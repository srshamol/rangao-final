import { describe, it, expect } from "vitest";

// Staff roles definition from useAuth.ts
const STAFF_ROLES = [
  "super_admin",
  "admin",
  "moderator",
  "support",
  "delivery_staff",
  "manager",
  "editor",
  "sales",
  "marketing",
  "accountant",
];

// Helper functions that represent the logic in AdminLogin.tsx and useAuth.ts
function isEmail(input: string): boolean {
  return input.includes("@");
}

function isStaffRole(role: string): boolean {
  return STAFF_ROLES.includes(role);
}

describe("Admin Login Logic Verification", () => {
  describe("Username vs Email Detection", () => {
    it("should classify standard emails correctly", () => {
      expect(isEmail("bdinfosky@gmail.com")).toBe(true);
      expect(isEmail("admin@rangao.bd")).toBe(true);
    });

    it("should classify usernames without @ symbol correctly", () => {
      expect(isEmail("admin")).toBe(false);
      expect(isEmail("super_admin_user")).toBe(false);
    });
  });

  describe("Staff Roles Verification", () => {
    it("should allow recognized admin and staff roles", () => {
      expect(isStaffRole("admin")).toBe(true);
      expect(isStaffRole("super_admin")).toBe(true);
      expect(isStaffRole("delivery_staff")).toBe(true);
      expect(isStaffRole("manager")).toBe(true);
    });

    it("should reject unrecognized or customer roles", () => {
      expect(isStaffRole("customer")).toBe(false);
      expect(isStaffRole("user")).toBe(false);
      expect(isStaffRole("guest")).toBe(false);
      expect(isStaffRole("")).toBe(false);
    });
  });
});
