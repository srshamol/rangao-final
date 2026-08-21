// Unified, Strongly-Typed Event Tracker for Meta Pixel & CAPI

import { DEFAULT_CURRENCY, DEFAULT_CONTENT_TYPE, META_STANDARD_EVENTS } from "./constants";
import { generateEventId, generatePurchaseEventId } from "./event-id";
import { normalizeContents, extractContentIds, normalizePrice } from "./normalize";
import { trackPixelEvent, trackPixelCustomEvent } from "./pixel";
import { relayClientEventToCapi } from "./capi";
import { getAttributionContext } from "./attribution";
import type { EcommerceItem, RawUserData, MetaCustomData } from "./types";

declare global {
  interface Window {
    dataLayer: any[];
  }
}

// Push to centralized dataLayer for GTM / GA4 multi-platform parity
function pushToDataLayer(event: string, data: Record<string, any>, meta: { eventId: string }) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event,
    ...data,
    meta: {
      eventId: meta.eventId,
      timestamp: Date.now(),
    },
  });
}

/**
 * 1. PageView Event
 * Fires on initial load and client-side SPA route transitions.
 */
export function trackPageView(url?: string, eventId?: string): string {
  const finalEventId = eventId || generateEventId(META_STANDARD_EVENTS.PAGE_VIEW);
  const currentUrl = url || (typeof window !== "undefined" ? window.location.href : "");

  trackPixelEvent(META_STANDARD_EVENTS.PAGE_VIEW, undefined, finalEventId);

  pushToDataLayer("virtual_page_view", {
    page_path: typeof window !== "undefined" ? window.location.pathname : "",
    page_url: currentUrl,
  }, { eventId: finalEventId });

  return finalEventId;
}

/**
 * 2. ViewContent Event
 * Fires when a customer views a product detail page (variable / combo / standard).
 */
export function trackViewContent(
  product: { id: string; name?: string; price: number; category?: string; sku?: string },
  eventId?: string
): string {
  const finalEventId = eventId || generateEventId(META_STANDARD_EVENTS.VIEW_CONTENT, product.sku || product.id);
  const price = normalizePrice(product.price);
  const contentId = String(product.sku || product.id).trim();

  const customData: MetaCustomData = {
    content_ids: [contentId],
    content_name: product.name || "",
    content_category: product.category || "General",
    content_type: DEFAULT_CONTENT_TYPE,
    value: price,
    currency: DEFAULT_CURRENCY,
    contents: [{
      id: contentId,
      quantity: 1,
      item_price: price,
      price: price,
      title: product.name || "",
    }],
  };

  trackPixelEvent(META_STANDARD_EVENTS.VIEW_CONTENT, customData, finalEventId);

  pushToDataLayer("view_item", {
    ecommerce: {
      currency: DEFAULT_CURRENCY,
      value: price,
      items: [{
        item_id: contentId,
        item_name: product.name || "",
        item_category: product.category || "General",
        price: price,
        quantity: 1,
      }],
    },
  }, { eventId: finalEventId });

  return finalEventId;
}

/**
 * 3. Search Event
 * Fires on meaningful product search submissions (e.g. submit, Enter, result selection).
 */
export function trackSearch(query: string, eventId?: string): string {
  if (!query || !query.trim()) return "";
  const finalEventId = eventId || generateEventId(META_STANDARD_EVENTS.SEARCH);
  const cleanQuery = query.trim();

  const customData: MetaCustomData = {
    search_string: cleanQuery,
  };

  trackPixelEvent(META_STANDARD_EVENTS.SEARCH, customData, finalEventId);

  pushToDataLayer("search", {
    search_term: cleanQuery,
  }, { eventId: finalEventId });

  return finalEventId;
}

/**
 * 4. AddToCart Event
 * Fires only after a product has been successfully added to cart or selected in Quick Order.
 */
export function trackAddToCart(
  item: EcommerceItem | { id: string; name?: string; price: number; category?: string; sku?: string },
  quantity = 1,
  eventId?: string
): string {
  const cleanQuantity = Math.max(1, quantity);
  const price = normalizePrice(item.price);
  const totalValue = normalizePrice(price * cleanQuantity);
  const contentId = String(item.sku || item.id).trim();
  const finalEventId = eventId || generateEventId(META_STANDARD_EVENTS.ADD_TO_CART, `${contentId}_${Date.now()}`);

  const customData: MetaCustomData = {
    content_ids: [contentId],
    content_name: item.name || "",
    content_category: item.category || "General",
    content_type: DEFAULT_CONTENT_TYPE,
    value: totalValue,
    currency: DEFAULT_CURRENCY,
    num_items: cleanQuantity,
    contents: [{
      id: contentId,
      quantity: cleanQuantity,
      item_price: price,
      price: price,
      title: item.name || "",
    }],
  };

  trackPixelEvent(META_STANDARD_EVENTS.ADD_TO_CART, customData, finalEventId);

  pushToDataLayer("add_to_cart", {
    ecommerce: {
      currency: DEFAULT_CURRENCY,
      value: totalValue,
      items: [{
        item_id: contentId,
        item_name: item.name || "",
        item_category: item.category || "General",
        price: price,
        quantity: cleanQuantity,
      }],
    },
  }, { eventId: finalEventId });

  return finalEventId;
}

