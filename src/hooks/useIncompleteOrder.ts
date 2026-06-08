import { useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "incomplete_order_session";

function getSessionId() {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
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
  const incompleteIdRef = useRef<string | null>(null);
  const sessionId = useRef(getSessionId());
  // Store latest products/pageSource in refs so saveIncomplete callback stays stable
  // (avoids dependency on the products array which is a new reference every render)
  const productsRef = useRef(products);
  const pageSourceRef = useRef(pageSource);
  productsRef.current = products;
  pageSourceRef.current = pageSource;

  const customerInfoRef = useRef<{ name?: string; phone?: string; email?: string } | null>(null);

  const fireNotification = useCallback(async () => {
    if (!incompleteIdRef.current || !customerInfoRef.current) return;
    const info = customerInfoRef.current;
    if (!info.name?.trim() && !info.phone?.trim()) return;

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
    async (data: { name?: string; phone?: string; email?: string; formData?: Record<string, any> }) => {
      const { name, phone, email, formData } = data;
      // Need at least name or phone
      if (!name?.trim() && !phone?.trim()) return;

      customerInfoRef.current = { name, phone, email };

      const currentProducts = productsRef.current;
      const currentPageSource = pageSourceRef.current;

      const payload: Record<string, any> = {
        customer_name: name?.trim() || null,
        customer_phone: phone?.trim() || null,
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

        if (incompleteId && !incompleteIdRef.current) {
          incompleteIdRef.current = incompleteId;
        }
      } catch (err) {
        console.error("Incomplete order save error:", err);
      }
    },
    [] // stable — reads latest values from refs, no deps needed
  );

  const markConverted = useCallback(async (orderId?: string) => {
    if (!incompleteIdRef.current) return;
    try {
      const update: Record<string, any> = { status: "converted" };
      if (orderId) update.converted_order_id = orderId;
      await supabase
        .from("incomplete_orders" as any)
        .update(update)
        .eq("id", incompleteIdRef.current);
      incompleteIdRef.current = null;
    } catch (err) {
      console.error("Mark converted error:", err);
    }
  }, []);

  const clearIncomplete = useCallback(async () => {
    if (!incompleteIdRef.current) return;
    try {
      await supabase
        .from("incomplete_orders" as any)
        .delete()
        .eq("id", incompleteIdRef.current);
      incompleteIdRef.current = null;
    } catch (err) {
      console.error("Clear incomplete error:", err);
    }
  }, []);

  return { saveIncomplete, markConverted, clearIncomplete, fireAbandonedNotification };
}
