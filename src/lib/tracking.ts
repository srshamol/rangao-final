// Unified Tracking System for GadgetGram
// Coordinates Meta Pixel, GTM, GA4, TikTok Pixel, and Google Tag Manager DataLayer

declare global {
  interface Window {
    fbq: (...args: any[]) => void;
    _fbq: any;
    ttq: any;
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

interface TrackingConfig {
  global_enabled: boolean;
  environment: string;
  meta_pixel_enabled: boolean;
  meta_pixel_id: string;
  meta_capi_enabled: boolean;
  meta_strict_purchase_mode: boolean;
  meta_debug_mode: boolean;
  gtm_enabled: boolean;
  gtm_id: string;
  ga4_enabled: boolean;
  ga4_id: string;
  google_debug_mode: boolean;
  tiktok_enabled: boolean;
  tiktok_pixel_id: string;
  tiktok_debug_mode: boolean;
}

export function isValidTrackingId(type: 'meta' | 'gtm' | 'ga4' | 'tiktok', value: string | undefined | null): boolean {
  if (!value) return false;
  const val = value.trim();
  if (!val) return false;
  
  const lowerVal = val.toLowerCase();
  if (
    lowerVal.includes("your") || 
    lowerVal.includes("placeholder") || 
    lowerVal.includes("xxxx") || 
    lowerVal.includes("test") || 
    lowerVal.includes("mock")
  ) {
    return false;
  }

  switch (type) {
    case 'meta':
      return /^\d+$/.test(val) && val !== '123456789012345';
    case 'gtm':
      return /^GTM-[A-Z0-9]+$/i.test(val) && !/^GTM-X+$/i.test(val);
    case 'ga4':
      return /^G-[A-Z0-9]+$/i.test(val) && !/^G-X+$/i.test(val);
    case 'tiktok':
      return /^[A-Z0-9]+$/i.test(val) && !/^C?X+$/i.test(val);
    default:
      return true;
  }
}

let activeConfig: TrackingConfig | null = null;
const loadedScripts = new Set<string>();

export function updateTrackingConfig(config: TrackingConfig) {
  activeConfig = config;
  if (config.meta_debug_mode || config.google_debug_mode || config.tiktok_debug_mode) {
    console.log("[Tracking] Config loaded/updated:", config);
  }
  initializeScripts();
}

function debugLog(platform: 'meta' | 'google' | 'tiktok' | 'general', message: string, ...args: any[]) {
  if (!activeConfig) return;
  const isDebug =
    (platform === 'meta' && activeConfig.meta_debug_mode) ||
    (platform === 'google' && activeConfig.google_debug_mode) ||
    (platform === 'tiktok' && activeConfig.tiktok_debug_mode) ||
    activeConfig.meta_debug_mode || activeConfig.google_debug_mode || activeConfig.tiktok_debug_mode;

  if (isDebug) {
    console.log(`%c[Tracking - ${platform.toUpperCase()}] ${message}`, 'background: #222; color: #bada55; font-weight: bold;', ...args);
  }
}

// 1. Dynamic Script Initialization
export function initializeScripts() {
  if (!activeConfig || !activeConfig.global_enabled) {
    debugLog('general', "Tracking globally disabled.");
    return;
  }

  // --- META PIXEL ---
  if (activeConfig.meta_pixel_enabled && isValidTrackingId('meta', activeConfig.meta_pixel_id)) {
    const pixelId = activeConfig.meta_pixel_id.trim();
    if (!loadedScripts.has(`meta-${pixelId}`)) {
      debugLog('meta', `Initializing Meta Pixel: ${pixelId}`);
      (function(f: any, b: Document, e: string, v: string, n: any, t?: any, s?: any) {
        if (f.fbq) return;
        n = f.fbq = function() {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n;
        n.push = n;
        n.loaded = !0;
        n.version = '2.0';
        n.queue = [];
        t = b.createElement(e);
        t.async = !0;
        t.src = v;
        s = b.getElementsByTagName(e)[0];
        s?.parentNode?.insertBefore(t, s);
      })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

      window.fbq('init', pixelId);
      loadedScripts.add(`meta-${pixelId}`);
    }
  }

  // --- GOOGLE ANALYTICS 4 ---
  if (activeConfig.ga4_enabled && isValidTrackingId('ga4', activeConfig.ga4_id)) {
    const gaId = activeConfig.ga4_id.trim();
    if (!loadedScripts.has(`ga4-${gaId}`)) {
      debugLog('google', `Initializing GA4: ${gaId}`);
      
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
      document.head.appendChild(script);

      window.dataLayer = window.dataLayer || [];
      window.gtag = function() {
        window.dataLayer.push(arguments);
      };
      window.gtag('js', new Date());
      window.gtag('config', gaId, {
        debug_mode: activeConfig.google_debug_mode,
      });

      loadedScripts.add(`ga4-${gaId}`);
    }
  }

  // --- GOOGLE TAG MANAGER ---
  if (activeConfig.gtm_enabled && isValidTrackingId('gtm', activeConfig.gtm_id)) {
    const gtmId = activeConfig.gtm_id.trim();
    if (!loadedScripts.has(`gtm-${gtmId}`)) {
      debugLog('google', `Initializing Google Tag Manager: ${gtmId}`);
      
      window.dataLayer = window.dataLayer || [];
      (function(w: any, d: Document, s: string, l: string, i: string) {
        w[l] = w[l] || [];
        w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
        var f = d.getElementsByTagName(s)[0],
          j = d.createElement(s) as any,
          dl = l != 'dataLayer' ? '&l=' + l : '';
        j.async = true;
        j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl;
        f?.parentNode?.insertBefore(j, f);
      })(window, document, 'script', 'dataLayer', gtmId);

      loadedScripts.add(`gtm-${gtmId}`);
    }
  }

  // --- TIKTOK PIXEL ---
  if (activeConfig.tiktok_enabled && isValidTrackingId('tiktok', activeConfig.tiktok_pixel_id)) {
    const ttId = activeConfig.tiktok_pixel_id.trim();
    if (!loadedScripts.has(`tiktok-${ttId}`)) {
      debugLog('tiktok', `Initializing TikTok Pixel: ${ttId}`);

      (function(w: any, d: Document, t: string) {
        w.TiktokAnalyticsObject = t;
        var ttq = (w[t] = w[t] || []);
        ttq.methods = [
          "page", "track", "identify", "instances", "debug", "on", "off",
          "once", "ready", "alias", "group", "enableCookie", "disableCookie",
          "holdConsent", "revokeConsent", "grantConsent"
        ];
        ttq.setAndDefer = function(t: any, e: any) {
          t[e] = function() {
            t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
          };
        };
        for (var i = 0; i < ttq.methods.length; i++) {
          ttq.setAndDefer(ttq, ttq.methods[i]);
        }
        ttq.instance = function(t: any) {
          for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) {
            ttq.setAndDefer(e, ttq.methods[n]);
          }
          return e;
        };
        ttq.load = function(e: any, n: any) {
          var r = "https://analytics.tiktok.com/i18n/pixel/events.js";
          ttq._i = ttq._i || {};
          ttq._i[e] = [];
          ttq._i[e]._u = r;
          ttq._t = ttq._t || {};
          ttq._t[e] = +new Date();
          ttq._o = ttq._o || {};
          ttq._o[e] = n || {};
          var o = d.createElement("script") as any;
          o.type = "text/javascript";
          o.async = !0;
          o.src = r + "?sdkid=" + e + "&lib=" + t;
          var i = d.getElementsByTagName("script")[0];
          i?.parentNode?.insertBefore(o, i);
        };
        ttq.load(ttId);
      })(window, document, 'ttq');

      loadedScripts.add(`tiktok-${ttId}`);
    }
  }
}

// 2. Standard Events Implementation

// PageView Event
export function trackPageView(url?: string) {
  if (!activeConfig || !activeConfig.global_enabled) return;
  debugLog('general', `PageView event at ${url || window.location.pathname}`);

  // Meta Pixel
  if (activeConfig.meta_pixel_enabled && window.fbq) {
    window.fbq('track', 'PageView');
  }

  // TikTok Pixel
  if (activeConfig.tiktok_enabled && window.ttq) {
    window.ttq.page();
  }

  // GTM dataLayer
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'virtual_page_view',
    page_path: url || window.location.pathname,
    page_title: document.title
  });
}

