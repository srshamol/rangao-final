import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

const STEADFAST_BASE_URL = 'https://portal.packzy.com/api/v1';

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

async function getCredentials(reqAuthHeader?: string | null) {
  let apiKey = Deno.env.get('STEADFAST_API_KEY') || '';
  let secretKey = Deno.env.get('STEADFAST_SECRET_KEY') || '';

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

  // Use service role client if available to bypass RLS when reading courier credentials
  const adminClient = supabaseUrl && (serviceRoleKey || anonKey)
    ? createClient(supabaseUrl, serviceRoleKey || anonKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      })
    : null;

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const { apiKey, secretKey } = await getCredentials(authHeader);

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
