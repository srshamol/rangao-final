import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase credentials (URL/Key) are missing in environment variables.");
  }
  return createClient(supabaseUrl, supabaseKey);
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message, isTest, isNewOrder, isStatusUpdate, isIncompleteOrder, isLowStock } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message content is required" });
  }

  try {
    // 1. Fetch telegram_settings from store_settings table
    const supabase = getSupabaseClient();
    const { data: row, error: dbError } = await supabase
      .from("store_settings" as any)
      .select("value")
      .eq("key", "telegram_settings")
      .maybeSingle();

    if (dbError) {
      console.error("Database query failed:", dbError);
      return res.status(500).json({ error: "Failed to load store settings" });
    }

    if (!row || !row.value) {
      return res.status(404).json({ error: "Telegram settings not configured" });
    }

    const settings = row.value;
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

    const result = await response.json();

    if (!response.ok || !result.ok) {
      console.error("Telegram API error:", result);
      return res.status(502).json({
        error: "Failed to send message via Telegram API",
        details: result.description || "Unknown error",
      });
    }

    return res.status(200).json({ status: "success", telegram_response: result });
  } catch (err: any) {
    console.error("Notification handler exception:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
