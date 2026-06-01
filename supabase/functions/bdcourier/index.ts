import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': '*',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
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

    const { endpoint, method, body } = await req.json();

    if (!endpoint) {
      return new Response(JSON.stringify({ error: 'Endpoint is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Resolve BDCourier Credentials
    let apiKey = Deno.env.get('BDCOURIER_API_KEY') || '';
    let baseUrl = Deno.env.get('BDCOURIER_BASE_URL') || 'https://api.bdcourier.com';

    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('value')
        .eq('key', 'courier_settings')
        .maybeSingle();

      if (!error && data?.value) {
        if (data.value.bdcourier_api_key) apiKey = data.value.bdcourier_api_key;
        if (data.value.bdcourier_base_url) baseUrl = data.value.bdcourier_base_url;
      }
    } catch (e) {
      console.error('Error fetching BDCourier settings from DB:', e);
    }

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'BDCourier API Key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    // For GET/POST compatibility (e.g. courier-check passes query params)
    let url = `${cleanBaseUrl}${cleanEndpoint}`;
    if (cleanEndpoint === '/courier-check' && body?.phone) {
      url = `${url}?phone=${encodeURIComponent(body.phone)}`;
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    console.log({
      provider: "BDCourier",
      action: "request",
      url,
      method,
    });

    const response = await fetch(url, {
      method: method || 'POST',
      headers,
      body: (method !== 'GET' && body) ? JSON.stringify(body) : undefined,
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error({
        provider: "BDCourier",
        endpoint: cleanEndpoint,
        status: response.status,
        message: responseData?.message || responseData?.error || "API Request Failed",
        response: responseData,
      });
    }

    return new Response(JSON.stringify(responseData), {
      status: response.ok ? 200 : response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error({
      provider: "BDCourier",
      error: error.message || error,
    });
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
