import { getMetaDatasetId, isMetaDatasetIdValid } from "./config";

declare global {
  interface Window {
    fbq: (...args: any[]) => void;
    _fbq: any;
    _fb_initialized_pixels?: Set<string>;
  }
}

let activePixelId: string | null = null;
let isLoaded = false;

// ---------------------------------------------------------------------------
// STEP 0: Create fbq queue stub immediately at module import time.
//
// This ensures window.fbq exists as a queue before any React component
// attempts to fire tracking events. Events queued here will be replayed
// automatically when fbevents.js fully loads and replaces this stub.
//
// This directly fixes the race condition where:
//   main.tsx → initializeTracking() → trackPageView()
// was called before TrackingProvider had a chance to call initMetaPixel().
// ---------------------------------------------------------------------------
if (typeof window !== "undefined") {
  const win = window as any;
  if (!win.fbq) {
    const n: any = (win.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    });
    if (!win._fbq) win._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
  }
}

// ---------------------------------------------------------------------------
// DIAGNOSTIC HELPERS
//
// isFbeventsLoaded():
//   Returns true ONLY when the real fbevents.js has loaded and replaced
//   the queue stub. The real implementation sets fbq.callMethod as a function.
//   Queue stub has callMethod = undefined.
//
//   IMPORTANT: Events queued via the stub ARE replayed when fbevents.js loads.
//   This helper is used for diagnostic logging only — it does NOT gate events.
// ---------------------------------------------------------------------------
export function isFbeventsLoaded(): boolean {
  if (typeof window === "undefined") return false;
  const win = window as any;
  return (
    typeof win.fbq === "function" &&
    typeof win.fbq.callMethod === "function"
  );
}

/**
 * Validates a Meta Pixel ID format (must be numeric, non-placeholder, not in invalid list).
 */
export function isValidMetaPixelId(pixelId: string | null | undefined): boolean {
  if (!pixelId) return false;
  return isMetaDatasetIdValid(pixelId);
}

/**
 * Loads and initializes the Meta Pixel script tag in the browser head.
 * Enforces the authoritative 16-digit Dataset ID (1862583688445311).
 *
 * Initialization order (MUST NOT be changed):
 *   1. fbq queue stub (already created at module load above)
 *   2. Load fbevents.js exactly once
 *   3. fbq('set', 'autoConfig', false, pixelId)   ← BEFORE init
 *   4. fbq('init', pixelId)
 *   5. fbq('track', 'PageView')   ← only if autoPageView: true
 */
export function initMetaPixel(pixelId?: string, options?: { autoPageView?: boolean }): void {
  if (typeof window === "undefined") return;

  const cleanId = getMetaDatasetId(pixelId);

  // Guard: prevent duplicate fbq('init') for the same pixel ID
  window._fb_initialized_pixels = window._fb_initialized_pixels || new Set();
  if (window._fb_initialized_pixels.has(cleanId)) {
    return;
  }

  const win = window as any;
  const doc = document;

  // STEP 1: Ensure queue stub exists (fallback if module-level init was skipped, e.g. SSR)
  if (!win.fbq) {
    const n: any = (win.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    });
    if (!win._fbq) win._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
  }

  // STEP 2: Inject fbevents.js exactly once (guarded by script ID)
  const scriptId = "meta-pixel-script";
  const scriptExists =
    typeof doc.getElementById === "function" && doc.getElementById(scriptId);

  if (!scriptExists) {
    const script = doc.createElement("script");
    script.id = scriptId;
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    const firstScript = doc.getElementsByTagName("script")[0];
    firstScript?.parentNode?.insertBefore(script, firstScript);
  }

  // STEP 3 + 4: autoConfig MUST be set before init per Meta specification.
  // autoConfig: false disables automatic DOM event detection that causes
  // ob3_plugin synthetic events and duplicate tracking.
  win.fbq("set", "autoConfig", false, cleanId);
  win.fbq("init", cleanId);

  window._fb_initialized_pixels.add(cleanId);
  activePixelId = cleanId;
  isLoaded = true;

  // STEP 5: PageView (queued immediately; replayed when fbevents.js loads)
  if (options?.autoPageView) {
    win.fbq("track", "PageView");
    console.log("[Meta Pixel] PageView queued for dispatch after fbevents.js load");
  }

  console.log(`[Meta Pixel] Initialized — ID: ${cleanId} | fbevents.js loaded: ${isFbeventsLoaded()}`);
}

