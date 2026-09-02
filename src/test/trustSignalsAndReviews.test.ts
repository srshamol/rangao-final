import { describe, it, expect } from "vitest";

// =============================================================================
// Simulation Types & Helper Classes
// =============================================================================

interface TestimonialRecord {
  id: string;
  product_id: string;
  order_id: string | null;
  customer_name: string;
  rating: number;
  review: string;
  is_active: boolean;
  status: "pending" | "approved" | "rejected";
  is_verified_purchase: boolean;
  created_at: string;
}

interface OrderRecord {
  id: string;
  order_number: string;
  customer_phone: string;
  order_status: string; // 'pending' | 'confirmed' | 'delivered' | 'cancelled'
  items: Array<{ product_id: string; quantity: number }>;
}

// Helper: Normalize Bangladesh Phone Number
function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("880") && cleaned.length === 13) cleaned = cleaned.substring(2);
  if (cleaned.startsWith("80") && cleaned.length === 12) cleaned = "0" + cleaned.substring(2);
  if (!cleaned.startsWith("0") && cleaned.length === 10) cleaned = "0" + cleaned;
  return cleaned;
}

class ReviewSystemEngine {
  orders: OrderRecord[] = [];
  testimonials: TestimonialRecord[] = [];

  submitProductReview(params: {
    productId: string;
    customerName: string;
    rating: number;
    review: string;
    orderNumber?: string;
    customerPhone?: string;
  }): { success: boolean; reviewId?: string; isVerified: boolean; message?: string; error?: string } {
    const { productId, customerName, rating, review, orderNumber, customerPhone } = params;

    if (!productId) return { success: false, isVerified: false, error: "প্রোডাক্ট আইডি আবশ্যক" };
    if (rating < 1 || rating > 5) return { success: false, isVerified: false, error: "রেটিং ১ থেকে ৫ এর মধ্যে হতে হবে" };
    if (!customerName || customerName.trim().length < 2) return { success: false, isVerified: false, error: "সঠিক নাম লিখুন" };
    if (!review || review.trim().length < 5) return { success: false, isVerified: false, error: "রিভিউ বক্তব্য কমপক্ষে ৫ অক্ষরের হতে হবে" };

    let isVerified = false;
    let matchedOrderId: string | null = null;

    if (orderNumber && customerPhone) {
      const cleanPhone = normalizePhone(customerPhone);
      const order = this.orders.find((o) => {
        const orderPhone = normalizePhone(o.customer_phone);
        return (
          o.order_number.toLowerCase() === orderNumber.trim().toLowerCase() &&
          orderPhone === cleanPhone &&
          o.order_status === "delivered"
        );
      });

      if (order) {
        // Check if product was in order
        const itemExists = order.items.some((i) => i.product_id === productId);
        if (itemExists) {
          // Check for duplicate review
          const existing = this.testimonials.find(
            (t) => t.order_id === order.id && t.product_id === productId
          );
          if (existing) {
            return {
              success: false,
              isVerified: false,
              error: "আপনি ইতিমধ্যে এই অর্ডারের পণ্যের জন্য একটি রিভিউ জমা দিয়েছেন।",
            };
          }
          isVerified = true;
          matchedOrderId = order.id;
        }
      }
    }

    const newRecord: TestimonialRecord = {
      id: `rev_${this.testimonials.length + 1}`,
      product_id: productId,
      order_id: matchedOrderId,
      customer_name: customerName.trim(),
      rating,
      review: review.trim(),
      is_active: false, // Always pending staff approval
      status: "pending",
      is_verified_purchase: isVerified,
      created_at: new Date().toISOString(),
    };

    this.testimonials.push(newRecord);
    return {
      success: true,
      reviewId: newRecord.id,
      isVerified,
      message: isVerified
        ? "ধন্যবাদ! আপনার ভেরিফাইড রিভিউ সফলভাবে জমা হয়েছে।"
        : "আপনার রিভিউটি সফলভাবে জমা হয়েছে।",
    };
  }

  // Staff moderation action
  moderateReview(
    reviewId: string,
    action: "approve" | "reject",
    callerRole: "admin" | "manager" | "customer"
  ): { success: boolean; error?: string } {
    if (callerRole !== "admin" && callerRole !== "manager") {
      return { success: false, error: "RLS_PERMISSION_DENIED: Staff role required" };
    }

    const review = this.testimonials.find((t) => t.id === reviewId);
    if (!review) return { success: false, error: "Review not found" };

    if (action === "approve") {
      review.status = "approved";
      review.is_active = true;
    } else {
      review.status = "rejected";
      review.is_active = false;
    }

    return { success: true };
  }

