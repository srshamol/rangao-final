-- Drop existing public read policy
DROP POLICY IF EXISTS "Public can read non-sensitive settings" ON public.store_settings;

-- Recreate with public_tracking_settings added
CREATE POLICY "Public can read non-sensitive settings"
  ON public.store_settings FOR SELECT
  USING (
    key IN ('hero_banner', 'contact_info', 'homepage_sections', 'store_info', 'delivery_charges', 'payment_methods', 'public_tracking_settings')
    OR
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role)
  );

-- Seed default settings if they do not exist
INSERT INTO public.store_settings (key, value)
VALUES 
  ('tracking_settings', '{
    "global_enabled": true,
    "environment": "production",
    "meta_pixel_enabled": false,
    "meta_pixel_id": "",
    "meta_capi_enabled": false,
    "meta_access_token": "",
    "meta_api_version": "v21.0",
    "meta_test_event_code": "",
    "meta_strict_purchase_mode": true,
    "meta_debug_mode": false,
    "gtm_enabled": false,
    "gtm_id": "",
    "ga4_enabled": false,
    "ga4_id": "",
    "google_debug_mode": false,
    "tiktok_enabled": false,
    "tiktok_pixel_id": "",
    "tiktok_access_token": "",
    "tiktok_debug_mode": false
  }'::jsonb),
  ('public_tracking_settings', '{
    "global_enabled": true,
    "environment": "production",
    "meta_pixel_enabled": false,
    "meta_pixel_id": "",
    "meta_capi_enabled": false,
    "meta_strict_purchase_mode": true,
    "meta_debug_mode": false,
    "gtm_enabled": false,
    "gtm_id": "",
    "ga4_enabled": false,
    "ga4_id": "",
    "google_debug_mode": false,
    "tiktok_enabled": false,
    "tiktok_pixel_id": "",
    "tiktok_debug_mode": false
  }'::jsonb)
ON CONFLICT (key) DO NOTHING;
