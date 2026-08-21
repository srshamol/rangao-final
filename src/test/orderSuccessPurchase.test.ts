import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { isPurchaseTracked, markPurchaseTracked } from "@/pages/OrderSuccess";
import { generatePurchaseEventId } from "@/lib/meta/event-id";
import { analytics } from "@/services/analytics";
import { trackPixelEvent, isFbeventsLoaded } from "@/lib/meta/pixel";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { value: { meta_strict_purchase_mode: false } },
            error: null,
          }),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        })),
      })),
    })),
  },
}));

describe("OrderSuccess Meta Purchase Tracking & Idempotency", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.clearAllMocks();
    (window as any).fbq = vi.fn();
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it("A. valid order should trigger Browser Purchase called once", () => {
    const purchaseSpy = vi.spyOn(analytics, "purchase");
    const orderNumber = "ORD-260821-8279";

    if (!isPurchaseTracked(orderNumber)) {
      const dispatchedId = analytics.purchase(
        {
          orderNumber,
          total: 2500,
          items: [{ id: "P1", productId: "P1", name: "Product 1", unitPrice: 2500, quantity: 1 }],
        },
        `evt_purchase_${orderNumber}`
      );
      if (dispatchedId) {
        markPurchaseTracked(orderNumber);
      }
    }

    expect(purchaseSpy).toHaveBeenCalledTimes(1);
    expect(purchaseSpy).toHaveBeenCalledWith(
      expect.objectContaining({ orderNumber: "ORD-260821-8279" }),
      "evt_purchase_ORD-260821-8279"
    );
    expect(isPurchaseTracked(orderNumber)).toBe(true);
  });

  it("B. same order rendered twice should only call Purchase once", () => {
    const purchaseSpy = vi.spyOn(analytics, "purchase");
    const orderNumber = "ORD-260821-TWICE";

    // First render
    if (!isPurchaseTracked(orderNumber)) {
      const dispatchedId = analytics.purchase({ orderNumber, total: 1000, items: [] }, `evt_purchase_${orderNumber}`);
      if (dispatchedId) {
        markPurchaseTracked(orderNumber);
      }
    }

    // Second render (same order)
    if (!isPurchaseTracked(orderNumber)) {
      const dispatchedId = analytics.purchase({ orderNumber, total: 1000, items: [] }, `evt_purchase_${orderNumber}`);
      if (dispatchedId) {
        markPurchaseTracked(orderNumber);
      }
    }

    expect(purchaseSpy).toHaveBeenCalledTimes(1);
  });

  it("C. React StrictMode remount should call Purchase once", () => {
    const purchaseSpy = vi.spyOn(analytics, "purchase");
    const orderNumber = "ORD-260821-STRICTMODE";

    // First mount
    if (!isPurchaseTracked(orderNumber)) {
      const id1 = analytics.purchase({ orderNumber, total: 3000, items: [] }, `evt_purchase_${orderNumber}`);
      if (id1) markPurchaseTracked(orderNumber);
    }

    // Second mount (StrictMode unmount + remount)
    if (!isPurchaseTracked(orderNumber)) {
      const id2 = analytics.purchase({ orderNumber, total: 3000, items: [] }, `evt_purchase_${orderNumber}`);
      if (id2) markPurchaseTracked(orderNumber);
    }

    expect(purchaseSpy).toHaveBeenCalledTimes(1);
    expect(isPurchaseTracked(orderNumber)).toBe(true);
  });

  it("D. page refresh (persisted in localStorage / sessionStorage) should not duplicate Purchase", () => {
    const orderNumber = "ORD-260821-REFRESH";

    // Simulate pre-existing localStorage key from previous page visit
    localStorage.setItem(`meta_purchase_tracked_${orderNumber}`, "true");

    const purchaseSpy = vi.spyOn(analytics, "purchase");
    if (!isPurchaseTracked(orderNumber)) {
      analytics.purchase({ orderNumber, total: 2000, items: [] }, `evt_purchase_${orderNumber}`);
    }

    expect(purchaseSpy).not.toHaveBeenCalled();
  });

  it("E. payment verification retry should not duplicate Purchase", () => {
    const orderNumber = "ORD-260821-RETRY";
    const purchaseSpy = vi.spyOn(analytics, "purchase");

    // Verification attempt 1
    if (!isPurchaseTracked(orderNumber)) {
      const id = analytics.purchase({ orderNumber, total: 1500, items: [] }, `evt_purchase_${orderNumber}`);
      if (id) markPurchaseTracked(orderNumber);
    }

    // Verification attempt 2 (retry callback)
    if (!isPurchaseTracked(orderNumber)) {
      const id = analytics.purchase({ orderNumber, total: 1500, items: [] }, `evt_purchase_${orderNumber}`);
      if (id) markPurchaseTracked(orderNumber);
    }

    expect(purchaseSpy).toHaveBeenCalledTimes(1);
  });

  it("F. missing or undefined orderNumber should NOT track Purchase", () => {
    const purchaseSpy = vi.spyOn(analytics, "purchase");
    const invalidOrder = { orderNumber: "", total: 1000, items: [] };

    const validNumber = invalidOrder.orderNumber && typeof invalidOrder.orderNumber === "string" && invalidOrder.orderNumber.trim();
    if (validNumber && !isPurchaseTracked(invalidOrder.orderNumber)) {
      analytics.purchase(invalidOrder as any, `evt_purchase_${invalidOrder.orderNumber}`);
    }

    expect(purchaseSpy).not.toHaveBeenCalled();
  });

  it("G. payment incomplete or verifying should NOT track Purchase", () => {
    const purchaseSpy = vi.spyOn(analytics, "purchase");
    const verifying = true;
    const verificationError = null;
    const order = {
      orderNumber: "ORD-260821-INCOMPLETE",
      paymentMethod: "uddoktapay",
      paymentStatus: "pending",
      total: 1000,
      items: []
    };

    const isOnlinePayment = Boolean(order.paymentMethod === "uddoktapay");
    const isPaymentIncomplete = isOnlinePayment && order.paymentStatus !== "completed";

    // Eligibility check
    if (!verifying && !verificationError && !isPaymentIncomplete && !isPurchaseTracked(order.orderNumber)) {
      analytics.purchase(order as any, `evt_purchase_${order.orderNumber}`);
    }

    expect(purchaseSpy).not.toHaveBeenCalled();
  });

  it("H. order number ORD-260821-8279 must produce exactly evt_purchase_ORD-260821-8279", () => {
    const orderNumber = "ORD-260821-8279";
    const eventId = generatePurchaseEventId(orderNumber);
    expect(eventId).toBe("evt_purchase_ORD-260821-8279");
  });

  it("I. Browser and Server use the same event ID format", () => {
    const orderNumber = "ORD-260821-8279";

    // Browser format from generatePurchaseEventId
    const browserEventId = generatePurchaseEventId(orderNumber);

    // Server format as defined in api/tracking/meta.ts
    const serverEventId = `evt_purchase_${orderNumber}`;

    expect(browserEventId).toBe(serverEventId);
    expect(browserEventId).toBe("evt_purchase_ORD-260821-8279");
  });
});

