import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

const STEADFAST_BASE_URL = 'https://portal.packzy.com/api/v1';

const courierStatusBengali: Record<string, string> = {
  pending: "পেন্ডিং (পিকআপ রিকোয়েস্ট)",
  in_review: "পর্যালোচনায় (In Review)",
  picked: "পিকআপ সম্পন্ন",
  pickup_done: "পিকআপ সম্পন্ন",
  dispatched: "হাবে পাঠানো হয়েছে",
  in_transit: "ট্রানজিটে আছে (গন্তব্যে যাচ্ছে)",
  out_for_delivery: "ডেলিভারির উদ্দেশ্যে বের হয়েছে",
  delivered: "ডেলিভারি সম্পন্ন ✅",
  partial_delivered: "আংশিক ডেলিভারি",
  delivered_approval_pending: "ডেলিভারি অনুমোদনের অপেক্ষায়",
  cancelled: "ক্যান্সেলড ❌",
  cancelled_approval_pending: "ক্যান্সেলেশন অনুমোদনের অপেক্ষায়",
  hold: "হোল্ড (স্থগিত)",
  return: "রিটার্ন প্রক্রিয়াধীন",
  returned: "রিটার্ন সম্পন্ন",
  unknown: "অজ্ঞাত অবস্থা",
};

function cleanPhone(rawPhone?: string): string {
  if (!rawPhone) return '';
  let cleaned = String(rawPhone).replace(/[^\d+]/g, '').trim();
  if (cleaned.startsWith('+880')) {
    cleaned = '0' + cleaned.substring(4);
  } else if (cleaned.startsWith('880')) {
    cleaned = '0' + cleaned.substring(3);
  } else if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  // If 10 digits starting with 1, prepend 0
  if (cleaned.length === 10 && cleaned.startsWith('1')) {
    cleaned = '0' + cleaned;
  }
  return cleaned;
}

async function getAdminClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

  if (supabaseUrl && (serviceRoleKey || anonKey)) {
    return createClient(supabaseUrl, serviceRoleKey || anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return null;
}

async function getCredentials(reqAuthHeader?: string | null) {
  let apiKey = Deno.env.get('STEADFAST_API_KEY') || '';
  let secretKey = Deno.env.get('STEADFAST_SECRET_KEY') || '';

  const adminClient = await getAdminClient();

  if (adminClient) {
    try {
      const { data, error } = await adminClient
        .from('store_settings')
        .select('value')
        .eq('key', 'courier_settings')
        .maybeSingle();

      if (!error && data?.value) {
        if (data.value.api_key) apiKey = String(data.value.api_key).trim();
        if (data.value.secret_key) secretKey = String(data.value.secret_key).trim();
      }
    } catch (e) {
      console.error('Error fetching courier credentials from database:', e);
    }
  }

  // Fallback with user auth header if adminClient didn't get keys
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  if ((!apiKey || !secretKey) && reqAuthHeader && supabaseUrl && anonKey) {
    try {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: reqAuthHeader } }
      });
      const { data, error } = await userClient
        .from('store_settings')
        .select('value')
        .eq('key', 'courier_settings')
        .maybeSingle();
      if (!error && data?.value) {
        if (data.value.api_key) apiKey = String(data.value.api_key).trim();
        if (data.value.secret_key) secretKey = String(data.value.secret_key).trim();
      }
    } catch (e) {
      console.error('Fallback credential fetch failed:', e);
    }
  }

  return { apiKey, secretKey };
}

