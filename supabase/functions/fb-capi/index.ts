import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { order_id, event_name = "Purchase" } = body;

    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Fetch order using admin client
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if CAPI Purchase was already sent for this order to prevent duplicate fires
    if (event_name === "Purchase") {
      const { data: existingSent } = await supabaseAdmin
        .from("order_history")
        .select("id")
        .eq("order_id", order_id)
        .eq("action", "fb_capi_sent")
        .maybeSingle();

      if (existingSent) {
        return new Response(
          JSON.stringify({ error: "Facebook CAPI Purchase event already sent for this order", skipped: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Only send for pending, confirmed, or delivered orders
    if (!["pending", "confirmed", "delivered"].includes(order.order_status)) {
      return new Response(
        JSON.stringify({ error: "Only pending, confirmed, or delivered orders can be sent", skipped: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch order items using admin client
    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("*")
      .eq("order_id", order_id);

    // Fetch FB/TikTok settings from store_settings using admin client
    const { data: fbRow } = await supabaseAdmin
      .from("store_settings")
      .select("value")
      .eq("key", "tracking_settings")
      .single();

    const fbSettings = fbRow?.value as any;
    
    const metaCapiEnabled = fbSettings?.meta_pixel_id && fbSettings?.meta_access_token && fbSettings?.meta_capi_enabled && fbSettings?.global_enabled;
    const tiktokCapiEnabled = fbSettings?.tiktok_pixel_id && fbSettings?.tiktok_access_token && fbSettings?.tiktok_enabled && fbSettings?.global_enabled;

    if (!metaCapiEnabled && !tiktokCapiEnabled) {
      return new Response(
        JSON.stringify({ error: "Neither Facebook CAPI nor TikTok Events API is configured or enabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let fbSuccess = false;
    let fbResult = null;
    let ttSuccess = false;
    let ttResult = null;

    const userAgent = req.headers.get("user-agent") || "";
    const rawIp = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "";
    const clientIp = rawIp.split(",")[0].trim();

    // 1. Meta Conversions API (CAPI)
    if (metaCapiEnabled) {
      try {
        const userData: Record<string, any> = {};
        if (order.customer_phone) {
          userData.ph = [await sha256(order.customer_phone.replace(/[^0-9]/g, ""))];
        }
        if (order.customer_email) {
          userData.em = [await sha256(order.customer_email.toLowerCase().trim())];
        }
        if (order.customer_name) {
          const nameParts = order.customer_name.trim().split(" ");
          if (nameParts[0]) userData.fn = [await sha256(nameParts[0].toLowerCase())];
          if (nameParts.length > 1) userData.ln = [await sha256(nameParts[nameParts.length - 1].toLowerCase())];
        }
        userData.country = [await sha256("bd")];
        if (clientIp) {
          userData.client_ip_address = clientIp;
        }
        if (userAgent) {
          userData.client_user_agent = userAgent;
        }

        const contentIds = (items || []).map((i: any) => i.product_id || i.product_name);
        const numItems = (items || []).reduce((sum: number, i: any) => sum + (i.quantity || 1), 0);

        const eventData: Record<string, any> = {
          event_name: event_name,
          event_time: Math.floor(Date.now() / 1000),
          event_id: order.order_number,
          event_source_url: Deno.env.get("SITE_URL") || "https://www.rangao.bd",
          user_data: userData,
          custom_data: {
            value: Number(order.total_amount),
            currency: "BDT",
            content_ids: contentIds,
            content_type: "product",
            num_items: numItems,
            order_id: order.order_number,
          },
          action_source: "website",
        };

        const payload: Record<string, any> = {
          data: [eventData],
          access_token: fbSettings.meta_access_token,
        };

        if (fbSettings.meta_test_event_code) {
          payload.test_event_code = fbSettings.meta_test_event_code;
        }

        const apiVersion = fbSettings.meta_api_version || "v21.0";

        const fbResponse = await fetch(
          `https://graph.facebook.com/${apiVersion}/${fbSettings.meta_pixel_id}/events`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );

        fbResult = await fbResponse.json();
        fbSuccess = fbResponse.ok && !fbResult.error;

        await supabase.from("order_history").insert({
          order_id: order_id,
          action: "fb_capi_sent",
          details: fbSuccess
            ? `Facebook CAPI ${event_name} ইভেন্ট সফলভাবে পাঠানো হয়েছে`
            : `Facebook CAPI ব্যর্থ: ${fbResult.error?.message || JSON.stringify(fbResult)}`,
          staff_name: "System",
        });
      } catch (err: any) {
        console.error("FB CAPI execution error:", err);
      }
    }

    // 2. TikTok Events API (Conversions API)
    if (tiktokCapiEnabled) {
      try {
        let ttEventName = event_name;
        if (event_name === "Purchase") {
          ttEventName = "CompletePayment";
        } else if (event_name === "Lead") {
          ttEventName = "SubmitForm";
        }

        const ttContents = (items || []).map((i: any) => ({
          content_id: String(i.product_id || i.product_name),
          content_name: i.product_name,
          quantity: Number(i.quantity || 1),
          price: Number(i.price || 0)
        }));

        const ttEvent: Record<string, any> = {
          event: ttEventName,
          event_id: order.order_number,
          timestamp: new Date().toISOString(),
          user: {
            phone_number: order.customer_phone ? await sha256(order.customer_phone.replace(/[^0-9]/g, "")) : undefined,
            email: order.customer_email ? await sha256(order.customer_email.toLowerCase().trim()) : undefined,
          },
          properties: {
            value: Number(order.total_amount),
            currency: "BDT",
            content_type: "product",
            contents: ttContents
          },
          context: {
            user_agent: userAgent || undefined,
            ip: clientIp || undefined
          }
        };

        const ttPayload: Record<string, any> = {
          pixel_code: fbSettings.tiktok_pixel_id,
          events: [ttEvent]
        };

        // If the merchant configures a test event code under fbSettings
        if (fbSettings.tiktok_test_event_code) {
          ttPayload.test_event_code = fbSettings.tiktok_test_event_code;
        } else if (fbSettings.meta_test_event_code?.startsWith("TEST")) {
          // Fallback if they put it in meta but it is a TikTok style code
          ttPayload.test_event_code = fbSettings.meta_test_event_code;
        }

        const ttResponse = await fetch(
          "https://business-api.tiktok.com/open_api/v1.3/event/track/",
          {
            method: "POST",
            headers: {
              "Access-Token": fbSettings.tiktok_access_token,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(ttPayload),
          }
        );

        ttResult = await ttResponse.json();
        ttSuccess = ttResponse.ok && ttResult.code === 0;

        await supabase.from("order_history").insert({
          order_id: order_id,
          action: "fb_capi_sent", // logged under the same action so it syncs to UI logs naturally
          details: ttSuccess
            ? `TikTok Conversions API ${ttEventName} ইভেন্ট সফলভাবে পাঠানো হয়েছে`
            : `TikTok Conversions API ব্যর্থ: ${ttResult.message || JSON.stringify(ttResult)} (Code: ${ttResult.code})`,
          staff_name: "System",
        });
      } catch (err: any) {
        console.error("TikTok Event API execution error:", err);
      }
    }

    return new Response(
      JSON.stringify({
        success: fbSuccess || ttSuccess,
        fb_success: fbSuccess,
        fb_response: fbResult,
        tt_success: ttSuccess,
        tt_response: ttResult,
        event_name,
        order_number: order.order_number,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function sha256(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

