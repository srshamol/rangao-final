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

  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: "Phone number is required" });
  }

  const cleanPhone = phone.trim();

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

    const settings = row?.value || {
      enabled: false,
      sandbox_mode: true,
      otp_digit_count: 4,
      otp_template: "Your OTP code is {otp}. Valid for 5 minutes.",
      gateway: "sandbox",
    };

    // 2. Generate OTP Code
    const digitCount = Number(settings.otp_digit_count) || 4;
    let code = "";
    if (digitCount === 6) {
      code = String(Math.floor(100000 + Math.random() * 900000));
    } else {
      code = String(Math.floor(1000 + Math.random() * 9000));
    }

    // 3. Special test phone number fallback
    if (cleanPhone === "01700000000" || cleanPhone === "01711111111") {
      code = "1234";
    }

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 mins

    // 4. Save to otp_verifications table
    const { error: insertError } = await supabase
      .from("otp_verifications" as any)
      .insert({
        phone: cleanPhone,
        code,
        verified: false,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error("Error inserting OTP:", insertError);
      return res.status(500).json({ error: "Failed to save verification code" });
    }

    // 5. Send OTP if enabled
    const otpMessage = (settings.otp_template || "Your OTP code is {otp}. Valid for 5 minutes.")
      .replace("{otp}", code);

    // If sandbox mode is enabled, we succeed immediately and return the code (for dev / testing convenience)
    if (settings.sandbox_mode || !settings.enabled || settings.gateway === "sandbox") {
      console.log(`[SMS SANDBOX] Sending OTP to ${cleanPhone}: "${otpMessage}"`);
      return res.status(200).json({ 
        status: "success", 
        message: "OTP sent successfully (Sandbox Mode)", 
        sandbox: true,
        // In sandbox we return the code to let user proceed without real gateway
        code: (cleanPhone === "01700000000" || cleanPhone === "01711111111") ? "1234" : code 
      });
    }

    // Call SMS Gateway
    const gateway = settings.gateway;
    const apiKey = settings.api_key || "";
    const username = settings.username || "";
    const password = settings.password || "";
    const senderId = settings.sender_id || "";
    const apiUrl = settings.api_url || "";

    let smsSuccess = false;
    let gatewayResponse = "";

    if (gateway === "greenweb") {
      const url = `https://api.greenweb.com.bd/api.php?json&token=${encodeURIComponent(apiKey)}&to=${encodeURIComponent(cleanPhone)}&message=${encodeURIComponent(otpMessage)}`;
      const response = await fetch(url);
      const text = await response.text();
      gatewayResponse = text;
      smsSuccess = response.ok;
    } else if (gateway === "elitbuzz") {
      const url = `https://sms.elitbuzz-bd.com/smsapi?api_key=${encodeURIComponent(apiKey)}&type=text&contacts=${encodeURIComponent(cleanPhone)}&senderid=${encodeURIComponent(senderId)}&msg=${encodeURIComponent(otpMessage)}`;
      const response = await fetch(url);
      const text = await response.text();
      gatewayResponse = text;
      smsSuccess = response.ok;
    } else if (gateway === "bulksmsbd") {
      const url = `http://bulksmsbd.net/api/smsapi?api_key=${encodeURIComponent(apiKey)}&type=text&number=${encodeURIComponent(cleanPhone)}&senderid=${encodeURIComponent(senderId)}&message=${encodeURIComponent(otpMessage)}`;
      const response = await fetch(url);
      const text = await response.text();
      gatewayResponse = text;
      smsSuccess = response.ok;
    } else if (gateway === "mim_sms") {
      const url = `https://mim-sms.com/smsapi?api_key=${encodeURIComponent(apiKey)}&type=text&contacts=${encodeURIComponent(cleanPhone)}&senderid=${encodeURIComponent(senderId)}&msg=${encodeURIComponent(otpMessage)}`;
      const response = await fetch(url);
      const text = await response.text();
      gatewayResponse = text;
      smsSuccess = response.ok;
    } else if (gateway === "custom" && apiUrl) {
      // Custom Gateway configuration
      const method = settings.method || "GET";
      const headers = settings.headers ? JSON.parse(settings.headers) : {};
      
      let finalUrl = apiUrl
        .replace("{to}", encodeURIComponent(cleanPhone))
        .replace("{msg}", encodeURIComponent(otpMessage));

      let body = null;
      if (method === "POST" && settings.body_template) {
        body = settings.body_template
          .replace("{to}", cleanPhone)
          .replace("{msg}", otpMessage);
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

    if (!smsSuccess) {
      console.error(`SMS Gateway failed for ${gateway}. Response: ${gatewayResponse}`);
      return res.status(502).json({ error: "Failed to send OTP via SMS Gateway" });
    }

    return res.status(200).json({ status: "success", message: "OTP sent successfully" });
  } catch (err: any) {
    console.error("send-otp handler exception:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