interface ProductType {
  id: string;
  name: string;
  category: string;
  price: number;
}

// ViewContent Event
export function trackViewContent(product: ProductType) {
  if (!activeConfig || !activeConfig.global_enabled) return;
  debugLog('general', "ViewContent event triggered:", product);

  // Meta Pixel
  if (activeConfig.meta_pixel_enabled && window.fbq) {
    window.fbq('track', 'ViewContent', {
      content_ids: [product.id],
      content_name: product.name,
      content_category: product.category,
      value: product.price,
      currency: "BDT",
      content_type: "product"
    });
  }

  // GA4
  if (activeConfig.ga4_enabled && window.gtag) {
    window.gtag('event', 'view_item', {
      currency: "BDT",
      value: product.price,
      items: [{
        item_id: product.id,
        item_name: product.name,
        item_category: product.category,
        price: product.price,
        quantity: 1
      }]
    });
  }

  // TikTok Pixel
  if (activeConfig.tiktok_enabled && window.ttq) {
    window.ttq.track('ViewContent', {
      contents: [{
        content_id: product.id,
        content_name: product.name,
        content_type: "product",
        quantity: 1,
        price: product.price
      }],
      value: product.price,
      currency: "BDT"
    });
  }

  // GTM dataLayer
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'view_item',
    ecommerce: {
      currency: "BDT",
      value: product.price,
      items: [{
        item_id: product.id,
        item_name: product.name,
        item_category: product.category,
        price: product.price,
        quantity: 1
      }]
    }
  });
}

