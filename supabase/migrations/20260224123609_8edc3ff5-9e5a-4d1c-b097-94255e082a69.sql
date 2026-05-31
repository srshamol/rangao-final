INSERT INTO public.store_settings (key, value)
VALUES ('facebook_pixel', '{"pixel_id": "", "enabled": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;