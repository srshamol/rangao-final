import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const DEFAULT_GRAPH_API_VERSION = "v21.0";
const META_GRAPH_API_BASE = "https://graph.facebook.com";

const ALLOWED_EVENT_NAMES = new Set([
  "PageView",
  "ViewContent",
  "AddToCart",
  "InitiateCheckout",
  "Purchase",
  "Lead",
  "Contact",
  "AddPaymentInfo",
  "CustomizeProduct",
]);

// Helper: SHA-256 Hash
function sha256(value: string): string {
  if (!value) return "";
  return crypto.createHash("sha256").update(value.trim(), "utf8").digest("hex");
}

// Helper: Phone Normalization for BD (E.164 without leading +)
function normalizeBDPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const bengaliDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  let cleaned = String(phone).trim();
  for (let i = 0; i < 10; i++) {
    cleaned = cleaned.replaceAll(bengaliDigits[i], i.toString());
  }
  cleaned = cleaned.replace(/\D/g, "");
  if (cleaned.startsWith("880") && cleaned.length === 13) return cleaned;
  if (cleaned.startsWith("01") && cleaned.length === 11) return `88${cleaned}`;
  if (cleaned.startsWith("1") && cleaned.length === 10) return `880${cleaned}`;
  return cleaned;
}

// Helper: Normalize value strictly to positive float number
function normalizeValue(value: any): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) / 100 : 0;
  }
  const cleanStr = String(value).replace(/[^0-9.-]+/g, "");
  const num = parseFloat(cleanStr);
  return Number.isFinite(num) && num >= 0 ? Math.round(num * 100) / 100 : 0;
}

