import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateTrackingConfig, trackPageView, trackViewContent, trackAddToCart, trackInitiateCheckout, trackPurchase, isValidTrackingId } from "@/lib/tracking";
import { initFBPixel, trackPageView as legacyTrackPageView, trackAddToCart as legacyTrackAddToCart, trackInitiateCheckout as legacyTrackInitiateCheckout, trackPurchase as legacyTrackPurchase, trackViewContent as legacyTrackViewContent } from "@/lib/fbpixel";

describe("Meta Pixel Tracking Validation", () => {
  beforeEach(() => {
    // Reset global window objects
    vi.stubGlobal("window", {
      fbq: vi.fn(),
      _fbq: {},
      dataLayer: [],
      location: {
        pathname: "/test-path",
      },
    });
    vi.stubGlobal("document", {
      title: "Test Title",
      createElement: vi.fn().mockReturnValue({}),
      getElementsByTagName: vi.fn().mockReturnValue([{
        parentNode: {
          insertBefore: vi.fn(),
        },
      }]),
      head: {
        appendChild: vi.fn(),
      },
    });
  });

  describe("isValidTrackingId", () => {
    it("should validate Meta Pixel IDs properly", () => {
      expect(isValidTrackingId("meta", "123456789")).toBe(true);
      expect(isValidTrackingId("meta", "123456789012345")).toBe(false); // placeholder check
      expect(isValidTrackingId("meta", "your-pixel-id")).toBe(false);
      expect(isValidTrackingId("meta", "")).toBe(false);
      expect(isValidTrackingId("meta", "abc12345")).toBe(false); // Meta IDs must be numeric
    });
  });

  describe("Unified Tracking Engine (tracking.ts)", () => {
    it("should initialize Meta Pixel script when configuration is enabled and valid", () => {
      const config = {
        global_enabled: true,
        environment: "production",
        meta_pixel_enabled: true,
        meta_pixel_id: "98765432101234",
        meta_capi_enabled: false,
        meta_strict_purchase_mode: true,
        meta_debug_mode: false,
        gtm_enabled: false,
        gtm_id: "",
        ga4_enabled: false,
        ga4_id: "",
        google_debug_mode: false,
        tiktok_enabled: false,
        tiktok_pixel_id: "",
        tiktok_debug_mode: false,
      };

      updateTrackingConfig(config);

      // Verify window.fbq was initialized and called with 'init'
      expect(window.fbq).toHaveBeenCalledWith("init", "98765432101234");
    });

    it("should trigger PageView event properly", () => {
      const config = {
        global_enabled: true,
        environment: "production",
        meta_pixel_enabled: true,
        meta_pixel_id: "98765432101234",
        meta_capi_enabled: false,
        meta_strict_purchase_mode: true,
        meta_debug_mode: false,
        gtm_enabled: false,
        gtm_id: "",
        ga4_enabled: false,
        ga4_id: "",
        google_debug_mode: false,
        tiktok_enabled: false,
        tiktok_pixel_id: "",
        tiktok_debug_mode: false,
      };

      updateTrackingConfig(config);
      trackPageView("/target-page");

      expect(window.fbq).toHaveBeenCalledWith("track", "PageView");
    });

    it("should trigger ViewContent event properly", () => {
      const config = {
        global_enabled: true,
        environment: "production",
        meta_pixel_enabled: true,
        meta_pixel_id: "98765432101234",
        meta_capi_enabled: false,
        meta_strict_purchase_mode: true,
        meta_debug_mode: false,
        gtm_enabled: false,
        gtm_id: "",
        ga4_enabled: false,
        ga4_id: "",
        google_debug_mode: false,
        tiktok_enabled: false,
        tiktok_pixel_id: "",
        tiktok_debug_mode: false,
      };

      updateTrackingConfig(config);
      trackViewContent({
        id: "prod-1",
        name: "Test Product",
        category: "Clothing",
        price: 1500,
      });

      expect(window.fbq).toHaveBeenCalledWith("track", "ViewContent", {
        content_ids: ["prod-1"],
        content_name: "Test Product",
        content_category: "Clothing",
        value: 1500,
        currency: "BDT",
        content_type: "product",
      });
    });

    it("should trigger AddToCart event properly", () => {
      const config = {
        global_enabled: true,
        environment: "production",
        meta_pixel_enabled: true,
        meta_pixel_id: "98765432101234",
        meta_capi_enabled: false,
        meta_strict_purchase_mode: true,
        meta_debug_mode: false,
        gtm_enabled: false,
        gtm_id: "",
        ga4_enabled: false,
        ga4_id: "",
        google_debug_mode: false,
        tiktok_enabled: false,
        tiktok_pixel_id: "",
        tiktok_debug_mode: false,
      };

      updateTrackingConfig(config);
      trackAddToCart({
        id: "prod-1",
        name: "Test Product",
        category: "Clothing",
        price: 1500,
      }, 2);

      expect(window.fbq).toHaveBeenCalledWith("track", "AddToCart", {
        content_ids: ["prod-1"],
        content_name: "Test Product",
        content_category: "Clothing",
        value: 3000,
        currency: "BDT",
        content_type: "product",
      });
    });

    it("should trigger Purchase event properly with Event ID deduplication", () => {
      const config = {
        global_enabled: true,
        environment: "production",
        meta_pixel_enabled: true,
        meta_pixel_id: "98765432101234",
        meta_capi_enabled: false,
        meta_strict_purchase_mode: true,
        meta_debug_mode: false,
        gtm_enabled: false,
        gtm_id: "",
        ga4_enabled: false,
        ga4_id: "",
        google_debug_mode: false,
        tiktok_enabled: false,
        tiktok_pixel_id: "",
        tiktok_debug_mode: false,
      };

      updateTrackingConfig(config);
      trackPurchase("order-12345", [
        { id: "prod-1", name: "Test Product", category: "Clothing", price: 1500, quantity: 2 }
      ], 3000);

      expect(window.fbq).toHaveBeenCalledWith("track", "Purchase", {
        value: 3000,
        currency: "BDT",
        content_ids: ["prod-1"],
        content_type: "product",
        order_id: "order-12345",
      }, {
        eventID: "order-12345",
      });
    });
  });

  describe("Legacy Facebook Pixel Utility (fbpixel.ts)", () => {
    it("should initialize legacy pixel and track standard events", () => {
      initFBPixel("98765432101234");
      expect(window.fbq).toHaveBeenCalledWith("init", "98765432101234");
      expect(window.fbq).toHaveBeenCalledWith("track", "PageView");

      legacyTrackPageView();
      expect(window.fbq).toHaveBeenCalledWith("track", "PageView");

      legacyTrackAddToCart({
        id: "prod-1",
        name: "Test Product",
        category: "Clothing",
        price: 1500,
      });
      expect(window.fbq).toHaveBeenCalledWith("track", "AddToCart", {
        content_ids: ["prod-1"],
        content_name: "Test Product",
        content_category: "Clothing",
        value: 1500,
        currency: "BDT",
      });

      legacyTrackPurchase("order-12345", [{ id: "prod-1" }], 1500);
      expect(window.fbq).toHaveBeenCalledWith("track", "Purchase", {
        value: 1500,
        currency: "BDT",
        content_ids: ["prod-1"],
        content_type: "product",
        order_id: "order-12345",
      }, {
        eventID: "order-12345",
      });
    });
  });

  describe("TikTok Pixel (tracking.ts)", () => {
    beforeEach(() => {
      // Mock ttq
      const ttqMock: any = vi.fn();
      ttqMock.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie", "holdConsent", "revokeConsent", "grantConsent"];
      ttqMock.load = vi.fn();
      ttqMock.page = vi.fn();
      ttqMock.track = vi.fn();
      vi.stubGlobal("window", {
        ...window,
        ttq: ttqMock,
      });
    });

    it("should validate TikTok Pixel IDs properly", () => {
      expect(isValidTrackingId("tiktok", "CQ1234567890")).toBe(true);
      expect(isValidTrackingId("tiktok", "your-tiktok-id")).toBe(false);
      expect(isValidTrackingId("tiktok", "")).toBe(false);
    });

    it("should trigger TikTok Pixel events correctly", () => {
      const config = {
        global_enabled: true,
        environment: "production",
        meta_pixel_enabled: false,
        meta_pixel_id: "",
        meta_capi_enabled: false,
        meta_strict_purchase_mode: false,
        meta_debug_mode: false,
        gtm_enabled: false,
        gtm_id: "",
        ga4_enabled: false,
        ga4_id: "",
        google_debug_mode: false,
        tiktok_enabled: true,
        tiktok_pixel_id: "TT987654",
        tiktok_debug_mode: false,
      };

      updateTrackingConfig(config);

      // 1. PageView
      trackPageView("/test-route");
      expect(window.ttq.page).toHaveBeenCalled();

      // 2. ViewContent
      trackViewContent({
        id: "prod-1",
        name: "TikTok Item",
        category: "Gadgets",
        price: 2500,
      });
      expect(window.ttq.track).toHaveBeenCalledWith("ViewContent", {
        contents: [{
          content_id: "prod-1",
          content_name: "TikTok Item",
          content_type: "product",
          quantity: 1,
          price: 2500,
        }],
        value: 2500,
        currency: "BDT",
      });

      // 3. AddToCart
      trackAddToCart({
        id: "prod-1",
        name: "TikTok Item",
        category: "Gadgets",
        price: 2500,
      }, 3);
      expect(window.ttq.track).toHaveBeenCalledWith("AddToCart", {
        contents: [{
          content_id: "prod-1",
          content_name: "TikTok Item",
          content_type: "product",
          quantity: 3,
          price: 2500,
        }],
        value: 7500,
        currency: "BDT",
      });

      // 4. Purchase (CompletePayment)
      trackPurchase("order-tt-1", [
        { id: "prod-1", name: "TikTok Item", category: "Gadgets", price: 2500, quantity: 3 }
      ], 7500);
      expect(window.ttq.track).toHaveBeenCalledWith("CompletePayment", {
        contents: [{
          content_id: "prod-1",
          content_name: "TikTok Item",
          content_type: "product",
          quantity: 3,
          price: 2500,
        }],
        value: 7500,
        currency: "BDT",
      }, {
        event_id: "order-tt-1",
      });
    });
  });
});
