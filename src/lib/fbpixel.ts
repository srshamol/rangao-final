// Facebook Pixel utility
// Pixel ID will be loaded from store_settings or fallback to empty

declare global {
  interface Window {
    fbq: (...args: any[]) => void;
    _fbq: any;
  }
}

let pixelInitialized = false;

export function initFBPixel(pixelId: string) {
  if (!pixelId || pixelInitialized) return;

  // Load FB Pixel script
  const f = window as any;
  const b = document;
  if (!f.fbq) {
    const n: any = (f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    });
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    const t = b.createElement("script");
    t.async = true;
    t.src = "https://connect.facebook.net/en_US/fbevents.js";
    const s = b.getElementsByTagName("script")[0];
    s?.parentNode?.insertBefore(t, s);
  }

  window.fbq("init", pixelId);
  window.fbq("track", "PageView");
  pixelInitialized = true;
}

function fbq(...args: any[]) {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq(...args);
  }
}

// Standard events
export function trackPageView() {
  fbq("track", "PageView");
}

export function trackAddToCart(product: {
  id: string;
  name: string;
  category: string;
  price: number;
}) {
  fbq("track", "AddToCart", {
    content_ids: [product.id],
    content_name: product.name,
    content_category: product.category,
    value: product.price,
    currency: "BDT",
  });
}

export function trackInitiateCheckout(items: { id: string; price: number; quantity: number }[], total: number) {
  fbq("track", "InitiateCheckout", {
    content_ids: items.map((i) => i.id),
    value: total,
    currency: "BDT",
    num_items: items.reduce((sum, i) => sum + i.quantity, 0),
  });
}

export function trackPurchase(
  orderId: string,
  items: { id: string }[],
  total: number
) {
  const cleanTotal = typeof total === "number" && Number.isFinite(total) && total > 0
    ? Math.round(total * 100) / 100
    : 1;

  fbq("track", "Purchase", {
    value: cleanTotal,
    currency: "BDT",
    content_ids: (items || []).map((i) => i.id).filter(Boolean),
    content_type: "product",
    order_id: orderId,
  }, {
    eventID: orderId,
  });
}

export function trackViewContent(product: {
  id: string;
  name: string;
  category: string;
  price: number;
}) {
  fbq("track", "ViewContent", {
    content_ids: [product.id],
    content_name: product.name,
    content_category: product.category,
    value: product.price,
    currency: "BDT",
  });
}

// Custom events
export function trackTimeOnPage(duration: number) {
  fbq("trackCustom", "TimeOnPage", { duration });
}

export function trackPageScroll(percent: number) {
  fbq("trackCustom", "PageScroll", { percent });
}
