import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

const STEADFAST_BASE_URL = 'https://portal.packzy.com/api/v1';

async function getHeaders(supabaseClient?: any) {
  let apiKey = Deno.env.get('STEADFAST_API_KEY') || '';
  let secretKey = Deno.env.get('STEADFAST_SECRET_KEY') || '';

  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('store_settings')
        .select('value')
        .eq('key', 'courier_settings')
        .maybeSingle();
      if (!error && data?.value) {
        if (data.value.api_key) apiKey = data.value.api_key;
        if (data.value.secret_key) secretKey = data.value.secret_key;
      }
    } catch (e) {
      console.error('Error fetching courier credentials from database:', e);
    }
  }

  return {
    'Api-Key': apiKey,
    'Secret-Key': secretKey,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, ...params } = await req.json();

    switch (action) {
      case 'create_order': {
        const res = await fetch(`${STEADFAST_BASE_URL}/create_order`, {
          method: 'POST',
          headers: await getHeaders(supabase),
          body: JSON.stringify({
            invoice: params.invoice,
            recipient_name: params.recipient_name,
            recipient_phone: params.recipient_phone,
            recipient_address: params.recipient_address,
            cod_amount: params.cod_amount,
            note: params.note || '',
            delivery_type: params.delivery_type ?? 0,
          }),
        });
        const data = await res.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'bulk_create': {
        const res = await fetch(`${STEADFAST_BASE_URL}/create_order/bulk-order`, {
          method: 'POST',
          headers: await getHeaders(supabase),
          body: JSON.stringify({ data: JSON.stringify(params.orders) }),
        });
        const data = await res.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'status_by_invoice': {
        const res = await fetch(`${STEADFAST_BASE_URL}/status_by_invoice/${params.invoice}`, {
          headers: await getHeaders(supabase),
        });
        const data = await res.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'status_by_tracking': {
        const res = await fetch(`${STEADFAST_BASE_URL}/status_by_trackingcode/${params.tracking_code}`, {
          headers: await getHeaders(supabase),
        });
        const data = await res.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_balance': {
        const res = await fetch(`${STEADFAST_BASE_URL}/get_balance`, {
          headers: await getHeaders(supabase),
        });
        const data = await res.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'create_return': {
        const body: Record<string, string> = {};
        if (params.consignment_id) body.consignment_id = params.consignment_id;
        else if (params.tracking_code) body.tracking_code = params.tracking_code;
        else if (params.invoice) body.invoice = params.invoice;
        if (params.reason) body.reason = params.reason;

        const res = await fetch(`${STEADFAST_BASE_URL}/create_return_request`, {
          method: 'POST',
          headers: await getHeaders(supabase),
          body: JSON.stringify(body),
        });
        const data = await res.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
