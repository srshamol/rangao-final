import { useRef, useCallback, useEffect } from "react";
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
  const savedRef = useRef(false);

  const saveIncomplete = useCallback(
    async (data: { name?: string; phone?: string; email?: string; formData?: Record<string, any> }) => {
      const { name, phone, email, formData } = data;
      // Need at least name or phone
      if (!name?.trim() && !phone?.trim()) return;

      const payload: Record<string, any> = {
        customer_name: name?.trim() || null,
        customer_phone: phone?.trim() || null,
        customer_email: email?.trim() || null,
        product_info: products,
        page_source: pageSource,
        form_data: formData || {},
        session_id: sessionId.current,
        status: "abandoned",
      };

      try {
        if (incompleteIdRef.current) {
          await supabase
            .from("incomplete_orders" as any)
            .update(payload)
            .eq("id", incompleteIdRef.current);
        } else {
          const { data: row } = await supabase
            .from("incomplete_orders" as any)
            .insert(payload)
            .select("id")
            .single();
          if (row) {
            incompleteIdRef.current = (row as any).id;
            
            // Dispatch Telegram Notification for new incomplete order
            try {
              const { sendTelegramNotification } = await import("@/lib/telegram");
              const itemsList = products
                .map((p) => `• ${p.name} (Qty: ${p.quantity || 1}) - ৳${p.price * (p.quantity || 1)}`)
                .join("\n");
              
              const message = `⚠️ <b>নতুন ইনকমপ্লিট অর্ডার (কার্ট পরিত্যক্ত)!</b>\n\n` +
                `<b>কাস্টমার:</b> ${name?.trim() || "N/A"}\n` +
                `<b>মোবাইল:</b> ${phone?.trim() || "N/A"}\n` +
                `<b>পেজ/সোর্স:</b> ${pageSource}\n\n` +
                `<b>পণ্যসমূহ:</b>\n${itemsList}`;
                
              sendTelegramNotification(message, { isIncompleteOrder: true });
            } catch (tgErr) {
              console.error("Error triggering incomplete order notification:", tgErr);
            }
          }
        }
        savedRef.current = true;
      } catch (err) {
        console.error("Incomplete order save error:", err);
      }
    },
    [pageSource, products]
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

  return { saveIncomplete, markConverted, clearIncomplete };
}