// Search Event
export function trackSearch(query: string) {
  if (!activeConfig || !activeConfig.global_enabled) return;
  debugLog('general', "Search event triggered:", query);

  // Meta Pixel
  if (activeConfig.meta_pixel_enabled && window.fbq) {
    window.fbq('track', 'Search', {
      search_string: query
    });
  }

  // GA4
  if (activeConfig.ga4_enabled && window.gtag) {
    window.gtag('event', 'search', {
      search_term: query
    });
  }

  // TikTok Pixel
  if (activeConfig.tiktok_enabled && window.ttq) {
    window.ttq.track('Search', {
      query: query
    });
  }

  // GTM dataLayer
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'search',
    search_term: query
  });
}

// AddToCart Event
export function trackAddToCart(product: ProductType, quantity: number = 1) {
  if (!activeConfig || !activeConfig.global_enabled) return;
  debugLog('general', "AddToCart event triggered:", product, "Qty:", quantity);

  // Meta Pixel
  if (activeConfig.meta_pixel_enabled && window.fbq) {
    window.fbq('track', 'AddToCart', {
      content_ids: [product.id],
      content_name: product.name,
      content_category: product.category,
      value: product.price * quantity,
      currency: "BDT",
      content_type: "product"
    });
  }

  // GA4
  if (activeConfig.ga4_enabled && window.gtag) {
    window.gtag('event', 'add_to_cart', {
      currency: "BDT",
      value: product.price * quantity,
      items: [{
        item_id: product.id,
        item_name: product.name,
        item_category: product.category,
        price: product.price,
        quantity: quantity
      }]
    });
  }

  // TikTok Pixel
  if (activeConfig.tiktok_enabled && window.ttq) {
    window.ttq.track('AddToCart', {
      contents: [{
        content_id: product.id,
        content_name: product.name,
        content_type: "product",
        quantity: quantity,
        price: product.price
      }],
      value: product.price * quantity,
      currency: "BDT"
    });
  }

  // GTM dataLayer
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'add_to_cart',
    ecommerce: {
      currency: "BDT",
      value: product.price * quantity,
      items: [{
        item_id: product.id,
        item_name: product.name,
        item_category: product.category,
        price: product.price,
        quantity: quantity
      }]
    }
  });
}

interface CartItemType {
  id: string;
  name: string;
  category?: string;
  price: number;
  quantity: number;
}

// InitiateCheckout Event
export function trackInitiateCheckout(items: CartItemType[], total: number) {
  if (!activeConfig || !activeConfig.global_enabled) return;
  debugLog('general', "InitiateCheckout event triggered. Items count:", items.length, "Total:", total);

  const contentIds = items.map(i => i.id);

  // Meta Pixel
  if (activeConfig.meta_pixel_enabled && window.fbq) {
    window.fbq('track', 'InitiateCheckout', {
      content_ids: contentIds,
      value: total,
      currency: "BDT",
      num_items: items.reduce((sum, i) => sum + i.quantity, 0)
    });
  }

  // GA4
  if (activeConfig.ga4_enabled && window.gtag) {
    window.gtag('event', 'begin_checkout', {
      currency: "BDT",
      value: total,
      items: items.map(item => ({
        item_id: item.id,
        item_name: item.name,
        item_category: item.category || "Uncategorized",
        price: item.price,
        quantity: item.quantity
      }))
    });
  }

  // TikTok Pixel
  if (activeConfig.tiktok_enabled && window.ttq) {
    window.ttq.track('InitiateCheckout', {
      contents: items.map(item => ({
        content_id: item.id,
        content_name: item.name,
        content_type: "product",
        quantity: item.quantity,
        price: item.price
      })),
      value: total,
      currency: "BDT"
    });
  }

  // GTM dataLayer
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'begin_checkout',
    ecommerce: {
      currency: "BDT",
      value: total,
      items: items.map(item => ({
        item_id: item.id,
        item_name: item.name,
        item_category: item.category || "Uncategorized",
        price: item.price,
        quantity: item.quantity
      }))
    }
  });
}