/**
 * 5. InitiateCheckout Event
 * Fires when customer enters checkout page or opens Quick Order modal.
 */
export function trackInitiateCheckout(
  items: EcommerceItem[],
  total: number,
  eventId?: string
): string {
  const finalEventId = eventId || generateEventId(META_STANDARD_EVENTS.INITIATE_CHECKOUT);
  const contents = normalizeContents(items);
  const contentIds = extractContentIds(items);
  const finalTotal = normalizePrice(total);
  const numItems = items.reduce((sum, i) => sum + (i.quantity || 1), 0);

  const customData: MetaCustomData = {
    content_ids: contentIds,
    content_type: DEFAULT_CONTENT_TYPE,
    contents,
    value: finalTotal,
    currency: DEFAULT_CURRENCY,
    num_items: numItems,
  };

  trackPixelEvent(META_STANDARD_EVENTS.INITIATE_CHECKOUT, customData, finalEventId);

  pushToDataLayer("begin_checkout", {
    ecommerce: {
      currency: DEFAULT_CURRENCY,
      value: finalTotal,
      items: items.map((i) => ({
        item_id: i.sku || i.id,
        item_name: i.name || "",
        item_category: i.category || "General",
        price: normalizePrice(i.price),
        quantity: i.quantity || 1,
      })),
    },
  }, { eventId: finalEventId });

  return finalEventId;
}

/**
 * 6. AddPaymentInfo Event
 * Fires when customer provides or confirms their payment method (e.g. COD / bKash / Nagad / Online).
 */
export function trackAddPaymentInfo(
  items: EcommerceItem[],
  total: number,
  paymentMethod = "COD",
  eventId?: string
): string {
  const finalEventId = eventId || generateEventId(META_STANDARD_EVENTS.ADD_PAYMENT_INFO);
  const contents = normalizeContents(items);
  const contentIds = extractContentIds(items);
  const finalTotal = normalizePrice(total);
  const numItems = items.reduce((sum, i) => sum + (i.quantity || 1), 0);

  const customData: MetaCustomData = {
    content_ids: contentIds,
    content_type: DEFAULT_CONTENT_TYPE,
    contents,
    value: finalTotal,
    currency: DEFAULT_CURRENCY,
    num_items: numItems,
    status: paymentMethod,
  };

  trackPixelEvent(META_STANDARD_EVENTS.ADD_PAYMENT_INFO, customData, finalEventId);

  pushToDataLayer("add_payment_info", {
    ecommerce: {
      currency: DEFAULT_CURRENCY,
      value: finalTotal,
      payment_type: paymentMethod,
      items: items.map((i) => ({
        item_id: i.sku || i.id,
        item_name: i.name || "",
        item_category: i.category || "General",
        price: normalizePrice(i.price),
        quantity: i.quantity || 1,
      })),
    },
  }, { eventId: finalEventId });

  return finalEventId;
}

/**
 * 7. Purchase Event — The Most Critical Conversion Event
 * Fires ONLY after order is successfully placed and validated.
 * Fully idempotent with deduplication event ID.
 */
export function trackPurchase(
  order: {
    orderNumber: string;
    orderId?: string;
    total: number;
    items: EcommerceItem[];
    customer?: RawUserData;
  },
  explicitEventId?: string
): string {
  const finalEventId = explicitEventId || generatePurchaseEventId(order.orderNumber);
  const contents = normalizeContents(order.items);
  const contentIds = extractContentIds(order.items);
  
  let finalTotal = normalizePrice(order.total);
  if (finalTotal <= 0 && Array.isArray(order.items) && order.items.length > 0) {
    const itemsSum = order.items.reduce((sum, i) => sum + (normalizePrice(i.price ?? (i as any).unitPrice ?? 0) * (i.quantity || 1)), 0);
    finalTotal = normalizePrice(itemsSum);
  }
  if (finalTotal <= 0) {
    finalTotal = 1;
  }

  const numItems = order.items.reduce((sum, i) => sum + (i.quantity || 1), 0);

  const customData: MetaCustomData = {
    content_ids: contentIds,
    content_type: DEFAULT_CONTENT_TYPE,
    contents,
    value: finalTotal,
    currency: DEFAULT_CURRENCY,
    num_items: numItems,
    order_id: order.orderNumber,
  };

  // 1. Browser Meta Pixel
  trackPixelEvent(META_STANDARD_EVENTS.PURCHASE, customData, finalEventId);

  // 2. Relay to CAPI endpoint asynchronously
  const attribution = getAttributionContext();
  const userDataPayload: RawUserData = {
    ...(order.customer || {}),
    fbp: attribution.fbp,
    fbc: attribution.fbc,
  };

  relayClientEventToCapi({
    event_name: META_STANDARD_EVENTS.PURCHASE,
    event_id: finalEventId,
    order_id: order.orderId || order.orderNumber,
    custom_data: customData,
    user_data: userDataPayload,
  });

  // 3. Centralized dataLayer
  pushToDataLayer("purchase", {
    ecommerce: {
      transaction_id: order.orderNumber,
      currency: DEFAULT_CURRENCY,
      value: finalTotal,
      items: order.items.map((i) => ({
        item_id: i.sku || i.id,
        item_name: i.name || "",
        item_category: i.category || "General",
        price: normalizePrice(i.price),
        quantity: i.quantity || 1,
      })),
    },
  }, { eventId: finalEventId });

  return finalEventId;
}