// ---------------------------------------------------------------------------
// PURCHASE PAYLOAD RULES (Meta fbevents.js validator requirements)
//
// The fbevents.js client-side validator (line ~198) enforces:
//   1. value MUST be a positive finite number
//   2. currency MUST be a valid 3-letter ISO string (BDT is supported)
//   3. If content_type is present AND equals "product":
//        content_ids MUST be a non-empty array
//   4. If content_ids is empty ([]):
//        content_type MUST be omitted (or the payload is flagged as invalid)
//
// CRITICAL: When the validator rejects the payload, it logs
//   "Parameter 'currency' is invalid for event 'Purchase'"
// and CANCELS the facebook.com/tr network request BEFORE it is made.
// This is why Meta Test Events shows ONLY Server — the browser HTTP
// request was never sent.
//
// FIX: Only include content_ids and content_type when content_ids is non-empty.
// ---------------------------------------------------------------------------

/**
 * Dispatches a standard Meta Pixel event with optional eventID deduplication parameter.
 *
 * Returns:
 *   true  = fbq command was issued (event queued or dispatched to fbevents.js)
 *   false = event was NOT issued (validation failure or browser unavailable)
 */
export function trackPixelEvent(
  eventName: string,
  params?: Record<string, any>,
  eventId?: string
): boolean {
  if (typeof window === "undefined") return false;
  const win = window as any;

  // fbq must exist (queue stub or real implementation)
  if (typeof win.fbq !== "function") {
    console.warn(`[Meta Pixel] fbq unavailable — event ${eventName} not issued.`);
    return false;
  }

  try {
    const sanitizedParams: Record<string, any> = params ? { ...params } : {};

    if (eventName === "Purchase") {
      // -----------------------------------------------------------------------
      // PURCHASE VALIDATION
      // -----------------------------------------------------------------------

      // 1. Currency: must be "BDT" (Bangladeshi Taka — ISO 4217 supported by Meta)
      const rawCurrency = sanitizedParams.currency || "BDT";
      const currency = String(rawCurrency).trim().toUpperCase();
      if (currency !== "BDT") {
        console.error("[Meta Purchase] Invalid currency — only BDT is accepted:", currency);
        return false;
      }
      sanitizedParams.currency = "BDT";

      // 2. Value: must be a positive finite number
      let numVal =
        typeof sanitizedParams.value === "number"
          ? sanitizedParams.value
          : parseFloat(String(sanitizedParams.value || "").replace(/[^0-9.-]+/g, ""));

      if (!Number.isFinite(numVal) || numVal <= 0) {
        console.error("[Meta Purchase] Invalid purchase value — must be a positive number:", sanitizedParams.value);
        return false;
      }
      sanitizedParams.value = Math.round(numVal * 100) / 100;

      // 3. content_ids: normalize to array of non-empty strings
      //    CRITICAL: If empty, DELETE the key entirely.
      //    An empty content_ids array with content_type="product" causes
      //    the fbevents.js validator to cancel the network request.
      let cleanContentIds: string[] = [];
      if (Array.isArray(sanitizedParams.content_ids)) {
        cleanContentIds = sanitizedParams.content_ids
          .map((id: any) => String(id || "").trim())
          .filter(Boolean);
      }

      if (cleanContentIds.length > 0) {
        sanitizedParams.content_ids = cleanContentIds;
        // 4. content_type: only include when content_ids is non-empty
        sanitizedParams.content_type = "product";
      } else {
        // No valid content IDs — omit both fields to prevent fbevents.js
        // validator from rejecting the payload and blocking the network request
        delete sanitizedParams.content_ids;
        delete sanitizedParams.content_type;
      }

      // 5. contents: normalize item list (only when content_ids is present)
      if (cleanContentIds.length > 0 && Array.isArray(sanitizedParams.contents)) {
        sanitizedParams.contents = sanitizedParams.contents.map((item: any) => {
          const itemPrice =
            typeof item.item_price === "number" && Number.isFinite(item.item_price)
              ? Math.round(item.item_price * 100) / 100
              : typeof item.price === "number" && Number.isFinite(item.price)
              ? Math.round(item.price * 100) / 100
              : 0;

          return {
            id: String(item.id || item.sku || item.productId || "").trim(),
            quantity: Math.max(1, parseInt(String(item.quantity || 1), 10)),
            item_price: itemPrice,
          };
        }).filter((item: any) => item.id); // remove items with no ID
      } else {
        // No valid content IDs — omit contents too
        delete sanitizedParams.contents;
      }

      // 6. num_items: derive from contents or set to 1
      if (
        Array.isArray(sanitizedParams.contents) &&
        sanitizedParams.contents.length > 0
      ) {
        sanitizedParams.num_items = sanitizedParams.contents.reduce(
          (sum: number, i: any) => sum + (i.quantity || 1),
          0
        );
      } else if (
        typeof sanitizedParams.num_items !== "number" ||
        !Number.isFinite(sanitizedParams.num_items) ||
        sanitizedParams.num_items <= 0
      ) {
        sanitizedParams.num_items = 1;
      }

      // -----------------------------------------------------------------------
      // DIAGNOSTIC LOG — immediately before fbq call
      // Shows state of fbevents.js and exact payload to aid network inspection
      // -----------------------------------------------------------------------
      const fbeventsReady = isFbeventsLoaded();
      console.log("[Meta Purchase] Browser dispatch requested:", {
        fbeventsLoaded: fbeventsReady,
        status: fbeventsReady
          ? "DISPATCHING to real fbevents.js"
          : "QUEUING via stub (will replay when fbevents.js loads)",
        payload: {
          value: sanitizedParams.value,
          currency: sanitizedParams.currency,
          content_ids: sanitizedParams.content_ids ?? "(omitted — no valid IDs)",
          content_type: sanitizedParams.content_type ?? "(omitted)",
          num_items: sanitizedParams.num_items,
          eventID: eventId ? String(eventId).trim() : "(no eventID)",
        },
        pixelId: activePixelId,
        timestamp: new Date().toISOString(),
      });

    } else {
      // Non-Purchase events: normalize currency/value if present
      if ("currency" in sanitizedParams) {
        sanitizedParams.currency = "BDT";
      }
      if ("value" in sanitizedParams) {
        const v =
          typeof sanitizedParams.value === "number"
            ? sanitizedParams.value
            : parseFloat(String(sanitizedParams.value).replace(/[^0-9.-]+/g, ""));
        sanitizedParams.value =
          Number.isFinite(v) && v >= 0 ? Math.round(v * 100) / 100 : 0;
      }
    }

    const cleanEventId = eventId ? String(eventId).trim() : undefined;
    const trackOptions = cleanEventId ? { eventID: cleanEventId } : undefined;

    // Issue the fbq command
    if (trackOptions) {
      win.fbq("track", eventName, sanitizedParams, trackOptions);
    } else {
      win.fbq("track", eventName, sanitizedParams);
    }

    if (process.env.NODE_ENV !== "production") {
      console.log(
        `%c[Meta Pixel] %c${eventName}`,
        "background: #1877F2; color: #fff; font-weight: bold; border-radius: 3px; padding: 1px 4px;",
        "font-weight: bold; color: #1877F2;",
        { params: sanitizedParams, eventId: cleanEventId }
      );
    }

    return true;
  } catch (err) {
    console.error(`[Meta Pixel] Error issuing fbq command for ${eventName}:`, err);
    return false;
  }
}

