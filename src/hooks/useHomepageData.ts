import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DBCategory {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface DBProduct {
  id: string;
  name: string;
  sku: string | null;
  category: string;
  regular_price: number;
  sale_price: number | null;
  stock_quantity: number;
  description: string;
  images: string[];
  featured: boolean;
  rating: number;
  review_count: number;
  status: string;
  tags: string[];
  created_at: string;
}

export interface DBTestimonial {
  id: string;
  customer_name: string;
  customer_location: string;
  customer_image_url: string;
  rating: number;
  review: string;
  is_active: boolean;
  sort_order: number;
}

export interface DBBrand {
  id: string;
  name: string;
  logo_url: string;
  website_url: string;
  is_active: boolean;
  sort_order: number;
}

// ─── Category Hooks ───────────────────────────────────────────────────────────

export function useCategories(opts?: { 
  ids?: string[]; 
  limit?: number; 
  sortBy?: "custom" | "newest" | "oldest" | "products" | "alphabetical";
}) {
  return useQuery({
    queryKey: ["homepage-categories", opts?.ids, opts?.limit, opts?.sortBy],
    queryFn: async () => {
      let q = supabase
        .from("categories")
        .select("*")
        .eq("is_active", true);

      // Apply initial query sorting
      if (opts?.sortBy === "newest") {
        q = q.order("created_at", { ascending: false });
      } else if (opts?.sortBy === "oldest") {
        q = q.order("created_at", { ascending: true });
      } else if (opts?.sortBy === "alphabetical") {
        q = q.order("name", { ascending: true });
      } else {
        // default/custom sort order
        q = q.order("sort_order", { ascending: true });
      }

      if (opts?.ids && opts.ids.length > 0) {
        q = q.in("id", opts.ids);
      }
      if (opts?.limit && opts?.sortBy !== "products") {
        q = q.limit(opts.limit);
      }

      const { data, error } = await q;
      if (error) throw error;

      let result = (data || []) as DBCategory[];

      // Special post-processing sort by product counts
      if (opts?.sortBy === "products") {
        const { data: products } = await supabase.from("products").select("category");
        const counts: Record<string, number> = {};
        (products || []).forEach((p: any) => {
          counts[p.category] = (counts[p.category] || 0) + 1;
        });

        result.sort((a, b) => (counts[b.slug] || 0) - (counts[a.slug] || 0));

        if (opts?.limit) {
          result = result.slice(0, opts.limit);
        }
      }

      return result;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    gcTime: 1000 * 60 * 10,
  });
}

// ─── Product Hooks ────────────────────────────────────────────────────────────

type ProductFilter = "featured" | "newest" | "best_seller" | "manual" | "category" | "sale";

export function useProducts(opts: {
  filter: ProductFilter;
  limit?: number;
  ids?: string[];
  categorySlug?: string;
}) {
  return useQuery({
    queryKey: ["homepage-products", opts.filter, opts.limit, opts.ids, opts.categorySlug],
    queryFn: async () => {
      let q = supabase
        .from("products")
        .select("*")
        .eq("status", "active")
        .gt("stock_quantity", 0);

      switch (opts.filter) {
        case "featured":
          q = q.eq("featured", true).order("created_at", { ascending: false });
          break;
        case "newest":
          q = q.order("created_at", { ascending: false });
          break;
        case "best_seller":
          q = q.order("review_count", { ascending: false });
          break;
        case "sale":
          q = q.not("sale_price", "is", null).order("created_at", { ascending: false });
          break;
        case "manual":
          if (opts.ids && opts.ids.length > 0) {
            q = q.in("id", opts.ids);
          } else {
            return [] as DBProduct[];
          }
          break;
        case "category":
          if (opts.categorySlug) {
            q = q.eq("category", opts.categorySlug).order("created_at", { ascending: false });
          }
          break;
        default:
          q = q.order("created_at", { ascending: false });
      }

      if (opts.limit) {
        q = q.limit(opts.limit);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as DBProduct[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    gcTime: 1000 * 60 * 10,
  });
}

// ─── Testimonials Hook ────────────────────────────────────────────────────────

export function useTestimonials(limit?: number) {
  return useQuery({
    queryKey: ["homepage-testimonials", limit],
    queryFn: async () => {
      let q = supabase
        .from("testimonials" as any)
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) return [] as DBTestimonial[];
      return (data || []) as DBTestimonial[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    gcTime: 1000 * 60 * 10,
  });
}

// ─── Brands Hook ─────────────────────────────────────────────────────────────

export function useBrands() {
  return useQuery({
    queryKey: ["homepage-brands"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands" as any)
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) return [] as DBBrand[];
      return (data || []) as DBBrand[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    gcTime: 1000 * 60 * 10,
  });
}

// ─── Statistics Hook ──────────────────────────────────────────────────────────

export function useAutoStatistics() {
  return useQuery({
    queryKey: ["homepage-statistics-auto"],
    queryFn: async () => {
      const [products, orders, reviews] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("order_status" as any, "delivered"),
      ]);
      return {
        products: products.count || 0,
        orders: orders.count || 0,
        customers: Math.round((orders.count || 0) * 0.85),
        reviews: reviews.count || 0,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    gcTime: 1000 * 60 * 10,
  });
}

// ─── Product count by category ────────────────────────────────────────────────

export function useProductCountByCategory() {
  return useQuery({
    queryKey: ["product-count-by-category"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("category")
        .eq("status", "active");
      const counts: Record<string, number> = {};
      (data || []).forEach((p: any) => {
        counts[p.category] = (counts[p.category] || 0) + 1;
      });
      return counts;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    gcTime: 1000 * 60 * 10,
  });
}
