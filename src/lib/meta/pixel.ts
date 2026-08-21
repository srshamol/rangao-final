import { getMetaDatasetId, isMetaDatasetIdValid, AUTHORITATIVE_META_DATASET_ID } from "./config";

declare global {
  interface Window {
    fbq: (...args: any[]) => void;
    _fbq: any;
    _fb_initialized_pixels?: Set<string>;
  }
}

let activePixelId: string | null = null;
let isLoaded = false;

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
 */
export function initMetaPixel(pixelId?: string, options?: { autoPageView?: boolean }): void {
  if (typeof window === "undefined") return;

  const cleanId = getMetaDatasetId(pixelId);

  // Guard against duplicate fbq('init') calls for the same pixel ID
  window._fb_initialized_pixels = window._fb_initialized_pixels || new Set();
  if (window._fb_initialized_pixels.has(cleanId)) {
    return;
  }

  const win = window as any;
  const doc = document;

  if (!win.fbq) {
    const n: any = (win.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    });
    if (!win._fbq) win._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];

    const script = doc.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    const firstScript = doc.getElementsByTagName("script")[0];
    firstScript?.parentNode?.insertBefore(script, firstScript);
  }

  // Explicitly disable Meta Pixel Automatic Configuration / Automatic Event Detection
  // to prevent synthetic duplicate events (e.g. ob3_plugin-set_... / ob3_plug...)
  win.fbq("set", "autoConfig", false, cleanId);
  win.fbq("init", cleanId);
  window._fb_initialized_pixels.add(cleanId);
  activePixelId = cleanId;
  isLoaded = true;

  if (options?.autoPageView) {
    win.fbq("track", "PageView");
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(`[Meta Pixel] Initialized successfully with ID: ${cleanId}`);
  }
}

/**
 * Dispatches a standard Meta Pixel event with optional eventID deduplication parameter.
 */
export function trackPixelEvent(
  eventName: string,
  params?: Record<string, any>,
  eventId?: string
): boolean {
  if (typeof window === "undefined") return false;
  const win = window as any;

  if (typeof win.fbq !== "function") {
    console.warn(`[Meta Pixel] fbq not defined on window. Event ${eventName} skipped.`);
    return false;
  }

  try {
    const sanitizedParams: Record<string, any> = params ? { ...params } : {};

    // Purchase event strictly requires both a valid numeric value (> 0) and ISO currency code 'BDT' in Meta specifications
    if (eventName === "Purchase") {
      // 1. Centralized Currency Normalization & Validation
      const rawCurrency = sanitizedParams.currency || "BDT";
      const currency = String(rawCurrency).trim().toUpperCase();
      if (currency !== "BDT") {
        console.error("[Meta Purchase] Invalid currency:", currency);
        return false;
      }
      sanitizedParams.currency = "BDT";

      // 2. Strict Positive Finite Number Value Normalization & Validation
      let numVal = typeof sanitizedParams.value === "number"
        ? sanitizedParams.value
        : parseFloat(String(sanitizedParams.value || "").replace(/[^0-9.-]+/g, ""));

      if (!Number.isFinite(numVal) || numVal <= 0) {
        console.error("[Meta Purchase] Invalid purchase value:", sanitizedParams.value);
        return false;
      }
      sanitizedParams.value = Math.round(numVal * 100) / 100;

      // 3. Clean Content IDs (array of strings)
      if (Array.isArray(sanitizedParams.content_ids)) {
        sanitizedParams.content_ids = sanitizedParams.content_ids
          .map((id: any) => String(id || "").trim())
          .filter(Boolean);
      } else {
        sanitizedParams.content_ids = [];
      }

      // 4. Content Type
      sanitizedParams.content_type = "product";

      // 5. Contents array normalization (id, quantity, item_price)
      if (Array.isArray(sanitizedParams.contents)) {
        sanitizedParams.contents = sanitizedParams.contents.map((item: any) => {
          const itemPrice = typeof item.item_price === "number" && Number.isFinite(item.item_price)
            ? Math.round(item.item_price * 100) / 100
            : typeof item.price === "number" && Number.isFinite(item.price)
            ? Math.round(item.price * 100) / 100
            : 0;

          return {
            id: String(item.id || item.sku || item.productId || "").trim(),
            quantity: Math.max(1, parseInt(String(item.quantity || 1), 10)),
            item_price: itemPrice,
          };
        });
      }

      // 6. Num Items
      if (typeof sanitizedParams.num_items !== "number" || !Number.isFinite(sanitizedParams.num_items) || sanitizedParams.num_items <= 0) {
        sanitizedParams.num_items = Array.isArray(sanitizedParams.contents) && sanitizedParams.contents.length > 0
          ? sanitizedParams.contents.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0)
          : 1;
      }
    } else {
      if ("currency" in sanitizedParams) {
        sanitizedParams.currency = "BDT";
      }
      if ("value" in sanitizedParams) {
        const v = typeof sanitizedParams.value === "number" ? sanitizedParams.value : parseFloat(String(sanitizedParams.value).replace(/[^0-9.-]+/g, ""));
        sanitizedParams.value = Number.isFinite(v) && v >= 0 ? Math.round(v * 100) / 100 : 0;
      }
    }

    const cleanEventId = eventId ? String(eventId).trim() : undefined;
    const options = cleanEventId ? { eventID: cleanEventId } : undefined;

    // Detailed diagnostic logging immediately before fbq call
    if (eventName === "Purchase") {
      console.log("[Meta Purchase] Final browser payload:", {
        value: sanitizedParams.value,
        valueType: typeof sanitizedParams.value,
        currency: sanitizedParams.currency,
        currencyType: typeof sanitizedParams.currency,
        currencyTrimmed:
          typeof sanitizedParams.currency === "string"
            ? sanitizedParams.currency.trim()
            : null,
        content_ids: sanitizedParams.content_ids,
        content_type: sanitizedParams.content_type,
        eventID: options?.eventID,
      });
    }

    if (options) {
      win.fbq("track", eventName, sanitizedParams, options);
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
    console.error(`[Meta Pixel] Failed to fire event ${eventName}:`, err);
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
  if (typeof window === "undefined" || !window.fbq) return;

  try {
    const sanitizedParams = params ? { ...params } : {};

    if ("currency" in sanitizedParams) {
      sanitizedParams.currency = "BDT";
    }
    if ("value" in sanitizedParams) {
      const v = typeof sanitizedParams.value === "number" ? sanitizedParams.value : parseFloat(String(sanitizedParams.value).replace(/[^0-9.-]+/g, ""));
      sanitizedParams.value = Number.isFinite(v) && v >= 0 ? Math.round(v * 100) / 100 : 0;
    }

    if (eventId) {
      window.fbq("trackCustom", customEventName, sanitizedParams, { eventID: eventId });
    } else {
      window.fbq("trackCustom", customEventName, sanitizedParams);
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
    console.error(`[Meta Pixel] Failed to fire custom event ${customEventName}:`, err);
  }
}

/**
 * Checks if the Meta Pixel has been loaded and initialized.
 */
export function isMetaPixelInitialized(): boolean {
  return isLoaded && typeof window !== "undefined" && typeof window.fbq === "function";
}