// AddPaymentInfo Event
export function trackAddPaymentInfo(items: CartItemType[], total: number) {
  if (!activeConfig || !activeConfig.global_enabled) return;
  debugLog('general', "AddPaymentInfo event triggered. Total:", total);

  const contentIds = items.map(i => i.id);

  // Meta Pixel
  if (activeConfig.meta_pixel_enabled && window.fbq) {
    window.fbq('track', 'AddPaymentInfo', {
      content_ids: contentIds,
      value: total,
      currency: "BDT"
    });
  }

  // GA4
  if (activeConfig.ga4_enabled && window.gtag) {
    window.gtag('event', 'add_payment_info', {
      currency: "BDT",
      value: total,
      items: items.map(item => ({
        item_id: item.id,
        item_name: item.name,
        item_category: item.category || "Uncategorized",
        price: item.price,
        quantity: item.quantity
      }))
    });
  }

  // TikTok Pixel
  if (activeConfig.tiktok_enabled && window.ttq) {
    window.ttq.track('AddPaymentInfo', {
      contents: items.map(item => ({
        content_id: item.id,
        content_name: item.name,
        content_type: "product",
        quantity: item.quantity,
        price: item.price
      })),
      value: total,
      currency: "BDT"
    });
  }

  // GTM dataLayer
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'add_payment_info',
    ecommerce: {
      currency: "BDT",
      value: total,
      items: items.map(item => ({
        item_id: item.id,
        item_name: item.name,
        item_category: item.category || "Uncategorized",
        price: item.price,
        quantity: item.quantity
      }))
    }
  });
}

// Purchase Event
export function trackPurchase(
  orderId: string,
  items: CartItemType[],
  total: number
) {
  if (!activeConfig || !activeConfig.global_enabled) return;
  debugLog('general', "Purchase event triggered. Order:", orderId, "Total:", total);

  const contentIds = items.map(i => i.id);

  // Meta Pixel with Deduplication Event ID
  if (activeConfig.meta_pixel_enabled && window.fbq) {
    window.fbq('track', 'Purchase', {
      value: total,
      currency: "BDT",
      content_ids: contentIds,
      content_type: "product",
      order_id: orderId,
    }, {
      eventID: orderId, // Used for CAPI and Pixel deduplication
    });
  }

  // GA4
  if (activeConfig.ga4_enabled && window.gtag) {
    window.gtag('event', 'purchase', {
      transaction_id: orderId,
      value: total,
      currency: "BDT",
      items: items.map(item => ({
        item_id: item.id,
        item_name: item.name,
        item_category: item.category || "Uncategorized",
        price: item.price,
        quantity: item.quantity
      }))
    });
  }

  // TikTok Pixel
  if (activeConfig.tiktok_enabled && window.ttq) {
    window.ttq.track('CompletePayment', {
      contents: items.map(item => ({
        content_id: item.id,
        content_name: item.name,
        content_type: "product",
        quantity: item.quantity,
        price: item.price
      })),
      value: total,
      currency: "BDT"
    });
  }

  // GTM dataLayer
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'purchase',
    ecommerce: {
      transaction_id: orderId,
      value: total,
      currency: "BDT",
      items: items.map(item => ({
        item_id: item.id,
        item_name: item.name,
        item_category: item.category || "Uncategorized",
        price: item.price,
        quantity: item.quantity
      }))
    }
  });
}

// Lead Event
export function trackLead(data: { value?: number; currency?: string; lead_type?: string } = {}) {
  if (!activeConfig || !activeConfig.global_enabled) return;
  debugLog('general', "Lead event triggered:", data);

  // Meta Pixel
  if (activeConfig.meta_pixel_enabled && window.fbq) {
    window.fbq('track', 'Lead', {
      value: data.value || 0,
      currency: data.currency || "BDT"
    });
  }

  // GA4
  if (activeConfig.ga4_enabled && window.gtag) {
    window.gtag('event', 'generate_lead', {
      value: data.value || 0,
      currency: data.currency || "BDT"
    });
  }

  // TikTok Pixel
  if (activeConfig.tiktok_enabled && window.ttq) {
    window.ttq.track('SubmitForm', {
      value: data.value || 0,
      currency: data.currency || "BDT"
    });
  }

  // GTM dataLayer
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'lead',
    value: data.value || 0,
    currency: data.currency || "BDT"
  });
}

