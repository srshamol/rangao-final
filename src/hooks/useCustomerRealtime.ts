/**
 * useCustomerRealtime — Supabase Realtime hook for the Customer/Storefront side
 *
 * Subscribes to INSERT/UPDATE/DELETE events on tables that affect what
 * customers see in real-time, without requiring a page reload:
 *
 *  - orders         → customer's own orders list & detail (status changes, etc.)
 *  - store_settings → logo, banner, announcement bar, hero, etc.
 *  - products       → catalog, prices, stock availability
 *  - categories     → navigation, category sections
 *  - testimonials   → homepage review section
 *  - brands         → homepage brand logos
 *
 * Mount this ONCE — it is rendered as <CustomerRealtime /> in App.tsx
 * alongside <SettingsSync />. All open storefront pages share the same
 * QueryClient → they all get updates automatically.
 */
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCustomerRealtime(userId?: string) {
  const qc = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    // Avoid double-subscribing in React Strict Mode
    if (channelRef.current) return;

    const channel = supabase
      .channel("customer-realtime-hub")

      // ── Customer Orders (live order status updates) ─────────────────────────
      // The row-level filter `user_id=eq.${userId}` reduces noise: only
      // changes to THIS customer's orders wake the subscription.
      // Falls back to ALL orders when userId is not yet known (fine — query
      // is disabled anyway when there's no user).
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          ...(userId ? { filter: `user_id=eq.${userId}` } : {}),
        },
        (payload) => {
          console.log("[CustomerRealtime] 📦 Orders changed:", payload.eventType, payload.new, payload.old);
          qc.invalidateQueries({ queryKey: ["my-orders"] });
          qc.invalidateQueries({ queryKey: ["customer-order"] }); // covers ["customer-order", id]
          qc.invalidateQueries({ queryKey: ["customer-order-items"] }); // covers ["customer-order-items", id]
          qc.invalidateQueries({ queryKey: ["homepage-statistics-auto"] });
        }
      )

      // ── Store Settings (logo, hero banner, announcement bar, etc.) ──────────
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "store_settings" },
        (payload) => {
          console.log("[CustomerRealtime] ⚙️ Store Settings changed:", payload.eventType, payload.new);
          qc.invalidateQueries({ queryKey: ["store-settings-all"] });
        }
      )

      // ── Products (catalog, prices, stock, featured flag) ────────────────────
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        (payload) => {
          console.log("[CustomerRealtime] 🏷️ Products changed:", payload.eventType, payload.new);
          qc.invalidateQueries({ queryKey: ["homepage-products"] });
          qc.invalidateQueries({ queryKey: ["shop-products"] });
          qc.invalidateQueries({ queryKey: ["product-detail"] }); // covers ["product-detail", id]
          qc.invalidateQueries({ queryKey: ["product-count-by-category"] });
          qc.invalidateQueries({ queryKey: ["homepage-statistics-auto"] });
        }
      )

      // ── Categories (nav menu, category section on homepage) ─────────────────
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories" },
        (payload) => {
          console.log("[CustomerRealtime] 🗂️ Categories changed:", payload.eventType, payload.new);
          qc.invalidateQueries({ queryKey: ["homepage-categories"] });
          qc.invalidateQueries({ queryKey: ["shop-categories"] });
          qc.invalidateQueries({ queryKey: ["product-count-by-category"] });
        }
      )

      // ── Testimonials (homepage reviews section) ──────────────────────────────
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "testimonials" },
        (payload) => {
          console.log("[CustomerRealtime] 💬 Testimonials changed:", payload.eventType, payload.new);
          qc.invalidateQueries({ queryKey: ["homepage-testimonials"] });
          qc.invalidateQueries({ queryKey: ["homepage-statistics-auto"] });
        }
      )

      // ── Brands (homepage brand logos section) ────────────────────────────────
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "brands" },
        (payload) => {
          console.log("[CustomerRealtime] 🏷️ Brands changed:", payload.eventType, payload.new);
          qc.invalidateQueries({ queryKey: ["homepage-brands"] });
        }
      )

      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("[CustomerRealtime] ✅ Supabase Realtime connected — live storefront updates active");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("[CustomerRealtime] ⚠️ Realtime connection issue:", status);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [qc, userId]);
}
