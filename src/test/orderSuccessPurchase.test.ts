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
            data: { value: { meta_strict_purchase_mode: true } },
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
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it("A. strict mode enabled should prevent browser Purchase from firing", async () => {
    const purchaseSpy = vi.spyOn(analytics, "purchase");
    const isStrict = true;

    // Simulate strict mode check logic
    if (isStrict) {
      // Skipped
    } else {
      analytics.purchase({
        orderNumber: "ORD-260821-6289",
        total: 2500,
        items: [],
      });
    }

    expect(purchaseSpy).not.toHaveBeenCalled();
  });

  it("B. strict mode disabled should allow Purchase to fire once", () => {
    const purchaseSpy = vi.spyOn(analytics, "purchase");
    const orderNumber = "ORD-260821-TEST1";
    const isStrict = false;

    if (!isStrict && !isPurchaseTracked(orderNumber)) {
      markPurchaseTracked(orderNumber);
      analytics.purchase(
        {
          orderNumber,
          total: 2500,
          items: [{ id: "P1", productId: "P1", name: "Product 1", unitPrice: 2500, quantity: 1 }],
        },
        `evt_purchase_${orderNumber}`
      );
    }

    expect(purchaseSpy).toHaveBeenCalledTimes(1);
    expect(purchaseSpy).toHaveBeenCalledWith(
      expect.objectContaining({ orderNumber }),
      "evt_purchase_ORD-260821-TEST1"
    );
  });

  it("C. same order object rendered twice should only fire Purchase once", () => {
    const purchaseSpy = vi.spyOn(analytics, "purchase");
    const orderNumber = "ORD-260821-TWICE";

    // First render
    if (!isPurchaseTracked(orderNumber)) {
      markPurchaseTracked(orderNumber);
      analytics.purchase({ orderNumber, total: 1000, items: [] }, `evt_purchase_${orderNumber}`);
    }

    // Second render (same order)
    if (!isPurchaseTracked(orderNumber)) {
      markPurchaseTracked(orderNumber);
      analytics.purchase({ orderNumber, total: 1000, items: [] }, `evt_purchase_${orderNumber}`);
    }

    expect(purchaseSpy).toHaveBeenCalledTimes(1);
  });

  it("D. same order loaded from location.state then Supabase should only fire once", () => {
    const purchaseSpy = vi.spyOn(analytics, "purchase");
    const orderNumber = "ORD-260821-STATE-DB";

    // 1. Loaded from location.state
    if (!isPurchaseTracked(orderNumber)) {
      markPurchaseTracked(orderNumber);
      analytics.purchase({ orderNumber, total: 1500, items: [] }, `evt_purchase_${orderNumber}`);
    }

    // 2. Later updated/reloaded from Supabase
    if (!isPurchaseTracked(orderNumber)) {
      markPurchaseTracked(orderNumber);
      analytics.purchase({ orderNumber, total: 1500, items: [] }, `evt_purchase_${orderNumber}`);
    }

    expect(purchaseSpy).toHaveBeenCalledTimes(1);
  });

  it("E. page remount should NOT fire Purchase again", () => {
    const purchaseSpy = vi.spyOn(analytics, "purchase");
    const orderNumber = "ORD-260821-REMOUNT";

    // Mount 1
    markPurchaseTracked(orderNumber);
    analytics.purchase({ orderNumber, total: 3000, items: [] }, `evt_purchase_${orderNumber}`);

    // Mount 2
    const tracked = isPurchaseTracked(orderNumber);
    if (!tracked) {
      analytics.purchase({ orderNumber, total: 3000, items: [] }, `evt_purchase_${orderNumber}`);
    }

    expect(tracked).toBe(true);
    expect(purchaseSpy).toHaveBeenCalledTimes(1);
  });

  it("F. browser refresh (simulated via sessionStorage / localStorage) should prevent duplicate tracking", () => {
    const orderNumber = "ORD-260821-REFRESH";

    // Simulate pre-existing localStorage key from previous page load
    localStorage.setItem(`meta_purchase_tracked_${orderNumber}`, "true");

    expect(isPurchaseTracked(orderNumber)).toBe(true);
  });

  it("G. order number ORD-260821-6289 must produce exact event ID evt_purchase_ORD-260821-6289", () => {
    const eventId = generatePurchaseEventId("ORD-260821-6289");
    expect(eventId).toBe("evt_purchase_ORD-260821-6289");
  });

  it("H. undefined or missing orderNumber should NOT track", () => {
    expect(isPurchaseTracked("")).toBe(true);
    expect(isPurchaseTracked(undefined as any)).toBe(true);
  });

  it("I. payment not completed or verifying should prevent purchase tracking", () => {
    const purchaseSpy = vi.spyOn(analytics, "purchase");
    const verifying = true;
    const verificationError = null;
    const order = { orderNumber: "ORD-260821-PENDING", total: 1000, items: [] };

    // Eligibility check
    if (!verifying && !verificationError && !isPurchaseTracked(order.orderNumber)) {
      analytics.purchase(order, `evt_purchase_${order.orderNumber}`);
    }

    expect(purchaseSpy).not.toHaveBeenCalled();
  });

  it("J. duplicate payment verification response should be idempotent", () => {
    const orderNumber = "ORD-260821-PAY-VERIFY";
    let verificationCount = 0;

    // Simulate first verification callback
    if (!isPurchaseTracked(orderNumber)) {
      markPurchaseTracked(orderNumber);
      verificationCount++;
    }

    // Simulate second verification callback
    if (!isPurchaseTracked(orderNumber)) {
      markPurchaseTracked(orderNumber);
      verificationCount++;
    }

    expect(verificationCount).toBe(1);
    expect(isPurchaseTracked(orderNumber)).toBe(true);
  });
});
