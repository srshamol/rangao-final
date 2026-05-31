import { supabase } from "@/integrations/supabase/client";

interface OrderControlSettings {
  max_orders_per_period: number;
  cooldown_hours: number;
  block_message: string;
  enabled: boolean;
}

interface CheckResult {
  allowed: boolean;
  message: string;
}

export async function checkOrderAllowed(phone: string, ipAddress?: string): Promise<CheckResult> {
  const normalizedIP = ipAddress?.trim().split(",")[0]?.trim() || "";

  // 1. Check if phone is blocked
  const { data: blockedPhone } = await supabase
    .from("blocked_entities")
    .select("id")
    .eq("type", "phone")
    .eq("value", phone)
    .maybeSingle();

  if (blockedPhone) {
    return {
      allowed: false,
      message: "এই ফোন নম্বর থেকে অর্ডার ব্লক করা হয়েছে। WhatsApp-এ যোগাযোগ করুন।",
    };
  }

  // 2. Check if IP is blocked
  if (normalizedIP) {
    const { data: blockedIP } = await supabase
      .from("blocked_entities")
      .select("id")
      .eq("type", "ip")
      .eq("value", normalizedIP)
      .maybeSingle();

    if (blockedIP) {
      return {
        allowed: false,
        message: "আপনার ডিভাইস থেকে অর্ডার ব্লক করা হয়েছে। WhatsApp-এ যোগাযোগ করুন।",
      };
    }
  }

  // 3. Check rate limiting settings
  const { data: settingsRow } = await supabase
    .from("store_settings")
    .select("value")
    .eq("key", "order_control")
    .single();

  const settings: OrderControlSettings = (settingsRow?.value as any) || {
    max_orders_per_period: 1,
    cooldown_hours: 24,
    block_message: "আপনি ইতিমধ্যে একটি অর্ডার করেছেন। পরে আবার চেষ্টা করুন।",
    enabled: true,
  };

  if (!settings.enabled) {
    return { allowed: true, message: "" };
  }

  // 4. Check recent orders by phone
  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - settings.cooldown_hours);

  const { count: recentOrdersByPhone } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("customer_phone", phone)
    .gte("created_at", cutoffTime.toISOString());

  if ((recentOrdersByPhone || 0) >= settings.max_orders_per_period) {
    return {
      allowed: false,
      message: settings.block_message,
    };
  }

  // 5. Check recent orders by IP
  if (normalizedIP) {
    const { count: recentOrdersByIP } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("ip_address", normalizedIP)
      .gte("created_at", cutoffTime.toISOString());

    if ((recentOrdersByIP || 0) >= settings.max_orders_per_period) {
      return {
        allowed: false,
        message: settings.block_message,
      };
    }
  }

  return { allowed: true, message: "" };
}

export async function getClientIP(): Promise<string> {
  const endpoints = [
    "https://api64.ipify.org?format=json",
    "https://api.ipify.org?format=json",
    "https://ipapi.co/json/",
  ];

  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(endpoint, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) continue;

      const data = await res.json();
      const ip = (data?.ip || data?.query || "").toString().trim();
      if (ip) return ip;
    } catch {
      // try next provider
    }
  }

  return "";
}
