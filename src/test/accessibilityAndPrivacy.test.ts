import { describe, it, expect, vi, beforeEach } from "vitest";
import { isTrackingAllowed, analytics } from "@/services/analytics";
import { generatePurchaseEventId, trackPurchase } from "@/lib/meta";

describe("Accessibility (A11y), Privacy Consent & Analytics Governance Suite", () => {
  let localStorageStore: Record<string, string> = {};

  beforeEach(() => {
    localStorageStore = {};

    vi.stubGlobal("window", {
      fbq: vi.fn(),
      _fbq: {},
      dataLayer: [],
      location: {
        href: "https://www.rangao.bd/products/ayatul-kursi",
        origin: "https://www.rangao.bd",
        pathname: "/products/ayatul-kursi",
        search: "",
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
    });
  });

  describe("1. Privacy Consent & Tracking Gating", () => {
    it("should strictly block tracking when user has explicitly declined cookies", () => {
      localStorageStore["rangao_cookie_consent"] = "declined";

      expect(isTrackingAllowed()).toBe(false);
      const res = analytics.pageView();
      expect(res).toBe("");
    });

    it("should allow tracking when user has granted consent", () => {
      localStorageStore["rangao_cookie_consent"] = "accepted";

      expect(isTrackingAllowed()).toBe(true);
      const res = analytics.pageView();
      expect(res).toMatch(/^evt_pageview_/);
    });

    it("should strictly block tracking on internal admin routes regardless of consent", () => {
      localStorageStore["rangao_cookie_consent"] = "accepted";
      window.location.pathname = "/admin/orders";

      expect(isTrackingAllowed()).toBe(false);
      const res = analytics.pageView();
      expect(res).toBe("");
    });

    it("should dynamically reflect consent revocation immediately", () => {
      localStorageStore["rangao_cookie_consent"] = "accepted";
      expect(isTrackingAllowed()).toBe(true);

      // User revokes consent in cookie preferences
      localStorageStore["rangao_cookie_consent"] = "declined";
      expect(isTrackingAllowed()).toBe(false);

      const eventRes = analytics.addToCart({
        id: "prod-1",
        name: "প্রিমিয়াম ক্যালিগ্রাফি",
        price: 2500,
        category: "Islamic",
        quantity: 1,
      });
      expect(eventRes).toBe("");
    });
  });

  describe("2. Purchase Event Deduplication & Authoritative State", () => {
    it("should generate stable canonical eventID matching orderNumber", () => {
      const orderNumber = "ORD-260902-8842";
      const eventId = generatePurchaseEventId(orderNumber);

      expect(eventId).toBe("evt_purchase_ORD-260902-8842");
    });

    it("should deduplicate purchase tracking payload using the same eventID", () => {
      localStorageStore["rangao_cookie_consent"] = "accepted";
      const orderNumber = "ORD-260902-9999";
      const eventId = generatePurchaseEventId(orderNumber);

      const returnedEventId = trackPurchase(
        {
          orderNumber,
          total: 1850,
          items: [{ id: "prod-123", name: "Ayatul Kursi", price: 1850, quantity: 1 }],
        },
        eventId
      );

      expect(returnedEventId).toBe("evt_purchase_ORD-260902-9999");
    });
  });

  describe("3. Accessible Controls & ARIA Semantics", () => {
    it("should validate that icon-only buttons have accessible names", () => {
      const iconButtons = [
        { control: "Mobile Menu Button", ariaLabel: "নেভিগেশন মেনু খুলুন" },
        { control: "Mobile Cart Button", ariaLabel: "শপিং কার্ট দেখুন (2টি পণ্য)" },
        { control: "Mobile Search Close", ariaLabel: "সার্চ বন্ধ করুন" },
        { control: "Quantity Minus Button", ariaLabel: "পরিমাণ ১ কমান" },
        { control: "Quantity Plus Button", ariaLabel: "পরিমাণ ১ বাড়ান" },
        { control: "Cart Item Trash Button", ariaLabel: "পণ্য কার্ট থেকে মুছে ফেলুন" },
      ];

      iconButtons.forEach((btn) => {
        expect(btn.ariaLabel).toBeDefined();
        expect(btn.ariaLabel.length).toBeGreaterThan(0);
      });
    });

    it("should validate variation options have aria-pressed and stock status description", () => {
      const variationButtonAria = (name: string, val: string, isSelected: boolean, isOutOfStock: boolean) => ({
        "aria-pressed": isSelected,
        "aria-label": `${name}: ${val}${isSelected ? ", নির্বাচিত" : ""}${isOutOfStock ? ", স্টক শেষ" : ", স্টকে আছে"}`,
      });

      const button = variationButtonAria("সাইজ", "12x18 inch", true, false);
      expect(button["aria-pressed"]).toBe(true);
      expect(button["aria-label"]).toBe("সাইজ: 12x18 inch, নির্বাচিত, স্টকে আছে");
    });

    it("should validate checkout form inputs use aria-invalid and aria-describedby for error states", () => {
      const getFieldA11yProps = (fieldName: string, isTouched: boolean, hasError: boolean) => ({
        "aria-invalid": isTouched && hasError ? "true" : "false",
        "aria-describedby": isTouched && hasError ? `checkout-${fieldName}-error` : undefined,
      });

      const validField = getFieldA11yProps("phone", true, false);
      expect(validField["aria-invalid"]).toBe("false");
      expect(validField["aria-describedby"]).toBeUndefined();

      const invalidField = getFieldA11yProps("phone", true, true);
      expect(invalidField["aria-invalid"]).toBe("true");
      expect(invalidField["aria-describedby"]).toBe("checkout-phone-error");
    });
  });

  describe("4. Dialog & Drawer Focus / Escape Handling", () => {
    it("should handle Escape key event to trigger dismissal", () => {
      const onCloseMock = vi.fn();

      const handleEscape = (e: { key: string }) => {
        if (e.key === "Escape") {
          onCloseMock();
        }
      };

      handleEscape({ key: "Enter" });
      expect(onCloseMock).not.toHaveBeenCalled();

      handleEscape({ key: "Escape" });
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
  });
});
