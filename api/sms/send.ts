import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://yglexjxvypwmvjvsspil.supabase.co";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase credentials (URL/Key) are missing in environment variables.");
  }
  return createClient(supabaseUrl, supabaseKey);
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { phone, message, orderId } = req.body;
  if (!phone || !message) {
    return res.status(400).json({ error: "Phone and message are required" });
  }

  const cleanPhone = phone.trim();
  const msgText = message.trim();

  try {
    const supabase = getSupabaseClient();
    
    // 1. Fetch SMS settings
    const { data: row, error: dbError } = await supabase
      .from("store_settings" as any)
      .select("value")
      .eq("key", "sms_settings")
      .maybeSingle();

    if (dbError) {
      console.error("Database query failed:", dbError);
      return res.status(500).json({ error: "Failed to load store settings" });
    }

    if (!row || !row.value) {
      return res.status(404).json({ error: "SMS settings not configured" });
    }

    const settings = row.value;
    const { enabled, sandbox_mode, gateway, api_key, sender_id, api_url } = settings;

    if (!enabled) {
      return res.status(200).json({ status: "skipped", reason: "SMS system is disabled" });
    }

    if (sandbox_mode || gateway === "sandbox") {
      console.log(`[SMS SANDBOX] Sending SMS to ${cleanPhone}: "${msgText}"`);
      if (orderId) {
        await supabase.from("order_history" as any).insert({
          order_id: orderId,
          action: "sms_notification",
          details: `Sandbox SMS simulation succeeded: "${msgText.substring(0, 100)}..."`,
          staff_name: "System",
        });
      }
      return res.status(200).json({ status: "success", message: "SMS sent successfully (Sandbox)", sandbox: true });
    }

    // Call SMS Gateway
    let smsSuccess = false;
    let gatewayResponse = "";

    if (gateway === "greenweb") {
      const url = `https://api.greenweb.com.bd/api.php?json&token=${encodeURIComponent(api_key)}&to=${encodeURIComponent(cleanPhone)}&message=${encodeURIComponent(msgText)}`;
      const response = await fetch(url);
      const text = await response.text();
      gatewayResponse = text;
      smsSuccess = response.ok;
    } else if (gateway === "elitbuzz") {
      const url = `https://sms.elitbuzz-bd.com/smsapi?api_key=${encodeURIComponent(api_key)}&type=text&contacts=${encodeURIComponent(cleanPhone)}&senderid=${encodeURIComponent(sender_id)}&msg=${encodeURIComponent(msgText)}`;
      const response = await fetch(url);
      const text = await response.text();
      gatewayResponse = text;
      smsSuccess = response.ok;
    } else if (gateway === "bulksmsbd") {
      const url = `http://bulksmsbd.net/api/smsapi?api_key=${encodeURIComponent(api_key)}&type=text&number=${encodeURIComponent(cleanPhone)}&senderid=${encodeURIComponent(sender_id)}&message=${encodeURIComponent(msgText)}`;
      const response = await fetch(url);
      const text = await response.text();
      gatewayResponse = text;
      smsSuccess = response.ok;
    } else if (gateway === "mim_sms") {
      const url = `https://mim-sms.com/smsapi?api_key=${encodeURIComponent(api_key)}&type=text&contacts=${encodeURIComponent(cleanPhone)}&senderid=${encodeURIComponent(sender_id)}&msg=${encodeURIComponent(msgText)}`;
      const response = await fetch(url);
      const text = await response.text();
      gatewayResponse = text;
      smsSuccess = response.ok;
    } else if (gateway === "custom" && api_url) {
      const method = settings.method || "GET";
      const headers = settings.headers ? JSON.parse(settings.headers) : {};
      
      let finalUrl = api_url
        .replace("{to}", encodeURIComponent(cleanPhone))
        .replace("{msg}", encodeURIComponent(msgText));

      let body = null;
      if (method === "POST" && settings.body_template) {
        body = settings.body_template
          .replace("{to}", cleanPhone)
          .replace("{msg}", msgText);
      }

      const response = await fetch(finalUrl, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body,
      });

      const text = await response.text();
      gatewayResponse = text;
      smsSuccess = response.ok;
    }

    if (orderId) {
      await supabase.from("order_history" as any).insert({
        order_id: orderId,
        action: "sms_notification",
        details: smsSuccess 
          ? `SMS notification sent successfully via gateway ${gateway}` 
          : `SMS notification failed: ${gatewayResponse.substring(0, 100)}`,
        staff_name: "System",
      });
    }

    if (!smsSuccess) {
      return res.status(502).json({ error: "Failed to send SMS via gateway", response: gatewayResponse });
    }

    return res.status(200).json({ status: "success", gatewayResponse });
  } catch (err: any) {
    console.error("send-sms handler exception:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
