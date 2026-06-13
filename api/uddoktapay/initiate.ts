import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
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

  const { orderId, origin } = req.body;

  if (!orderId) {
    return res.status(400).json({ error: "orderId is required" });
  }

  const frontendOrigin = origin || "http://localhost:5173";

  try {
    const supabase = getSupabaseClient();

    // 1. Fetch order details from database
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, order_number, total_amount, customer_name, customer_email, customer_phone")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error("Failed to fetch order:", orderError);
      return res.status(404).json({ error: "Order not found" });
    }

    // 2. Fetch UddoktaPay credentials from store_settings
    const { data: row, error: settingsError } = await supabase
      .from("store_settings" as any)
      .select("value")
      .eq("key", "payment_methods")
      .maybeSingle();

    if (settingsError || !row || !row.value) {
      console.error("Failed to load payment settings:", settingsError);
      return res.status(500).json({ error: "Payment configuration not found" });
    }

    const { uddoktapay_api_key, uddoktapay_base_url } = row.value as any;

    if (!uddoktapay_api_key || !uddoktapay_base_url) {
      return res.status(400).json({ error: "UddoktaPay credentials are not configured in settings" });
    }

    // Prepare API URL and key
    let baseUrl = uddoktapay_base_url.trim().replace(/\/$/, "");
    if (baseUrl.endsWith("/api")) {
      baseUrl = baseUrl.slice(0, -4).replace(/\/$/, "");
    }
    const apiKey = uddoktapay_api_key.trim();

    // 3. Initiate payment with UddoktaPay checkout-v2 API
    const uddoktaPayPayload = {
      full_name: order.customer_name || "Customer",
      email: order.customer_email || "customer@example.com",
      amount: String(order.total_amount),
      currency: "BDT",
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
      },
      redirect_url: `${frontendOrigin}/order-success/${order.order_number}`,
      return_type: "GET",
      cancel_url: `${frontendOrigin}/checkout?payment_status=cancelled`,
      webhook_url: `${frontendOrigin}/api/uddoktapay/webhook`,
    };

    console.log("Initiating UddoktaPay payment for order:", order.order_number, "Payload:", uddoktaPayPayload);

    const apiResponse = await fetch(`${baseUrl}/api/checkout-v2`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "accept": "application/json",
        "RT-UDDOKTAPAY-API-KEY": apiKey,
      },
      body: JSON.stringify(uddoktaPayPayload),
    });

    const result = await apiResponse.json();

    if (!apiResponse.ok || !result.status) {
      console.error("UddoktaPay initiate API error:", result);
      return res.status(502).json({
        error: "Failed to initiate payment with UddoktaPay",
        details: result.message || "Unknown error",
      });
    }

    // 4. Log initiate action in order_history
    await supabase.from("order_history" as any).insert({
      order_id: order.id,
      action: "payment_initiated",
      details: `UddoktaPay payment initiated. URL: ${result.payment_url}`,
      staff_name: "System",
    });

    return res.status(200).json({ payment_url: result.payment_url });
  } catch (err: any) {
    console.error("Payment initiate exception:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
