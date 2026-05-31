import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': '*',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let requestPhone = '';
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
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { phone } = await req.json();
    requestPhone = phone;

    if (!phone) {
      return new Response(JSON.stringify({ error: 'Phone number is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let apiKey = Deno.env.get('BDCOURIER_API_KEY') || '';
    let baseUrl = Deno.env.get('BDCOURIER_BASE_URL') || 'https://api.bdcourier.com';

    // Attempt to load from database first
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('value')
        .eq('key', 'courier_settings')
        .maybeSingle();
      if (!error && data?.value) {
        if (data.value.bdcourier_api_key) {
          apiKey = data.value.bdcourier_api_key;
        }
        if (data.value.bdcourier_base_url) {
          baseUrl = data.value.bdcourier_base_url;
        }
      }
    } catch (e) {
      console.error('Error fetching BDCourier settings from db:', e);
    }

    if (!apiKey) {
      console.error({
        function: "courier-check",
        error: "BDCourier API Key not configured",
        payload: { phone },
      });
      return new Response(JSON.stringify({ error: 'BDCourier API Key not configured' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const url = `${cleanBaseUrl}/courier-check?phone=${encodeURIComponent(phone)}`;

    console.log({
      function: "courier-check",
      payload: { phone },
      url,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.substring(0, 5)}...`
      }
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    let data;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = { rawText: await response.text() };
    }

    console.log({
      function: "courier-check",
      payload: { phone },
      status: response.status,
      responseBody: data,
    });

    return new Response(JSON.stringify(data), {
      status: response.ok ? 200 : response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error({
      function: "courier-check",
      payload: { phone: requestPhone },
      error: error.message || error,
      stack: error.stack || null,
    });
    return new Response(JSON.stringify({ error: error.message || 'BDCourier Server Error', details: error.stack || null }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
