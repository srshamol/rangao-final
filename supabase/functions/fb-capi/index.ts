import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    // Fetch order
    const { data: order, error: orderErr } = await supabase
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

    // Only send for confirmed/delivered
    if (!["confirmed", "delivered"].includes(order.order_status)) {
      return new Response(
        JSON.stringify({ error: "Only confirmed/delivered orders can be sent", skipped: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch order items
    const { data: items } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", order_id);

    // Fetch FB settings from store_settings
    const { data: fbRow } = await supabase
      .from("store_settings")
      .select("value")
      .eq("key", "facebook_pixel")
      .single();

    const fbSettings = fbRow?.value as any;
    if (!fbSettings?.pixel_id || !fbSettings?.access_token || !fbSettings?.enabled) {
      return new Response(
        JSON.stringify({ error: "Facebook Pixel not configured or disabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build CAPI event
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

    const contentIds = (items || []).map((i: any) => i.product_id || i.product_name);
    const numItems = (items || []).reduce((sum: number, i: any) => sum + (i.quantity || 1), 0);

    const eventData: Record<string, any> = {
      event_name: event_name,
      event_time: Math.floor(Date.now() / 1000),
      event_source_url: Deno.env.get("SITE_URL") || "https://gadgetgram-sparkle.lovable.app",
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
      access_token: fbSettings.access_token,
    };

    if (fbSettings.test_event_code) {
      payload.test_event_code = fbSettings.test_event_code;
    }

    // Send to Facebook
    const fbResponse = await fetch(
      `https://graph.facebook.com/v21.0/${fbSettings.pixel_id}/events`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const fbResult = await fbResponse.json();

    // Log the result
    const success = fbResponse.ok && !fbResult.error;
    await supabase.from("order_history").insert({
      order_id: order_id,
      action: "fb_capi_sent",
      details: success
        ? `Facebook CAPI ${event_name} ইভেন্ট সফলভাবে পাঠানো হয়েছে`
        : `Facebook CAPI ব্যর্থ: ${fbResult.error?.message || JSON.stringify(fbResult)}`,
      staff_name: "System",
    });

    return new Response(
      JSON.stringify({
        success,
        fb_response: fbResult,
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
