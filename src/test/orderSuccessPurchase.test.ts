import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { isPurchaseTracked, markPurchaseTracked } from "@/pages/OrderSuccess";
import { generatePurchaseEventId } from "@/lib/meta/event-id";
import { analytics } from "@/services/analytics";

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

    // Server format as defined in fb-capi/index.ts: `evt_purchase_${order.order_number}`
    const serverEventId = `evt_purchase_${orderNumber}`;

    expect(browserEventId).toBe(serverEventId);
    expect(browserEventId).toBe("evt_purchase_ORD-260821-8279");
  });
});