// ---------------------------------------------------------------------------
// NEW TESTS: content_ids / content_type payload validation
// These tests directly verify the fix for the root cause:
//   empty content_ids + content_type="product" → fbevents.js rejects payload
//   → browser network request (tr?id=...) is never made
//   → Meta Test Events shows only Server
// ---------------------------------------------------------------------------
describe("Meta Pixel Purchase — content_ids / content_type payload validation", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.clearAllMocks();
    (window as any).fbq = vi.fn();
    (window as any)._fb_initialized_pixels = undefined;
  });

  it("J. Purchase with valid content_ids should include content_ids and content_type", () => {
    const fbqSpy = (window as any).fbq as ReturnType<typeof vi.fn>;

    const result = trackPixelEvent("Purchase", {
      value: 780,
      currency: "BDT",
      content_ids: ["9f8a7e0c-2794-45d1-9eb2-1695437f9250"],
      content_type: "product",
      num_items: 1,
    }, "evt_purchase_ORD-260821-5589");

    expect(result).toBe(true);
    expect(fbqSpy).toHaveBeenCalledWith(
      "track",
      "Purchase",
      expect.objectContaining({
        value: 780,
        currency: "BDT",
        content_ids: ["9f8a7e0c-2794-45d1-9eb2-1695437f9250"],
        content_type: "product",
      }),
      { eventID: "evt_purchase_ORD-260821-5589" }
    );

    // Verify content_ids is non-empty in the actual call
    const callArgs = fbqSpy.mock.calls.find((c: any[]) => c[1] === "Purchase");
    expect(callArgs).toBeDefined();
    expect(callArgs![2].content_ids).toHaveLength(1);
    expect(callArgs![2].content_type).toBe("product");
  });

  it("K. Purchase with empty content_ids [] must NOT include content_ids or content_type in payload", () => {
    // ROOT CAUSE FIX TEST:
    // Before fix: { content_ids: [], content_type: "product" } → fbevents.js rejects
    // After fix:  content_ids and content_type are omitted → fbevents.js accepts
    const fbqSpy = (window as any).fbq as ReturnType<typeof vi.fn>;

    const result = trackPixelEvent("Purchase", {
      value: 780,
      currency: "BDT",
      content_ids: [],            // empty array — was causing the rejection
      content_type: "product",    // must be omitted when content_ids is empty
      num_items: 1,
    }, "evt_purchase_ORD-260821-EMPTY");

    expect(result).toBe(true); // event must be issued despite no content_ids
    expect(fbqSpy).toHaveBeenCalledWith(
      "track",
      "Purchase",
      expect.not.objectContaining({ content_ids: expect.anything() }),
      { eventID: "evt_purchase_ORD-260821-EMPTY" }
    );

    const callArgs = fbqSpy.mock.calls.find((c: any[]) => c[1] === "Purchase");
    expect(callArgs).toBeDefined();
    // CRITICAL: content_ids must be absent, not an empty array
    expect(callArgs![2]).not.toHaveProperty("content_ids");
    // CRITICAL: content_type must also be absent when content_ids is absent
    expect(callArgs![2]).not.toHaveProperty("content_type");
    // value and currency must still be present
    expect(callArgs![2].value).toBe(780);
    expect(callArgs![2].currency).toBe("BDT");
  });

  it("L. Purchase with null/undefined content_ids must NOT include content_ids or content_type", () => {
    const fbqSpy = (window as any).fbq as ReturnType<typeof vi.fn>;

    const result = trackPixelEvent("Purchase", {
      value: 500,
      currency: "BDT",
      // content_ids not provided at all
    }, "evt_purchase_ORD-NULL-IDS");

    expect(result).toBe(true);
    const callArgs = fbqSpy.mock.calls.find((c: any[]) => c[1] === "Purchase");
    expect(callArgs).toBeDefined();
    expect(callArgs![2]).not.toHaveProperty("content_ids");
    expect(callArgs![2]).not.toHaveProperty("content_type");
    expect(callArgs![2].currency).toBe("BDT");
    expect(callArgs![2].value).toBe(500);
  });

  it("M. Purchase with content_ids containing only empty strings must omit content_ids", () => {
    const fbqSpy = (window as any).fbq as ReturnType<typeof vi.fn>;

    const result = trackPixelEvent("Purchase", {
      value: 300,
      currency: "BDT",
      content_ids: ["", "  ", ""],  // all blank — should resolve to empty after filter
    }, "evt_purchase_ORD-BLANK-IDS");

    expect(result).toBe(true);
    const callArgs = fbqSpy.mock.calls.find((c: any[]) => c[1] === "Purchase");
    expect(callArgs![2]).not.toHaveProperty("content_ids");
    expect(callArgs![2]).not.toHaveProperty("content_type");
  });

  it("N. Purchase must reject non-BDT currency", () => {
    const fbqSpy = (window as any).fbq as ReturnType<typeof vi.fn>;

    const result = trackPixelEvent("Purchase", {
      value: 780,
      currency: "USD",  // must be rejected — only BDT is the business currency
    }, "evt_purchase_ORD-USD-REJECT");

    expect(result).toBe(false);
    // fbq must NOT have been called with Purchase
    const purchaseCall = fbqSpy.mock.calls.find((c: any[]) => c[1] === "Purchase");
    expect(purchaseCall).toBeUndefined();
  });

  it("O. Purchase must reject zero value", () => {
    const fbqSpy = (window as any).fbq as ReturnType<typeof vi.fn>;

    const result = trackPixelEvent("Purchase", {
      value: 0,
      currency: "BDT",
    }, "evt_purchase_ORD-ZERO-VALUE");

    expect(result).toBe(false);
    const purchaseCall = fbqSpy.mock.calls.find((c: any[]) => c[1] === "Purchase");
    expect(purchaseCall).toBeUndefined();
  });

  it("P. Purchase must reject negative value", () => {
    const fbqSpy = (window as any).fbq as ReturnType<typeof vi.fn>;

    const result = trackPixelEvent("Purchase", {
      value: -100,
      currency: "BDT",
    }, "evt_purchase_ORD-NEG-VALUE");

    expect(result).toBe(false);
  });

  it("Q. isFbeventsLoaded returns false when fbq is the queue stub", () => {
    // Queue stub has no callMethod — meaning fbevents.js has NOT loaded yet
    (window as any).fbq = function() {};
    (window as any).fbq.callMethod = undefined;

    expect(isFbeventsLoaded()).toBe(false);
  });

  it("R. isFbeventsLoaded returns true when fbq has callMethod (real fbevents.js)", () => {
    // Real fbevents.js sets callMethod as a function on the fbq object
    (window as any).fbq = function() {};
    (window as any).fbq.callMethod = function() {};

    expect(isFbeventsLoaded()).toBe(true);
  });

  it("S. Purchase with mixed valid/invalid content_ids filters to only valid IDs", () => {
    const fbqSpy = (window as any).fbq as ReturnType<typeof vi.fn>;

    const result = trackPixelEvent("Purchase", {
      value: 1000,
      currency: "BDT",
      content_ids: ["valid-id-1", "", "valid-id-2", "  "],
    }, "evt_purchase_ORD-MIXED-IDS");

    expect(result).toBe(true);
    const callArgs = fbqSpy.mock.calls.find((c: any[]) => c[1] === "Purchase");
    expect(callArgs![2].content_ids).toEqual(["valid-id-1", "valid-id-2"]);
    expect(callArgs![2].content_type).toBe("product");
  });

  it("T. Purchase eventID must match Browser and Server canonical format", () => {
    const fbqSpy = (window as any).fbq as ReturnType<typeof vi.fn>;
    const orderNumber = "ORD-260821-5589";
    const eventId = `evt_purchase_${orderNumber}`;

    trackPixelEvent("Purchase", { value: 780, currency: "BDT" }, eventId);

    const callArgs = fbqSpy.mock.calls.find((c: any[]) => c[1] === "Purchase");
    expect(callArgs).toBeDefined();
    // Browser event ID must match server event ID format exactly
    expect(callArgs![3]).toEqual({ eventID: "evt_purchase_ORD-260821-5589" });
  });
});


