import { useRef, useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { normalizeBDPhone } from "@/lib/phoneValidation";

const SESSION_KEY = "incomplete_order_session";

function getSessionId() {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      id = crypto.randomUUID();
    } else {
      // Fallback v4 UUID generator
      id = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

interface ProductInfo {
  name: string;
  id?: string;
  price: number;
  quantity: number;
  image?: string;
}

interface UseIncompleteOrderOptions {
  pageSource: string;
  products: ProductInfo[];
}

export function useIncompleteOrder({ pageSource, products }: UseIncompleteOrderOptions) {
  const storageKey = `active_incomplete_order_id_${pageSource}`;
  const incompleteIdRef = useRef<string | null>(
    typeof window !== "undefined" ? localStorage.getItem(storageKey) : null
  );
  const sessionId = useRef(getSessionId());
  // Store latest products/pageSource in refs so saveIncomplete callback stays stable
  // (avoids dependency on the products array which is a new reference every render)
  const productsRef = useRef(products);
  const pageSourceRef = useRef(pageSource);
  productsRef.current = products;
  pageSourceRef.current = pageSource;

  const [dbDraft, setDbDraft] = useState<{
    customer_name?: string;
    customer_phone?: string;
    customer_email?: string;
    form_data?: Record<string, any>;
  } | null>(null);

  const notificationFiredRef = useRef(false);
  const customerInfoRef = useRef<{ name?: string; phone?: string; email?: string } | null>(null);
  const isSavingRef = useRef(false);

  // Load latest draft from DB on mount
  useEffect(() => {
    const fetchLatestIncomplete = async () => {
      try {
        let data = null;
        const activeId = incompleteIdRef.current;
        
        // 1. Try by active ID first
        if (activeId) {
          const { data: byId } = await supabase
            .from("incomplete_orders" as any)
            .select("id, customer_name, customer_phone, customer_email, form_data")
            .eq("id", activeId)
            .eq("status", "abandoned")
            .maybeSingle();
          if (byId) {
            data = byId;
          }
        }

        // 2. If not found by active ID, try by session ID
        if (!data && sessionId.current) {
          const { data: bySession } = await supabase
            .from("incomplete_orders" as any)
            .select("id, customer_name, customer_phone, customer_email, form_data")
            .eq("session_id", sessionId.current)
            .eq("status", "abandoned")
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (bySession) {
            data = bySession;
            incompleteIdRef.current = bySession.id;
            localStorage.setItem(storageKey, bySession.id);
          }
        }

        if (data) {
          setDbDraft({
            customer_name: data.customer_name || "",
            customer_phone: data.customer_phone || "",
            customer_email: data.customer_email || "",
            form_data: data.form_data || {},
          });
        }
      } catch (err) {
        console.error("Error fetching latest incomplete order:", err);
      }
    };

    fetchLatestIncomplete();
  }, [storageKey]);

  const fireNotification = useCallback(async () => {
    if (notificationFiredRef.current) return;
    if (!incompleteIdRef.current || !customerInfoRef.current) return;
    const info = customerInfoRef.current;
    if (!info.name?.trim() && !info.phone?.trim()) return;

    notificationFiredRef.current = true;
    try {
      const { sendTelegramNotification } = await import("@/lib/telegram");
      const itemsList = productsRef.current
        .map((p) => `• ${p.name} (Qty: ${p.quantity || 1}) - ৳${p.price * (p.quantity || 1)}`)
        .join("\n");

      const message = `⚠️ <b>নতুন ইনকমপ্লিট অর্ডার (কার্ট পরিত্যক্ত)!</b>\n\n` +
        `<b>কাস্টমার:</b> ${info.name?.trim() || "N/A"}\n` +
        `<b>মোবাইল:</b> ${info.phone?.trim() || "N/A"}\n` +
        `<b>পেজ/সোর্স:</b> ${pageSourceRef.current}\n\n` +
        `<b>পণ্যসমূহ:</b>\n${itemsList}`;

      await sendTelegramNotification(message, { isIncompleteOrder: true });
    } catch (tgErr) {
      console.error("Error triggering incomplete order notification:", tgErr);
    }
  }, []);

  // Fire notification on unmount/exit if the order has not been completed
  useEffect(() => {
    return () => {
      if (incompleteIdRef.current) {
        fireNotification();
      }
    };
  }, [fireNotification]);

  const fireAbandonedNotification = useCallback(async () => {
    await fireNotification();
  }, [fireNotification]);

  const saveIncomplete = useCallback(
    async (data: { name?: string; phone?: string; email?: string; formData?: Record<string, any> }, fireNotificationAfterSave = false) => {
      const { name, phone, email, formData } = data;
      // Need at least name or phone
      if (!name?.trim() && !phone?.trim()) return;

      if (isSavingRef.current && !incompleteIdRef.current) {
        return;
      }
      isSavingRef.current = true;

      const cleanPhone = phone?.trim() ? normalizeBDPhone(phone.trim()) : null;
      customerInfoRef.current = { name, phone: cleanPhone || phone, email };

      const currentProducts = productsRef.current;
      const currentPageSource = pageSourceRef.current;

      const payload: Record<string, any> = {
        customer_name: name?.trim() || null,
        customer_phone: cleanPhone,
        customer_email: email?.trim() || null,
        product_info: currentProducts,
        page_source: currentPageSource,
        form_data: formData || {},
        session_id: sessionId.current,
        status: "abandoned",
      };

      try {
        const { data: incompleteId, error } = await supabase.rpc("save_incomplete_order", {
          p_id: incompleteIdRef.current || null,
          p_customer_name: payload.customer_name,
          p_customer_phone: payload.customer_phone,
          p_customer_email: payload.customer_email,
          p_product_info: payload.product_info,
          p_page_source: payload.page_source,
          p_form_data: payload.form_data,
          p_session_id: payload.session_id
        });

        if (error) throw error;

        if (incompleteId) {
          incompleteIdRef.current = incompleteId;
          localStorage.setItem(storageKey, incompleteId);
          if (fireNotificationAfterSave) {
            await fireNotification();
          }
        }
      } catch (err) {
        console.error("Incomplete order save error:", err);
      } finally {
        isSavingRef.current = false;
      }
    },
    [storageKey, fireNotification] // stable — reads latest values from refs, but depends on storageKey
  );

  const markConverted = useCallback(async (orderId?: string, customerPhone?: string) => {
    try {
      await supabase.rpc("delete_incomplete_orders", {
        p_id: incompleteIdRef.current || null,
        p_session_id: sessionId.current || null,
        p_customer_phone: customerPhone?.trim() || null
      });
      
      localStorage.removeItem(storageKey);
      incompleteIdRef.current = null;
    } catch (err) {
      console.error("Mark converted error:", err);
    }
  }, [storageKey]);

  const clearIncomplete = useCallback(async () => {
    try {
      if (incompleteIdRef.current) {
        await supabase
          .from("incomplete_orders" as any)
          .delete()
          .eq("id", incompleteIdRef.current);
      }

      if (sessionId.current) {
        await supabase
          .from("incomplete_orders" as any)
          .delete()
          .eq("session_id", sessionId.current);
      }

      localStorage.removeItem(storageKey);
      incompleteIdRef.current = null;
    } catch (err) {
      console.error("Clear incomplete error:", err);
    }
  }, [storageKey]);

  return { saveIncomplete, markConverted, clearIncomplete, fireAbandonedNotification, dbDraft };
}
