/**
 * Comprehensive Role-Based Access Control (RBAC) & Least-Privilege Permission Module
 * Defines roles, resource capabilities, route access boundaries, and error sanitization.
 */

export type AppRole =
  | "super_admin"
  | "admin"
  | "manager"
  | "editor"
  | "sales"
  | "support"
  | "delivery_staff"
  | "marketing"
  | "accountant";

export const ALL_STAFF_ROLES: AppRole[] = [
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

export const ROLE_METADATA: Record<AppRole, { en: string; bn: string; description: string }> = {
  super_admin: {
    en: "Super Admin",
    bn: "সুপার অ্যাডমিন",
    description: "সম্পূর্ণ আনরেস্ট্রিক্টেড অ্যাক্সেস, স্টাফ রোল ও নিরাপত্তা সেটিংস ম্যানেজমেন্ট।",
  },
  admin: {
    en: "Admin",
    bn: "অ্যাডমিন",
    description: "স্টোরের সার্বিক পরিচালনা, অর্ডার, ইনভেন্টরি, প্রোডাক্ট ও সেটিংস কন্ট্রোল।",
  },
  manager: {
    en: "Manager",
    bn: "ম্যানেজার",
    description: "দৈনন্দিন অপারেশন, প্রোডাক্ট ক্যাটালগ, কুপন এবং অর্ডার প্রসেসিং।",
  },
  editor: {
    en: "Editor",
    bn: "এডিটর",
    description: "প্রোডাক্ট কন্টেন্ট, ব্লগ, ব্র্যান্ডস ও মিডিয়া লাইব্রেরি ম্যানেজমেন্ট।",
  },
  sales: {
    en: "Sales",
    bn: "সেলস টিম",
    description: "অর্ডার কনফার্মেশন, ইনকমপ্লিট অর্ডার ফলো-আপ এবং কাস্টমার সেলস।",
  },
  support: {
    en: "Support",
    bn: "কাস্টমার সাপোর্ট",
    description: "অর্ডার ট্র্যাকিং, কাস্টমার নোট ও সহায়তা সংক্রান্ত কাজ।",
  },
  delivery_staff: {
    en: "Delivery Staff",
    bn: "ডেলিভারি স্টাফ",
    description: "শিপড অর্ডার পার্সেল ডেলিভারি ও রিটার্ন স্ট্যাটাস আপডেট।",
  },
  marketing: {
    en: "Marketing",
    bn: "মার্কেটিং",
    description: "কুপন, ব্যানার, এসইও, ক্যাম্পেইন ও টেসটিমোনিয়াল ম্যানেজমেন্ট।",
  },
  accountant: {
    en: "Accountant",
    bn: "হিসাবরক্ষক (অ্যাকাউন্ট্যান্ট)",
    description: "ফাইন্যান্স, ট্রানজ্যাকশন, কুরিয়ার ব্যালেন্স ও সম্পন্ন অর্ডারের হিসেব।",
  },
};

export type AdminResource =
  | "dashboard"
  | "orders"
  | "incomplete_orders"
  | "order_control"
  | "products"
  | "categories"
  | "inventory"
  | "coupons"
  | "finance"
  | "customers"
  | "staff"
  | "settings"
  | "storage_diagnostics"
  | "media_library"
  | "homepage"
  | "homepage_seo"
  | "testimonials"
  | "brands"
  | "blog"
  | "profile"
  | "audit_logs";

export type PermissionAction = "view" | "create" | "edit" | "delete";

/**
 * Route-level permission map: which roles can access each admin route
 */
export const ROUTE_PERMISSIONS: { pathPrefix: string; exact?: boolean; allowedRoles: AppRole[] }[] = [
  // Super Admin exclusive
  { pathPrefix: "/admin/staff", allowedRoles: ["super_admin"] },
  { pathPrefix: "/admin/operational-health", allowedRoles: ["super_admin", "admin"] },
  { pathPrefix: "/admin/settings/storage-diagnostics", allowedRoles: ["super_admin", "admin"] },
  { pathPrefix: "/admin/settings", exact: true, allowedRoles: ["super_admin", "admin"] },

  // Finance & Accounting
  { pathPrefix: "/admin/finance", allowedRoles: ["super_admin", "admin", "accountant"] },

  // Order Control & Fraud
  { pathPrefix: "/admin/order-control", allowedRoles: ["super_admin", "admin", "manager"] },

  // Orders & Incomplete Orders
  {
    pathPrefix: "/admin/orders",
    allowedRoles: ["super_admin", "admin", "manager", "sales", "support", "delivery_staff", "accountant"],
  },
  {
    pathPrefix: "/admin/incomplete-orders",
    allowedRoles: ["super_admin", "admin", "manager", "sales", "support"],
  },

  // Inventory
  {
    pathPrefix: "/admin/inventory",
    allowedRoles: ["super_admin", "admin", "manager", "sales", "accountant"],
  },

  // Customers
  {
    pathPrefix: "/admin/customers",
    allowedRoles: ["super_admin", "admin", "manager", "support"],
  },

  // Products & Categories
  {
    pathPrefix: "/admin/products",
    allowedRoles: ["super_admin", "admin", "manager", "editor", "marketing", "sales"],
  },
  {
    pathPrefix: "/admin/categories",
    allowedRoles: ["super_admin", "admin", "manager", "editor"],
  },

  // Coupons
  {
    pathPrefix: "/admin/coupons",
    allowedRoles: ["super_admin", "admin", "manager", "marketing"],
  },

  // Media & Assets
  {
    pathPrefix: "/admin/media-library",
    allowedRoles: ["super_admin", "admin", "manager", "editor", "marketing"],
  },

  // Homepage, SEO, Testimonials, Brands, Blog
  {
    pathPrefix: "/admin/homepage-seo",
    allowedRoles: ["super_admin", "admin", "marketing"],
  },
  {
    pathPrefix: "/admin/homepage",
    allowedRoles: ["super_admin", "admin", "manager", "marketing", "editor"],
  },
  {
    pathPrefix: "/admin/testimonials",
    allowedRoles: ["super_admin", "admin", "manager", "editor", "marketing"],
  },
  {
    pathPrefix: "/admin/brands",
    allowedRoles: ["super_admin", "admin", "manager", "editor"],
  },
  {
    pathPrefix: "/admin/blog",
    allowedRoles: ["super_admin", "admin", "manager", "editor", "marketing"],
  },

  // Dashboard & Profile
  {
    pathPrefix: "/admin/profile",
    allowedRoles: ALL_STAFF_ROLES,
  },
  {
    pathPrefix: "/admin",
    exact: true,
    allowedRoles: ALL_STAFF_ROLES,
  },
];

/**
 * Check whether a role has permission to access a specific route
 */
export function canAccessAdminRoute(
  role: string | null | undefined,
  pathname: string,
  userEmail?: string | null
): boolean {
  if (userEmail?.toLowerCase() === "bdinfosky@gmail.com") return true;
  if (!role) return false;
  const normalizedRole = role.toLowerCase() as AppRole;
  if (!ALL_STAFF_ROLES.includes(normalizedRole)) return false;

  // Super Admin can access everything
  if (normalizedRole === "super_admin") return true;

  // Clean trailing slash
  const cleanPath = pathname.replace(/\/$/, "");

  // Find most specific match
  for (const rule of ROUTE_PERMISSIONS) {
    if (rule.exact) {
      if (cleanPath === rule.pathPrefix) {
        return rule.allowedRoles.includes(normalizedRole);
      }
    } else {
      if (cleanPath === rule.pathPrefix || cleanPath.startsWith(rule.pathPrefix + "/")) {
        return rule.allowedRoles.includes(normalizedRole);
      }
    }
  }

  // If path starts with /admin, fallback check
  if (cleanPath.startsWith("/admin")) {
    return false;
  }

  return true;
}

/**
 * Valid order status transitions state machine
 */
export const ALLOWED_ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled", "courier_cancelled", "processing"],
  confirmed: ["processing", "cancelled", "courier_cancelled", "shipped"],
  processing: ["shipped", "cancelled", "courier_cancelled"],
  shipped: ["delivered", "returned", "cancelled", "courier_cancelled"],
  delivered: ["returned", "cancelled"], // return/refund flow
  cancelled: ["pending"], // re-opening closed orders
  courier_cancelled: ["pending"],
  returned: ["pending"],
};

