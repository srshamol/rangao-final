
-- 1. Add explicit SELECT policy for incomplete_orders (staff only)
CREATE POLICY "Only staff can read incomplete orders"
  ON public.incomplete_orders FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role) OR
    has_role(auth.uid(), 'sales'::app_role)
  );

-- 2. Replace public SELECT on store_settings with restricted policy
DROP POLICY IF EXISTS "Anyone can read store settings" ON public.store_settings;

CREATE POLICY "Public can read non-sensitive settings"
  ON public.store_settings FOR SELECT
  USING (
    key IN ('hero_banner', 'contact_info', 'homepage_sections', 'store_info', 'delivery_charges', 'payment_methods')
    OR
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role)
  );
