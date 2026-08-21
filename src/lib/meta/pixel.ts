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
): void {
  if (typeof window === "undefined" || !window.fbq) return;

  try {
    const sanitizedParams = params ? { ...params } : {};

    // Strictly enforce valid currency & numeric value according to Meta standards
    if ("currency" in sanitizedParams) {
      sanitizedParams.currency = "BDT";
    }
    if ("value" in sanitizedParams) {
      const v = typeof sanitizedParams.value === "number" ? sanitizedParams.value : parseFloat(String(sanitizedParams.value).replace(/[^0-9.-]+/g, ""));
      sanitizedParams.value = Number.isFinite(v) && v >= 0 ? Math.round(v * 100) / 100 : 0;
    }

    if (eventId) {
      window.fbq("track", eventName, sanitizedParams, { eventID: eventId });
    } else {
      window.fbq("track", eventName, sanitizedParams);
    }

    if (process.env.NODE_ENV !== "production") {
      console.log(
        `%c[Meta Pixel] %c${eventName}`,
        "background: #1877F2; color: #fff; font-weight: bold; border-radius: 3px; padding: 1px 4px;",
        "font-weight: bold; color: #1877F2;",
        { params: sanitizedParams, eventId }
      );
    }
  } catch (err) {
    console.error(`[Meta Pixel] Failed to fire event ${eventName}:`, err);
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
