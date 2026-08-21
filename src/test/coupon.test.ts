import { describe, it, expect } from "vitest";

// Extracted coupon verification and calculation logic to test it in isolation
interface Coupon {
  code: string;
  discount_type: "percentage" | "flat" | "free_delivery";
  discount_value: number;
  max_discount: number | null;
  min_order: number | null;
  usage_limit: number | null;
  used_count: number | null;
  valid_from: string | null;
  valid_to: string | null;
  is_active: boolean | null;
}

function calculateDiscount(
  appliedCoupon: Coupon | null,
  subtotal: number,
  deliveryCharge: number
): { discountAmount: number; error?: string } {
  if (!appliedCoupon) {
    return { discountAmount: 0 };
  }

  if (appliedCoupon.is_active === false) {
    return { discountAmount: 0, error: "এই কুপনটি সঠিক নয় বা বর্তমানে সক্রিয় নেই" };
  }

  // Check dates
  const now = new Date();
  if (appliedCoupon.valid_from && new Date(appliedCoupon.valid_from) > now) {
    return { discountAmount: 0, error: "এই কুপনটি ব্যবহারের সময় এখনও শুরু হয়নি" };
  }
  if (appliedCoupon.valid_to && new Date(appliedCoupon.valid_to) < now) {
    return { discountAmount: 0, error: "এই কুপনটির মেয়াদ শেষ হয়ে গেছে" };
  }

  // Check min order
  if (appliedCoupon.min_order && subtotal < Number(appliedCoupon.min_order)) {
    return {
      discountAmount: 0,
      error: `এই কুপনটি ব্যবহার করতে ন্যূনতম ৳${Number(
        appliedCoupon.min_order
      ).toLocaleString()} অর্ডার করতে হবে`,
    };
  }

  // Check usage limit
  if (
    appliedCoupon.usage_limit &&
    Number(appliedCoupon.used_count || 0) >= appliedCoupon.usage_limit
  ) {
    return { discountAmount: 0, error: "এই কুপনটি ব্যবহারের সীমা অতিক্রম করেছে" };
  }

  let discountAmount = 0;
  const isFreeDelivery =
    appliedCoupon.discount_type === "free_delivery" ||
    (appliedCoupon.discount_type === "flat" && Number(appliedCoupon.discount_value) === 0);

  if (appliedCoupon.discount_type === "percentage") {
    discountAmount = (subtotal * Number(appliedCoupon.discount_value)) / 100;
    if (appliedCoupon.max_discount) {
      discountAmount = Math.min(discountAmount, Number(appliedCoupon.max_discount));
    }
  } else if (isFreeDelivery) {
    discountAmount = deliveryCharge;
  } else if (appliedCoupon.discount_type === "flat") {
    discountAmount = Number(appliedCoupon.discount_value);
  }

  return { discountAmount };
}

describe("Coupon Verification and Discount Calculation", () => {
  const deliveryCharge = 70;

  it("should return 0 discount if no coupon is applied", () => {
    const result = calculateDiscount(null, 1000, deliveryCharge);
    expect(result.discountAmount).toBe(0);
  });

  it("should calculate percentage discount correctly", () => {
    const coupon: Coupon = {
      code: "SAVE10",
      discount_type: "percentage",
      discount_value: 10,
      max_discount: null,
      min_order: null,
      usage_limit: null,
      used_count: 0,
      valid_from: null,
      valid_to: null,
      is_active: true,
    };

    const result = calculateDiscount(coupon, 1500, deliveryCharge);
    expect(result.discountAmount).toBe(150);
  });

  it("should apply max discount constraint for percentage coupons", () => {
    const coupon: Coupon = {
      code: "SAVE20",
      discount_type: "percentage",
      discount_value: 20,
      max_discount: 100,
      min_order: null,
      usage_limit: null,
      used_count: 0,
      valid_from: null,
      valid_to: null,
      is_active: true,
    };

    const result = calculateDiscount(coupon, 1000, deliveryCharge); // 20% of 1000 is 200, cap is 100
    expect(result.discountAmount).toBe(100);
  });

  it("should calculate flat discount correctly", () => {
    const coupon: Coupon = {
      code: "FLAT150",
      discount_type: "flat",
      discount_value: 150,
      max_discount: null,
      min_order: null,
      usage_limit: null,
      used_count: 0,
      valid_from: null,
      valid_to: null,
      is_active: true,
    };

    const result = calculateDiscount(coupon, 1000, deliveryCharge);
    expect(result.discountAmount).toBe(150);
  });

  it("should calculate free delivery discount correctly", () => {
    const coupon: Coupon = {
      code: "FREESHIP",
      discount_type: "free_delivery",
      discount_value: 0,
      max_discount: null,
      min_order: null,
      usage_limit: null,
      used_count: 0,
      valid_from: null,
      valid_to: null,
      is_active: true,
    };

    const result = calculateDiscount(coupon, 1000, deliveryCharge);
    expect(result.discountAmount).toBe(70);
  });

  it("should fail validation if subtotal is below min order", () => {
    const coupon: Coupon = {
      code: "MIN500",
      discount_type: "flat",
      discount_value: 50,
      max_discount: null,
      min_order: 500,
      usage_limit: null,
      used_count: 0,
      valid_from: null,
      valid_to: null,
      is_active: true,
    };

    const result = calculateDiscount(coupon, 300, deliveryCharge);
    expect(result.discountAmount).toBe(0);
    expect(result.error).toContain("500");
  });

  it("should fail validation if coupon is expired", () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const coupon: Coupon = {
      code: "EXPIRED",
      discount_type: "flat",
      discount_value: 50,
      max_discount: null,
      min_order: null,
      usage_limit: null,
      used_count: 0,
      valid_from: null,
      valid_to: pastDate,
      is_active: true,
    };

    const result = calculateDiscount(coupon, 1000, deliveryCharge);
    expect(result.discountAmount).toBe(0);
    expect(result.error).toContain("মেয়াদ শেষ হয়ে গেছে");
  });

  it("should fail validation if usage limit is reached", () => {
    const coupon: Coupon = {
      code: "LIMIT",
      discount_type: "flat",
      discount_value: 50,
      max_discount: null,
      min_order: null,
      usage_limit: 5,
      used_count: 5,
      valid_from: null,
      valid_to: null,
      is_active: true,
    };

    const result = calculateDiscount(coupon, 1000, deliveryCharge);
    expect(result.discountAmount).toBe(0);
    expect(result.error).toContain("ব্যবহারের সীমা অতিক্রম করেছে");
  });
});
