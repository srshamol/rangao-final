import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase credentials (URL/Key) are missing in environment variables.");
  }
  return createClient(supabaseUrl, supabaseKey);
}

// Background Telegram Notification Helper
async function triggerTelegramNotification(supabase: any, orderData: any, paymentUrl?: string) {
  try {
    const { data: row } = await supabase
      .from("store_settings" as any)
      .select("value")
      .eq("key", "telegram_settings")
      .maybeSingle();

    if (row && row.value) {
      const { bot_token, chat_id, enabled, notify_new_order } = row.value;
      if (enabled && notify_new_order && bot_token && chat_id) {
        const items = orderData.items || [];
        const itemsList = items
          .map((i: any) => `• ${i.product_name || i.name} (Qty: ${i.quantity}) - ৳${i.total_price || (i.unit_price * i.quantity)}`)
          .join("\n");

        let couponText = "";
        if (orderData.coupon_code) {
          couponText = `<b>কুপন:</b> ${orderData.coupon_code} (ছাড়: ৳${orderData.discount_amount})\n`;
        }

        const address = orderData.shipping_address || {};
        const addressText = `${address.address || ""}${address.thana ? ", " + address.thana : ""}${address.district ? ", " + address.district : ""}, ${address.division || ""}`;

        const message = `🛍️ <b>নতুন অর্ডার এসেছে!</b>\n\n` +
          `<b>অর্ডার নং:</b> #${orderData.order_number}\n` +
          `<b>গ্রাহকের নাম:</b> ${orderData.customer_name}\n` +
          `<b>মোবাইল:</b> ${orderData.customer_phone}\n` +
          `<b>ঠিকানা:</b> ${addressText}\n` +
          `<b>পেমেন্ট মেথড:</b> ${orderData.payment_method}\n` +
          couponText +
          `\n<b>পণ্যসমূহ:</b>\n${itemsList}\n\n` +
          `<b>সাবটোটাল:</b> ৳${orderData.subtotal}\n` +
          `<b>ডেলিভারি চার্জ:</b> ৳${orderData.delivery_charge}\n` +
          `<b>সর্বমোট পরিমাণ:</b> ৳${orderData.total_amount}` +
          (paymentUrl ? `\n\n🔗 <b>Payment URL:</b> ${paymentUrl}` : "");

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

        await supabase.from("order_history" as any).insert({
          order_id: orderData.order_id || orderData.id,
          action: "telegram_notification",
          details: "Telegram notification for new order sent successfully",
          staff_name: "System",
        });
      }
    }
  } catch (tgErr) {
    console.error("Failed to send telegram notification:", tgErr);
  }
}

