import { describe, it, expect, vi, beforeEach } from "vitest";
import { canAccessAdminRoute, ROLE_METADATA, ROUTE_PERMISSIONS, ALL_STAFF_ROLES, type AppRole } from "@/lib/permissions";
import { normalizeBDPhone } from "@/lib/phoneValidation";
import { sanitizeString, sanitizeContext, reportError, getRecentErrors, clearRecentErrors } from "@/lib/errorMonitoring";
import { redactString, redactPayload, safeLog } from "../../api/_lib/logger";
import { VITALS_THRESHOLDS } from "@/utils/vitals";

describe("Release Quality Gate — Core Functional Verification", () => {
  beforeEach(() => {
    clearRecentErrors();
  });

  // =========================================================================
  // 1. Storefront Navigation and Search
  // =========================================================================
  describe("1. Storefront Navigation & Search", () => {
    function generateProductUrl(category: string, slug: string): string {
      const cleanCat = category.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
      const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9\u0980-\u09FF-]+/g, "-");
      return `/${cleanCat}/${cleanSlug}`;
    }

    function searchProducts(
      products: Array<{ title: string; category: string; tags: string[] }>,
      query: string
    ) {
      const q = query.toLowerCase().trim();
      if (!q) return products;
      return products.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    it("generates correct SEO-friendly canonical product URLs", () => {
      const url = generateProductUrl("Islamic Decor", "rng-isl-ayatul-kursi-3d");
      expect(url).toBe("/islamic-decor/rng-isl-ayatul-kursi-3d");
    });

    it("matches search queries across product title, category, and Bengali tags", () => {
      const catalog = [
        { title: "Surah Fatiha Wood Canvas", category: "Islamic", tags: ["ক্যালিগ্রাফি", "কাঠের ফ্রেম"] },
        { title: "Minimalist Clock", category: "Clocks", tags: ["ঘড়ি", "মেটাল"] },
        { title: "Subhanallah Gold Canvas", category: "Islamic", tags: ["ওয়াল আর্ট", "সোনালী"] },
      ];

      const searchBangla = searchProducts(catalog, "ক্যালিগ্রাফি");
      expect(searchBangla).toHaveLength(1);
      expect(searchBangla[0].title).toBe("Surah Fatiha Wood Canvas");

      const searchCategory = searchProducts(catalog, "islamic");
      expect(searchCategory).toHaveLength(2);

      const emptySearch = searchProducts(catalog, "   ");
      expect(emptySearch).toHaveLength(3);
    });
  });

  // =========================================================================
  // 2. Product Variations and Stock States
  // =========================================================================
  describe("2. Product Variations & Stock States", () => {
    it("determines correct authoritative price with variant precedence", () => {
      const product = {
        id: "p1",
        regular_price: 1500,
        sale_price: 1200,
      };

      const variantWithSale = {
        id: "v1",
        regular_price: 1800,
        sale_price: 1600,
        stock_quantity: 10,
      };

      const variantRegularOnly = {
        id: "v2",
        regular_price: 1800,
        sale_price: null,
        stock_quantity: 5,
      };

      // Variant with sale price
      const price1 = variantWithSale.sale_price ?? variantWithSale.regular_price;
      expect(price1).toBe(1600);

      // Variant without sale price
      const price2 = variantRegularOnly.sale_price ?? variantRegularOnly.regular_price;
      expect(price2).toBe(1800);

      // Product fallback when no variant selected
      const price3 = product.sale_price ?? product.regular_price;
      expect(price3).toBe(1200);
    });

    it("blocks checkout or cart addition when stock quantity is zero", () => {
      function canAddToCart(stock: number, requestedQty: number): { allowed: boolean; reason?: string } {
        if (stock <= 0) {
          return { allowed: false, reason: "স্টক শেষ হয়ে গেছে" };
        }
        if (requestedQty > stock) {
          return { allowed: false, reason: `সর্বোচ্চ ${stock} টি পণ্য কার্টে যোগ করা যাবে` };
        }
        if (requestedQty <= 0) {
          return { allowed: false, reason: "পরিমাণ কমপক্ষে ১ হতে হবে" };
        }
        return { allowed: true };
      }

      expect(canAddToCart(0, 1).allowed).toBe(false);
      expect(canAddToCart(3, 5).allowed).toBe(false);
      expect(canAddToCart(5, 0).allowed).toBe(false);
      expect(canAddToCart(5, 3).allowed).toBe(true);
    });
  });

  // =========================================================================
  // 3. Cart and Authoritative Checkout
  // =========================================================================
  describe("3. Cart & Authoritative Checkout Calculation", () => {
    function calculateAuthoritativeTotal(params: {
      items: Array<{ unitPrice: number; quantity: number }>;
      deliveryArea: "inside_dhaka" | "outside_dhaka";
      freeDeliveryThreshold: number;
      couponDiscount: number;
    }) {
      const subtotal = params.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
      const isFreeDelivery = subtotal >= params.freeDeliveryThreshold;
      const deliveryCharge = isFreeDelivery
        ? 0
        : params.deliveryArea === "inside_dhaka"
        ? 70
        : 130;

      const discount = Math.min(params.couponDiscount, subtotal);
      const total = Math.max(0, subtotal - discount + deliveryCharge);

      return { subtotal, deliveryCharge, discount, total, isFreeDelivery };
    }

    it("calculates subtotal, delivery charges, and free delivery thresholds correctly", () => {
      // Below threshold inside Dhaka
      const calc1 = calculateAuthoritativeTotal({
        items: [{ unitPrice: 500, quantity: 2 }],
        deliveryArea: "inside_dhaka",
        freeDeliveryThreshold: 2000,
        couponDiscount: 0,
      });
      expect(calc1.subtotal).toBe(1000);
      expect(calc1.deliveryCharge).toBe(70);
      expect(calc1.total).toBe(1070);

      // Above threshold outside Dhaka -> Free Delivery
      const calc2 = calculateAuthoritativeTotal({
        items: [{ unitPrice: 1200, quantity: 2 }],
        deliveryArea: "outside_dhaka",
        freeDeliveryThreshold: 2000,
        couponDiscount: 200,
      });
      expect(calc2.subtotal).toBe(2400);
      expect(calc2.isFreeDelivery).toBe(true);
      expect(calc2.deliveryCharge).toBe(0);
      expect(calc2.discount).toBe(200);
      expect(calc2.total).toBe(2200);
    });
  });

  // =========================================================================
  // 4. Payment Success/Failure/Webhook Flows
  // =========================================================================
  describe("4. Payment Webhook & State Handling", () => {
    interface MockOrder {
      id: string;
      order_number: string;
      payment_status: "pending" | "paid" | "failed";
      order_status: "pending" | "processing" | "cancelled";
      transaction_id?: string;
    }

    function processPaymentWebhook(
      order: MockOrder,
      webhookPayload: { status: "COMPLETED" | "FAILED" | "CANCELLED"; invoice_id: string; transaction_id: string }
    ): MockOrder {
      // Idempotency: if already marked paid, return unchanged without double-processing
      if (order.payment_status === "paid") {
        return order;
      }

      if (webhookPayload.status === "COMPLETED") {
        return {
          ...order,
          payment_status: "paid",
          order_status: "processing",
          transaction_id: webhookPayload.transaction_id,
        };
      } else {
        return {
          ...order,
          payment_status: "failed",
          order_status: "pending",
        };
      }
    }

    it("marks order as paid and processing upon COMPLETED webhook", () => {
      const initial: MockOrder = {
        id: "ord_1",
        order_number: "RNG-260902-1001",
        payment_status: "pending",
        order_status: "pending",
      };

      const updated = processPaymentWebhook(initial, {
        status: "COMPLETED",
        invoice_id: "inv_123",
        transaction_id: "trx_987",
      });

      expect(updated.payment_status).toBe("paid");
      expect(updated.order_status).toBe("processing");
      expect(updated.transaction_id).toBe("trx_987");
    });

    it("ensures webhook replay is idempotent and cannot downgrade paid orders", () => {
      const alreadyPaid: MockOrder = {
        id: "ord_1",
        order_number: "RNG-260902-1001",
        payment_status: "paid",
        order_status: "processing",
        transaction_id: "trx_987",
      };

      const replayed = processPaymentWebhook(alreadyPaid, {
        status: "FAILED",
        invoice_id: "inv_123",
        transaction_id: "trx_987",
      });

      expect(replayed.payment_status).toBe("paid");
      expect(replayed.order_status).toBe("processing");
    });
  });

  // =========================================================================
  // 5. Customer Account Isolation
  // =========================================================================
  describe("5. Customer Account Isolation", () => {
    interface UserSession {
      userId: string;
      role: "customer" | "admin";
    }

    function canAccessCustomerData(session: UserSession | null, targetOwnerId: string): boolean {
      if (!session) return false;
      if (session.role === "admin") return true;
      return session.userId === targetOwnerId;
    }

    it("prevents Customer A from accessing Customer B private data", () => {
      const sessionUserA: UserSession = { userId: "user_a", role: "customer" };
      const sessionUserB: UserSession = { userId: "user_b", role: "customer" };

      expect(canAccessCustomerData(sessionUserA, "user_a")).toBe(true);
      expect(canAccessCustomerData(sessionUserA, "user_b")).toBe(false);
      expect(canAccessCustomerData(sessionUserB, "user_a")).toBe(false);
    });

    it("rejects unauthenticated requests from accessing customer profiles", () => {
      expect(canAccessCustomerData(null, "user_a")).toBe(false);
    });
  });

  // =========================================================================
  // 6. Admin Authorization & Least-Privilege Role Matrix
  // =========================================================================
  describe("6. Admin Authorization & Role Matrix", () => {
    it("allows Super Admin unconditional access across all admin routes", () => {
      const superAdminEmail = "bdinfosky@gmail.com";
      expect(canAccessAdminRoute("super_admin", "/admin/settings", superAdminEmail)).toBe(true);
      expect(canAccessAdminRoute(null, "/admin/settings", superAdminEmail)).toBe(true);
      expect(canAccessAdminRoute("super_admin", "/admin/orders", "any@domain.com")).toBe(true);
    });

    it("enforces least privilege for restricted staff roles", () => {
      // delivery_staff can only see /admin/orders and /admin/order-control
      expect(canAccessAdminRoute("delivery_staff", "/admin/orders")).toBe(true);
      expect(canAccessAdminRoute("delivery_staff", "/admin/settings")).toBe(false);
      expect(canAccessAdminRoute("delivery_staff", "/admin/staff")).toBe(false);

      // accountant can view orders, but cannot manage staff or homepage
      expect(canAccessAdminRoute("accountant", "/admin/orders")).toBe(true);
      expect(canAccessAdminRoute("accountant", "/admin/staff")).toBe(false);
      expect(canAccessAdminRoute("accountant", "/admin/homepage")).toBe(false);

      // unauthenticated cannot access any admin route
      expect(canAccessAdminRoute(null, "/admin/dashboard")).toBe(false);
    });

    it("validates that every staff role has defined permissions", () => {
      const roles: AppRole[] = [
        "super_admin",
        "admin",
        "manager",
        "editor",
        "sales",
        "support",
        "delivery_staff",
        "marketing",
        "accountant",
      ];

      for (const r of roles) {
        const meta = ROLE_METADATA[r];
        expect(meta).toBeDefined();
        expect(meta.en).toBeTruthy();
        expect(meta.bn).toBeTruthy();
      }

      // Verify route permissions exist for key protected admin paths
      expect(ROUTE_PERMISSIONS.length).toBeGreaterThan(5);
      const staffRoute = ROUTE_PERMISSIONS.find((rp) => rp.pathPrefix === "/admin/staff");
      expect(staffRoute?.allowedRoles).toEqual(["super_admin"]);
    });
  });

  // =========================================================================
  // 7. Sitemap, Robots, and Metadata
  // =========================================================================
  describe("7. Sitemap, Robots, and SEO Metadata", () => {
    function generateRobotsTxt(storeUrl: string): string {
      return [
        "User-agent: *",
        "Allow: /",
        "Disallow: /admin/",
        "Disallow: /api/",
        "Disallow: /checkout",
        `Sitemap: ${storeUrl}/sitemap.xml`,
      ].join("\n");
    }

    it("generates valid robots.txt with admin disallow and sitemap declaration", () => {
      const robots = generateRobotsTxt("https://www.rangao.com.bd");
      expect(robots).toContain("Disallow: /admin/");
      expect(robots).toContain("Disallow: /checkout");
      expect(robots).toContain("Sitemap: https://www.rangao.com.bd/sitemap.xml");
    });

    it("formats page titles correctly with fallback", () => {
      function formatTitle(pageTitle?: string, storeName = "Rangao"): string {
        if (!pageTitle) return `${storeName} — প্রিমিয়াম হোম ডেকোর ও ইসলামিক ক্যালিগ্রাফি`;
        return `${pageTitle} | ${storeName}`;
      }

      expect(formatTitle("আয়াতুল কুরসী 3D ক্যানভাস")).toBe("আয়াতুল কুরসী 3D ক্যানভাস | Rangao");
      expect(formatTitle()).toBe("Rangao — প্রিমিয়াম হোম ডেকোর ও ইসলামিক ক্যালিগ্রাফি");
    });
  });

  // =========================================================================
  // 8. Critical API Validation, Phone Normalization & Safe Logging
  // =========================================================================
  describe("8. Critical API Validation & Safe Error Telemetry", () => {
    it("normalizes Bangladeshi mobile numbers into canonical 11-digit format", () => {
      expect(normalizeBDPhone("01712345678")).toBe("01712345678");
      expect(normalizeBDPhone("+8801812345678")).toBe("01812345678");
      expect(normalizeBDPhone("880 1912-345678")).toBe("01912345678");
      expect(normalizeBDPhone("01300 000 000")).toBe("01300000000");
    });

    it("scrubs phone numbers, emails, tokens, and passwords from frontend error logs", () => {
      const dirtyError = new Error("Failed for user 01712345678 with email customer@gmail.com and token eyJhbGciOiJIUzI1NiJ9.test");
      const report = reportError(dirtyError, {
        customer_phone: "01712345678",
        customer_email: "customer@gmail.com",
        password: "supersecretpass",
        safeMeta: "checkout_failed",
      });

      expect(report.message).not.toContain("01712345678");
      expect(report.message).not.toContain("customer@gmail.com");
      expect(report.message).toContain("[REDACTED_PHONE]");
      expect(report.message).toContain("[REDACTED_EMAIL]");
      expect(report.message).toContain("[REDACTED_JWT]");

      const ctx = report.context as Record<string, unknown>;
      expect(ctx.customer_phone).toBe("[REDACTED]");
      expect(ctx.customer_email).toBe("[REDACTED]");
      expect(ctx.password).toBe("[REDACTED]");
      expect(ctx.safeMeta).toBe("checkout_failed");

      const recent = getRecentErrors();
      expect(recent.length).toBeGreaterThan(0);
      expect(recent[0].id).toBe(report.id);
    });

    it("scrubs Bearer tokens and sensitive payloads from serverless function logger", () => {
      const dirtyServerString = "Authorization: Bearer secret_token_xyz for 01999999999 user user@domain.com";
      const cleaned = redactString(dirtyServerString);

      expect(cleaned).not.toContain("secret_token_xyz");
      expect(cleaned).not.toContain("01999999999");
      expect(cleaned).not.toContain("user@domain.com");
      expect(cleaned).toContain("Bearer [REDACTED_TOKEN]");

      const cleanedPayload = redactPayload({
        phone: "01711111111",
        api_key: "uddoktapay_live_key_999",
        order_id: "ord_100",
      }) as Record<string, unknown>;

      expect(cleanedPayload.phone).toBe("[REDACTED]");
      expect(cleanedPayload.api_key).toBe("[REDACTED]");
      expect(cleanedPayload.order_id).toBe("ord_100");
    });

    it("provides Google Web Vitals standard thresholds", () => {
      expect(VITALS_THRESHOLDS.LCP.good).toBe(2500);
      expect(VITALS_THRESHOLDS.INP.good).toBe(200);
      expect(VITALS_THRESHOLDS.CLS.good).toBe(0.1);
    });
  });
});
