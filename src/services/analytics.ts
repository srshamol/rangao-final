import { type Product } from "@/data/products";
import { type CartItem } from "@/context/CartContext";
import {
  trackPageView,
  trackViewContent,
  trackSearch,
  trackAddToCart,
  trackInitiateCheckout,
  trackAddPaymentInfo,
  trackPurchase,
  trackLead,
  trackCompleteRegistration,
  trackAddToWishlist,
  trackContact,
  trackCustomEvent,
} from "@/lib/meta";
import type { EcommerceItem, RawUserData } from "@/lib/meta/types";

export interface AnalyticsOrder {
  orderNumber: string;
  orderId?: string;
  total: number;
  customer?: RawUserData;
  items: Array<{
    id?: string;
    productId?: string;
    name: string;
    unitPrice: number;
    quantity: number;
    category?: string;
    sku?: string;
  }>;
}

// Check if tracking is allowed based on user consent and path
export function isTrackingAllowed(): boolean {
  if (typeof window === "undefined") return false;

  // 1. Consent Check - only block if user explicitly declined
  const consent = localStorage.getItem("rangao_cookie_consent");
  if (consent === "declined") {
    return false;
  }

  // 2. Admin Check - never track internal admin usage
  if (window.location.pathname.startsWith("/admin")) {
    return false;
  }

  return true;
}

export function initializeTracking(): void {
  if (typeof window === "undefined" || !isTrackingAllowed()) return;
  trackPageView(window.location.href);
}

export const analytics = {
  // PageView
  pageView(url?: string, eventId?: string): string {
    if (!isTrackingAllowed()) return "";
    return trackPageView(url, eventId);
  },

  // Called when user views a product
  viewItem(product: Product | { id: string; name?: string; price: number; category?: string; sku?: string }, eventId?: string): string {
    if (!isTrackingAllowed()) return "";
    return trackViewContent({
      id: product.id,
      name: product.name,
      category: (product as any).categoryLabel || product.category || "General",
      price: product.price,
      sku: (product as any).sku || product.id,
    }, eventId);
  },

  // Called when user adds item to cart
  addToCart(product: Product | EcommerceItem, quantity = 1, eventId?: string): string {
    if (!isTrackingAllowed()) return "";
    return trackAddToCart(
      {
        id: product.id,
        name: product.name,
        category: (product as any).categoryLabel || product.category || "General",
        price: product.price,
        sku: (product as any).sku || product.id,
        quantity,
      },
      quantity,
      eventId
    );
  },

  // Called when user removes item from cart
  removeFromCart(product: Product, quantity: number): void {
    if (!isTrackingAllowed()) return;

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "remove_from_cart",
      ecommerce: {
        currency: "BDT",
        value: product.price * quantity,
        items: [
          {
            item_id: product.id,
            item_name: product.name,
            item_category: product.categoryLabel || product.category || "General",
            price: product.price,
            quantity: quantity,
          },
        ],
      },
    });
  },

  // Called when user starts checkout
  beginCheckout(cart: CartItem[] | EcommerceItem[], total: number, eventId?: string): string {
    if (!isTrackingAllowed()) return "";

    const mappedItems: EcommerceItem[] = cart.map((item: any) => ({
      id: item.product?.id || item.id,
      sku: item.product?.sku || item.sku || item.product?.id || item.id,
      name: item.product?.name || item.name,
      category: item.product?.categoryLabel || item.product?.category || item.category || "General",
      price: item.product?.price ?? item.price ?? 0,
      quantity: item.quantity || 1,
    }));

    return trackInitiateCheckout(mappedItems, total, eventId);
  },

  // Called when payment method is selected or provided
  addPaymentInfo(items: EcommerceItem[], total: number, paymentMethod = "COD", eventId?: string): string {
    if (!isTrackingAllowed()) return "";
    return trackAddPaymentInfo(items, total, paymentMethod, eventId);
  },

  // Called when order is placed successfully
  purchase(order: AnalyticsOrder, eventId?: string): string {
    if (!isTrackingAllowed()) return "";

    const mappedItems: EcommerceItem[] = order.items.map((item) => ({
      id: String(item.productId || item.id || order.orderNumber),
      sku: String(item.sku || item.productId || item.id || order.orderNumber),
      name: item.name,
      price: item.unitPrice,
      quantity: item.quantity,
      category: item.category || "General",
    }));

    return trackPurchase(
      {
        orderNumber: order.orderNumber,
        orderId: order.orderId,
        total: order.total,
        items: mappedItems,
        customer: order.customer,
      },
      eventId
    );
  },

  // Called on search
  search(query: string, resultCount?: number, eventId?: string): string {
    if (!isTrackingAllowed()) return "";
    return trackSearch(query, eventId);
  },

  // Called on lead / inquiry submission
  lead(data: { value?: number; leadType?: string; email?: string; phone?: string } = {}, eventId?: string): string {
    if (!isTrackingAllowed()) return "";
    return trackLead(data, eventId);
  },

  // Called on customer registration
  completeRegistration(method = "email", userData?: RawUserData, eventId?: string): string {
    if (!isTrackingAllowed()) return "";
    return trackCompleteRegistration(method, userData, eventId);
  },

  // Called on wishlist addition
  addToWishlist(item: EcommerceItem, eventId?: string): string {
    if (!isTrackingAllowed()) return "";
    return trackAddToWishlist(item, eventId);
  },

  // Called on contact / whatsapp / call clicks
  contact(method: "whatsapp" | "phone" | "form", eventId?: string): string {
    if (!isTrackingAllowed()) return "";
    return trackContact(method, eventId);
  },

  // Custom events
  custom(eventName: string, params?: Record<string, any>, eventId?: string): string {
    if (!isTrackingAllowed()) return "";
    return trackCustomEvent(eventName, params, eventId);
  },
};
