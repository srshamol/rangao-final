import { describe, it, expect } from "vitest";

interface Testimonial {
  id: string;
  customer_name: string;
  customer_location: string;
  customer_image_url: string;
  rating: number;
  review: string;
  is_active: boolean;
  status?: string;
  sort_order: number;
  product_id: string | null;
  created_at?: string;
}

interface DBProduct {
  id: string;
  name: string;
  rating: number | null;
  review_count: number | null;
  testimonials?: Testimonial[];
}

function processProductReviews(dbProduct: DBProduct) {
  const dbReviews = (dbProduct.testimonials || [])
    .filter((t: Testimonial) => t.is_active && (t.status === undefined || t.status === "approved"))
    .sort((a: Testimonial, b: Testimonial) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA;
    });

  const hasReviews = dbReviews && dbReviews.length > 0;
  
  const computedRating = hasReviews 
    ? Number((dbReviews.reduce((sum: number, r: Testimonial) => sum + r.rating, 0) / dbReviews.length).toFixed(1))
    : (Number(dbProduct.rating) > 0 ? Number(dbProduct.rating) : 0);
    
  const computedReviewCount = hasReviews 
    ? dbReviews.length 
    : (Number(dbProduct.review_count) > 0 ? Number(dbProduct.review_count) : 0);

  return {
    reviews: dbReviews,
    rating: computedRating,
    reviewCount: computedReviewCount
  };
}

describe("Product Reviews and Testimonials Logic", () => {
  it("should filter out inactive reviews and unapproved reviews", () => {
    const product: DBProduct = {
      id: "p1",
      name: "Islamic Calligraphy",
      rating: 4.5,
      review_count: 10,
      testimonials: [
        {
          id: "t1",
          customer_name: "John Doe",
          customer_location: "Dhaka",
          customer_image_url: "",
          rating: 5,
          review: "Excellent!",
          is_active: true,
          status: "approved",
          sort_order: 0,
          product_id: "p1",
          created_at: "2026-06-01T00:00:00Z"
        },
        {
          id: "t2",
          customer_name: "Jane Doe",
          customer_location: "Sylhet",
          customer_image_url: "",
          rating: 1,
          review: "Bad delivery",
          is_active: false,
          status: "pending",
          sort_order: 0,
          product_id: "p1",
          created_at: "2026-06-02T00:00:00Z"
        }
      ]
    };

    const result = processProductReviews(product);
    expect(result.reviews).toHaveLength(1);
    expect(result.reviews[0].id).toBe("t1");
  });

  it("should sort reviews by created_at descending", () => {
    const product: DBProduct = {
      id: "p1",
      name: "Islamic Calligraphy",
      rating: 4.5,
      review_count: 10,
      testimonials: [
        {
          id: "t1",
          customer_name: "Old Review",
          customer_location: "Dhaka",
          customer_image_url: "",
          rating: 4,
          review: "Good!",
          is_active: true,
          status: "approved",
          sort_order: 0,
          product_id: "p1",
          created_at: "2026-06-01T00:00:00Z"
        },
        {
          id: "t2",
          customer_name: "New Review",
          customer_location: "Sylhet",
          customer_image_url: "",
          rating: 5,
          review: "Excellent!",
          is_active: true,
          status: "approved",
          sort_order: 0,
          product_id: "p1",
          created_at: "2026-06-05T00:00:00Z"
        }
      ]
    };

    const result = processProductReviews(product);
    expect(result.reviews[0].id).toBe("t2");
    expect(result.reviews[1].id).toBe("t1");
  });

  it("should calculate average rating formatted to 1 decimal place", () => {
    const product: DBProduct = {
      id: "p1",
      name: "Islamic Calligraphy",
      rating: null,
      review_count: null,
      testimonials: [
        {
          id: "t1",
          customer_name: "Rafi",
          customer_location: "Dhaka",
          customer_image_url: "",
          rating: 5,
          review: "Perfect",
          is_active: true,
          status: "approved",
          sort_order: 0,
          product_id: "p1"
        },
        {
          id: "t2",
          customer_name: "Tasnim",
          customer_location: "Chittagong",
          customer_image_url: "",
          rating: 4,
          review: "Very good",
          is_active: true,
          status: "approved",
          sort_order: 0,
          product_id: "p1"
        },
        {
          id: "t3",
          customer_name: "Imran",
          customer_location: "Khulna",
          customer_image_url: "",
          rating: 4,
          review: "Nice",
          is_active: true,
          status: "approved",
          sort_order: 0,
          product_id: "p1"
        }
      ]
    };

    const result = processProductReviews(product);
    // (5 + 4 + 4) / 3 = 13 / 3 = 4.333... => 4.3
    expect(result.rating).toBe(4.3);
    expect(result.reviewCount).toBe(3);
  });

  it("should return 0 rating and 0 reviewCount when there are no reviews (no fake 4.9/48 fallback)", () => {
    const productWithoutReviews: DBProduct = {
      id: "p2",
      name: "Islamic Calligraphy 2",
      rating: null,
      review_count: null,
      testimonials: []
    };

    const result = processProductReviews(productWithoutReviews);
    expect(result.rating).toBe(0);
    expect(result.reviewCount).toBe(0);
    expect(result.reviews).toHaveLength(0);
  });
});
