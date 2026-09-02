import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

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

function getSupabaseAdmin() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://yglexjxvypwmvjvsspil.supabase.co";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for authoritative SMS dispatch.");
  }
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
}

// Helper: Verify caller is staff or internal
async function verifyCallerAuth(req: VercelRequest, supabase: any): Promise<boolean> {
  const internalSecret = req.headers["x-internal-secret"];
  if (internalSecret && process.env.INTERNAL_API_SECRET && internalSecret === process.env.INTERNAL_API_SECRET) {
    return true;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }

  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return false;

  const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !user) return false;

  // Check user role from profiles / user_roles
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const userRole = roleData?.role || user.user_metadata?.role;
  return ["admin", "manager", "sales", "super_admin"].includes(userRole);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const supabase = getSupabaseAdmin();

    // Enforce authentication & authorization
    const isAuthorized = await verifyCallerAuth(req, supabase);
    if (!isAuthorized) {
      return res.status(401).json({ error: "Unauthorized: Staff authentication required to dispatch custom SMS." });
    }

    const { phone, message, orderId } = req.body || {};
    if (!phone || !message) {
      return res.status(400).json({ error: "Phone and message are required" });
    }

    const cleanPhone = normalizeBDPhone(phone);
    const msgText = String(message).trim();

    if (!cleanPhone || cleanPhone.length !== 11 || !msgText) {
      return res.status(400).json({ error: "Invalid phone number or empty message" });
    }

    // 1. Fetch SMS settings
    const { data: row, error: dbError } = await supabase
      .from("store_settings")
      .select("value")
      .eq("key", "sms_settings")
      .maybeSingle();

    if (dbError || !row || !row.value) {
      return res.status(404).json({ error: "SMS settings not configured" });
    }

    const settings = row.value as any;
    const { enabled, sandbox_mode, gateway, api_key, sender_id, api_url } = settings;

    if (!enabled) {
      return res.status(200).json({ status: "skipped", reason: "SMS system is disabled" });
    }

    if (sandbox_mode || gateway === "sandbox") {
      console.log(`[SMS SANDBOX] Sending SMS to ${cleanPhone}: "${msgText.substring(0, 100)}"`);
      if (orderId) {
        await supabase.from("order_history").insert({
          order_id: orderId,
          action: "sms_notification",
          details: `Sandbox SMS simulation: "${msgText.substring(0, 100)}..."`,
          staff_name: "Staff",
        });
      }
      return res.status(200).json({ status: "success", message: "SMS dispatched in sandbox mode", sandbox: true });
    }

    // Call SMS Gateway
    let smsSuccess = false;

    if (gateway === "greenweb" && api_key) {
      const url = `https://api.greenweb.com.bd/api.php?json&token=${encodeURIComponent(api_key)}&to=${encodeURIComponent(cleanPhone)}&message=${encodeURIComponent(msgText)}`;
      const response = await fetch(url);
      smsSuccess = response.ok;
    } else if (gateway === "elitbuzz" && api_key && sender_id) {
      const url = `https://sms.elitbuzz-bd.com/smsapi?api_key=${encodeURIComponent(api_key)}&type=text&contacts=${encodeURIComponent(cleanPhone)}&senderid=${encodeURIComponent(sender_id)}&msg=${encodeURIComponent(msgText)}`;
      const response = await fetch(url);
      smsSuccess = response.ok;
    } else if (gateway === "bulksmsbd" && api_key && sender_id) {
      const url = `http://bulksmsbd.net/api/smsapi?api_key=${encodeURIComponent(api_key)}&type=text&number=${encodeURIComponent(cleanPhone)}&senderid=${encodeURIComponent(sender_id)}&message=${encodeURIComponent(msgText)}`;
      const response = await fetch(url);
      smsSuccess = response.ok;
    } else if (gateway === "mim_sms" && api_key && sender_id) {
      const url = `https://mim-sms.com/smsapi?api_key=${encodeURIComponent(api_key)}&type=text&contacts=${encodeURIComponent(cleanPhone)}&senderid=${encodeURIComponent(sender_id)}&msg=${encodeURIComponent(msgText)}`;
      const response = await fetch(url);
      smsSuccess = response.ok;
    } else if (gateway === "custom" && api_url) {
      const method = settings.method || "GET";
      const headers = settings.headers ? JSON.parse(settings.headers) : {};
      const finalUrl = api_url
        .replace("{to}", encodeURIComponent(cleanPhone))
        .replace("{msg}", encodeURIComponent(msgText));

      const response = await fetch(finalUrl, { method, headers });
      smsSuccess = response.ok;
    }

    if (orderId) {
      await supabase.from("order_history").insert({
        order_id: orderId,
        action: "sms_notification",
        details: smsSuccess 
          ? `SMS notification sent successfully via ${gateway}` 
          : `SMS notification delivery failed via ${gateway}`,
        staff_name: "Staff",
      });
    }

    if (!smsSuccess) {
      return res.status(502).json({ error: "SMS delivery failed via provider gateway." });
    }

    return res.status(200).json({ status: "success", message: "SMS dispatched successfully." });
  } catch (err: any) {
    console.error("send-sms handler exception:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
