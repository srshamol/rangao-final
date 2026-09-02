import { supabase } from "@/integrations/supabase/client";

interface SendTelegramOptions {
  isTest?: boolean;
  isNewOrder?: boolean;
  isStatusUpdate?: boolean;
  isIncompleteOrder?: boolean;
  isLowStock?: boolean;
  orderId?: string;
}

export async function sendTelegramNotification(
  message: string,
  options: SendTelegramOptions = {}
): Promise<{ success: boolean; error?: string }> {
  
  // 1. Try secure Postgres RPC function (recommended, bypasses RLS, works locally & on Vercel)
  try {
    const { data, error } = await supabase.rpc("send_telegram_notification", {
      p_message: message,
      p_options: {
        isTest: options.isTest || false,
        isNewOrder: options.isNewOrder || false,
        isStatusUpdate: options.isStatusUpdate || false,
        isIncompleteOrder: options.isIncompleteOrder || false,
        isLowStock: options.isLowStock || false,
        ...(options.orderId ? { orderId: options.orderId } : {})
      }
    });

    if (!error && data) {
      if (data.success || data.status === "skipped") {
        console.log("[Telegram] Notification sent successfully via RPC:", data);
        return { success: true };
      }
      if (data.error) {
        throw new Error(data.error);
      }
    }
    if (error) throw error;
  } catch (rpcErr: any) {
    // If the function doesn't exist, we'll log it as a warning and proceed to Vercel/client fallback.
    // If it's a genuine credentials failure, we also try other fallbacks.
    console.warn("[Telegram] RPC dispatch failed, trying Vercel serverless relay...", rpcErr.message || rpcErr);
  }

  // 2. Try production path (Vercel Serverless Function)
  try {
    const response = await fetch("/api/telegram", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        isTest: options.isTest || false,
        isNewOrder: options.isNewOrder || false,
        isStatusUpdate: options.isStatusUpdate || false,
        isIncompleteOrder: options.isIncompleteOrder || false,
        isLowStock: options.isLowStock || false,
        orderId: options.orderId || null,
      }),
    });

    const contentType = response.headers.get("content-type") || "";
    // If Vite fallback returns index.html, throw to trigger direct dispatch fallback
    if (contentType.includes("text/html") || !response.ok) {
      throw new Error("Serverless relay unavailable (returned HTML/error)");
    }

    const data = await response.json();
    if (data?.status === "success" || data?.status === "skipped") {
      return { success: true };
    }
    // If the serverless function itself returned an error payload, throw so fallback runs
    if (data?.error) {
      throw new Error(`Serverless relay error: ${data.error}`);
    }
    return { success: true };
  } catch (err) {
    console.warn("[Telegram] Serverless relay failed or is unavailable locally. Falling back to direct client-side dispatch...", err);
    
    // 3. Local Fallback: Fetch settings and dispatch directly from client browser
    try {
      const { data: row, error: dbError } = await supabase
        .from("store_settings" as any)
        .select("value")
        .eq("key", "telegram_settings")
        .maybeSingle();

      if (dbError) throw dbError;
      if (!row || !row.value) {
        return { success: false, error: "Telegram settings not configured in database." };
      }

      const settings = row.value;
      const { 
        bot_token, 
        chat_id, 
        enabled, 
        notify_new_order, 
        notify_status_change,
        notify_incomplete_order,
        notify_low_stock
      } = settings;

      if (!options.isTest && !enabled) {
        console.log("[Telegram] Notifications are disabled in settings.");
        return { success: true };
      }

      if (options.isNewOrder && !notify_new_order && !options.isTest) {
        console.log("[Telegram] New order notifications are disabled.");
        return { success: true };
      }

      if (options.isStatusUpdate && !notify_status_change && !options.isTest) {
        console.log("[Telegram] Status update notifications are disabled.");
        return { success: true };
      }

      if (options.isIncompleteOrder && !notify_incomplete_order && !options.isTest) {
        console.log("[Telegram] Incomplete order notifications are disabled.");
        return { success: true };
      }

      if (options.isLowStock && !notify_low_stock && !options.isTest) {
        console.log("[Telegram] Low stock notifications are disabled.");
        return { success: true };
      }

      if (!bot_token || !chat_id) {
        return { success: false, error: "Bot token or Chat ID is missing in settings." };
      }

      const telegramUrl = `https://api.telegram.org/bot${bot_token}/sendMessage`;
      const response = await fetch(telegramUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chat_id,
          text: message,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.ok) {
        return { success: false, error: result.description || "Failed to send message via Telegram Bot API." };
      }

      // Log to history locally if user is signed in as admin/staff
      if (options.orderId) {
        try {
          await supabase.from("order_history" as any).insert({
            order_id: options.orderId,
            action: "telegram_notification",
            details: "Telegram notification sent successfully via client-side fallback dispatch",
            staff_name: "System",
          });
        } catch (e: any) {
          console.warn("Failed to write to order_history from fallback:", e);
        }
      }

      console.log("[Telegram] Direct client-side message sent successfully!");
      return { success: true };
    } catch (fallbackErr: any) {
      console.error("[Telegram] Local fallback dispatch failed:", fallbackErr);
      let errMsg = fallbackErr.message || "Failed client-side Telegram dispatch";
      if (errMsg.includes("Failed to fetch") || errMsg.includes("fetch")) {
        errMsg = "Failed to fetch. This usually happens locally because the `/api/telegram` serverless endpoint is unavailable in `npm run dev` mode, and direct browser requests to `api.telegram.org` are blocked by ad-blockers, Brave Shields, or ISP firewalls. Please test this on your deployed Vercel site.";
      }
      return { success: false, error: errMsg };
    }
  }
}
