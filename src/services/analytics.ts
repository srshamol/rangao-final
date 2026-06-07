import { type Product } from "@/data/products";
import { type CartItem } from "@/context/CartContext";

export interface AnalyticsOrder {
  orderNumber: string;
  total: number;
  items: Array<{
    name: string;
    unitPrice: number;
    quantity: number;
  }>;
}

// Check if tracking is allowed based on user consent and path
export function isTrackingAllowed(): boolean {
  if (typeof window === "undefined") return false;

  // 1. Consent Check
  const consent = localStorage.getItem("rangao_cookie_consent");
  if (consent !== "accepted") {
    return false;
  }

  // 2. Admin Check
  if (window.location.pathname.startsWith("/admin")) {
    return false;
  }

  return true;
}

// Dynamically initialize Google Tag Manager and GA4 Tag
export function initializeTracking(): void {
  if (typeof window === "undefined") return;

  const consent = localStorage.getItem("rangao_cookie_consent");
  if (consent !== "accepted") return;

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || [];

  // 1. Inject GTM (GTM-KZFPJ2VZ)
  if (!document.getElementById("gtm-script")) {
    window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
    const gtmScript = document.createElement("script");
    gtmScript.id = "gtm-script";
    gtmScript.async = true;
    gtmScript.src = "https://www.googletagmanager.com/gtm.js?id=GTM-KZFPJ2VZ";
    document.head.appendChild(gtmScript);
  }

  // 2. Inject GA4 gtag (G-HZ2NSKYMB0)
  if (!document.getElementById("ga4-script")) {
    const ga4Script = document.createElement("script");
    ga4Script.id = "ga4-script";
    ga4Script.async = true;
    ga4Script.src = "https://www.googletagmanager.com/gtag/js?id=G-HZ2NSKYMB0";
    document.head.appendChild(ga4Script);

    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", "G-HZ2NSKYMB0");
  }

  // 3. Inject Meta Pixel (2224593695020368)
  if (!window.fbq) {
    (function (f: any, b: Document, e: string, v: string, n?: any, t?: any, s?: any) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = "2.0";
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s?.parentNode?.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");

    window.fbq("init", "2224593695020368");
    window.fbq("track", "PageView");
  }
}

export const analytics = {
  // Called when user views a product
  viewItem(product: Product): void {
    if (!isTrackingAllowed()) return;

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "view_item",
      ecommerce: {
        currency: "BDT",
        value: product.price,
        items: [
          {
            item_id: product.id,
            item_name: product.name,
            item_category: product.categoryLabel || product.category,
            price: product.price,
            quantity: 1,
          },
        ],
      },
    });

    if (window.fbq) {
      window.fbq("track", "ViewContent", {
        content_ids: [product.id],
        content_name: product.name,
        content_category: product.categoryLabel || product.category,
        value: product.price,
        currency: "BDT",
        content_type: "product",
      });
    }
  },

  // Called when user adds item to cart
  addToCart(product: Product, quantity: number): void {
    if (!isTrackingAllowed()) return;

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "add_to_cart",
      ecommerce: {
        currency: "BDT",
        value: product.price * quantity,
        items: [
          {
            item_id: product.id,
            item_name: product.name,
            item_category: product.categoryLabel || product.category,
            price: product.price,
            quantity: quantity,
          },
        ],
      },
    });

    if (window.fbq) {
      window.fbq("track", "AddToCart", {
        content_ids: [product.id],
        content_name: product.name,
        content_category: product.categoryLabel || product.category,
        value: product.price * quantity,
        currency: "BDT",
        content_type: "product",
      });
    }
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
            item_category: product.categoryLabel || product.category,
            price: product.price,
            quantity: quantity,
          },
        ],
      },
    });
  },

  // Called when user starts checkout (enters phone/address)
  beginCheckout(cart: CartItem[], total: number): void {
    if (!isTrackingAllowed()) return;

    const items = cart.map((item) => ({
      item_id: item.product.id,
      item_name: item.product.name,
      item_category: item.product.categoryLabel || item.product.category,
      price: item.product.price,
      quantity: item.quantity,
    }));

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "begin_checkout",
      ecommerce: {
        currency: "BDT",
        value: total,
        items,
      },
    });

    if (window.fbq) {
      window.fbq("track", "InitiateCheckout", {
        content_ids: cart.map((item) => item.product.id),
        value: total,
        currency: "BDT",
        num_items: cart.reduce((sum, item) => sum + item.quantity, 0),
      });
    }
  },

  // Called when COD order is placed successfully
  purchase(order: AnalyticsOrder): void {
    if (!isTrackingAllowed()) return;

    const items = order.items.map((item) => ({
      item_name: item.name,
      price: item.unitPrice,
      quantity: item.quantity,
    }));

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "purchase",
      ecommerce: {
        transaction_id: order.orderNumber,
        value: order.total,
        currency: "BDT",
        items,
      },
    });

    if (window.fbq) {
      window.fbq("track", "Purchase", {
        value: order.total,
        currency: "BDT",
        content_name: order.items.map((i) => i.name).join(", "),
        content_type: "product",
        order_id: order.orderNumber,
      });
    }
  },

  // Called on search
  search(query: string, resultCount: number): void {
    if (!isTrackingAllowed()) return;

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "search",
      search_term: query,
      result_count: resultCount,
    });

    if (window.fbq) {
      window.fbq("track", "Search", {
        search_string: query,
      });
    }
  },
};