/**
 * 8. Lead Event
 * Fires for genuine lead submissions (inquiries, custom quotes, callback requests).
 */
export function trackLead(
  data: { value?: number; leadType?: string; email?: string; phone?: string } = {},
  eventId?: string
): string {
  const finalEventId = eventId || generateEventId(META_STANDARD_EVENTS.LEAD);
  const customData: MetaCustomData = {
    value: normalizePrice(data.value || 0),
    currency: DEFAULT_CURRENCY,
    content_name: data.leadType || "Inquiry",
  };

  trackPixelEvent(META_STANDARD_EVENTS.LEAD, customData, finalEventId);

  relayClientEventToCapi({
    event_name: META_STANDARD_EVENTS.LEAD,
    event_id: finalEventId,
    custom_data: customData,
    user_data: { email: data.email, phone: data.phone },
  });

  pushToDataLayer("generate_lead", {
    lead_type: data.leadType || "Inquiry",
    value: normalizePrice(data.value || 0),
    currency: DEFAULT_CURRENCY,
  }, { eventId: finalEventId });

  return finalEventId;
}

/**
 * 9. CompleteRegistration Event
 * Fires only upon successful customer account registration.
 */
export function trackCompleteRegistration(
  method = "email",
  userData?: RawUserData,
  eventId?: string
): string {
  const finalEventId = eventId || generateEventId(META_STANDARD_EVENTS.COMPLETE_REGISTRATION);
  const customData: MetaCustomData = {
    status: "completed",
    content_name: method,
  };

  trackPixelEvent(META_STANDARD_EVENTS.COMPLETE_REGISTRATION, customData, finalEventId);

  if (userData) {
    relayClientEventToCapi({
      event_name: META_STANDARD_EVENTS.COMPLETE_REGISTRATION,
      event_id: finalEventId,
      custom_data: customData,
      user_data: userData,
    });
  }

  pushToDataLayer("sign_up", {
    method,
  }, { eventId: finalEventId });

  return finalEventId;
}

/**
 * 10. AddToWishlist Event
 */
export function trackAddToWishlist(item: EcommerceItem, eventId?: string): string {
  const finalEventId = eventId || generateEventId(META_STANDARD_EVENTS.ADD_TO_WISHLIST, item.sku || item.id);
  const price = normalizePrice(item.price);
  const contentId = String(item.sku || item.id).trim();

  const customData: MetaCustomData = {
    content_ids: [contentId],
    content_name: item.name || "",
    content_category: item.category || "General",
    content_type: DEFAULT_CONTENT_TYPE,
    value: price,
    currency: DEFAULT_CURRENCY,
  };

  trackPixelEvent(META_STANDARD_EVENTS.ADD_TO_WISHLIST, customData, finalEventId);

  pushToDataLayer("add_to_wishlist", {
    ecommerce: {
      currency: DEFAULT_CURRENCY,
      value: price,
      items: [{
        item_id: contentId,
        item_name: item.name || "",
        price: price,
        quantity: 1,
      }],
    },
  }, { eventId: finalEventId });

  return finalEventId;
}

/**
 * 11. Contact Event (WhatsApp, Phone Call, Form)
 */
export function trackContact(method: "whatsapp" | "phone" | "form", eventId?: string): string {
  const finalEventId = eventId || generateEventId(META_STANDARD_EVENTS.CONTACT, method);
  const customData: MetaCustomData = {
    content_name: method === "whatsapp" ? "WhatsApp Click" : method === "phone" ? "Phone Call" : "Contact Form",
  };

  trackPixelEvent(META_STANDARD_EVENTS.CONTACT, customData, finalEventId);

  pushToDataLayer("contact", {
    contact_method: method,
  }, { eventId: finalEventId });

  return finalEventId;
}

/**
 * 12. Custom Event Tracker
 */
export function trackCustomEvent(
  customEventName: string,
  params?: Record<string, any>,
  eventId?: string
): string {
  const finalEventId = eventId || generateEventId(customEventName);
  trackPixelCustomEvent(customEventName, params, finalEventId);

  pushToDataLayer("custom_meta_event", {
    custom_event_name: customEventName,
    params,
  }, { eventId: finalEventId });

  return finalEventId;
}
