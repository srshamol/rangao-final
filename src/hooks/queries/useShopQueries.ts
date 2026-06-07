import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useProducts(filters?: { category?: string; minPrice?: number; maxPrice?: number }) {
  return useQuery({
    queryKey: ["shop-products", filters],
    queryFn: async () => {
      let query = supabase.from("products").select("*").eq("status", "active");

      if (filters?.category) {
        query = query.eq("category", filters.category);
      }
      if (filters?.minPrice !== undefined) {
        query = query.gte("regular_price", filters.minPrice);
      }
      if (filters?.maxPrice !== undefined) {
        query = query.lte("regular_price", filters.maxPrice);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ["product-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["shop-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;
      return data || [];
    },
    staleTime: 30 * 60 * 1000, // 30 minutes cache (infrequent updates)
    gcTime: 60 * 60 * 1000,
  });
}

export function useOrders(userId?: string) {
  return useQuery({
    queryKey: ["user-orders", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (*)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 0, // No caching for order history (always fetch latest status)
  });
}
