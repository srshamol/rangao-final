import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const DEFAULT_GRAPH_API_VERSION = "v21.0";
const META_GRAPH_API_BASE = "https://graph.facebook.com";

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. CORS & Methods
  res.setHeader("Access-Control-Allow-Origin", "*");
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

    if (!event_name || typeof event_name !== "string") {
      return res.status(400).json({ error: "event_name is required" });
    }

    const finalEventId = String(event_id || `evt_${event_name.toLowerCase()}_${Date.now()}`).trim();

    // 2. Resolve Supabase Client for authoritative order lookup
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://yglexjxvypwmvjvsspil.supabase.co";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // 3. Load tracking credentials (Environment variables take precedence, database fallback)
    const AUTHORITATIVE_META_DATASET_ID = "1862583688445311";
    const INVALID_META_DATASET_IDS = ["18625836884445311"];

    function sanitizeDatasetId(id?: string | null): string {
      if (id && typeof id === "string") {
        const clean = id.trim();
        if (INVALID_META_DATASET_IDS.includes(clean)) return AUTHORITATIVE_META_DATASET_ID;
        if (/^\d{15,16}$/.test(clean)) return clean;
      }
      return AUTHORITATIVE_META_DATASET_ID;
    }

    let metaPixelId = sanitizeDatasetId(
      process.env.META_PIXEL_ID ||
      process.env.NEXT_PUBLIC_META_PIXEL_ID ||
      process.env.VITE_META_PIXEL_ID
    );
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
        if (!process.env.META_GRAPH_API_VERSION && trackingConfig.meta_api_version) {
          const confVersion = String(trackingConfig.meta_api_version).trim();
          if (/^v\d+\.\d+$/.test(confVersion)) {
            apiVersion = confVersion;
          }
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

    // 5. Build authoritative User Data
    const formattedUserData: Record<string, any> = {};

    let authoritativeValue = normalizeValue(custom_data?.value);
    let authoritativeContentIds = custom_data?.content_ids || [];
    let authoritativeContents = custom_data?.contents || [];
    let authoritativeOrderId = custom_data?.order_id || order_id;
    let matchedDbOrder: any = null;

    // If order_id is present (especially for Purchase), verify from Database
    if (order_id) {
      try {
        const { data: dbOrder } = await supabase
          .from("orders")
          .select("*, order_items(*)")
          .or(`id.eq.${order_id},order_number.eq.${order_id}`)
          .maybeSingle();

        if (dbOrder) {
          matchedDbOrder = dbOrder;

          // Idempotency: Check if Purchase was already sent for this order
          if (event_name === "Purchase") {
            const status = (dbOrder.order_status || "").toLowerCase();
            if (status === "cancelled" || status === "refunded" || status === "failed") {
              return res.status(200).json({
                skipped: true,
                message: `Order is ${status}, skipping Purchase event`,
              });
            }

            if (dbOrder.meta_purchase_status === "sent") {
              return res.status(200).json({
                success: true,
                deduplicated: true,
                message: "Purchase event already sent for this order (db status)",
              });
            }

            const { data: history } = await supabase
              .from("order_history")
              .select("id")
              .eq("order_id", dbOrder.id)
              .eq("action", "fb_capi_sent")
              .maybeSingle();

            if (history) {
              return res.status(200).json({
                success: true,
                deduplicated: true,
                message: "Purchase event already sent for this order (history)",
              });
            }
          }

          // Authoritative customer data from database
          if (dbOrder.customer_email) {
            formattedUserData.em = [sha256(dbOrder.customer_email.toLowerCase().trim())];
          }
          if (dbOrder.customer_phone) {
            formattedUserData.ph = [sha256(normalizeBDPhone(dbOrder.customer_phone))];
          }
          if (dbOrder.customer_name) {
            const parts = dbOrder.customer_name.trim().split(/\s+/);
            if (parts[0]) formattedUserData.fn = [sha256(parts[0].toLowerCase())];
            if (parts.length > 1) formattedUserData.ln = [sha256(parts[parts.length - 1].toLowerCase())];
          }
          if (dbOrder.shipping_address?.city || dbOrder.shipping_address?.district) {
            formattedUserData.ct = [sha256((dbOrder.shipping_address.city || dbOrder.shipping_address.district).toLowerCase())];
          }
          if (dbOrder.fbp) formattedUserData.fbp = dbOrder.fbp;
          if (dbOrder.fbc) formattedUserData.fbc = dbOrder.fbc;
          formattedUserData.external_id = [sha256(dbOrder.id)];

          // Authoritative order details
          authoritativeValue = normalizeValue(dbOrder.total_amount);
          authoritativeOrderId = dbOrder.order_number;

          if (dbOrder.order_items && dbOrder.order_items.length > 0) {
            authoritativeContentIds = dbOrder.order_items.map((i: any) => String(i.product_id || i.product_name));
            authoritativeContents = dbOrder.order_items.map((i: any) => ({
              id: String(i.product_id || i.product_name),
              quantity: i.quantity || 1,
              item_price: normalizeValue(i.unit_price || 0),
            }));
          }
        }
      } catch (dbErr) {
        console.warn("[Meta CAPI Serverless] Error looking up order from DB:", dbErr);
      }
    }

    // Fallback/direct user matching data from request body if not populated from DB
    if (!formattedUserData.em && user_data.email) {
      formattedUserData.em = [sha256(user_data.email.toLowerCase().trim())];
    }
    if (!formattedUserData.ph && user_data.phone) {
      formattedUserData.ph = [sha256(normalizeBDPhone(user_data.phone))];
    }
    if (!formattedUserData.fn && user_data.firstName) {
      formattedUserData.fn = [sha256(user_data.firstName.toLowerCase().trim())];
    }
    if (!formattedUserData.ln && user_data.lastName) {
      formattedUserData.ln = [sha256(user_data.lastName.toLowerCase().trim())];
    }
    if (user_data.fbp && !formattedUserData.fbp) {
      formattedUserData.fbp = user_data.fbp;
    }
    if (user_data.fbc && !formattedUserData.fbc) {
      formattedUserData.fbc = user_data.fbc;
    }

    formattedUserData.country = [sha256("bd")];
    formattedUserData.client_ip_address = user_data.client_ip_address || clientIp;
    formattedUserData.client_user_agent = user_data.client_user_agent || clientUserAgent;

    // 6. Build Meta CAPI Event Payload
    const eventTime = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
    const eventSourceUrl = req.headers.referer || "https://www.rangao.bd";

    const customDataPayload: Record<string, any> = {
      ...custom_data,
      currency: "BDT",
      content_type: "product",
      value: authoritativeValue,
    };

    if (authoritativeContentIds.length > 0) {
      customDataPayload.content_ids = authoritativeContentIds;
    }
    if (authoritativeContents.length > 0) {
      customDataPayload.contents = authoritativeContents;
    }
    if (authoritativeOrderId) {
      customDataPayload.order_id = authoritativeOrderId;
    }

    const capiEvent = {
      event_name,
      event_time: eventTime,
      event_id: finalEventId,
      event_source_url: eventSourceUrl,
      action_source: "website",
      user_data: formattedUserData,
      custom_data: customDataPayload,
    };

    const payload: Record<string, any> = {
      data: [capiEvent],
      access_token: metaAccessToken,
    };

    if (testEventCode) {
      payload.test_event_code = testEventCode.trim();
    }

    // 7. Dispatch to Meta Graph API
    const response = await fetch(
      `${META_GRAPH_API_BASE}/${apiVersion}/${metaPixelId}/events`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const result = await response.json();
    const isSuccess = response.ok && !result.error;

    // Log to order history & update orders table if order_id exists
    if (matchedDbOrder && event_name === "Purchase") {
      try {
        if (isSuccess) {
          await supabase
            .from("orders")
            .update({
              meta_purchase_event_id: finalEventId,
              meta_purchase_status: "sent",
              meta_purchase_sent_at: new Date().toISOString(),
              meta_purchase_last_error: null,
            })
            .eq("id", matchedDbOrder.id);

          await supabase.from("order_history").insert({
            order_id: matchedDbOrder.id,
            action: "fb_capi_sent",
            details: `Meta CAPI ${event_name} ইভেন্ট সফলভাবে পাঠানো হয়েছে (Event ID: ${finalEventId})`,
            staff_name: "Meta CAPI System",
          });
        } else {
          const errorMsg = result.error?.message || JSON.stringify(result);
          await supabase
            .from("orders")
            .update({
              meta_purchase_status: "failed",
              meta_purchase_last_error: errorMsg,
            })
            .eq("id", matchedDbOrder.id);
        }
      } catch (logErr) {
        // non-blocking
      }
    }

    if (!isSuccess) {
      const errorMsg = result.error?.message || `HTTP ${response.status}: Failed to send Meta CAPI event`;
      console.warn(
        `[Meta CAPI] Event ${event_name} failed:`,
        `Code: ${result.error?.code || response.status}`,
        `Message: ${errorMsg}`,
        `Trace: ${result.fbtrace_id || "N/A"}`
      );

      // Return HTTP 200 with structured diagnostic response so frontend never gets a 500 console error
      return res.status(200).json({
        success: false,
        status: "meta_rejected",
        error: errorMsg,
        code: result.error?.code,
        error_subcode: result.error?.error_subcode,
        fbtrace_id: result.fbtrace_id,
      });
    }

    return res.status(200).json({
      success: true,
      status: "sent",
      event_id: finalEventId,
      events_received: result.events_received,
      fbtrace_id: result.fbtrace_id,
    });
  } catch (err: any) {
    console.error("[Meta CAPI Serverless Exception]:", err.message || err);
    return res.status(200).json({
      success: false,
      status: "server_exception",
      error: err.message || "Internal server error",
    });
  }
}
