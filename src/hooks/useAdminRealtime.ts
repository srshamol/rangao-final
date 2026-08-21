/**
 * useAdminRealtime — Central Supabase Realtime hook for Admin Panel
 *
 * Subscribes to INSERT/UPDATE/DELETE events on:
 *  - orders          → invalidates admin-orders, admin-stats, dashboard queries, sidebar counts
 *  - incomplete_orders → invalidates incomplete-orders, sidebar counts
 *  - products        → invalidates admin-products, admin-stats (low stock)
 *  - inventory_log   → invalidates admin-inventory
 *  - order_items     → invalidates admin-orders (for top products / stats)
 *
 * Mount this ONCE in the Admin layout — not per-page.
 * All open admin pages sharing the same QueryClient will get updates automatically.
 */
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabaseAdmin as supabase } from "@/integrations/supabase/client";

export function useAdminRealtime() {
  const qc = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    // Avoid double-subscribing in React Strict Mode
    if (channelRef.current) return;

    const channel = supabase
      .channel("admin-realtime-hub")

      // ── Orders ───────────────────────────────────────────────────────────
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        console.log("[AdminRealtime] 📦 Orders changed:", payload.eventType, payload.new, payload.old);
        qc.invalidateQueries({ queryKey: ["admin-orders"] });
        qc.invalidateQueries({ queryKey: ["admin-order"] }); // covers ["admin-order", id] in OrderDetail
        qc.invalidateQueries({ queryKey: ["admin-orders-stats"] });
        qc.invalidateQueries({ queryKey: ["admin-stats"] });
        qc.invalidateQueries({ queryKey: ["admin-status-breakdown"] });
        qc.invalidateQueries({ queryKey: ["admin-recent-orders"] });
        qc.invalidateQueries({ queryKey: ["admin-daily-sales-7"] });
        qc.invalidateQueries({ queryKey: ["admin-sidebar-order-counts"] });
        qc.invalidateQueries({ queryKey: ["finance-kpi"] });
        qc.invalidateQueries({ queryKey: ["finance-transactions"] });
        qc.invalidateQueries({ queryKey: ["finance-daily-sales"] });
        qc.invalidateQueries({ queryKey: ["homepage-statistics-auto"] });
      })

      // ── Order Items (affects top products, finance) ───────────────────────
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, (payload) => {
        console.log("[AdminRealtime] 🛍️ Order Items changed:", payload.eventType, payload.new);
        qc.invalidateQueries({ queryKey: ["admin-top-products"] });
        qc.invalidateQueries({ queryKey: ["admin-finance"] });
      })

      // ── Incomplete Orders ─────────────────────────────────────────────────
      .on("postgres_changes", { event: "*", schema: "public", table: "incomplete_orders" }, (payload) => {
        console.log("[AdminRealtime] ⏳ Incomplete Orders changed:", payload.eventType, payload.new);
        qc.invalidateQueries({ queryKey: ["incomplete-orders"] });
        qc.invalidateQueries({ queryKey: ["admin-sidebar-order-counts"] });
      })

      // ── Products / Inventory ──────────────────────────────────────────────
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, (payload) => {
        console.log("[AdminRealtime] 🏷️ Products changed:", payload.eventType, payload.new);
        qc.invalidateQueries({ queryKey: ["admin-products"] });
        qc.invalidateQueries({ queryKey: ["admin-stats"] });
        qc.invalidateQueries({ queryKey: ["admin-low-stock"] });
        // Note: customer-facing product keys are invalidated by useCustomerRealtime
      })

      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_log" }, (payload) => {
        console.log("[AdminRealtime] 📦 Inventory log changed:", payload.eventType, payload.new);
        qc.invalidateQueries({ queryKey: ["admin-inventory"] }); // matches ["admin-inventory", "stats"] and ["admin-inventory", "logs"]
        qc.invalidateQueries({ queryKey: ["admin-stats"] });
        qc.invalidateQueries({ queryKey: ["admin-low-stock"] });
      })

      // ── Coupons ───────────────────────────────────────────────────────────
      .on("postgres_changes", { event: "*", schema: "public", table: "coupons" }, (payload) => {
        console.log("[AdminRealtime] 🎟️ Coupons changed:", payload.eventType, payload.new);
        qc.invalidateQueries({ queryKey: ["admin-coupons"] });
        qc.invalidateQueries({ queryKey: ["coupons"] });
      })

      // ── Order History & Notes ─────────────────────────────────────────────
      .on("postgres_changes", { event: "*", schema: "public", table: "order_history" }, (payload) => {
        console.log("[AdminRealtime] 📜 Order History changed:", payload.eventType, payload.new);
        qc.invalidateQueries({ queryKey: ["admin-orders"] });
        qc.invalidateQueries({ queryKey: ["order-history"] });
      })

      .on("postgres_changes", { event: "*", schema: "public", table: "order_notes" }, (payload) => {
        console.log("[AdminRealtime] 📝 Order Notes changed:", payload.eventType, payload.new);
        qc.invalidateQueries({ queryKey: ["admin-orders"] });
        qc.invalidateQueries({ queryKey: ["admin-order"] }); // covers detail view notes
        qc.invalidateQueries({ queryKey: ["order-notes"] });
      })

      // ── Store Settings (for multi-tab admin scenarios) ────────────────────
      .on("postgres_changes", { event: "*", schema: "public", table: "store_settings" }, (payload) => {
        console.log("[AdminRealtime] ⚙️ Store Settings changed:", payload.eventType, payload.new);
        qc.invalidateQueries({ queryKey: ["store-settings-all"] });
      })

      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("[AdminRealtime] ✅ Supabase Realtime connected — live updates active");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("[AdminRealtime] ⚠️ Realtime connection issue:", status);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [qc]);
}
