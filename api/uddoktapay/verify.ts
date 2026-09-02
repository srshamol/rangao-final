import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://yglexjxvypwmvjvsspil.supabase.co";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for authoritative payment verification.");
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
          details: "Telegram notification for UddoktaPay payment success sent successfully",
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

  const { invoiceId } = req.body || {};
  if (!invoiceId) {
    return res.status(400).json({ error: "invoiceId is required" });
  }

  try {
    const supabase = getSupabaseAdmin();

    // 1. Fetch configured payment settings from server environment or private store_settings
    let apiKey = process.env.UDDOKTAPAY_API_KEY?.trim() || "";
    let baseUrl = process.env.UDDOKTAPAY_BASE_URL?.trim() || "";

    if (!apiKey || !baseUrl) {
      const { data: row, error: settingsError } = await supabase
        .from("store_settings")
        .select("value")
        .eq("key", "payment_methods")
        .maybeSingle();

      if (!settingsError && row?.value) {
        const conf = row.value as any;
        if (!apiKey) apiKey = conf.uddoktapay_api_key?.trim() || "";
        if (!baseUrl) baseUrl = conf.uddoktapay_base_url?.trim() || "";
      }
    }

    if (!apiKey || !baseUrl) {
      console.error("UddoktaPay verify error: Credentials not configured on server.");
      return res.status(500).json({ error: "Payment verification credentials are not configured on the server." });
    }

    baseUrl = baseUrl.replace(/\/$/, "");
    if (baseUrl.endsWith("/api")) {
      baseUrl = baseUrl.slice(0, -4).replace(/\/$/, "");
    }

    // 2. Call UddoktaPay Verify Payment API Server-to-Server
    const verifyResponse = await fetch(`${baseUrl}/api/verify-payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
        "RT-UDDOKTAPAY-API-KEY": apiKey,
      },
      body: JSON.stringify({ invoice_id: invoiceId }),
    });

    const result = await verifyResponse.json();

    if (!verifyResponse.ok) {
      console.error("UddoktaPay verification response error:", result);
      return res.status(502).json({ error: "Payment verification failed with provider." });
    }

    // 3. Process completed payment
    if (result.status === "COMPLETED") {
      const orderId = result.metadata?.order_id;
      const orderNumber = result.metadata?.order_number;
      const paidAmount = Number(result.amount);

      if (!orderId) {
        return res.status(200).json({ verified: true, status: result.status, message: "Payment verified without order metadata" });
      }

      // Query order
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .select("id, order_number, payment_status, total_amount, customer_name")
        .eq("id", orderId)
        .maybeSingle();

      if (orderErr || !order) {
        return res.status(404).json({ error: "Order record not found" });
      }

      // Verify amount
      const expectedAmount = Number(order.total_amount);
      if (isNaN(paidAmount) || Math.abs(paidAmount - expectedAmount) > 0.01) {
        console.error(`Verify: Amount mismatch. Expected ${expectedAmount}, received ${paidAmount}`);
        return res.status(400).json({ error: "Payment amount mismatch" });
      }

      if (order.payment_status !== "completed") {
        await supabase
          .from("orders")
          .update({
            payment_status: "completed",
            order_status: "confirmed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId);

        await supabase.from("order_history").insert({
          order_id: orderId,
          action: "payment_verified",
          details: `Payment verified via API. Method: ${result.payment_method || "Online"}. Txn ID: ${result.transaction_id || "N/A"}. Invoice: ${invoiceId}. Amount: ৳${paidAmount}`,
          staff_name: "System",
        });

        const tgMessage = `✅ <b>পেমেন্ট সফলভাবে ভেরিফাই হয়েছে (API Verification)!</b>\n\n` +
          `<b>অর্ডার নং:</b> #${orderNumber || order.order_number || "N/A"}\n` +
          `<b>গ্রাহকের নাম:</b> ${order.customer_name || "N/A"}\n` +
          `<b>পেমেন্ট মেথড:</b> ${result.payment_method || "Online"}\n` +
          `<b>ট্রানজেকশন আইডি:</b> <code>${result.transaction_id || "N/A"}</code>\n` +
          `<b>টাকার পরিমাণ:</b> ৳${paidAmount}`;

        await sendTelegramNotification(supabase, tgMessage, orderId);
      }

      return res.status(200).json({
        verified: true,
        status: "COMPLETED",
        orderId: order.id,
        orderNumber: order.order_number,
      });
    }

    return res.status(200).json({
      verified: false,
      status: result.status,
      message: result.message || "Payment is not completed",
    });
  } catch (err: any) {
    console.error("verify-payment handler exception:", err);
    return res.status(500).json({ error: "Payment verification error" });
  }
}
