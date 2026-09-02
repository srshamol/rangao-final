import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://yglexjxvypwmvjvsspil.supabase.co";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for authoritative webhook processing.");
  }
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
}

async function sendTelegramNotification(supabase: any, message: string, orderId: string) {
  try {
    const { data: row } = await supabase
      .from("store_settings")
      .select("value")
      .eq("key", "telegram_settings")
      .maybeSingle();

    if (row && row.value) {
      const { bot_token, chat_id, enabled, notify_new_order } = row.value as any;
      if (enabled && notify_new_order && bot_token && chat_id) {
        const telegramUrl = `https://api.telegram.org/bot${bot_token}/sendMessage`;
        await fetch(telegramUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chat_id,
            text: message,
            parse_mode: "HTML",
            disable_web_page_preview: true,
          }),
        });

        await supabase.from("order_history").insert({
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const supabase = getSupabaseAdmin();

    // 1. Fetch configured API key from server environment or private store_settings
    let configuredApiKey = process.env.UDDOKTAPAY_API_KEY?.trim() || "";

    if (!configuredApiKey) {
      const { data: row, error: settingsError } = await supabase
        .from("store_settings")
        .select("value")
        .eq("key", "payment_methods")
        .maybeSingle();

      if (!settingsError && row?.value) {
        configuredApiKey = (row.value as any)?.uddoktapay_api_key?.trim() || "";
      }
    }

    if (!configuredApiKey) {
      console.error("Webhook Error: UddoktaPay API key is not configured on server.");
      return res.status(500).json({ error: "Server payment configuration missing" });
    }

    // 2. Validate webhook request header API key
    const headerApiKey = (
      req.headers["rt-uddoktapay-api-key"] ||
      req.headers["RT-UDDOKTAPAY-API-KEY"] ||
      req.headers["rt_uddoktapay_api_key"]
    )?.toString().trim();

    if (!headerApiKey || headerApiKey !== configuredApiKey) {
      console.warn("Webhook: Unauthorized webhook call attempt. Received header API key:", headerApiKey ? "[REDACTED]" : "NONE");
      return res.status(401).json({ error: "Unauthorized Action: Invalid Webhook Secret" });
    }

    const payload = req.body;
    if (!payload || typeof payload !== "object") {
      return res.status(400).json({ error: "Invalid JSON payload" });
    }

    // 3. Process completed payment
    if (payload.status === "COMPLETED") {
      const orderId = payload.metadata?.order_id;
      const orderNumber = payload.metadata?.order_number;
      const invoiceId = payload.invoice_id;
      const paidAmount = Number(payload.amount);
      const currency = payload.currency || "BDT";

      if (!orderId) {
        console.warn("Webhook: Metadata does not contain order_id.", payload);
        return res.status(200).json({ received: true, error: "Missing order_id in metadata" });
      }

      // Currency check
      if (currency !== "BDT") {
        console.error(`Webhook: Mismatched currency ${currency}`);
        return res.status(400).json({ error: "Invalid currency. BDT expected." });
      }

      // Query order from database
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("id, order_number, payment_status, total_amount, customer_name")
        .eq("id", orderId)
        .maybeSingle();

      if (orderError || !order) {
        console.error(`Webhook: Order with ID ${orderId} not found in database.`);
        return res.status(404).json({ error: "Order not found" });
      }

      // Strict Amount Validation (prevent underpayment / tampering)
      const expectedAmount = Number(order.total_amount);
      if (isNaN(paidAmount) || Math.abs(paidAmount - expectedAmount) > 0.01) {
        console.error(`Webhook: Paid amount mismatch. Expected: ${expectedAmount}, Received: ${paidAmount}`);
        return res.status(400).json({
          error: "Payment amount mismatch",
          expected: expectedAmount,
          received: paidAmount,
        });
      }

      // Idempotency Guard: If already completed, return 200 without duplicate operations
      if (order.payment_status === "completed") {
        return res.status(200).json({
          status: "success",
          message: "Order payment already marked completed (idempotent)",
        });
      }

      // Update order status and payment status in database
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          payment_status: "completed",
          order_status: "confirmed", // Auto-confirm on verified payment
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (updateError) {
        console.error("Webhook: Failed to update order status:", updateError);
        return res.status(500).json({ error: "Failed to update order status" });
      }

      // Add audit history log
      await supabase.from("order_history").insert({
        order_id: orderId,
        action: "payment_webhook",
        details: `Payment confirmed via webhook. Method: ${payload.payment_method || "Online"}. Txn ID: ${payload.transaction_id || "N/A"}. Invoice: ${invoiceId}. Amount: ৳${paidAmount}`,
        staff_name: "System",
      });

      // Send Telegram Notification
      const tgMessage = `🔔 <b>পেমেন্ট সম্পন্ন হয়েছে (UddoktaPay Webhook)!</b>\n\n` +
        `<b>অর্ডার নং:</b> #${orderNumber || order.order_number || "N/A"}\n` +
        `<b>গ্রাহকের নাম:</b> ${order.customer_name || "N/A"}\n` +
        `<b>পেমেন্ট মেথড:</b> ${payload.payment_method || "Online"}\n` +
        `<b>ট্রানজেকশন আইডি:</b> <code>${payload.transaction_id || "N/A"}</code>\n` +
        `<b>ইনভয়েস আইডি:</b> <code>${invoiceId || "N/A"}</code>\n` +
        `<b>টাকার পরিমাণ:</b> ৳${paidAmount}`;

      await sendTelegramNotification(supabase, tgMessage, orderId);

      return res.status(200).json({ status: "success", message: "Payment processed successfully" });
    }

    return res.status(200).json({ received: true, status: payload.status });
  } catch (err: any) {
    console.error("Webhook handler exception:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