  // Authoritative Review Summary for Storefront / Schema
  getProductReviewSummary(productId: string) {
    const approvedReviews = this.testimonials.filter(
      (t) => t.product_id === productId && t.is_active && t.status === "approved"
    );

    const count = approvedReviews.length;
    if (count === 0) {
      return {
        productId,
        reviewCount: 0,
        averageRating: 0,
        distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
        percentages: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
        reviews: [],
        aggregateRatingSchema: null, // Strictly null when 0 reviews
      };
    }

    const totalScore = approvedReviews.reduce((sum, r) => sum + r.rating, 0);
    const avg = Number((totalScore / count).toFixed(1));

    const dist = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
    approvedReviews.forEach((r) => {
      const starKey = String(r.rating) as keyof typeof dist;
      if (dist[starKey] !== undefined) dist[starKey] += 1;
    });

    const pcts = {
      "1": Math.round((dist["1"] / count) * 100),
      "2": Math.round((dist["2"] / count) * 100),
      "3": Math.round((dist["3"] / count) * 100),
      "4": Math.round((dist["4"] / count) * 100),
      "5": Math.round((dist["5"] / count) * 100),
    };

    return {
      productId,
      reviewCount: count,
      averageRating: avg,
      distribution: dist,
      percentages: pcts,
      reviews: approvedReviews,
      aggregateRatingSchema: {
        "@type": "AggregateRating",
        ratingValue: avg,
        reviewCount: count,
      },
    };
  }
}

// =============================================================================
// Test Suites
// =============================================================================

