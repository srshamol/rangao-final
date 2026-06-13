import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase credentials (URL/Key) are missing in environment variables.");
  }
  return createClient(supabaseUrl, supabaseKey);
}

async function sendTelegramNotification(supabase: any, message: string, orderId: string) {
  try {
    const { data: row } = await supabase
      .from("store_settings" as any)
      .select("value")
      .eq("key", "telegram_settings")
      .maybeSingle();

    if (row && row.value) {
      const { bot_token, chat_id, enabled, notify_new_order } = row.value;
      if (enabled && notify_new_order && bot_token && chat_id) {
        const telegramUrl = `https://api.telegram.org/bot${bot_token}/sendMessage`;
        await fetch(telegramUrl, {
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

        await supabase.from("order_history" as any).insert({
          order_id: orderId,
          action: "telegram_notification",
          details: "Telegram notification for UddoktaPay payment success sent successfully",
          staff_name: "System",
        });
      }
    }
  } catch (tgErr: any) {
    console.error("Failed to send telegram notification:", tgErr);
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { invoiceId } = req.body;

  if (!invoiceId) {
    return res.status(400).json({ error: "invoiceId is required" });
  }

  try {
    const supabase = getSupabaseClient();

    // 1. Fetch payment settings
    const { data: row, error: settingsError } = await supabase
      .from("store_settings" as any)
      .select("value")
      .eq("key", "payment_methods")
      .maybeSingle();

    if (settingsError || !row || !row.value) {
      console.error("Failed to load payment settings:", settingsError);
      return res.status(500).json({ error: "Payment configuration not found" });
    }

    const { uddoktapay_api_key, uddoktapay_base_url } = row.value as any;

    if (!uddoktapay_api_key || !uddoktapay_base_url) {
      return res.status(400).json({ error: "UddoktaPay credentials are not configured" });
    }

    let baseUrl = uddoktapay_base_url.trim().replace(/\/$/, "");
    if (baseUrl.endsWith("/api")) {
      baseUrl = baseUrl.slice(0, -4).replace(/\/$/, "");
    }
    const apiKey = uddoktapay_api_key.trim();

    // 2. Call UddoktaPay Verify Payment API
    console.log("Verifying UddoktaPay invoice:", invoiceId);
    const verifyResponse = await fetch(`${baseUrl}/api/verify-payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "accept": "application/json",
        "RT-UDDOKTAPAY-API-KEY": apiKey,
      },
      body: JSON.stringify({ invoice_id: invoiceId }),
    });

    const result = await verifyResponse.json();

    if (!verifyResponse.ok) {
      console.error("UddoktaPay verification response error:", result);
      return res.status(502).json({ error: "UddoktaPay verification failed", details: result });
    }

    // 3. Process completed payment
    if (result.status === "COMPLETED") {
      const orderId = result.metadata?.order_id;
      const orderNumber = result.metadata?.order_number;

      if (!orderId) {
        return res.status(200).json({ verified: true, status: result.status, message: "Payment is completed but no order metadata found" });
      }

      // Fetch current order status
      const { data: order } = await supabase
        .from("orders")
        .select("payment_status, total_amount, customer_name")
        .eq("id", orderId)
        .single();

      if (order && order.payment_status !== "completed") {
        // Update order status and payment status in one go
        await supabase
          .from("orders")
          .update({
            payment_status: "completed",
            order_status: "confirmed", // Auto-confirm on payment success
            updated_at: new Date().toISOString()
          })
          .eq("id", orderId);

        // Add history log
        await supabase.from("order_history" as any).insert({
          order_id: orderId,
          action: "payment_verified",
          details: `Payment verified via API. Method: ${result.payment_method || "Online"}. Txn ID: ${result.transaction_id || "N/A"}. Invoice: ${invoiceId}`,
          staff_name: "System",
        });

        // Send Telegram notification
        const tgMessage = `✅ <b>পেমেন্ট সম্পন্ন হয়েছে (UddoktaPay)!</b>\n\n` +
          `<b>অর্ডার নং:</b> #${orderNumber || "N/A"}\n` +
          `<b>গ্রাহকের নাম:</b> ${order.customer_name || "N/A"}\n` +
          `<b>পেমেন্ট মেথড:</b> ${result.payment_method || "Online"}\n` +
          `<b>ট্রানজেকশন আইডি:</b> <code>${result.transaction_id || "N/A"}</code>\n` +
          `<b>টাকার পরিমাণ:</b> ৳${result.amount || order.total_amount}`;

        await sendTelegramNotification(supabase, tgMessage, orderId);
      }

      return res.status(200).json({ verified: true, status: result.status, orderId });
    }

    return res.status(200).json({ verified: false, status: result.status, message: `Payment status is ${result.status}` });
  } catch (err: any) {
    console.error("Payment verification exception:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
