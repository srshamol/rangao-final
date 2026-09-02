import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://yglexjxvypwmvjvsspil.supabase.co";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for authoritative Telegram notification dispatch.");
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

    // Enforce authorization: only staff or internal services can trigger notifications
    const isAuthorized = await verifyCallerAuth(req, supabase);
    if (!isAuthorized) {
      return res.status(401).json({ error: "Unauthorized: Staff authentication required to send Telegram notifications." });
    }

    const { message, isTest, isNewOrder, isStatusUpdate, isIncompleteOrder, isLowStock, orderId } = req.body || {};

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message content is required" });
    }

    const msgText = message.trim();

    // 1. Fetch telegram_settings from store_settings table
    const { data: row, error: dbError } = await supabase
      .from("store_settings")
      .select("value")
      .eq("key", "telegram_settings")
      .maybeSingle();

    if (dbError || !row || !row.value) {
      return res.status(404).json({ error: "Telegram settings not configured" });
    }

    const settings = row.value as any;
    const { 
      bot_token, 
      chat_id, 
      enabled, 
      notify_new_order, 
      notify_status_change,
      notify_incomplete_order,
      notify_low_stock
    } = settings;

    // 2. Validate configuration
    if (!isTest && !enabled) {
      return res.status(200).json({ status: "skipped", reason: "Telegram notifications are disabled" });
    }

    if (isNewOrder && !notify_new_order && !isTest) {
      return res.status(200).json({ status: "skipped", reason: "New order notifications are disabled" });
    }

    if (isStatusUpdate && !notify_status_change && !isTest) {
      return res.status(200).json({ status: "skipped", reason: "Status change notifications are disabled" });
    }

    if (isIncompleteOrder && !notify_incomplete_order && !isTest) {
      return res.status(200).json({ status: "skipped", reason: "Incomplete order notifications are disabled" });
    }

    if (isLowStock && !notify_low_stock && !isTest) {
      return res.status(200).json({ status: "skipped", reason: "Low stock notifications are disabled" });
    }

    if (!bot_token || !chat_id) {
      return res.status(400).json({ error: "Bot token or Chat ID is missing in settings" });
    }

    // 3. Deliver to Telegram Bot API
    const telegramUrl = `https://api.telegram.org/bot${bot_token}/sendMessage`;
    const response = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chat_id,
        text: msgText,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
      console.error("Telegram API error:", result);
      if (orderId) {
        await supabase.from("order_history").insert({
          order_id: orderId,
          action: "telegram_notification",
          details: `Telegram notification delivery failed: ${result.description || "Unknown error"}`,
          staff_name: "System",
        });
      }
      return res.status(502).json({ error: "Failed to deliver message via Telegram provider." });
    }

    if (orderId) {
      await supabase.from("order_history").insert({
        order_id: orderId,
        action: "telegram_notification",
        details: "Telegram notification sent successfully",
        staff_name: "System",
      });
    }

    return res.status(200).json({ status: "success", message: "Notification delivered successfully." });
  } catch (err: any) {
    console.error("Telegram handler exception:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
