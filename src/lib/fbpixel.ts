// Facebook Pixel utility (Legacy compatibility layer delegating to authoritative @/lib/meta)

import {
  initMetaPixel,
  trackPageView as metaTrackPageView,
  trackAddToCart as metaTrackAddToCart,
  trackInitiateCheckout as metaTrackInitiateCheckout,
  trackPurchase as metaTrackPurchase,
  trackViewContent as metaTrackViewContent,
  trackCustomEvent,
} from "./meta";

export function initFBPixel(pixelId: string) {
  initMetaPixel(pixelId);
}

// Standard events
export function trackPageView() {
  metaTrackPageView();
}

export function trackAddToCart(product: {
  id: string;
  name: string;
  category: string;
  price: number;
}) {
  metaTrackAddToCart(product, 1);
}

export function trackInitiateCheckout(items: { id: string; price: number; quantity: number }[], total: number) {
  metaTrackInitiateCheckout(
    items.map(i => ({ id: i.id, sku: i.id, name: i.id, price: i.price, quantity: i.quantity })),
    total
  );
}

export function trackPurchase(
  orderId: string,
  items: { id: string }[],
  total: number
) {
  metaTrackPurchase({
    orderNumber: orderId,
    total,
    items: (items || []).map(i => ({ id: i.id, sku: i.id, name: i.id, price: total, quantity: 1 }))
  });
}

export function trackViewContent(product: {
  id: string;
  name: string;
  category: string;
  price: number;
}) {
  metaTrackViewContent(product);
}

// Custom events
export function trackTimeOnPage(duration: number) {
  trackCustomEvent("TimeOnPage", { duration });
}

export function trackPageScroll(percent: number) {
  trackCustomEvent("PageScroll", { percent });
}