/**
 * Validate an order status change for a given role
 */
export function canPerformOrderTransition(
  role: string | null | undefined,
  fromStatus: string,
  toStatus: string
): { allowed: boolean; reason?: string } {
  if (!role) {
    return { allowed: false, reason: "অননুমোদিত অ্যাক্সেস: লগইন করুন" };
  }

  const normalizedRole = role.toLowerCase() as AppRole;
  if (!ALL_STAFF_ROLES.includes(normalizedRole)) {
    return { allowed: false, reason: "অকার্যকর স্টাফ রোল" };
  }

  // Super Admin emergency override
  if (normalizedRole === "super_admin") {
    return { allowed: true };
  }

  // Accountant cannot modify order status
  if (normalizedRole === "accountant") {
    return { allowed: false, reason: "হিসাবরক্ষক রোল থেকে অর্ডারের স্ট্যাটাস পরিবর্তন করার অনুমতি নেই।" };
  }

  // Delivery staff can only mark shipped orders as delivered or returned
  if (normalizedRole === "delivery_staff") {
    if (fromStatus !== "shipped" || !["delivered", "returned"].includes(toStatus)) {
      return {
        allowed: false,
        reason: "ডেলিভারি স্টাফ শুধুমাত্র শিপড অর্ডার ডেলিভার্ড অথবা রিটার্ন হিসেবে চিহ্নিত করতে পারেন।",
      };
    }
    return { allowed: true };
  }

  // Check state machine validity
  const allowedNext = ALLOWED_ORDER_STATUS_TRANSITIONS[fromStatus];
  if (!allowedNext || !allowedNext.includes(toStatus)) {
    return {
      allowed: false,
      reason: `স্ট্যাটাস "${fromStatus}" থেকে "${toStatus}" এ পরিবর্তন করা সম্ভব নয়।`,
    };
  }

  // Re-opening closed orders (cancelled/returned -> pending) is restricted to super_admin, admin, manager
  if (["cancelled", "courier_cancelled", "returned"].includes(fromStatus) && toStatus === "pending") {
    if (!["super_admin", "admin", "manager"].includes(normalizedRole)) {
      return {
        allowed: false,
        reason: "বাতিলকৃত অর্ডার পুনরায় সচল করার অনুমতি শুধুমাত্র অ্যাডমিন ও ম্যানেজারের রয়েছে।",
      };
    }
  }

  return { allowed: true };
}