/**
 * Dispatches a custom Meta Pixel event with optional eventID deduplication parameter.
 */
export function trackPixelCustomEvent(
  customEventName: string,
  params?: Record<string, any>,
  eventId?: string
): void {
  if (typeof window === "undefined") return;
  const win = window as any;
  if (typeof win.fbq !== "function") return;

  try {
    const sanitizedParams = params ? { ...params } : {};

    if ("currency" in sanitizedParams) {
      sanitizedParams.currency = "BDT";
    }
    if ("value" in sanitizedParams) {
      const v =
        typeof sanitizedParams.value === "number"
          ? sanitizedParams.value
          : parseFloat(String(sanitizedParams.value).replace(/[^0-9.-]+/g, ""));
      sanitizedParams.value =
        Number.isFinite(v) && v >= 0 ? Math.round(v * 100) / 100 : 0;
    }

    if (eventId) {
      win.fbq("trackCustom", customEventName, sanitizedParams, { eventID: eventId });
    } else {
      win.fbq("trackCustom", customEventName, sanitizedParams);
    }

    if (process.env.NODE_ENV !== "production") {
      console.log(
        `%c[Meta Pixel Custom] %c${customEventName}`,
        "background: #4267B2; color: #fff; font-weight: bold; border-radius: 3px; padding: 1px 4px;",
        "font-weight: bold; color: #4267B2;",
        { params: sanitizedParams, eventId }
      );
    }
  } catch (err) {
    console.error(`[Meta Pixel] Error issuing custom event ${customEventName}:`, err);
  }
}

/**
 * Checks if the Meta Pixel has been initialized (fbq('init') was called).
 * Note: this does NOT mean fbevents.js has fully loaded.
 * Use isFbeventsLoaded() to check whether the real script is active.
 */
export function isMetaPixelInitialized(): boolean {
  return isLoaded && typeof window !== "undefined" && typeof window.fbq === "function";
}
