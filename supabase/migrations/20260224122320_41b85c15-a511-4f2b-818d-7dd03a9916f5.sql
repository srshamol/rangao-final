CREATE TABLE public.store_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Manager can manage store settings"
  ON public.store_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Anyone can read store settings"
  ON public.store_settings FOR SELECT
  USING (true);

-- Seed default settings
INSERT INTO public.store_settings (key, value) VALUES
  ('store_info', '{"name": "Rangao", "phone": "", "email": "", "address": "", "logo_url": ""}'::jsonb),
  ('delivery_charges', '{"dhaka_inside": 70, "dhaka_outside": 130, "free_delivery_min": 0}'::jsonb),
  ('payment_methods', '{"cod": true, "bkash": false, "nagad": false, "bkash_number": "", "nagad_number": ""}'::jsonb),
  ('courier_settings', '{"default_courier": "steadfast", "auto_sync_hours": 6}'::jsonb);