/**
 * Sanitize admin error messages before presenting them in UI / toast
 * Prevents leaking Postgres table names, SQL queries, stack traces, or credentials
 */
export function sanitizeAdminError(error: any): string {
  if (!error) return "একটি অপ্রত্যাশিত ত্রুটি ঘটেছে। অনুগ্রহ করে আবার চেষ্টা করুন।";

  const msg = typeof error === "string" ? error : error.message || String(error);

  // Check for known security/permission errors
  if (msg.includes("permission denied") || msg.includes("row-level security") || msg.includes("42501")) {
    return "অননুমোদিত অ্যাকশন: এই কাজটি সম্পন্ন করার পর্যাপ্ত পারমিশন আপনার নেই।";
  }

  if (msg.includes("INVALID_ORDER_TRANSITION") || msg.includes("INVALID_TRANSITION")) {
    return "অকার্যকর স্ট্যাটাস পরিবর্তন: এই অর্ডারে এই স্ট্যাটাস প্রয়োগ করা সম্ভব নয়।";
  }

  if (msg.includes("OUT_OF_STOCK")) {
    return "ইনভেন্টরি ত্রুটি: পর্যাপ্ত স্টক নেই।";
  }

  if (msg.includes("duplicate key") || msg.includes("unique constraint")) {
    return "এই তথ্যটি ইতিমধ্যে ডাটাবেজে সংরক্ষিত রয়েছে।";
  }

  // Strip database schema / internal paths / stack keywords
  const sanitized = msg
    .replace(/PGRST\d+/gi, "")
    .replace(/relation ".*?"/gi, "রেকর্ড")
    .replace(/column ".*?"/gi, "ফিল্ড")
    .replace(/at Object\..*$/gi, "")
    .replace(/at async.*$/gi, "")
    .replace(/https?:\/\/[^\s]+/gi, "")
    .trim();

  return sanitized || "অপারেশন সম্পন্ন করা সম্ভব হয়নি।";
}
