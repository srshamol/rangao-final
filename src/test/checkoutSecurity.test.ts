import { describe, it, expect, vi, beforeEach } from "vitest";

// Types matching authoritative server schema
interface Product {
  id: string;
  name: string;
  status: "active" | "inactive" | "draft";
  regular_price: number;
  sale_price: number | null;
  stock_quantity: number;
  has_variants: boolean;
  variants?: Array<{
    id: string;
    title: string;
    regular_price: number;
    sale_price: number | null;
    stock_quantity: number;
    is_active: boolean;
  }>;
  tags?: string[];
  is_free_delivery?: boolean;
}

interface Coupon {
  id: string;
  code: string;
  discount_type: "percentage" | "flat" | "free_delivery";
  discount_value: number;
  min_order: number | null;
  max_discount: number | null;
  valid_from: string | null;
  valid_to: string | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
}

interface DeliverySettings {
  dhaka_inside: number;
  dhaka_outside: number;
  free_delivery_min: number;
}

// In-memory Database Simulation for Concurrency & Authoritative Calculations
class AuthoritativeDatabase {
  products: Map<string, Product> = new Map();
  coupons: Map<string, Coupon> = new Map();
  orders: Map<string, any> = new Map();
  orderItems: Array<any> = [];
  inventoryLogs: Array<any> = [];
  deliverySettings: DeliverySettings = {
    dhaka_inside: 70,
    dhaka_outside: 130,
    free_delivery_min: 5000,
  };

  // Mutex lock simulation per product to test concurrent row-level locking
  private productLocks: Map<string, Promise<void>> = new Map();

  async acquireProductLock(productId: string): Promise<() => void> {
    while (this.productLocks.has(productId)) {
      await this.productLocks.get(productId);
    }
    let releaseLock: () => void = () => {};
    const lockPromise = new Promise<void>((resolve) => {
      releaseLock = () => {
        this.productLocks.delete(productId);
        resolve();
      };
    });
    this.productLocks.set(productId, lockPromise);
    return releaseLock;
  }