async function requestSteadfast(endpoint: string, options: { method?: string; body?: any; headers: Record<string, string> }) {
  const url = `${STEADFAST_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers: options.headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const contentType = res.headers.get('content-type') || '';
  let data: any;

  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    const text = await res.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = { rawText: text, status: res.status, message: text || `HTTP ${res.status} error from Steadfast` };
    }
  }

  return {
    httpStatus: res.status,
    ok: res.ok,
    data,
  };
}

async function handleWebhookUpdate(webhookData: any, adminClient: any) {
  if (!adminClient) {
    return { status: "error", message: "Database admin client unavailable" };
  }

  const notificationType = webhookData.notification_type || 'delivery_status';
  const invoice = webhookData.invoice ? String(webhookData.invoice).trim() : '';
  const consignmentId = webhookData.consignment_id ? String(webhookData.consignment_id).trim() : '';
  const trackingCode = webhookData.tracking_code ? String(webhookData.tracking_code).trim() : '';
  const rawStatus = (webhookData.status || webhookData.delivery_status || '').toLowerCase().trim();
  const trackingMessage = webhookData.tracking_message || webhookData.message || webhookData.note || '';
  const updatedAt = webhookData.updated_at || new Date().toISOString();

  if (!invoice && !consignmentId && !trackingCode) {
    return { status: "error", message: "Missing invoice or consignment ID in webhook payload." };
  }

  // Look up order by invoice (order_number), consignment_id, or tracking_code
  let query = adminClient.from('orders').select('*');
  if (invoice) {
    query = query.eq('order_number', invoice);
  } else if (consignmentId) {
    query = query.eq('shipping_address->>consignment_id', consignmentId);
  } else if (trackingCode) {
    query = query.eq('shipping_address->>tracking_number', trackingCode);
  }

  const { data: order, error: findError } = await query.maybeSingle();
  if (findError || !order) {
    console.warn(`Webhook: Order not found for invoice=${invoice}, cid=${consignmentId}, tracking=${trackingCode}`);
    return { status: "error", message: "Order not found for given invoice / consignment ID." };
  }

  const currentAddress = (typeof order.shipping_address === 'object' && order.shipping_address) ? order.shipping_address : {};
  const currentUpdates = Array.isArray(currentAddress.tracking_updates) ? [...currentAddress.tracking_updates] : [];

  // Determine status - if tracking_update has no explicit status, use existing or infer
  let effectiveStatus = rawStatus || currentAddress.courier_status || 'in_transit';
  if (!rawStatus && trackingMessage) {
    const lowerMsg = trackingMessage.toLowerCase();
    if (lowerMsg.includes('deliver') && !lowerMsg.includes('out for')) effectiveStatus = 'delivered';
    else if (lowerMsg.includes('out for delivery')) effectiveStatus = 'out_for_delivery';
    else if (lowerMsg.includes('sorting') || lowerMsg.includes('hub') || lowerMsg.includes('transit')) effectiveStatus = 'in_transit';
    else if (lowerMsg.includes('pick')) effectiveStatus = 'picked';
    else if (lowerMsg.includes('cancel')) effectiveStatus = 'cancelled';
    else if (lowerMsg.includes('return')) effectiveStatus = 'return';
  }

  // Determine new order_status
  let newOrderStatus = order.order_status;
  let paymentStatus = order.payment_status;

  if (effectiveStatus === 'delivered') {
    newOrderStatus = 'delivered';
    if (order.payment_method === 'cod') {
      paymentStatus = 'completed';
    }
  } else if (effectiveStatus === 'in_transit' || effectiveStatus === 'dispatched' || effectiveStatus === 'out_for_delivery' || effectiveStatus === 'picked') {
    if (order.order_status === 'processing' || order.order_status === 'confirmed') {
      newOrderStatus = 'shipped';
    }
  } else if (effectiveStatus === 'cancelled' || effectiveStatus === 'cancelled_delivery' || effectiveStatus === 'return' || effectiveStatus === 'returned') {
    newOrderStatus = 'courier_cancelled';
  }

  // Build new tracking update entry
  const newUpdateItem = {
    status: effectiveStatus,
    status_display: courierStatusBengali[effectiveStatus] || effectiveStatus,
    message: trackingMessage || (courierStatusBengali[effectiveStatus] ? `Steadfast স্ট্যাটাস: ${courierStatusBengali[effectiveStatus]}` : ''),
    timestamp: updatedAt,
    source: notificationType === 'tracking_update' ? 'steadfast_tracking_update' : 'steadfast_webhook',
  };

  // Avoid duplicate adjacent updates with same status within 1 minute
  const lastUpdate = currentUpdates[currentUpdates.length - 1];
  const isDuplicate = lastUpdate && lastUpdate.status === effectiveStatus && lastUpdate.message === newUpdateItem.message;
  
  if (!isDuplicate) {
    currentUpdates.push(newUpdateItem);
  }

  const updatedAddress = {
    ...currentAddress,
    courier_company: currentAddress.courier_company || 'Steadfast',
    tracking_number: trackingCode || currentAddress.tracking_number,
    consignment_id: consignmentId || currentAddress.consignment_id,
    courier_status: effectiveStatus,
    last_tracking_update: updatedAt,
    tracking_updates: currentUpdates,
  };

  if (webhookData.delivery_charge !== undefined) {
    updatedAddress.courier_delivery_charge = Number(webhookData.delivery_charge);
  }
  if (webhookData.cod_amount !== undefined) {
    updatedAddress.courier_cod_amount = Number(webhookData.cod_amount);
  }

  const updatePayload: Record<string, any> = {
    shipping_address: updatedAddress,
    order_status: newOrderStatus,
  };
  if (paymentStatus) {
    updatePayload.payment_status = paymentStatus;
  }

  const { error: updateError } = await adminClient
    .from('orders')
    .update(updatePayload)
    .eq('id', order.id);

  if (updateError) {
    console.error('Failed to update order from webhook:', updateError);
    return { status: "error", message: updateError.message || "Failed to update order." };
  }

  // Insert history record
  const statusDisplay = courierStatusBengali[effectiveStatus] || effectiveStatus;
  await adminClient.from('order_history').insert({
    order_id: order.id,
    action: 'steadfast_webhook_sync',
    details: `Steadfast Webhook (${notificationType}): ${statusDisplay}${trackingMessage ? ` — ${trackingMessage}` : ''} (অর্ডার: ${newOrderStatus})`,
    staff_name: 'Steadfast Webhook',
  });

  return {
    status: "success",
    message: "Webhook received successfully.",
    order_number: order.order_number,
    courier_status: effectiveStatus,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const { apiKey, secretKey } = await getCredentials(authHeader);
    const adminClient = await getAdminClient();

    const bodyText = await req.text();
    let parsedBody: any = {};
    if (bodyText) {
      try {
        parsedBody = JSON.parse(bodyText);
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON body', status: 400 }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Check if this request is a webhook from Steadfast (indicated by notification_type or consignment_id without internal action)
    const isWebhook = parsedBody.action === 'webhook' || (!parsedBody.action && (parsedBody.notification_type || parsedBody.consignment_id || parsedBody.tracking_message));

    if (isWebhook) {
      const webhookResult = await handleWebhookUpdate(parsedBody, adminClient);
      return new Response(JSON.stringify(webhookResult), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, ...params } = parsedBody;

    if (!action) {
      return new Response(JSON.stringify({ error: 'Action is required', status: 400 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check credentials before executing API actions
    if (!apiKey || !secretKey) {
      return new Response(
        JSON.stringify({
          status: 400,
          success: false,
          error: 'Steadfast API Key অথবা Secret Key কনফিগার করা নেই। অনুগ্রহ করে Settings > কুরিয়ার সেটিংস এ গিয়ে Steadfast API Key এবং Secret Key সেভ করুন।',
          message: 'Steadfast API credentials are missing. Please configure them in Settings > Courier Settings.'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const headers: Record<string, string> = {
      'Api-Key': apiKey,
      'Secret-Key': secretKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    switch (action) {
      case 'create_order': {
        const phone = cleanPhone(params.recipient_phone);
        if (!phone || phone.length < 11) {
          return new Response(
            JSON.stringify({
              status: 400,
              success: false,
              message: `গ্রাহকের ফোন নম্বর সঠিক নয় (${params.recipient_phone || 'খালি'})। ১১ ডিজিটের সঠিক মোবাইল নম্বর দিন।`,
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const address = (params.recipient_address || '').trim();
        if (!address || address.length < 5) {
          return new Response(
            JSON.stringify({
              status: 400,
              success: false,
              message: 'গ্রাহকের ঠিকানা অসম্পূর্ণ বা খালি। অনুগ্রহ করে পূর্ণাঙ্গ ঠিকানা দিন।',
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const payload = {
          invoice: String(params.invoice || '').trim(),
          recipient_name: String(params.recipient_name || 'Customer').trim(),
          recipient_phone: phone,
          recipient_address: address,
          cod_amount: Number(params.cod_amount) || 0,
          note: String(params.note || '').trim(),
          delivery_type: params.delivery_type ?? 0,
        };

        const result = await requestSteadfast('/create_order', {
          method: 'POST',
          headers,
          body: payload,
        });

        return new Response(JSON.stringify(result.data), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'bulk_create': {
        const orders = Array.isArray(params.orders) ? params.orders.map((o: any) => ({
          ...o,
          recipient_phone: cleanPhone(o.recipient_phone),
        })) : [];

        const result = await requestSteadfast('/create_order/bulk-order', {
          method: 'POST',
          headers,
          body: { data: JSON.stringify(orders) },
        });

        return new Response(JSON.stringify(result.data), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'status_by_invoice': {
        const invoice = encodeURIComponent(String(params.invoice || '').trim());
        const result = await requestSteadfast(`/status_by_invoice/${invoice}`, {
          method: 'GET',
          headers,
        });

        return new Response(JSON.stringify(result.data), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'status_by_tracking': {
        const rawTracking = String(params.tracking_code || '').trim();
        const tracking = encodeURIComponent(rawTracking);
        const result = await requestSteadfast(`/status_by_trackingcode/${tracking}`, {
          method: 'GET',
          headers,
        });

        let data = result.data || {};

        // If API didn't return weight or delivery_charge, fetch from Steadfast tracking portal
        if (!data.weight && !data.delivery_charge && !data.consignment?.weight && !data.consignment?.delivery_charge && rawTracking) {
          try {
            const publicRes = await fetch(`https://steadfast.com.bd/tracking?tracking_code=${encodeURIComponent(rawTracking)}`, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              }
            });
            if (publicRes.ok) {
              const html = await publicRes.text();

              // Extract Weight: e.g. "Weight : 1.7KG"
              const weightMatch = html.match(/Weight\s*:\s*([\d.]+\s*(?:KG|kg|g|gm)?)/i);
              if (weightMatch) {
                data.weight = weightMatch[1].trim();
              }

              // Extract Delivery Charge: e.g. "Delivery Charge : 95 TK"
              const deliveryMatch = html.match(/Delivery\s*Charge\s*:\s*([\d.]+)\s*(?:TK|Tk|tk|৳)?/i);
              if (deliveryMatch) {
                data.delivery_charge = parseFloat(deliveryMatch[1]);
              }

              // Extract COD: e.g. "COD: ৳ 990"
              const codMatch = html.match(/COD\s*:\s*(?:৳|TK|Tk)?\s*([\d.]+)/i);
              if (codMatch) {
                data.cod_amount = parseFloat(codMatch[1]);
              }

              // Extract Status if missing
              if (!data.delivery_status) {
                const statusMatch = html.match(/(?:Status\s*:\s*|class="[^"]*badge[^"]*">\s*)(Pending|In Review|Dispatched|In Transit|Out for Delivery|Delivered|Cancelled|Return)/i);
                if (statusMatch) {
                  data.delivery_status = statusMatch[1].toLowerCase().replace(/\s+/g, '_');
                }
              }
            }
          } catch (scrapeErr) {
            console.warn("Public tracking fallback error:", scrapeErr);
          }
        }

        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'status_by_cid': {
        const cid = encodeURIComponent(String(params.consignment_id || params.cid || '').trim());
        const result = await requestSteadfast(`/status_by_cid/${cid}`, {
          method: 'GET',
          headers,
        });

        return new Response(JSON.stringify(result.data), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_balance':
      case 'test_connection': {
        const result = await requestSteadfast('/get_balance', {
          method: 'GET',
          headers,
        });

        return new Response(JSON.stringify(result.data), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'create_return': {
        const body: Record<string, string> = {};
        if (params.consignment_id) body.consignment_id = String(params.consignment_id);
        else if (params.tracking_code) body.tracking_code = String(params.tracking_code);
        else if (params.invoice) body.invoice = String(params.invoice);
        if (params.reason) body.reason = String(params.reason);

        const result = await requestSteadfast('/create_return_request', {
          method: 'POST',
          headers,
          body,
        });

        return new Response(JSON.stringify(result.data), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}`, status: 400 }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (err: any) {
    console.error('Steadfast Edge Function Unhandled Error:', err);
    return new Response(
      JSON.stringify({
        status: 500,
        success: false,
        error: err.message || 'Internal server error in Steadfast courier function',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
