import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateEventId,
  generatePurchaseEventId,
  normalizePhone,
  normalizeEmail,
  normalizePrice,
  normalizeContentItem,
  normalizeContents,
  extractContentIds,
  isPurchaseEligible,
  sha256,
  buildHashedUserData,
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
  initMetaPixel,
  isValidMetaPixelId,
  captureAttribution,
  getAttributionContext,
  sendMetaCapiEvent,
} from "@/lib/meta";

describe("Meta Pixel + Conversions API (CAPI) Production Suite", () => {
  let localStorageStore: Record<string, string> = {};
  let sessionStorageStore: Record<string, string> = {};

  beforeEach(() => {
    localStorageStore = {};
    sessionStorageStore = {};

    // Mock window & document environment
    vi.stubGlobal("window", {
      fbq: vi.fn(),
      _fbq: {},
      dataLayer: [],
      location: {
        href: "https://www.rangao.bd/products/ayatul-kursi?fbclid=IwAR123456789&utm_source=facebook&utm_medium=cpc&utm_campaign=ramadan_sale",
        origin: "https://www.rangao.bd",
        pathname: "/products/ayatul-kursi",
        search: "?fbclid=IwAR123456789&utm_source=facebook&utm_medium=cpc&utm_campaign=ramadan_sale",
      },
    });

    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => localStorageStore[key] || null),
      setItem: vi.fn((key: string, val: string) => {
        localStorageStore[key] = val;
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageStore[key];
      }),
      clear: vi.fn(() => {
        localStorageStore = {};
      }),
    });

    vi.stubGlobal("sessionStorage", {
      getItem: vi.fn((key: string) => sessionStorageStore[key] || null),
      setItem: vi.fn((key: string, val: string) => {
        sessionStorageStore[key] = val;
      }),
      removeItem: vi.fn((key: string) => {
        delete sessionStorageStore[key];
      }),
      clear: vi.fn(() => {
        sessionStorageStore = {};
      }),
    });

    vi.stubGlobal("document", {
      title: "Rangao — Premium Wall Decor",
      referrer: "https://www.facebook.com/",
      cookie: "",
      createElement: vi.fn().mockReturnValue({}),
      getElementsByTagName: vi.fn().mockReturnValue([
        {
          parentNode: {
            insertBefore: vi.fn(),
          },
        },
      ]),
      head: {
        appendChild: vi.fn(),
      },
    });
  });

  describe("1. Event ID Generation & Deduplication Keying", () => {
    it("should generate deterministic event IDs when seed is provided", () => {
      const orderNumber = "ORD-260821-4821";
      const id1 = generatePurchaseEventId(orderNumber);
      const id2 = generatePurchaseEventId(orderNumber);

      expect(id1).toBe("evt_purchase_ORD-260821-4821");
      expect(id1).toBe(id2); // Strict equality between client and server ID
    });

    it("should generate unique timestamped IDs for non-seeded events", () => {
      const id1 = generateEventId("PageView");
      const id2 = generateEventId("PageView");

      expect(id1).toMatch(/^evt_pageview_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^evt_pageview_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe("2. Bangladesh Phone & Field Normalization", () => {
    it("should normalize Bangladeshi phone numbers into E.164 (without +)", () => {
      expect(normalizePhone("01712345678")).toBe("8801712345678");
      expect(normalizePhone("+8801712345678")).toBe("8801712345678");
      expect(normalizePhone("8801712345678")).toBe("8801712345678");
      expect(normalizePhone("017-1234-5678")).toBe("8801712345678");
      expect(normalizePhone("০১৭১২৩৪৫৬৭৮")).toBe("8801712345678");
      expect(normalizePhone("")).toBe("");
    });

    it("should normalize email addresses (lowercase, trimmed)", () => {
      expect(normalizeEmail("  Customer@Example.COM ")).toBe("customer@example.com");
      expect(normalizeEmail("")).toBe("");
    });

    it("should normalize pricing values to 2 decimals", () => {
      expect(normalizePrice(990)).toBe(990);
      expect(normalizePrice("1250.509")).toBe(1250.51);
      expect(normalizePrice(null)).toBe(0);
      expect(normalizePrice("invalid")).toBe(0);
    });
  });

  describe("3. Product & Combo Content Normalization", () => {
    it("should normalize standard and variable product items", () => {
      const item = {
        id: "prod-1",
        sku: "RNG-AYAT-01",
        name: "Ayatul Kursi 3D Canvas",
        price: 850,
        quantity: 2,
        category: "Wall Art",
      };

      const normalized = normalizeContentItem(item);
      expect(normalized.id).toBe("RNG-AYAT-01");
      expect(normalized.quantity).toBe(2);
      expect(normalized.item_price).toBe(850);
      expect(normalized.title).toBe("Ayatul Kursi 3D Canvas");
    });

    it("should normalize combo products preserving primary SKU/ID", () => {
      const comboItem = {
        id: "combo-1",
        sku: "RNG-COMBO-LIVING",
        name: "Rangao Living Room Combo Package",
        price: 2490,
        quantity: 1,
        isCombo: true,
      };

      const normalized = normalizeContentItem(comboItem);
      expect(normalized.id).toBe("RNG-COMBO-LIVING");
      expect(normalized.item_price).toBe(2490);

      const contentIds = extractContentIds([comboItem]);
      expect(contentIds).toEqual(["RNG-COMBO-LIVING"]);
    });
  });

  describe("4. SHA-256 Hashing & User Matching (Enhanced Signal Quality)", () => {
    it("should compute accurate SHA-256 hex string", async () => {
      const hash = await sha256("test@example.com");
      expect(hash).toBe("973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b");
    });

    it("should hash PII while keeping fbp, fbc, IP and UA unhashed", async () => {
      const rawUser = {
        email: "customer@rangao.bd",
        phone: "01712345678",
        fullName: "Tanvir Ahmed",
        city: "Dhaka",
        country: "bd",
        clientIp: "103.145.23.10",
        clientUserAgent: "Mozilla/5.0 TestBrowser",
        fbp: "fb.1.1724283921.123456789",
        fbc: "fb.1.1724283921.IwAR123456789",
      };

      const userData = await buildHashedUserData(rawUser);

      // Hashed parameters (arrays of hex strings)
      expect(userData.em).toBeDefined();
      expect(userData.em![0]).toMatch(/^[a-f0-9]{64}$/);
      expect(userData.ph).toBeDefined();
      expect(userData.ph![0]).toMatch(/^[a-f0-9]{64}$/);
      expect(userData.fn).toBeDefined();
      expect(userData.fn![0]).toBe(await sha256("tanvir"));
      expect(userData.ln).toBeDefined();
      expect(userData.ln![0]).toBe(await sha256("ahmed"));
      expect(userData.ct).toBeDefined();
      expect(userData.country).toBeDefined();

      // Unhashed parameters
      expect(userData.fbp).toBe("fb.1.1724283921.123456789");
      expect(userData.fbc).toBe("fb.1.1724283921.IwAR123456789");
      expect(userData.client_ip_address).toBe("103.145.23.10");
      expect(userData.client_user_agent).toBe("Mozilla/5.0 TestBrowser");
    });
  });

  describe("5. Order Purchase Eligibility & Idempotency", () => {
    it("should correctly evaluate order eligibility", () => {
      expect(isPurchaseEligible({ order_status: "pending", total_amount: 1200 })).toBe(true);
      expect(isPurchaseEligible({ order_status: "confirmed", total_amount: 990 })).toBe(true);
      expect(isPurchaseEligible({ order_status: "delivered", total_amount: 1500 })).toBe(true);
      expect(isPurchaseEligible({ order_status: "cancelled", total_amount: 1200 })).toBe(false);
      expect(isPurchaseEligible({ order_status: "refunded", total_amount: 1200 })).toBe(false);
      expect(isPurchaseEligible({ order_status: "confirmed", total_amount: 0 })).toBe(false);
    });
  });

  describe("6. Complete E-commerce Funnel Event Triggers", () => {
    it("should validate Meta Pixel ID properly", () => {
      expect(isValidMetaPixelId("98765432101234")).toBe(true);
      expect(isValidMetaPixelId("123456789012345")).toBe(false);
      expect(isValidMetaPixelId("")).toBe(false);
      expect(isValidMetaPixelId("your-pixel-id")).toBe(false);
    });

    it("should trigger PageView event", () => {
      const eventId = trackPageView("https://www.rangao.bd/products");
      expect(window.fbq).toHaveBeenCalledWith("track", "PageView", {}, { eventID: eventId });
    });

    it("should trigger ViewContent event with product catalog payload", () => {
      const eventId = trackViewContent({
        id: "prod-canvas-01",
        name: "Islamic Wall Art",
        price: 1250,
        category: "Wall Decor",
      });

      expect(window.fbq).toHaveBeenCalledWith(
        "track",
        "ViewContent",
        expect.objectContaining({
          content_ids: ["prod-canvas-01"],
          content_name: "Islamic Wall Art",
          content_type: "product",
          value: 1250,
          currency: "BDT",
        }),
        { eventID: eventId }
      );
    });

    it("should trigger AddToCart event with calculated total", () => {
      const eventId = trackAddToCart(
        {
          id: "prod-1",
          sku: "SKU-001",
          name: "Wooden Clock",
          price: 950,
        },
        3
      );

      expect(window.fbq).toHaveBeenCalledWith(
        "track",
        "AddToCart",
        expect.objectContaining({
          content_ids: ["SKU-001"],
          value: 2850, // 950 * 3
          num_items: 3,
          currency: "BDT",
        }),
        { eventID: eventId }
      );
    });

    it("should trigger InitiateCheckout event with full cart", () => {
      const items = [
        { id: "item-1", sku: "SKU-1", name: "Art 1", price: 800, quantity: 1 },
        { id: "item-2", sku: "SKU-2", name: "Art 2", price: 1200, quantity: 2 },
      ];

      const eventId = trackInitiateCheckout(items, 3200);

      expect(window.fbq).toHaveBeenCalledWith(
        "track",
        "InitiateCheckout",
        expect.objectContaining({
          content_ids: ["SKU-1", "SKU-2"],
          value: 3200,
          currency: "BDT",
          num_items: 3,
        }),
        { eventID: eventId }
      );
    });

    it("should trigger AddPaymentInfo event with chosen payment method", () => {
      const items = [{ id: "item-1", name: "Art 1", price: 800, quantity: 1 }];
      const eventId = trackAddPaymentInfo(items, 800, "Cash on Delivery");

      expect(window.fbq).toHaveBeenCalledWith(
        "track",
        "AddPaymentInfo",
        expect.objectContaining({
          content_ids: ["item-1"],
          value: 800,
          currency: "BDT",
          status: "Cash on Delivery",
        }),
        { eventID: eventId }
      );
    });

    it("should trigger Purchase event with deduplication event ID and order number", () => {
      const order = {
        orderNumber: "ORD-2026-9999",
        orderId: "uuid-order-12345",
        total: 1950,
        items: [
          { id: "p1", sku: "RNG-01", name: "Item 1", price: 950, quantity: 1 },
          { id: "p2", sku: "RNG-02", name: "Item 2", price: 1000, quantity: 1 },
        ],
        customer: {
          phone: "01712345678",
          email: "buyer@rangao.bd",
          fullName: "Customer Name",
        },
      };

      const eventId = trackPurchase(order);

      // 1. Browser Pixel deduplication check
      expect(eventId).toBe("evt_purchase_ORD-2026-9999");
      expect(window.fbq).toHaveBeenCalledWith(
        "track",
        "Purchase",
        expect.objectContaining({
          content_ids: ["RNG-01", "RNG-02"],
          value: 1950,
          currency: "BDT",
          order_id: "ORD-2026-9999",
        }),
        { eventID: "evt_purchase_ORD-2026-9999" }
      );

      // 2. Centralized dataLayer push
      expect(window.dataLayer).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            event: "purchase",
            ecommerce: expect.objectContaining({
              transaction_id: "ORD-2026-9999",
              value: 1950,
            }),
          }),
        ])
      );
    });

    it("should trigger Lead and CompleteRegistration events", () => {
      const leadEventId = trackLead({ value: 500, leadType: "Custom Order Quote" });
      expect(window.fbq).toHaveBeenCalledWith(
        "track",
        "Lead",
        expect.objectContaining({
          value: 500,
          content_name: "Custom Order Quote",
        }),
        { eventID: leadEventId }
      );

      const regEventId = trackCompleteRegistration("phone_otp");
      expect(window.fbq).toHaveBeenCalledWith(
        "track",
        "CompleteRegistration",
        expect.objectContaining({
          status: "completed",
          content_name: "phone_otp",
        }),
        { eventID: regEventId }
      );
    });

    it("should trigger Contact and Custom events", () => {
      const contactEventId = trackContact("whatsapp");
      expect(window.fbq).toHaveBeenCalledWith(
        "track",
        "Contact",
        expect.objectContaining({
          content_name: "WhatsApp Click",
        }),
        { eventID: contactEventId }
      );

      const customEventId = trackCustomEvent("CouponApplied", { code: "RAMADAN20" });
      expect(window.fbq).toHaveBeenCalledWith(
        "trackCustom",
        "CouponApplied",
        { code: "RAMADAN20" },
        { eventID: customEventId }
      );
    });
  });

  describe("7. Attribution & UTM Persistence Across Multi-Page Funnel", () => {
    it("should capture and persist fbclid, fbc, and UTMs into storage", () => {
      const attr = captureAttribution();

      expect(attr.fbclid).toBe("IwAR123456789");
      expect(attr.utm_source).toBe("facebook");
      expect(attr.utm_medium).toBe("cpc");
      expect(attr.utm_campaign).toBe("ramadan_sale");
      expect(attr.fbc).toMatch(/^fb\.1\.\d+\.IwAR123456789$/);

      // Verify persistence in localStorage
      const savedContext = JSON.parse(localStorageStore["rangao_meta_attribution"]);
      expect(savedContext.utm_campaign).toBe("ramadan_sale");
    });

    it("should retain original attribution when navigating to a URL without query params", () => {
      // Step 1: Initial landing with UTMs
      captureAttribution();

      // Step 2: Customer navigates to product page without query params
      window.location.search = "";
      window.location.href = "https://www.rangao.bd/checkout";

      const subsequentAttr = captureAttribution();
      expect(subsequentAttr.utm_source).toBe("facebook");
      expect(subsequentAttr.utm_campaign).toBe("ramadan_sale");
      expect(subsequentAttr.fbclid).toBe("IwAR123456789");
    });
  });

  describe("8. Thank-You Page 10x Refresh Idempotency Check", () => {
    it("should return the exact same deterministic event ID for repeated purchase calls", () => {
      const orderNumber = "ORD-REFRESH-TEST-100";
      const ids: string[] = [];

      for (let i = 0; i < 10; i++) {
        ids.push(generatePurchaseEventId(orderNumber));
      }

      // All 10 IDs must be strictly identical
      expect(new Set(ids).size).toBe(1);
      expect(ids[0]).toBe("evt_purchase_ORD-REFRESH-TEST-100");
    });
  });

  describe("9. CAPI Dispatcher Payload & Timestamp Verification", () => {
    it("should reject CAPI dispatch when credentials are missing", async () => {
      const result = await sendMetaCapiEvent(
        {
          event_name: "Purchase",
          event_time: Math.floor(Date.now() / 1000),
          event_id: "evt_purchase_test",
          action_source: "website",
          user_data: {},
        },
        { pixelId: "", accessToken: "" }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Missing pixelId or accessToken");
    });
  });
});