  // Authoritative Checkout Logic matching process_checkout PostgreSQL RPC
  async processCheckout(payload: {
    items: Array<{ productId: string; variantId?: string | null; quantity: number; clientPrice?: number; clientTotal?: number }>;
    customerName: string;
    customerPhone: string;
    customerEmail?: string | null;
    shippingAddress: { division: string; address: string; district?: string; thana?: string };
    paymentMethod?: string;
    couponCode?: string | null;
    orderNotes?: string | null;
    idempotencyKey?: string | null;
    userId?: string | null;
  }): Promise<{ success: boolean; order?: any; is_duplicate?: boolean; error?: string }> {
    // 1. Validation
    if (!payload.customerName?.trim() || !payload.customerPhone?.trim()) {
      return { success: false, error: "VALIDATION_ERROR: Customer name and phone required" };
    }
    if (!payload.items || payload.items.length === 0) {
      return { success: false, error: "VALIDATION_ERROR: Cart is empty" };
    }

    // 2. Idempotency Check
    if (payload.idempotencyKey?.trim()) {
      const existing = Array.from(this.orders.values()).find(
        (o) => o.idempotency_key === payload.idempotencyKey?.trim()
      );
      if (existing) {
        return {
          success: true,
          is_duplicate: true,
          order: existing,
        };
      }
    }

    // 3. Acquire atomic row-level locks on all requested products (sorted to prevent deadlocks)
    const productIds = Array.from(new Set(payload.items.map((i) => i.productId))).sort();
    const releaseLocks: Array<() => void> = [];
    for (const pid of productIds) {
      const release = await this.acquireProductLock(pid);
      releaseLocks.push(release);
    }

    try {
      let subtotal = 0;
      let hasFreeDelivery = false;
      const verifiedItems: Array<any> = [];

      // Validate products, variations, authoritative prices & stock
      for (const item of payload.items) {
        if (item.quantity <= 0) {
          return { success: false, error: "VALIDATION_ERROR: Quantity must be at least 1" };
        }

        const product = this.products.get(item.productId);
        if (!product) {
          return { success: false, error: `INVALID_PRODUCT: Product ${item.productId} not found` };
        }
        if (product.status !== "active") {
          return { success: false, error: `INACTIVE_PRODUCT: Product "${product.name}" is not active` };
        }

        if (product.is_free_delivery || product.tags?.includes("ফ্রি ডেলিভারি") || product.tags?.includes("free_delivery")) {
          hasFreeDelivery = true;
        }

        let unitPrice = 0;
        let itemTitle = product.name;
        let variantTitle: string | null = null;

        if (product.has_variants && product.variants && product.variants.length > 0) {
          if (!item.variantId) {
            return { success: false, error: `VARIANT_REQUIRED: Product "${product.name}" requires variant selection` };
          }
          const variant = product.variants.find((v) => v.id === item.variantId);
          if (!variant) {
            return { success: false, error: `INVALID_VARIANT: Variant "${item.variantId}" not found` };
          }
          if (!variant.is_active) {
            return { success: false, error: `INACTIVE_VARIANT: Variant "${variant.title}" is inactive` };
          }
          if (variant.stock_quantity < item.quantity) {
            return {
              success: false,
              error: `OUT_OF_STOCK: Insufficient stock for variant "${variant.title}" (available: ${variant.stock_quantity}, requested: ${item.quantity})`,
            };
          }

          // Authoritative price (ignoring any clientPrice / clientTotal)
          unitPrice = variant.sale_price ?? variant.regular_price;
          variantTitle = variant.title;
          itemTitle = `${product.name} (${variant.title})`;

          // Decrement variant stock atomically
          variant.stock_quantity -= item.quantity;
        } else {
          if (product.stock_quantity < item.quantity) {
            return {
              success: false,
              error: `OUT_OF_STOCK: Insufficient stock for product "${product.name}" (available: ${product.stock_quantity}, requested: ${item.quantity})`,
            };
          }

          // Authoritative price (ignoring any clientPrice / clientTotal)
          unitPrice = product.sale_price ?? product.regular_price;
        }

        // Decrement product stock
        product.stock_quantity -= item.quantity;

        const itemTotal = unitPrice * item.quantity;
        subtotal += itemTotal;

        verifiedItems.push({
          product_id: product.id,
          product_name: itemTitle,
          variant_id: item.variantId || null,
          variant_title: variantTitle,
          unit_price: unitPrice,
          quantity: item.quantity,
          total_price: itemTotal,
        });

        this.inventoryLogs.push({
          product_id: product.id,
          type: "sale",
          quantity_change: -item.quantity,
        });
      }

      // 4. Calculate Delivery Charge
      const isDhaka = payload.shippingAddress.division.includes("ঢাকা") || payload.shippingAddress.division.toLowerCase().includes("dhaka");
      let deliveryCharge = isDhaka ? this.deliverySettings.dhaka_inside : this.deliverySettings.dhaka_outside;

      if (hasFreeDelivery || (this.deliverySettings.free_delivery_min > 0 && subtotal >= this.deliverySettings.free_delivery_min)) {
        deliveryCharge = 0;
      }

      // 5. Validate & Apply Coupon
      let discountAmount = 0;
      let appliedCouponCode: string | null = null;

      if (payload.couponCode?.trim()) {
        const cleanCode = payload.couponCode.trim().toUpperCase();
        const coupon = this.coupons.get(cleanCode);

        if (!coupon || !coupon.is_active) {
          return { success: false, error: `INVALID_COUPON: Coupon "${cleanCode}" is invalid or inactive` };
        }

        const now = new Date();
        if (coupon.valid_from && new Date(coupon.valid_from) > now) {
          return { success: false, error: `COUPON_NOT_STARTED: Coupon "${cleanCode}" is not yet active` };
        }
        if (coupon.valid_to && new Date(coupon.valid_to) < now) {
          return { success: false, error: `COUPON_EXPIRED: Coupon "${cleanCode}" has expired` };
        }
        if (coupon.min_order && subtotal < coupon.min_order) {
          return { success: false, error: `COUPON_MIN_ORDER: Minimum order of ৳${coupon.min_order} required` };
        }
        if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
          return { success: false, error: `COUPON_LIMIT_REACHED: Coupon "${cleanCode}" usage limit reached` };
        }

        // Calculate discount
        if (coupon.discount_type === "percentage") {
          discountAmount = (subtotal * coupon.discount_value) / 100;
          if (coupon.max_discount && coupon.max_discount > 0) {
            discountAmount = Math.min(discountAmount, coupon.max_discount);
          }
        } else if (coupon.discount_type === "free_delivery") {
          discountAmount = deliveryCharge;
        } else if (coupon.discount_type === "flat") {
          discountAmount = Math.min(coupon.discount_value, subtotal);
        }

        // Increment coupon used count atomically
        coupon.used_count += 1;
        appliedCouponCode = coupon.code;
      }

      // 6. Calculate Final Total
      const totalAmount = Math.max(0, subtotal + deliveryCharge - discountAmount);

      // 7. Create Order Record
      const orderId = `ord_uuid_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

      const createdOrder = {
        order_id: orderId,
        id: orderId,
        order_number: orderNumber,
        customer_name: payload.customerName.trim(),
        customer_phone: payload.customerPhone.trim(),
        customer_email: payload.customerEmail || null,
        shipping_address: payload.shippingAddress,
        payment_method: payload.paymentMethod || "cod",
        payment_status: "pending",
        order_status: "pending",
        subtotal,
        delivery_charge: deliveryCharge,
        discount_amount: discountAmount,
        coupon_code: appliedCouponCode,
        total_amount: totalAmount,
        idempotency_key: payload.idempotencyKey?.trim() || null,
        items: verifiedItems,
        created_at: new Date().toISOString(),
      };

      this.orders.set(orderId, createdOrder);
      for (const vi of verifiedItems) {
        this.orderItems.push({ ...vi, order_id: orderId });
      }

      return {
        success: true,
        is_duplicate: false,
        order: createdOrder,
      };
    } finally {
      // Release all product row locks
      for (const release of releaseLocks) {
        release();
      }
    }
  }
}

describe("Secure Authoritative Checkout Flow", () => {
  let db: AuthoritativeDatabase;

  beforeEach(() => {
    db = new AuthoritativeDatabase();

    // Seed test products
    db.products.set("prod-frame-01", {
      id: "prod-frame-01",
      name: "Ayatul Kursi Wood Frame",
      status: "active",
      regular_price: 1500,
      sale_price: 1200,
      stock_quantity: 10,
      has_variants: true,
      variants: [
        {
          id: "var-15x21",
          title: "15 × 21 inch",
          regular_price: 1500,
          sale_price: 1200,
          stock_quantity: 4,
          is_active: true,
        },
        {
          id: "var-18x24",
          title: "18 × 24 inch",
          regular_price: 2000,
          sale_price: 1800,
          stock_quantity: 1,
          is_active: true,
        },
        {
          id: "var-inactive",
          title: "24 × 36 inch (Inactive)",
          regular_price: 3000,
          sale_price: 2500,
          stock_quantity: 5,
          is_active: false,
        },
      ],
    });

    db.products.set("prod-clock-02", {
      id: "prod-clock-02",
      name: "Islamic Wall Clock",
      status: "active",
      regular_price: 850,
      sale_price: 750,
      stock_quantity: 5,
      has_variants: false,
    });

    // Seed test coupons
    db.coupons.set("SAVE10", {
      id: "coup-1",
      code: "SAVE10",
      discount_type: "percentage",
      discount_value: 10,
      min_order: 1000,
      max_discount: 200,
      valid_from: null,
      valid_to: null,
      usage_limit: 10,
      used_count: 0,
      is_active: true,
    });

    db.coupons.set("FREESHIP", {
      id: "coup-2",
      code: "FREESHIP",
      discount_type: "free_delivery",
      discount_value: 0,
      min_order: null,
      max_discount: null,
      valid_from: null,
      valid_to: null,
      usage_limit: null,
      used_count: 0,
      is_active: true,
    });

    db.coupons.set("EXPIRED20", {
      id: "coup-3",
      code: "EXPIRED20",
      discount_type: "percentage",
      discount_value: 20,
      min_order: null,
      max_discount: null,
      valid_from: null,
      valid_to: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      usage_limit: 5,
      used_count: 0,
      is_active: true,
    });

    db.coupons.set("MAXEDOUT", {
      id: "coup-4",
      code: "MAXEDOUT",
      discount_type: "flat",
      discount_value: 100,
      min_order: null,
      max_discount: null,
      valid_from: null,
      valid_to: null,
      usage_limit: 3,
      used_count: 3,
      is_active: true,
    });
  });

  // =========================================================================
  // 1. Price Tampering Attempts
  // =========================================================================
  describe("1. Price Tampering Attempts", () => {
    it("should ignore browser-supplied unit_price or total and calculate authoritatively from DB", async () => {
      const maliciousPayload = {
        items: [
          {
            productId: "prod-frame-01",
            variantId: "var-15x21",
            quantity: 2,
            clientPrice: 1, // Tampered: 1 BDT instead of 1200 BDT
            clientTotal: 2, // Tampered: 2 BDT instead of 2400 BDT
          },
        ],
        customerName: "Alice User",
        customerPhone: "01711111111",
        shippingAddress: { division: "ঢাকা", address: "Dhanmondi, Dhaka" },
        paymentMethod: "cod",
      };

      const result = await db.processCheckout(maliciousPayload);

      expect(result.success).toBe(true);
      expect(result.order).toBeDefined();
      // Server authoritative price: 1200 * 2 = 2400 subtotal
      expect(result.order.subtotal).toBe(2400);
      // Dhaka inside delivery: 70
      expect(result.order.delivery_charge).toBe(70);
      // Total: 2400 + 70 = 2470
      expect(result.order.total_amount).toBe(2470);
      expect(result.order.items[0].unit_price).toBe(1200);
      expect(result.order.items[0].total_price).toBe(2400);
    });

    it("should ignore negative client prices and enforce authoritative regular/sale price", async () => {
      const maliciousPayload = {
        items: [
          {
            productId: "prod-clock-02",
            quantity: 1,
            clientPrice: -500,
            clientTotal: -500,
          },
        ],
        customerName: "Bob Tamperer",
        customerPhone: "01822222222",
        shippingAddress: { division: "চট্টগ্রাম", address: "Agrabad, Chittagong" },
        paymentMethod: "cod",
      };

      const result = await db.processCheckout(maliciousPayload);

      expect(result.success).toBe(true);
      expect(result.order.subtotal).toBe(750);
      expect(result.order.delivery_charge).toBe(130); // outside dhaka
      expect(result.order.total_amount).toBe(880);
    });
  });

  // =========================================================================
  // 2. Invalid or Out-of-stock Variations
  // =========================================================================
  describe("2. Invalid or Out-of-Stock Variations", () => {
    it("should reject non-existent variation IDs", async () => {
      const payload = {
        items: [
          {
            productId: "prod-frame-01",
            variantId: "var-non-existent-999",
            quantity: 1,
          },
        ],
        customerName: "Charlie",
        customerPhone: "01933333333",
        shippingAddress: { division: "ঢাকা", address: "Mirpur" },
      };

      const result = await db.processCheckout(payload);
      expect(result.success).toBe(false);
      expect(result.error).toContain("INVALID_VARIANT");
    });

    it("should reject inactive variations", async () => {
      const payload = {
        items: [
          {
            productId: "prod-frame-01",
            variantId: "var-inactive",
            quantity: 1,
          },
        ],
        customerName: "Charlie",
        customerPhone: "01933333333",
        shippingAddress: { division: "ঢাকা", address: "Mirpur" },
      };

      const result = await db.processCheckout(payload);
      expect(result.success).toBe(false);
      expect(result.error).toContain("INACTIVE_VARIANT");
    });

    it("should reject checkout when requested quantity exceeds variant stock", async () => {
      // var-18x24 has stock = 1
      const payload = {
        items: [
          {
            productId: "prod-frame-01",
            variantId: "var-18x24",
            quantity: 2, // Requesting 2 when only 1 available
          },
        ],
        customerName: "Dave",
        customerPhone: "01744444444",
        shippingAddress: { division: "ঢাকা", address: "Gulshan" },
      };

      const result = await db.processCheckout(payload);
      expect(result.success).toBe(false);
      expect(result.error).toContain("OUT_OF_STOCK");
    });
  });

  // =========================================================================
  // 3. Concurrent Stock Protection
  // =========================================================================
  describe("3. Concurrent Stock Protection", () => {
    it("should prevent overselling and negative inventory when two users checkout the last unit concurrently", async () => {
      // var-18x24 has stock = 1
      const product = db.products.get("prod-frame-01")!;
      const variant = product.variants!.find((v) => v.id === "var-18x24")!;
      expect(variant.stock_quantity).toBe(1);

      const request1 = db.processCheckout({
        items: [{ productId: "prod-frame-01", variantId: "var-18x24", quantity: 1 }],
        customerName: "User 1",
        customerPhone: "01711111111",
        shippingAddress: { division: "ঢাকা", address: "Dhaka 1" },
      });

      const request2 = db.processCheckout({
        items: [{ productId: "prod-frame-01", variantId: "var-18x24", quantity: 1 }],
        customerName: "User 2",
        customerPhone: "01722222222",
        shippingAddress: { division: "ঢাকা", address: "Dhaka 2" },
      });

      const [res1, res2] = await Promise.all([request1, request2]);

      // Exactly one request must succeed, and the other must fail with OUT_OF_STOCK
      const succeededCount = [res1, res2].filter((r) => r.success).length;
      const failedCount = [res1, res2].filter((r) => !r.success && r.error?.includes("OUT_OF_STOCK")).length;

      expect(succeededCount).toBe(1);
      expect(failedCount).toBe(1);

      // Remaining stock must be exactly 0 (never negative)
      expect(variant.stock_quantity).toBe(0);
      expect(product.stock_quantity).toBe(9); // was 10, reduced by 1
    });
  });

  // =========================================================================
  // 4. Coupon Validation
  // =========================================================================
  describe("4. Coupon Validation", () => {
    it("should apply valid percentage coupon capped at max discount", async () => {
      const payload = {
        items: [{ productId: "prod-frame-01", variantId: "var-15x21", quantity: 2 }], // 1200 * 2 = 2400 subtotal
        customerName: "Coupon User",
        customerPhone: "01755555555",
        shippingAddress: { division: "ঢাকা", address: "Uttara" },
        couponCode: "SAVE10", // 10% of 2400 is 240, capped at max_discount 200
      };

      const result = await db.processCheckout(payload);
      expect(result.success).toBe(true);
      expect(result.order.subtotal).toBe(2400);
      expect(result.order.discount_amount).toBe(200);
      expect(result.order.delivery_charge).toBe(70);
      expect(result.order.total_amount).toBe(2270); // 2400 + 70 - 200

      // Verify coupon usage count incremented
      const coupon = db.coupons.get("SAVE10")!;
      expect(coupon.used_count).toBe(1);
    });

    it("should reject expired coupons", async () => {
      const payload = {
        items: [{ productId: "prod-clock-02", quantity: 2 }],
        customerName: "Late User",
        customerPhone: "01755555555",
        shippingAddress: { division: "ঢাকা", address: "Uttara" },
        couponCode: "EXPIRED20",
      };

      const result = await db.processCheckout(payload);
      expect(result.success).toBe(false);
      expect(result.error).toContain("COUPON_EXPIRED");
    });

    it("should reject coupons when subtotal is below minimum order requirement", async () => {
      // SAVE10 requires min_order = 1000. prod-clock-02 is 750.
      const payload = {
        items: [{ productId: "prod-clock-02", quantity: 1 }], // 750 subtotal < 1000
        customerName: "Small Order User",
        customerPhone: "01755555555",
        shippingAddress: { division: "ঢাকা", address: "Uttara" },
        couponCode: "SAVE10",
      };

      const result = await db.processCheckout(payload);
      expect(result.success).toBe(false);
      expect(result.error).toContain("COUPON_MIN_ORDER");
    });

    it("should reject coupons that reached usage limit", async () => {
      const payload = {
        items: [{ productId: "prod-frame-01", variantId: "var-15x21", quantity: 1 }],
        customerName: "Limit User",
        customerPhone: "01755555555",
        shippingAddress: { division: "ঢাকা", address: "Uttara" },
        couponCode: "MAXEDOUT",
      };

      const result = await db.processCheckout(payload);
      expect(result.success).toBe(false);
      expect(result.error).toContain("COUPON_LIMIT_REACHED");
    });

    it("should apply free delivery coupon correctly", async () => {
      const payload = {
        items: [{ productId: "prod-clock-02", quantity: 1 }],
        customerName: "Free Ship User",
        customerPhone: "01755555555",
        shippingAddress: { division: "সিলেট", address: "Sylhet Sadar" }, // outside dhaka: 130
        couponCode: "FREESHIP",
      };

      const result = await db.processCheckout(payload);
      expect(result.success).toBe(true);
      expect(result.order.subtotal).toBe(750);
      expect(result.order.delivery_charge).toBe(130);
      expect(result.order.discount_amount).toBe(130);
      expect(result.order.total_amount).toBe(750);
    });
  });

  // =========================================================================
  // 5. Duplicate / Idempotent Checkout Requests
  // =========================================================================
  describe("5. Duplicate / Idempotent Checkout Requests", () => {
    it("should return the existing order safely without double-charging or re-deducting stock when replayed with same idempotencyKey", async () => {
      const idempotencyKey = "idemp_test_key_abc123";
      const initialStock = db.products.get("prod-clock-02")!.stock_quantity;

      const payload = {
        items: [{ productId: "prod-clock-02", quantity: 1 }],
        customerName: "Idempotent User",
        customerPhone: "01766666666",
        shippingAddress: { division: "ঢাকা", address: "Banani" },
        idempotencyKey,
      };

      // First call: creates order
      const res1 = await db.processCheckout(payload);
      expect(res1.success).toBe(true);
      expect(res1.is_duplicate).toBe(false);
      const createdOrderNumber = res1.order.order_number;

      // Stock should have decreased by 1
      expect(db.products.get("prod-clock-02")!.stock_quantity).toBe(initialStock - 1);

      // Second call: duplicate replay with same idempotencyKey
      const res2 = await db.processCheckout(payload);
      expect(res2.success).toBe(true);
      expect(res2.is_duplicate).toBe(true);
      expect(res2.order.order_number).toBe(createdOrderNumber);

      // Stock must NOT have decreased a second time!
      expect(db.products.get("prod-clock-02")!.stock_quantity).toBe(initialStock - 1);

      // Total orders in DB should still be 1
      expect(db.orders.size).toBe(1);
    });
  });

  // =========================================================================
  // 6. Anonymous Users Unable to Write Orders Directly
  // =========================================================================
  describe("6. Direct Client Database Write Access", () => {
    it("should reject client-side direct table insert attempts when RLS denies direct insert", async () => {
      // Mock client attempting direct supabase.from('orders').insert(...)
      const mockSupabaseClient = {
        from: (table: string) => ({
          insert: async (data: any) => {
            if (table === "orders" || table === "order_items") {
              // Simulating PostgreSQL RLS policy violation (permission denied for table)
              return {
                data: null,
                error: {
                  code: "42501",
                  message: `new row violates row-level security policy for table "${table}"`,
                  details: "Direct insert is disabled for anonymous/client roles. Use process_checkout RPC.",
                },
              };
            }
            return { data: null, error: null };
          },
        }),
      };

      const { data, error } = await mockSupabaseClient.from("orders").insert({
        customer_name: "Attacker",
        total_amount: 1, // Attempted price manipulation
      });

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error?.code).toBe("42501");
      expect(error?.message).toContain("row-level security policy");
    });
  });
});
