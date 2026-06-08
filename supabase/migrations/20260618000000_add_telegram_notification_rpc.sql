-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create pg_net schema if needed (Supabase usually manages this, but let's make sure it is in search_path)
CREATE OR REPLACE FUNCTION public.send_telegram_notification(
  p_message text,
  p_options jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
DECLARE
  v_settings jsonb;
  v_bot_token text;
  v_chat_id text;
  v_enabled boolean;
  v_notify_new_order boolean;
  v_notify_status_change boolean;
  v_notify_incomplete_order boolean;
  v_notify_low_stock boolean;
  v_url text;
  v_res_id bigint;
BEGIN
  -- 1. Fetch telegram_settings
  SELECT value INTO v_settings FROM public.store_settings WHERE key = 'telegram_settings';
  
  IF v_settings IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Telegram settings not configured');
  END IF;

  v_bot_token := v_settings->>'bot_token';
  v_chat_id := v_settings->>'chat_id';
  v_enabled := COALESCE((v_settings->>'enabled')::boolean, false);
  v_notify_new_order := COALESCE((v_settings->>'notify_new_order')::boolean, false);
  v_notify_status_change := COALESCE((v_settings->>'notify_status_change')::boolean, false);
  v_notify_incomplete_order := COALESCE((v_settings->>'notify_incomplete_order')::boolean, false);
  v_notify_low_stock := COALESCE((v_settings->>'notify_low_stock')::boolean, false);

  -- 2. Check filters
  IF NOT COALESCE((p_options->>'isTest')::boolean, false) AND NOT v_enabled THEN
    RETURN jsonb_build_object('success', true, 'status', 'skipped', 'reason', 'Telegram notifications are disabled');
  END IF;

  IF COALESCE((p_options->>'isNewOrder')::boolean, false) AND NOT v_notify_new_order AND NOT COALESCE((p_options->>'isTest')::boolean, false) THEN
    RETURN jsonb_build_object('success', true, 'status', 'skipped', 'reason', 'New order notifications are disabled');
  END IF;

  IF COALESCE((p_options->>'isStatusUpdate')::boolean, false) AND NOT v_notify_status_change AND NOT COALESCE((p_options->>'isTest')::boolean, false) THEN
    RETURN jsonb_build_object('success', true, 'status', 'skipped', 'reason', 'Status change notifications are disabled');
  END IF;

  IF COALESCE((p_options->>'isIncompleteOrder')::boolean, false) AND NOT v_notify_incomplete_order AND NOT COALESCE((p_options->>'isTest')::boolean, false) THEN
    RETURN jsonb_build_object('success', true, 'status', 'skipped', 'reason', 'Incomplete order notifications are disabled');
  END IF;

  IF COALESCE((p_options->>'isLowStock')::boolean, false) AND NOT v_notify_low_stock AND NOT COALESCE((p_options->>'isTest')::boolean, false) THEN
    RETURN jsonb_build_object('success', true, 'status', 'skipped', 'reason', 'Low stock notifications are disabled');
  END IF;

  IF v_bot_token IS NULL OR v_chat_id IS NULL OR v_bot_token = '' OR v_chat_id = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bot token or Chat ID is missing');
  END IF;

  -- 3. Perform network call via pg_net (net.http_post)
  v_url := 'https://api.telegram.org/bot' || v_bot_token || '/sendMessage';
  
  SELECT net.http_post(
    url := v_url,
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object(
      'chat_id', v_chat_id,
      'text', p_message,
      'parse_mode', 'HTML',
      'disable_web_page_preview', true
    )
  ) INTO v_res_id;

  -- 4. Log to order history if order_id is provided
  IF p_options ? 'orderId' THEN
    INSERT INTO public.order_history (order_id, action, details, staff_name)
    VALUES (
      (p_options->>'orderId')::uuid,
      'telegram_notification',
      'Telegram notification queued (pg_net job id: ' || v_res_id || ')',
      'System'
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'job_id', v_res_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
