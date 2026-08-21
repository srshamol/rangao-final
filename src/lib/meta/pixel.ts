// Browser-side Meta Pixel (fbevents.js) Loader & Dispatcher

declare global {
  interface Window {
    fbq: (...args: any[]) => void;
    _fbq: any;
  }
}

let activePixelId: string | null = null;
let isLoaded = false;

/**
 * Validates a Meta Pixel ID format (must be numeric, non-placeholder).
 */
export function isValidMetaPixelId(pixelId: string | null | undefined): boolean {
  if (!pixelId) return false;
  const clean = String(pixelId).trim();
  if (!clean || !/^\d+$/.test(clean)) return false;
  if (clean === "123456789012345" || clean.length < 5) return false;
  return true;
}

/**
 * Loads and initializes the Meta Pixel script tag in the browser head.
 */
export function initMetaPixel(pixelId: string, options?: { autoPageView?: boolean }): void {
  if (typeof window === "undefined") return;
  if (!isValidMetaPixelId(pixelId)) {
    console.warn("[Meta Pixel] Invalid Pixel ID provided:", pixelId);
    return;
  }

  const cleanId = pixelId.trim();

  // If already initialized with same ID, avoid duplicate execution
  if (isLoaded && activePixelId === cleanId) {
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
    if (eventId) {
      window.fbq("track", eventName, params || {}, { eventID: eventId });
    } else {
      window.fbq("track", eventName, params || {});
    }

    if (process.env.NODE_ENV !== "production") {
      console.log(
        `%c[Meta Pixel] %c${eventName}`,
        "background: #1877F2; color: #fff; font-weight: bold; border-radius: 3px; padding: 1px 4px;",
        "font-weight: bold; color: #1877F2;",
        { params, eventId }
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
    if (eventId) {
      window.fbq("trackCustom", customEventName, params || {}, { eventID: eventId });
    } else {
      window.fbq("trackCustom", customEventName, params || {});
    }

    if (process.env.NODE_ENV !== "production") {
      console.log(
        `%c[Meta Pixel Custom] %c${customEventName}`,
        "background: #4267B2; color: #fff; font-weight: bold; border-radius: 3px; padding: 1px 4px;",
        "font-weight: bold; color: #4267B2;",
        { params, eventId }
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
