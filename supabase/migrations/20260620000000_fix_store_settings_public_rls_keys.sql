-- Update public read policy for store_settings to allow public keys for order control and SEO
DROP POLICY IF EXISTS "Public can read non-sensitive settings" ON public.store_settings;

CREATE POLICY "Public can read non-sensitive settings"
  ON public.store_settings FOR SELECT
  USING (
    key IN (
      'hero_banner', 
      'contact_info', 
      'homepage_sections', 
      'store_info', 
      'delivery_charges', 
      'payment_methods', 
      'public_tracking_settings', 
      'homepage_section_order', 
      'offer_banner', 
      'trust_features', 
      'newsletter', 
      'statistics', 
      'homepage_gallery', 
      'announcement_bar', 
      'seo_settings',
      'order_control',
      'category_seo_data'
    )
    OR key LIKE 'product_seo_%'
    OR
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role)
  );