describe("Evidence-Based Trust Signals & Verified Reviews Test Suite", () => {
  // ---------------------------------------------------------------------------
  // 1. Products with No Reviews
  // ---------------------------------------------------------------------------
  describe("1. Products with no reviews", () => {
    it("should return rating 0, reviewCount 0, empty distribution, and NO AggregateRating schema", () => {
      const engine = new ReviewSystemEngine();
      const summary = engine.getProductReviewSummary("prod-new-101");

      expect(summary.reviewCount).toBe(0);
      expect(summary.averageRating).toBe(0);
      expect(summary.aggregateRatingSchema).toBeNull();
      expect(summary.distribution["5"]).toBe(0);
      expect(summary.percentages["5"]).toBe(0);
      expect(summary.reviews).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Unverified / Pending Reviews Not Affecting Rating or Schema
  // ---------------------------------------------------------------------------
  describe("2. Unverified / pending reviews not affecting rating or schema", () => {
    it("should NOT include pending or unapproved reviews in product rating, count, or schema", () => {
      const engine = new ReviewSystemEngine();

      // Submit 2 reviews (which default to pending / is_active: false)
      engine.submitProductReview({
        productId: "prod-202",
        customerName: "Pending Customer 1",
        rating: 5,
        review: "This product is fantastic!",
      });

      engine.submitProductReview({
        productId: "prod-202",
        customerName: "Pending Customer 2",
        rating: 4,
        review: "Pretty good product quality",
      });

      // Query storefront summary
      const summary = engine.getProductReviewSummary("prod-202");
      expect(summary.reviewCount).toBe(0);
      expect(summary.averageRating).toBe(0);
      expect(summary.aggregateRatingSchema).toBeNull();
      expect(summary.reviews).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Delivered-Order Review Eligibility
  // ---------------------------------------------------------------------------
  describe("3. Delivered-order review eligibility", () => {
    it("should grant 'is_verified_purchase = true' when review matches a delivered order with the product", () => {
      const engine = new ReviewSystemEngine();
      engine.orders.push({
        id: "ord-uuid-1",
        order_number: "ORD-DELIVERED-001",
        customer_phone: "01712345678",
        order_status: "delivered",
        items: [{ product_id: "prod-301", quantity: 1 }],
      });

      const res = engine.submitProductReview({
        productId: "prod-301",
        customerName: "Real Buyer",
        rating: 5,
        review: "Real customer review for delivered order",
        orderNumber: "ORD-DELIVERED-001",
        customerPhone: "01712345678",
      });

      expect(res.success).toBe(true);
      expect(res.isVerified).toBe(true);
      expect(engine.testimonials[0].is_verified_purchase).toBe(true);
      expect(engine.testimonials[0].order_id).toBe("ord-uuid-1");
    });

    it("should set 'is_verified_purchase = false' when order is not delivered or product is not in order", () => {
      const engine = new ReviewSystemEngine();
      engine.orders.push({
        id: "ord-uuid-2",
        order_number: "ORD-PENDING-002",
        customer_phone: "01812345678",
        order_status: "pending", // NOT delivered
        items: [{ product_id: "prod-302", quantity: 1 }],
      });

      const res = engine.submitProductReview({
        productId: "prod-302",
        customerName: "Pending Buyer",
        rating: 5,
        review: "Product not delivered yet",
        orderNumber: "ORD-PENDING-002",
        customerPhone: "01812345678",
      });

      expect(res.success).toBe(true);
      expect(res.isVerified).toBe(false);
      expect(engine.testimonials[0].is_verified_purchase).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Duplicate Review Prevention
  // ---------------------------------------------------------------------------
  describe("4. Duplicate review prevention", () => {
    it("should prevent duplicate review submissions for the same delivered order item", () => {
      const engine = new ReviewSystemEngine();
      engine.orders.push({
        id: "ord-uuid-3",
        order_number: "ORD-DUP-003",
        customer_phone: "01912345678",
        order_status: "delivered",
        items: [{ product_id: "prod-401", quantity: 1 }],
      });

      // 1st review submission: success
      const firstSubmission = engine.submitProductReview({
        productId: "prod-401",
        customerName: "Buyer 1",
        rating: 5,
        review: "First review submission for this order",
        orderNumber: "ORD-DUP-003",
        customerPhone: "01912345678",
      });
      expect(firstSubmission.success).toBe(true);

      // 2nd review submission for same order & product: REJECTED
      const secondSubmission = engine.submitProductReview({
        productId: "prod-401",
        customerName: "Buyer 1",
        rating: 5,
        review: "Duplicate attempt for same item",
        orderNumber: "ORD-DUP-003",
        customerPhone: "01912345678",
      });
      expect(secondSubmission.success).toBe(false);
      expect(secondSubmission.error).toContain("ইতিমধ্যে এই অর্ডারের পণ্যের জন্য একটি রিভিউ");
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Staff Approval Workflow
  // ---------------------------------------------------------------------------
  describe("5. Staff approval workflow", () => {
    it("should deny non-staff from approving or altering review status", () => {
      const engine = new ReviewSystemEngine();
      engine.submitProductReview({
        productId: "prod-501",
        customerName: "Guest",
        rating: 5,
        review: "Nice product indeed",
      });

      const revId = engine.testimonials[0].id;
      const attempt = engine.moderateReview(revId, "approve", "customer");
      expect(attempt.success).toBe(false);
      expect(attempt.error).toContain("RLS_PERMISSION_DENIED");
      expect(engine.testimonials[0].status).toBe("pending");
      expect(engine.testimonials[0].is_active).toBe(false);
    });

    it("should allow staff to approve and publish reviews", () => {
      const engine = new ReviewSystemEngine();
      engine.submitProductReview({
        productId: "prod-501",
        customerName: "Guest",
        rating: 5,
        review: "Nice product indeed",
      });

      const revId = engine.testimonials[0].id;
      const attempt = engine.moderateReview(revId, "approve", "admin");
      expect(attempt.success).toBe(true);
      expect(engine.testimonials[0].status).toBe("approved");
      expect(engine.testimonials[0].is_active).toBe(true);
    });

    it("should allow staff to reject reviews", () => {
      const engine = new ReviewSystemEngine();
      engine.submitProductReview({
        productId: "prod-501",
        customerName: "Spammer",
        rating: 1,
        review: "Spam advertising review text",
      });

      const revId = engine.testimonials[0].id;
      const attempt = engine.moderateReview(revId, "reject", "admin");
      expect(attempt.success).toBe(true);
      expect(engine.testimonials[0].status).toBe("rejected");
      expect(engine.testimonials[0].is_active).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Verified-Review Rating Calculations
  // ---------------------------------------------------------------------------
  describe("6. Verified-review rating calculations", () => {
    it("should accurately compute average rating, distribution counts, and percentage shares from approved reviews", () => {
      const engine = new ReviewSystemEngine();
      const productId = "prod-601";

      // Submit 4 reviews with varied ratings: 5, 5, 4, 2
      const r1 = engine.submitProductReview({ productId, customerName: "Customer A", rating: 5, review: "Great product 1" });
      const r2 = engine.submitProductReview({ productId, customerName: "Customer B", rating: 5, review: "Great product 2" });
      const r3 = engine.submitProductReview({ productId, customerName: "Customer C", rating: 4, review: "Good product 3" });
      const r4 = engine.submitProductReview({ productId, customerName: "Customer D", rating: 2, review: "Average product 4" });
      // 5th review rejected/pending (should not count)
      const r5 = engine.submitProductReview({ productId, customerName: "Spammer E", rating: 1, review: "Bad spam 5" });

      // Staff approves r1, r2, r3, r4
      engine.moderateReview(r1.reviewId!, "approve", "admin");
      engine.moderateReview(r2.reviewId!, "approve", "admin");
      engine.moderateReview(r3.reviewId!, "approve", "admin");
      engine.moderateReview(r4.reviewId!, "approve", "admin");
      // r5 remains pending

      const summary = engine.getProductReviewSummary(productId);

      // Total approved: 4
      expect(summary.reviewCount).toBe(4);
      // Average: (5 + 5 + 4 + 2) / 4 = 16 / 4 = 4.0
      expect(summary.averageRating).toBe(4.0);

      // Star Distribution counts
      expect(summary.distribution["5"]).toBe(2);
      expect(summary.distribution["4"]).toBe(1);
      expect(summary.distribution["3"]).toBe(0);
      expect(summary.distribution["2"]).toBe(1);
      expect(summary.distribution["1"]).toBe(0); // 1-star was unapproved

      // Percentages
      expect(summary.percentages["5"]).toBe(50); // 2/4 = 50%
      expect(summary.percentages["4"]).toBe(25); // 1/4 = 25%
      expect(summary.percentages["3"]).toBe(0);
      expect(summary.percentages["2"]).toBe(25); // 1/4 = 25%
      expect(summary.percentages["1"]).toBe(0);

      // Valid AggregateRating schema is generated
      expect(summary.aggregateRatingSchema).toEqual({
        "@type": "AggregateRating",
        ratingValue: 4.0,
        reviewCount: 4,
      });
    });
  });
});
