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
          details: "Telegram notification for UddoktaPay webhook payment success sent successfully",
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

  try {
    const supabase = getSupabaseClient();

    // 1. Fetch configured API key from store_settings
    const { data: row, error: settingsError } = await supabase
      .from("store_settings" as any)
      .select("value")
      .eq("key", "payment_methods")
      .maybeSingle();

    if (settingsError || !row || !row.value) {
      console.error("Webhook: Failed to load payment settings:", settingsError);
      return res.status(500).json({ error: "Payment configuration not found" });
    }

    const { uddoktapay_api_key } = row.value as any;

    if (!uddoktapay_api_key) {
      console.error("Webhook: UddoktaPay API key is not configured in database.");
      return res.status(400).json({ error: "UddoktaPay API key is not configured" });
    }

    // 2. Validate webhook request header API key
    const headerApiKey = req.headers["rt-uddoktapay-api-key"] || req.headers["RT-UDDOKTAPAY-API-KEY"];
    const configuredApiKey = uddoktapay_api_key.trim();

    if (!headerApiKey || headerApiKey !== configuredApiKey) {
      console.warn("Webhook: Unauthorized webhook call attempt. Received header API key:", headerApiKey);
      return res.status(401).send("Unauthorized Action");
    }

    const payload = req.body;
    console.log("Webhook: UddoktaPay Webhook Received payload:", JSON.stringify(payload));

    if (!payload || typeof payload !== "object") {
      return res.status(400).send("Invalid JSON payload");
    }

    // 3. Process completed payment
    if (payload.status === "COMPLETED") {
      const orderId = payload.metadata?.order_id;
      const orderNumber = payload.metadata?.order_number;
      const invoiceId = payload.invoice_id;

      if (!orderId) {
        console.warn("Webhook: Metadata does not contain order_id. Payload:", payload);
        return res.status(200).send("Webhook received, but metadata is missing order_id");
      }

      // Query order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("payment_status, total_amount, customer_name")
        .eq("id", orderId)
        .single();

      if (orderError || !order) {
        console.error(`Webhook: Order with ID ${orderId} not found in database.`);
        return res.status(404).send("Order not found");
      }

      if (order.payment_status !== "completed") {
        // Update order status and payment status in database
        await supabase
          .from("orders")
          .update({
            payment_status: "completed",
            order_status: "confirmed", // Auto-confirm order
            updated_at: new Date().toISOString()
          })
          .eq("id", orderId);

        // Add history log
        await supabase.from("order_history" as any).insert({
          order_id: orderId,
          action: "payment_webhook",
          details: `Payment confirmed via webhook. Method: ${payload.payment_method || "Online"}. Txn ID: ${payload.transaction_id || "N/A"}. Invoice: ${invoiceId}`,
          staff_name: "System",
        });

        // Send Telegram Notification
        const tgMessage = `🔔 <b>পেমেন্ট সম্পন্ন হয়েছে (UddoktaPay Webhook)!</b>\n\n` +
          `<b>অর্ডার নং:</b> #${orderNumber || "N/A"}\n` +
          `<b>গ্রাহকের নাম:</b> ${order.customer_name || "N/A"}\n` +
          `<b>পেমেন্ট মেথড:</b> ${payload.payment_method || "Online"}\n` +
          `<b>ট্রানজেকশন আইডি:</b> <code>${payload.transaction_id || "N/A"}</code>\n` +
          `<b>টাকার পরিমাণ:</b> ৳${payload.amount || order.total_amount}`;

        await sendTelegramNotification(supabase, tgMessage, orderId);
        console.log(`Webhook: Order ${orderNumber} payment confirmed and notified.`);
      } else {
        console.log(`Webhook: Order ${orderNumber} is already marked as paid.`);
      }
    }

    return res.status(200).send("Webhook received successfully");
  } catch (err: any) {
    console.error("Webhook processing exception:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
