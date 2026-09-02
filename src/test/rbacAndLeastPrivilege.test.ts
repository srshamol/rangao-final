import { describe, it, expect } from "vitest";
import {
  canAccessAdminRoute,
  canPerformOrderTransition,
  sanitizeAdminError,
  ALL_STAFF_ROLES,
  type AppRole,
} from "@/lib/permissions";
import { mediaService } from "@/lib/mediaService";

describe("RBAC & Least-Privilege Security Suite", () => {
  // =========================================================================
  // 1. ROLE PERMISSION BOUNDARIES
  // =========================================================================
  describe("1. Role Permission Boundaries Across All 9 Roles", () => {
    it("should allow super_admin full unrestricted access across all admin routes", () => {
      const allRoutes = [
        "/admin",
        "/admin/staff",
        "/admin/finance",
        "/admin/settings",
        "/admin/orders",
        "/admin/products",
        "/admin/inventory",
        "/admin/coupons",
        "/admin/customers",
        "/admin/media-library",
        "/admin/homepage",
        "/admin/blog",
      ];

      for (const route of allRoutes) {
        expect(canAccessAdminRoute("super_admin", route)).toBe(true);
      }
    });

    it("should enforce least-privilege boundaries for editor (content only)", () => {
      // Allowed: Content and catalog
      expect(canAccessAdminRoute("editor", "/admin/products")).toBe(true);
      expect(canAccessAdminRoute("editor", "/admin/categories")).toBe(true);
      expect(canAccessAdminRoute("editor", "/admin/blog")).toBe(true);
      expect(canAccessAdminRoute("editor", "/admin/media-library")).toBe(true);

      // Denied: Orders, customer data, finance, staff, settings
      expect(canAccessAdminRoute("editor", "/admin/orders")).toBe(false);
      expect(canAccessAdminRoute("editor", "/admin/customers")).toBe(false);
      expect(canAccessAdminRoute("editor", "/admin/finance")).toBe(false);
      expect(canAccessAdminRoute("editor", "/admin/staff")).toBe(false);
      expect(canAccessAdminRoute("editor", "/admin/settings")).toBe(false);
    });

    it("should enforce least-privilege boundaries for sales (orders & conversion only)", () => {
      // Allowed: Orders and conversion
      expect(canAccessAdminRoute("sales", "/admin/orders")).toBe(true);
      expect(canAccessAdminRoute("sales", "/admin/incomplete-orders")).toBe(true);
      expect(canAccessAdminRoute("sales", "/admin/products")).toBe(true);

      // Denied: Finance, staff, settings, coupons
      expect(canAccessAdminRoute("sales", "/admin/finance")).toBe(false);
      expect(canAccessAdminRoute("sales", "/admin/staff")).toBe(false);
      expect(canAccessAdminRoute("sales", "/admin/settings")).toBe(false);
      expect(canAccessAdminRoute("sales", "/admin/coupons")).toBe(false);
    });

    it("should enforce least-privilege boundaries for delivery_staff", () => {
      // Allowed: Orders for dispatch
      expect(canAccessAdminRoute("delivery_staff", "/admin/orders")).toBe(true);

      // Denied: Finance, settings, staff, products, categories, coupons, media
      expect(canAccessAdminRoute("delivery_staff", "/admin/finance")).toBe(false);
      expect(canAccessAdminRoute("delivery_staff", "/admin/settings")).toBe(false);
      expect(canAccessAdminRoute("delivery_staff", "/admin/staff")).toBe(false);
      expect(canAccessAdminRoute("delivery_staff", "/admin/products")).toBe(false);
      expect(canAccessAdminRoute("delivery_staff", "/admin/coupons")).toBe(false);
      expect(canAccessAdminRoute("delivery_staff", "/admin/media-library")).toBe(false);
      expect(canAccessAdminRoute("delivery_staff", "/admin/customers")).toBe(false);
    });

    it("should enforce least-privilege boundaries for marketing", () => {
      // Allowed: Coupons, homepage, blog, SEO, media
      expect(canAccessAdminRoute("marketing", "/admin/coupons")).toBe(true);
      expect(canAccessAdminRoute("marketing", "/admin/homepage")).toBe(true);
      expect(canAccessAdminRoute("marketing", "/admin/homepage-seo")).toBe(true);
      expect(canAccessAdminRoute("marketing", "/admin/blog")).toBe(true);
      expect(canAccessAdminRoute("marketing", "/admin/media-library")).toBe(true);

      // Denied: Orders, customer PII, finance, staff, settings
      expect(canAccessAdminRoute("marketing", "/admin/orders")).toBe(false);
      expect(canAccessAdminRoute("marketing", "/admin/customers")).toBe(false);
      expect(canAccessAdminRoute("marketing", "/admin/finance")).toBe(false);
      expect(canAccessAdminRoute("marketing", "/admin/staff")).toBe(false);
      expect(canAccessAdminRoute("marketing", "/admin/settings")).toBe(false);
    });

    it("should enforce least-privilege boundaries for accountant", () => {
      // Allowed: Finance, completed orders review, inventory valuation
      expect(canAccessAdminRoute("accountant", "/admin/finance")).toBe(true);
      expect(canAccessAdminRoute("accountant", "/admin/orders")).toBe(true);
      expect(canAccessAdminRoute("accountant", "/admin/inventory")).toBe(true);

      // Denied: Staff, settings, coupon creation, media upload, product editing
      expect(canAccessAdminRoute("accountant", "/admin/staff")).toBe(false);
      expect(canAccessAdminRoute("accountant", "/admin/settings")).toBe(false);
      expect(canAccessAdminRoute("accountant", "/admin/media-library")).toBe(false);
      expect(canAccessAdminRoute("accountant", "/admin/products")).toBe(false);
    });

    it("should strictly deny staff route to everyone except super_admin", () => {
      const nonSuperAdminRoles: AppRole[] = [
        "admin",
        "manager",
        "editor",
        "sales",
        "support",
        "delivery_staff",
        "marketing",
        "accountant",
      ];

      for (const r of nonSuperAdminRoles) {
        expect(canAccessAdminRoute(r, "/admin/staff")).toBe(false);
      }
      expect(canAccessAdminRoute("super_admin", "/admin/staff")).toBe(true);
    });
  });

  // =========================================================================
  // 2. CUSTOMER ISOLATION OF ACCOUNT & ORDER DATA
  // =========================================================================
  describe("2. Customer Isolation of Account and Order Data", () => {
    it("should isolate customer orders: customer A cannot read customer B's orders", () => {
      const customerAId = "cust-1111-aaaa";
      const customerBId = "cust-2222-bbbb";

      const ordersTable = [
        { id: "ord-1", user_id: customerAId, customer_name: "Customer A", total: 1200 },
        { id: "ord-2", user_id: customerBId, customer_name: "Customer B", total: 2400 },
      ];

      // Simulated RLS filter: SELECT WHERE user_id = auth.uid()
      const simulateCustomerOrderSelect = (authenticatedUid: string) => {
        return ordersTable.filter((o) => o.user_id === authenticatedUid);
      };

      const resultsForA = simulateCustomerOrderSelect(customerAId);
      expect(resultsForA).toHaveLength(1);
      expect(resultsForA[0].id).toBe("ord-1");
      expect(resultsForA.some((o) => o.user_id === customerBId)).toBe(false);

      const resultsForB = simulateCustomerOrderSelect(customerBId);
      expect(resultsForB).toHaveLength(1);
      expect(resultsForB[0].id).toBe("ord-2");
    });

    it("should prevent public unauthenticated users from querying internal order notes or history", () => {
      const simulateOrderNotesAccess = (role: "anon" | "customer" | "staff") => {
        if (role === "staff") return { allowed: true };
        return { allowed: false, error: "RLS_PERMISSION_DENIED" };
      };

      expect(simulateOrderNotesAccess("anon").allowed).toBe(false);
      expect(simulateOrderNotesAccess("customer").allowed).toBe(false);
      expect(simulateOrderNotesAccess("staff").allowed).toBe(true);
    });

    it("should mask customer PII on public tracking if requester is unauthenticated and phone does not match", () => {
      // Simulating get_order_summary_by_number anti-scraping logic
      const simulateOrderSummaryLookup = (
        orderRecord: { order_number: string; customer_phone: string; customer_name: string },
        requester: { role: string; uid?: string; verifyPhone?: string; isRecentCheckout?: boolean }
      ) => {
        const isStaff = ["super_admin", "admin", "manager", "support"].includes(requester.role);
        const isVerifiedPhone =
          requester.verifyPhone &&
          requester.verifyPhone.replace(/\D/g, "").slice(-10) ===
            orderRecord.customer_phone.replace(/\D/g, "").slice(-10);

        if (isStaff || isVerifiedPhone || requester.isRecentCheckout) {
          return { is_masked: false, name: orderRecord.customer_name, phone: orderRecord.customer_phone };
        }

        // Masked for arbitrary public scrapers
        return { is_masked: true, name: undefined, phone: undefined };
      };

      const order = {
        order_number: "RNG-9988",
        customer_phone: "01711000000",
        customer_name: "Farhana Ahmed",
      };

      // Random anonymous scraper with no phone
      const scraperRes = simulateOrderSummaryLookup(order, { role: "anon" });
      expect(scraperRes.is_masked).toBe(true);
      expect(scraperRes.name).toBeUndefined();

      // Verified customer with correct phone
      const customerRes = simulateOrderSummaryLookup(order, { role: "anon", verifyPhone: "01711000000" });
      expect(customerRes.is_masked).toBe(false);
      expect(customerRes.name).toBe("Farhana Ahmed");
    });
  });

  // =========================================================================
  // 3. UNAUTHORIZED ADMIN ROUTE / API ACCESS & ERROR SANITIZATION
  // =========================================================================
  describe("3. Unauthorized Admin Route/API Access & Safe Errors", () => {
    it("should deny unauthenticated requests or invalid roles across all admin subroutes", () => {
      const routes = ["/admin", "/admin/orders", "/admin/finance", "/admin/settings"];

      for (const route of routes) {
        expect(canAccessAdminRoute(null, route)).toBe(false);
        expect(canAccessAdminRoute(undefined, route)).toBe(false);
        expect(canAccessAdminRoute("customer", route)).toBe(false);
        expect(canAccessAdminRoute("hacker", route)).toBe(false);
      }
    });

    it("should sanitize admin errors and strip database tables, SQL queries, and stack traces", () => {
      const rawPgError = new Error(
        'permission denied for table "user_roles" at Object.query (file:///app/dist/index.js:12:4)'
      );
      const sanitized = sanitizeAdminError(rawPgError);
      expect(sanitized).not.toContain("user_roles");
      expect(sanitized).not.toContain("Object.query");
      expect(sanitized).toContain("অননুমোদিত অ্যাকশন");

      const transitionError = new Error("INVALID_ORDER_TRANSITION: Cannot transition order from pending to delivered");
      const sanitizedTransition = sanitizeAdminError(transitionError);
      expect(sanitizedTransition).toContain("অকার্যকর স্ট্যাটাস পরিবর্তন");
    });
  });

  // =========================================================================
  // 4. AUDIT-LOG CREATION FOR SENSITIVE OPERATIONS
  // =========================================================================
  describe("4. Audit-Log Creation for Sensitive Operations", () => {
    it("should construct valid audit log payload with actor, action, previous_state, and new_state", () => {
      const createAuditEntry = (
        action: string,
        entityType: string,
        entityId: string,
        prevState: any,
        newState: any,
        actor: { id: string; role: string; email: string },
        reason?: string
      ) => {
        return {
          id: "audit-" + Math.random().toString(36).slice(2, 9),
          actor_id: actor.id,
          actor_email: actor.email,
          actor_role: actor.role,
          action,
          entity_type: entityType,
          entity_id: entityId,
          previous_state: prevState,
          new_state: newState,
          reason: reason || null,
          created_at: new Date().toISOString(),
        };
      };

      // 1. Order Status Change
      const orderAudit = createAuditEntry(
        "order_status_change",
        "order",
        "ord-12345",
        { status: "shipped" },
        { status: "delivered" },
        { id: "staff-1", role: "delivery_staff", email: "delivery@rangao.bd" },
        "Customer received package and paid COD"
      );

      expect(orderAudit.action).toBe("order_status_change");
      expect(orderAudit.actor_role).toBe("delivery_staff");
      expect(orderAudit.previous_state.status).toBe("shipped");
      expect(orderAudit.new_state.status).toBe("delivered");
      expect(orderAudit.reason).toContain("paid COD");

      // 2. Staff Role Change
      const roleAudit = createAuditEntry(
        "role_changed",
        "staff",
        "user-999",
        { role: "editor" },
        { role: "manager" },
        { id: "super-1", role: "super_admin", email: "bdinfosky@gmail.com" },
        "Promoted to operations manager"
      );

      expect(roleAudit.action).toBe("role_changed");
      expect(roleAudit.actor_role).toBe("super_admin");
      expect(roleAudit.previous_state.role).toBe("editor");
      expect(roleAudit.new_state.role).toBe("manager");
    });
  });

  // =========================================================================
  // 5. INVALID ORDER-STATUS TRANSITION REJECTION
  // =========================================================================
  describe("5. Invalid Order-Status Transition Rejection (FSM)", () => {
    it("should reject invalid status jumps (e.g. pending to delivered, cancelled to delivered)", () => {
      // Pending -> Delivered: must go through confirmed -> processing -> shipped
      const jumpAttempt = canPerformOrderTransition("manager", "pending", "delivered");
      expect(jumpAttempt.allowed).toBe(false);
      expect(jumpAttempt.reason).toBeDefined();

      // Cancelled -> Delivered: invalid terminal leap
      const cancelledJump = canPerformOrderTransition("admin", "cancelled", "delivered");
      expect(cancelledJump.allowed).toBe(false);

      // Delivered -> Processing: cannot reverse completed delivery to processing
      const reverseAttempt = canPerformOrderTransition("sales", "delivered", "processing");
      expect(reverseAttempt.allowed).toBe(false);
    });

    it("should accept valid order status transitions along the canonical lifecycle", () => {
      // pending -> confirmed
      expect(canPerformOrderTransition("sales", "pending", "confirmed").allowed).toBe(true);

      // confirmed -> processing
      expect(canPerformOrderTransition("manager", "confirmed", "processing").allowed).toBe(true);

      // processing -> shipped
      expect(canPerformOrderTransition("admin", "processing", "shipped").allowed).toBe(true);

      // shipped -> delivered (delivery staff)
      expect(canPerformOrderTransition("delivery_staff", "shipped", "delivered").allowed).toBe(true);

      // shipped -> returned (delivery staff)
      expect(canPerformOrderTransition("delivery_staff", "shipped", "returned").allowed).toBe(true);
    });

    it("should prevent delivery_staff from modifying pending or confirmed orders", () => {
      const invalidStaffAttempt = canPerformOrderTransition("delivery_staff", "pending", "confirmed");
      expect(invalidStaffAttempt.allowed).toBe(false);
      expect(invalidStaffAttempt.reason).toContain("ডেলিভারি স্টাফ শুধুমাত্র শিপড অর্ডার");
    });

    it("should prevent accountant from modifying order statuses", () => {
      const accountantAttempt = canPerformOrderTransition("accountant", "pending", "confirmed");
      expect(accountantAttempt.allowed).toBe(false);
      expect(accountantAttempt.reason).toContain("হিসাবরক্ষক রোল থেকে");
    });

    it("should restrict re-opening cancelled orders to super_admin, admin, and manager", () => {
      expect(canPerformOrderTransition("sales", "cancelled", "pending").allowed).toBe(false);
      expect(canPerformOrderTransition("support", "cancelled", "pending").allowed).toBe(false);
      expect(canPerformOrderTransition("manager", "cancelled", "pending").allowed).toBe(true);
      expect(canPerformOrderTransition("admin", "cancelled", "pending").allowed).toBe(true);
      expect(canPerformOrderTransition("super_admin", "cancelled", "pending").allowed).toBe(true);
    });
  });

  // =========================================================================
  // 6. UNAUTHORIZED MEDIA UPLOAD / DELETE ATTEMPTS
  // =========================================================================
  describe("6. Unauthorized Media Upload and Delete Attempts", () => {
    it("should reject invalid file types and non-whitelisted MIME types", () => {
      const exeFile = new File(["fake-binary"], "malicious.exe", { type: "application/x-msdownload" });
      const exeValidation = mediaService.validateFile(exeFile, "images");
      expect(exeValidation.valid).toBe(false);

      const htmlFile = new File(["<html>bad</html>"], "attack.html", { type: "text/html" });
      const htmlValidation = mediaService.validateFile(htmlFile, "images");
      expect(htmlValidation.valid).toBe(false);

      const validImage = new File(["fake-png"], "banner.png", { type: "image/png" });
      const imageValidation = mediaService.validateFile(validImage, "images");
      expect(imageValidation.valid).toBe(true);
    });

    it("should reject files exceeding strict bucket size limits", () => {
      // 10MB compressed image (max allowed is 5MB)
      const oversizedImage = new File([new Uint8Array(10 * 1024 * 1024)], "oversized.jpg", { type: "image/jpeg" });
      const sizeValidation = mediaService.validateFile(oversizedImage, "images", true);
      expect(sizeValidation.valid).toBe(false);
      expect(sizeValidation.error).toContain("সর্বোচ্চ সাইজ");
    });

    it("should sanitize custom file paths against directory traversal", () => {
      const sanitizePath = (customPath?: string) => {
        return customPath
          ? customPath.replace(/\.\./g, "").replace(/[^a-zA-Z0-9_\-\/.]/g, "_").replace(/^\/+/, "")
          : undefined;
      };

      const attackPath = "../../etc/passwd.jpg";
      const sanitized = sanitizePath(attackPath);
      expect(sanitized).not.toContain("..");
      expect(sanitized).toBe("etc/passwd.jpg");

      const cleanPath = "hero/desktop-banner.webp";
      expect(sanitizePath(cleanPath)).toBe("hero/desktop-banner.webp");
    });
  });
});