// Helper: Validate Origin / Referer
function isAllowedOrigin(origin: string | undefined, referer: string | undefined): { allowed: boolean; originHeader: string } {
  const target = origin || referer || "";
  if (!target) return { allowed: true, originHeader: "*" }; // Server-to-server or direct internal

  try {
    const url = new URL(target.startsWith("http") ? target : `https://${target}`);
    const host = url.hostname.toLowerCase();

    const isMatch =
      host === "rangao.bd" ||
      host === "www.rangao.bd" ||
      host.endsWith(".rangao.bd") ||
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".vercel.app");

    return {
      allowed: isMatch,
      originHeader: isMatch ? (origin || `https://${host}`) : "",
    };
  } catch {
    return { allowed: false, originHeader: "" };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin as string;
  const referer = req.headers.referer as string;
  const originCheck = isAllowedOrigin(origin, referer);

  if (!originCheck.allowed) {
    return res.status(403).json({ error: "Forbidden: Unauthorized origin for Meta CAPI relay" });
  }

  if (originCheck.originHeader && originCheck.originHeader !== "*") {
    res.setHeader("Access-Control-Allow-Origin", originCheck.originHeader);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { event_name, event_id, order_id, custom_data = {}, user_data = {} } = req.body || {};

    if (!event_name || typeof event_name !== "string" || !ALLOWED_EVENT_NAMES.has(event_name.trim())) {
      return res.status(400).json({ error: "Invalid or unsupported event_name" });
    }

    const cleanEventName = event_name.trim();
    const finalEventId = String(event_id || `evt_${cleanEventName.toLowerCase()}_${Date.now()}`).trim();

    // 2. Resolve Supabase Client (fail closed if service key missing)
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://yglexjxvypwmvjvsspil.supabase.co";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseServiceKey) {
      console.error("Meta CAPI Error: SUPABASE_SERVICE_ROLE_KEY is required.");
      return res.status(500).json({ error: "Server configuration missing" });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // 3. Load tracking credentials (Environment variables take precedence, database fallback)
    const AUTHORITATIVE_META_DATASET_ID = "1862583688445311";

    function sanitizeDatasetId(id?: string | null): string {
      if (id && typeof id === "string") {
        const clean = id.trim();
        if (/^\d{15,16}$/.test(clean)) return clean;
      }
      return AUTHORITATIVE_META_DATASET_ID;
    }

    let metaPixelId = sanitizeDatasetId(process.env.META_PIXEL_ID || process.env.VITE_META_PIXEL_ID);
    let metaAccessToken = process.env.META_CAPI_ACCESS_TOKEN || "";
    let testEventCode = process.env.META_TEST_EVENT_CODE || "";
    let capiEnabled = true;
    let apiVersion = process.env.META_GRAPH_API_VERSION || DEFAULT_GRAPH_API_VERSION;

    try {
      const { data: rows } = await supabase
        .from("store_settings")
        .select("key, value")
        .in("key", ["tracking_settings", "public_tracking_settings"]);

      const trackingConfig = (rows?.find((r) => r.key === "tracking_settings")?.value ||
        rows?.find((r) => r.key === "public_tracking_settings")?.value) as any;

      if (trackingConfig) {
        if (!process.env.META_PIXEL_ID && trackingConfig.meta_pixel_id) {
          metaPixelId = sanitizeDatasetId(trackingConfig.meta_pixel_id);
        }
        if (!metaAccessToken && trackingConfig.meta_access_token) {
          metaAccessToken = trackingConfig.meta_access_token;
        }
        if (!testEventCode && trackingConfig.meta_test_event_code) {
          testEventCode = trackingConfig.meta_test_event_code;
        }
        if (trackingConfig.meta_capi_enabled !== undefined) capiEnabled = Boolean(trackingConfig.meta_capi_enabled);
        if (trackingConfig.global_enabled === false) capiEnabled = false;
      }
    } catch (settingsErr) {
      console.warn("[Meta CAPI Serverless] Error reading settings from DB:", settingsErr);
    }

    metaPixelId = sanitizeDatasetId(metaPixelId);

    if (!capiEnabled || !metaPixelId || !metaAccessToken) {
      return res.status(200).json({
        skipped: true,
        message: "Meta CAPI is not configured or disabled in settings",
      });
    }

    // 4. Capture Client IP & User Agent
    const clientIp =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ||
      (req.headers["x-real-ip"] as string) ||
      req.socket.remoteAddress ||
      "";
    const clientUserAgent = (req.headers["user-agent"] as string) || "";

    // 5. Authoritative Order Data Validation for Purchase Events
    let finalValue = normalizeValue(custom_data.value);
    let finalCurrency = custom_data.currency || "BDT";
    let finalContentIds: string[] = Array.isArray(custom_data.content_ids)
      ? custom_data.content_ids.map(String).filter((id: string) => id.trim().length > 0)
      : [];
    let finalNumItems = Number(custom_data.num_items) || (finalContentIds.length > 0 ? finalContentIds.length : 1);
    let finalContents = Array.isArray(custom_data.contents) ? custom_data.contents : [];

    let customerPhone = user_data.phone || "";
    let customerEmail = user_data.email || "";
    let customerName = user_data.name || "";
    let clientFbp = user_data.fbp || req.body?.fbp || "";
    let clientFbc = user_data.fbc || req.body?.fbc || "";

    if (cleanEventName === "Purchase" && order_id) {
      try {
        const { data: orderData } = await supabase
          .from("orders")
          .select(`
            id, order_number, total_amount, customer_name, customer_phone, customer_email,
            fbp, fbc, ip_address, user_agent,
            order_items ( id, product_id, product_name, quantity, unit_price )
          `)
          .or(`id.eq.${order_id},order_number.eq.${order_id}`)
          .maybeSingle();

        if (orderData) {
          finalValue = normalizeValue(orderData.total_amount);
          if (!customerPhone && orderData.customer_phone) customerPhone = orderData.customer_phone;
          if (!customerEmail && orderData.customer_email) customerEmail = orderData.customer_email;
          if (!customerName && orderData.customer_name) customerName = orderData.customer_name;
          if (!clientFbp && orderData.fbp) clientFbp = orderData.fbp;
          if (!clientFbc && orderData.fbc) clientFbc = orderData.fbc;

          if (orderData.order_items && Array.isArray(orderData.order_items) && orderData.order_items.length > 0) {
            finalContentIds = orderData.order_items.map((i: any) => String(i.product_id || i.product_name));
            finalNumItems = orderData.order_items.reduce((sum: number, i: any) => sum + (Number(i.quantity) || 1), 0);
            finalContents = orderData.order_items.map((i: any) => ({
              id: String(i.product_id || i.product_name),
              quantity: Number(i.quantity) || 1,
              item_price: normalizeValue(i.unit_price),
            }));
          }
        }
      } catch (orderErr) {
        console.warn("[Meta CAPI Serverless] Error fetching order data:", orderErr);
      }
    }

    // 6. Construct User Data with Normalization & Hashing
    const userDataPayload: Record<string, any> = {};

    const cleanPhone = normalizeBDPhone(customerPhone);
    if (cleanPhone) userDataPayload.ph = [sha256(cleanPhone)];

    if (customerEmail && typeof customerEmail === "string" && customerEmail.includes("@")) {
      userDataPayload.em = [sha256(customerEmail.trim().toLowerCase())];
    }

    if (customerName && typeof customerName === "string") {
      const parts = customerName.trim().split(/\s+/);
      if (parts.length > 0 && parts[0]) userDataPayload.fn = [sha256(parts[0].toLowerCase())];
      if (parts.length > 1 && parts[parts.length - 1]) userDataPayload.ln = [sha256(parts[parts.length - 1].toLowerCase())];
    }

    if (clientIp) userDataPayload.client_ip_address = clientIp;
    if (clientUserAgent) userDataPayload.client_user_agent = clientUserAgent;
    if (clientFbp) userDataPayload.fbp = String(clientFbp).trim();
    if (clientFbc) userDataPayload.fbc = String(clientFbc).trim();

    // 7. Construct Custom Data
    const customDataPayload: Record<string, any> = {
      currency: finalCurrency,
      value: finalValue,
    };

    if (finalContentIds.length > 0) {
      customDataPayload.content_ids = finalContentIds;
      customDataPayload.content_type = "product";
    }
    if (finalNumItems > 0) customDataPayload.num_items = finalNumItems;
    if (finalContents.length > 0) customDataPayload.contents = finalContents;
    if (order_id) customDataPayload.order_id = String(order_id).trim();

    // 8. Build Meta CAPI Payload
    const eventPayload: Record<string, any> = {
      event_name: cleanEventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: finalEventId,
      event_source_url: req.body?.event_source_url || referer || "https://www.rangao.bd",
      action_source: "website",
      user_data: userDataPayload,
      custom_data: customDataPayload,
    };

    const graphUrl = `${META_GRAPH_API_BASE}/${apiVersion}/${metaPixelId}/events`;
    const postBody: Record<string, any> = {
      data: [eventPayload],
      access_token: metaAccessToken,
    };

    if (testEventCode) {
      postBody.test_event_code = testEventCode;
    }

    const metaResponse = await fetch(graphUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(postBody),
    });

    const metaResult = await metaResponse.json();

    if (!metaResponse.ok) {
      console.error("[Meta CAPI Relay] Graph API error:", metaResult);
      return res.status(502).json({
        error: "Meta Graph API error",
        details: metaResult.error?.message || "Unknown error from Meta",
      });
    }

    return res.status(200).json({
      success: true,
      events_received: metaResult.events_received || 1,
      fbtrace_id: metaResult.fbtrace_id,
      event_id: finalEventId,
    });
  } catch (err: any) {
    console.error("[Meta CAPI Relay] Handler exception:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
