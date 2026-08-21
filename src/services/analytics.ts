import { type Product } from "@/data/products";
import { type CartItem } from "@/context/CartContext";
import {
  trackViewContent,
  trackAddToCart,
  trackInitiateCheckout,
  trackPurchase,
  trackSearch,
  trackPageView
} from "@/lib/tracking";

export interface AnalyticsOrder {
  orderNumber: string;
  total: number;
  items: Array<{
    id?: string;
    productId?: string;
    name: string;
    unitPrice: number;
    quantity: number;
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

// Legacy initialisation is now managed dynamically by TrackingProvider and lib/tracking.ts
export function initializeTracking(): void {
  if (typeof window === "undefined") return;
  // Trigger initial PageView event using the unified tracking engine
  trackPageView(window.location.pathname);
}

export const analytics = {
  // Called when user views a product
  viewItem(product: Product): void {
    if (!isTrackingAllowed()) return;

    trackViewContent({
      id: product.id,
      name: product.name,
      category: product.categoryLabel || product.category || "Uncategorized",
      price: product.price,
    });
  },

  // Called when user adds item to cart
  addToCart(product: Product, quantity: number): void {
    if (!isTrackingAllowed()) return;

    trackAddToCart(
      {
        id: product.id,
        name: product.name,
        category: product.categoryLabel || product.category || "Uncategorized",
        price: product.price,
      },
      quantity
    );
  },

  // Called when user removes item from cart
  removeFromCart(product: Product, quantity: number): void {
    // Standard GA4/Meta Pixel doesn't have a strict standard event for removeFromCart,
    // but GTM dataLayer is supported.
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
            item_category: product.categoryLabel || product.category || "Uncategorized",
            price: product.price,
            quantity: quantity,
          },
        ],
      },
    });
  },

  // Called when user starts checkout
  beginCheckout(cart: CartItem[], total: number): void {
    if (!isTrackingAllowed()) return;

    const mappedItems = cart.map((item) => ({
      id: item.product.id,
      name: item.product.name,
      category: item.product.categoryLabel || item.product.category || "Uncategorized",
      price: item.product.price,
      quantity: item.quantity,
    }));

    trackInitiateCheckout(mappedItems, total);
  },

  // Called when order is placed successfully
  purchase(order: AnalyticsOrder): void {
    if (!isTrackingAllowed()) return;

    // Convert items to tracking format with exact product IDs
    const mappedItems = order.items.map((item) => ({
      id: item.id || item.productId || order.orderNumber,
      name: item.name,
      price: item.unitPrice,
      quantity: item.quantity,
    }));

    trackPurchase(order.orderNumber, mappedItems, order.total);
  },

  // Called on search
  search(query: string, resultCount: number): void {
    if (!isTrackingAllowed()) return;

    trackSearch(query);
  },
};
