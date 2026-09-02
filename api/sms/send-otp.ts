import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// Helper: Normalize Bangladesh Phone Number
function normalizeBDPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const bengaliDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  let cleaned = String(phone).trim();
  for (let i = 0; i < 10; i++) {
    cleaned = cleaned.replaceAll(bengaliDigits[i], i.toString());
  }
  cleaned = cleaned.replace(/\D/g, "");
  if (cleaned.startsWith("880") && cleaned.length === 13) cleaned = cleaned.substring(2);
  if (cleaned.startsWith("80") && cleaned.length === 12) cleaned = "0" + cleaned.substring(2);
  if (!cleaned.startsWith("0") && cleaned.length === 10) cleaned = "0" + cleaned;
  return cleaned;
}

// Helper: Hash OTP Code with phone salt
export function hashOtp(phone: string, code: string): string {
  return crypto
    .createHash("sha256")
    .update(`${phone.trim()}:${code.trim()}`)
    .digest("hex");
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://yglexjxvypwmvjvsspil.supabase.co";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for authoritative OTP operations.");
  }
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { phone } = req.body || {};
  if (!phone) {
    return res.status(400).json({ error: "Phone number is required" });
  }

  const cleanPhone = normalizeBDPhone(phone);
  if (!cleanPhone || cleanPhone.length !== 11 || !cleanPhone.startsWith("01")) {
    return res.status(400).json({ error: "সঠিক ১১ ডিজিটের বাংলাদেশি মোবাইল নম্বর দিন (যেমন: 017xxxxxxxx)" });
  }

  const clientIp =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ||
    (req.headers["x-real-ip"] as string) ||
    req.socket.remoteAddress ||
    "unknown";

  try {
    const supabase = getSupabaseAdmin();

    // 1. Fetch SMS settings from store_settings (via service role)
    const { data: row } = await supabase
      .from("store_settings")
      .select("value")
      .eq("key", "sms_settings")
      .maybeSingle();

    const settings = (row?.value as any) || {
      enabled: false,
      sandbox_mode: true,
      otp_digit_count: 4,
      otp_template: "Your OTP code is {otp}. Valid for 5 minutes.",
      gateway: "sandbox",
    };

    // 2. Rate-Limiting: Check recent OTP requests for this phone and IP
    const now = Date.now();
    const oneMinuteAgo = new Date(now - 60 * 1000).toISOString();
    const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString();

    // Check 60-second cooldown
    const { data: recentOtps, error: rateErr } = await supabase
      .from("otp_verifications")
      .select("id, created_at")
      .eq("phone", cleanPhone)
      .gt("created_at", oneMinuteAgo);

    if (!rateErr && recentOtps && recentOtps.length > 0) {
      return res.status(429).json({
        error: "অনুগ্রহ করে ১ মিনিট পর আবার ওটিপি রিকোয়েস্ট করুন।",
        cooldown: true,
      });
    }

    // Check hourly limit (max 5 per hour per phone)
    const { data: hourlyOtps } = await supabase
      .from("otp_verifications")
      .select("id")
      .eq("phone", cleanPhone)
      .gt("created_at", oneHourAgo);

    if (hourlyOtps && hourlyOtps.length >= 5) {
      return res.status(429).json({
        error: "আপনি সর্বোচ্চ সংখ্যক ওটিপি রিকোয়েস্ট করেছেন। অনুগ্রহ করে ১ ঘণ্টা পর চেষ্টা করুন।",
      });
    }

    // 3. Generate Cryptographically Random OTP Code
    const digitCount = Number(settings.otp_digit_count) === 6 ? 6 : 4;
    const minCode = digitCount === 6 ? 100000 : 1000;
    const maxCode = digitCount === 6 ? 999999 : 9999;
    const rawCode = String(crypto.randomInt(minCode, maxCode + 1));

    const codeHash = hashOtp(cleanPhone, rawCode);
    const expiresAt = new Date(now + 5 * 60 * 1000).toISOString(); // 5 mins

    // 4. Save Hashed OTP record to database (Zero Plaintext Storage)
    const { error: insertError } = await supabase
      .from("otp_verifications")
      .insert({
        phone: cleanPhone,
        code_hash: codeHash,
        verified: false,
        attempts: 0,
        max_attempts: 3,
        expires_at: expiresAt,
        ip_address: clientIp,
      });

    if (insertError) {
      console.error("Error inserting hashed OTP:", insertError);
      return res.status(500).json({ error: "Failed to create verification record" });
    }

    // 5. Dispatch SMS via Gateway if enabled
    const otpMessage = (settings.otp_template || "Your OTP code is {otp}. Valid for 5 minutes.")
      .replace("{otp}", rawCode);

    if (settings.sandbox_mode || !settings.enabled || settings.gateway === "sandbox") {
      console.log(`[SMS SANDBOX] Sending OTP to ${cleanPhone}: "${otpMessage}"`);
      // Crucial Security Rule: NEVER return the OTP code in response even in sandbox mode!
      return res.status(200).json({
        status: "success",
        message: "ওটিপি সফলভাবে পাঠানো হয়েছে",
        sandbox: true,
      });
    }

    const gateway = settings.gateway;
    const apiKey = settings.api_key || "";
    const senderId = settings.sender_id || "";
    const apiUrl = settings.api_url || "";

    let smsSuccess = false;

    if (gateway === "greenweb" && apiKey) {
      const url = `https://api.greenweb.com.bd/api.php?json&token=${encodeURIComponent(apiKey)}&to=${encodeURIComponent(cleanPhone)}&message=${encodeURIComponent(otpMessage)}`;
      const response = await fetch(url);
      smsSuccess = response.ok;
    } else if (gateway === "elitbuzz" && apiKey && senderId) {
      const url = `https://sms.elitbuzz-bd.com/smsapi?api_key=${encodeURIComponent(apiKey)}&type=text&contacts=${encodeURIComponent(cleanPhone)}&senderid=${encodeURIComponent(senderId)}&msg=${encodeURIComponent(otpMessage)}`;
      const response = await fetch(url);
      smsSuccess = response.ok;
    } else if (gateway === "bulksmsbd" && apiKey && senderId) {
      const url = `http://bulksmsbd.net/api/smsapi?api_key=${encodeURIComponent(apiKey)}&type=text&number=${encodeURIComponent(cleanPhone)}&senderid=${encodeURIComponent(senderId)}&message=${encodeURIComponent(otpMessage)}`;
      const response = await fetch(url);
      smsSuccess = response.ok;
    } else if (gateway === "mim_sms" && apiKey && senderId) {
      const url = `https://mim-sms.com/smsapi?api_key=${encodeURIComponent(apiKey)}&type=text&contacts=${encodeURIComponent(cleanPhone)}&senderid=${encodeURIComponent(senderId)}&msg=${encodeURIComponent(otpMessage)}`;
      const response = await fetch(url);
      smsSuccess = response.ok;
    } else if (gateway === "custom" && apiUrl) {
      const method = settings.method || "GET";
      const headers = settings.headers ? JSON.parse(settings.headers) : {};
      const finalUrl = apiUrl
        .replace("{to}", encodeURIComponent(cleanPhone))
        .replace("{msg}", encodeURIComponent(otpMessage));

      const response = await fetch(finalUrl, { method, headers });
      smsSuccess = response.ok;
    }

    if (!smsSuccess) {
      console.warn(`SMS gateway ${gateway} delivery failed for ${cleanPhone}`);
    }

    // Never return the OTP code
    return res.status(200).json({
      status: "success",
      message: "ওটিপি সফলভাবে পাঠানো হয়েছে",
    });
  } catch (err: any) {
    console.error("send-otp handler exception:", err);
    return res.status(500).json({ error: "ওটিপি পাঠাতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।" });
  }
}