// Background Customer Order SMS Helper
async function triggerOrderSuccessSMS(supabase: any, orderData: any) {
  try {
    const { data: row } = await supabase
      .from("store_settings" as any)
      .select("value")
      .eq("key", "sms_settings")
      .maybeSingle();

    if (row && row.value) {
      const smsConfig = row.value;
      if (smsConfig.enabled && smsConfig.order_success_sms_enabled && orderData.customer_phone) {
        const smsTemplate = smsConfig.order_success_sms_template || "Dear {name}, your order #{order_number} has been received. Total: ৳{total}.";
        const smsText = smsTemplate
          .replace("{name}", orderData.customer_name || "Customer")
          .replace("{order_number}", orderData.order_number)
          .replace("{total}", String(orderData.total_amount));

        // Call internal SMS delivery endpoint or send directly
        const cleanPhone = orderData.customer_phone.trim();
        const apiKey = smsConfig.api_key;
        const senderId = smsConfig.sender_id || smsConfig.senderId;

        if (apiKey && senderId && !smsConfig.sandbox_mode) {
          // Standard Greenweb / BulkSMS gateway dispatch
          const apiUrl = `http://api.greenweb.com.bd/api.php?token=${encodeURIComponent(apiKey)}&to=${encodeURIComponent(cleanPhone)}&message=${encodeURIComponent(smsText)}`;
          await fetch(apiUrl, { method: "GET" });
        }
      }
    }
  } catch (smsErr) {
    console.error("Failed to send order success SMS:", smsErr);
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    items,
    customer,
    shippingAddress,
    paymentMethod = "cod",
    couponCode = null,
    orderNotes = null,
    idempotencyKey = null,
    trackingParams = {},
    userId = null,
    origin = null,
  } = req.body || {};

  // 1. Basic Payload Validation
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "কার্টে কোনো পণ্য নেই (Cart is empty)" });
  }

  if (!customer?.name?.trim() || !customer?.phone?.trim()) {
    return res.status(400).json({ error: "নাম এবং মোবাইল নাম্বার প্রদান করা আবশ্যক" });
  }

  if (!shippingAddress?.division?.trim() || !shippingAddress?.address?.trim()) {
    return res.status(400).json({ error: "ডেলিভারি ঠিকানা ও বিভাগ প্রদান করা আবশ্যক" });
  }

  // Extract server-derived headers
  const clientIP = req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || req.socket?.remoteAddress || "";
  const userAgent = req.headers["user-agent"] || "";

  const mergedTracking = {
    ...trackingParams,
    ip_address: typeof clientIP === "string" ? clientIP.split(",")[0].trim() : "",
    user_agent: userAgent,
  };

  // Map items to authoritatively strictly required fields: product_id, variant_id, quantity
  const sanitizedItems = items.map((item: any) => ({
    product_id: item.productId || item.product_id || item.id,
    variant_id: item.variantId || item.variant_id || item.selectedVariant?.id || null,
    quantity: Number(item.quantity || 1),
  }));

  try {
    const supabase = getSupabaseClient();

    // 2. Execute Transactional Authoritative Checkout RPC
    const { data: orderSummary, error: rpcError } = await supabase.rpc("process_checkout", {
      p_items: sanitizedItems,
      p_customer_name: customer.name.trim(),
      p_customer_phone: customer.phone.trim(),
      p_customer_email: customer.email?.trim() || null,
      p_shipping_address: shippingAddress,
      p_payment_method: paymentMethod,
      p_coupon_code: couponCode?.trim() || null,
      p_order_notes: orderNotes?.trim() || null,
      p_idempotency_key: idempotencyKey?.trim() || null,
      p_user_id: userId || null,
      p_tracking_params: mergedTracking,
    });

    if (rpcError) {
      console.error("Checkout RPC Error:", rpcError);
      const errMsg = rpcError.message || "Failed to process order";

      if (errMsg.includes("OUT_OF_STOCK")) {
        return res.status(400).json({ error: "পণ্যটি বর্তমানে স্টকে নেই বা পর্যাপ্ত স্টক নেই", details: errMsg });
      }
      if (errMsg.includes("INVALID_VARIANT") || errMsg.includes("INACTIVE_VARIANT")) {
        return res.status(400).json({ error: "নির্বাচিত ভ্যারিয়েশনটি সঠিক নয় বা বর্তমানে অনুপলব্ধ", details: errMsg });
      }
      if (errMsg.includes("COUPON")) {
        return res.status(400).json({ error: "কুপন কোডটি সঠিক নয় বা ব্যবহারের শর্ত পূরণ হয়নি", details: errMsg });
      }
      if (errMsg.includes("VALIDATION_ERROR") || errMsg.includes("INVALID_PRODUCT")) {
        return res.status(400).json({ error: "অর্ডারের তথ্যে ত্রুটি রয়েছে", details: errMsg });
      }

      return res.status(500).json({ error: "অর্ডার সম্পন্ন করতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।", details: errMsg });
    }

    if (!orderSummary || !orderSummary.order_id) {
      return res.status(500).json({ error: "অর্ডার তৈরিতে ত্রুটি দেখা দিয়েছে" });
    }

    // 3. Handle Online Payment Gateway (UddoktaPay) Server-Side
    if (paymentMethod === "uddoktapay") {
      try {
        const { data: payRow, error: settingsError } = await supabase
          .from("store_settings" as any)
          .select("value")
          .eq("key", "payment_methods")
          .maybeSingle();

        if (settingsError || !payRow || !payRow.value) {
          throw new Error("Payment settings configuration not found.");
        }

        const { uddoktapay_api_key, uddoktapay_base_url } = payRow.value as any;
        if (!uddoktapay_api_key || !uddoktapay_base_url) {
          throw new Error("UddoktaPay API credentials are missing in store settings.");
        }

        let baseUrl = uddoktapay_base_url.trim().replace(/\/$/, "");
        if (baseUrl.endsWith("/api")) {
          baseUrl = baseUrl.slice(0, -4).replace(/\/$/, "");
        }
        const apiKey = uddoktapay_api_key.trim();
        const siteOrigin = origin || req.headers.origin || "http://localhost:5173";

        const uddoktaPayPayload = {
          full_name: orderSummary.customer_name || "Customer",
          email: orderSummary.customer_email || "customer@example.com",
          amount: String(orderSummary.total_amount),
          currency: "BDT",
          metadata: {
            order_id: orderSummary.order_id,
            order_number: orderSummary.order_number,
          },
          redirect_url: `${siteOrigin}/order-success/${orderSummary.order_number}`,
          return_type: "GET",
          cancel_url: `${siteOrigin}/checkout?payment_status=cancelled`,
          webhook_url: `${siteOrigin}/api/uddoktapay/webhook`,
        };

        const apiResponse = await fetch(`${baseUrl}/api/checkout-v2`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            accept: "application/json",
            "RT-UDDOKTAPAY-API-KEY": apiKey,
          },
          body: JSON.stringify(uddoktaPayPayload),
        });

        const payResult = await apiResponse.json();

        if (apiResponse.ok && payResult.status && payResult.payment_url) {
          await supabase.from("order_history" as any).insert({
            order_id: orderSummary.order_id,
            action: "payment_initiated",
            details: `UddoktaPay payment URL generated: ${payResult.payment_url}`,
            staff_name: "System",
          });

          // Trigger background Telegram notification
          triggerTelegramNotification(supabase, orderSummary, payResult.payment_url).catch(() => {});

          return res.status(200).json({
            success: true,
            order: orderSummary,
            payment_url: payResult.payment_url,
          });
        } else {
          console.error("UddoktaPay initiate error:", payResult);
          return res.status(200).json({
            success: true,
            order: orderSummary,
            payment_error: payResult.message || "পেমেন্ট গেটওয়েতে সংযোগ করতে সমস্যা হয়েছে",
          });
        }
      } catch (payEx: any) {
        console.error("UddoktaPay payment initiation exception:", payEx);
        return res.status(200).json({
          success: true,
          order: orderSummary,
          payment_error: payEx.message || "পেমেন্ট গেটওয়েতে সমস্যা হয়েছে",
        });
      }
    }

    // 4. Background Notifications for COD and other payment methods
    triggerTelegramNotification(supabase, orderSummary).catch(() => {});
    triggerOrderSuccessSMS(supabase, orderSummary).catch(() => {});

    return res.status(200).json({
      success: true,
      order: orderSummary,
    });
  } catch (err: any) {
    console.error("Checkout Handler Exception:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
