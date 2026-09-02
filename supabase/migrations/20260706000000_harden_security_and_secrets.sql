-- Migration: 20260706000000_harden_security_and_secrets.sql
-- Description: Isolate private secrets, restrict store_settings RLS, create safe public payment RPC, and harden OTP verification table.

-- 1. STORE_SETTINGS RLS HARDENING
-- Drop all existing public read policies on store_settings
DROP POLICY IF EXISTS "Public can read non-sensitive settings" ON public.store_settings;
DROP POLICY IF EXISTS "Anyone can read store settings" ON public.store_settings;

-- Create strict public read policy containing ONLY non-sensitive storefront display settings
CREATE POLICY "Public can read storefront display settings"
  ON public.store_settings FOR SELECT
  USING (
    key IN (
      'hero_banner', 
      'contact_info', 
      'homepage_sections', 
      'store_info', 
      'delivery_charges', 
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
      'category_seo_data',
      'about_us_settings'
    )
    OR key LIKE 'product_seo_%'
    OR (
      auth.role() = 'authenticated' AND (
        has_role(auth.uid(), 'super_admin'::app_role) OR
        has_role(auth.uid(), 'admin'::app_role) OR
        has_role(auth.uid(), 'manager'::app_role) OR
        has_role(auth.uid(), 'sales'::app_role)
      )
    )
  );

-- Ensure staff management policy remains in effect
DROP POLICY IF EXISTS "Admin/Manager can manage settings" ON public.store_settings;
CREATE POLICY "Admin/Manager can manage settings"
  ON public.store_settings FOR ALL
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role)
  );

-- 2. SAFE PUBLIC PAYMENT METHODS RPC
-- Exposes ONLY display flags to the storefront and NEVER leaks payment gateway API keys or secret credentials.
CREATE OR REPLACE FUNCTION public.get_public_payment_methods()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_val JSONB;
BEGIN
  SELECT value INTO v_val FROM public.store_settings WHERE key = 'payment_methods';
  IF v_val IS NULL THEN
    RETURN jsonb_build_object(
      'cod', true,
      'bkash', false,
      'nagad', false,
      'bkash_number', '',
      'nagad_number', '',
      'uddoktapay', false,
      'uddoktapay_display_name', 'অনলাইন পেমেন্ট'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'cod', COALESCE((v_val->>'cod')::boolean, true),
    'bkash', COALESCE((v_val->>'bkash')::boolean, false),
    'nagad', COALESCE((v_val->>'nagad')::boolean, false),
    'bkash_number', COALESCE(v_val->>'bkash_number', ''),
    'nagad_number', COALESCE(v_val->>'nagad_number', ''),
    'uddoktapay', COALESCE((v_val->>'uddoktapay')::boolean, false),
    'uddoktapay_display_name', COALESCE(v_val->>'uddoktapay_display_name', 'অনলাইন পেমেন্ট')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_payment_methods() TO anon, authenticated, service_role;

-- 3. OTP VERIFICATIONS TABLE HARDENING
-- Ensure columns for hashed code, attempt counting, and IP tracking exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'otp_verifications' AND column_name = 'code_hash') THEN
    ALTER TABLE public.otp_verifications ADD COLUMN code_hash TEXT NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'otp_verifications' AND column_name = 'attempts') THEN
    ALTER TABLE public.otp_verifications ADD COLUMN attempts INT NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'otp_verifications' AND column_name = 'max_attempts') THEN
    ALTER TABLE public.otp_verifications ADD COLUMN max_attempts INT NOT NULL DEFAULT 3;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'otp_verifications' AND column_name = 'ip_address') THEN
    ALTER TABLE public.otp_verifications ADD COLUMN ip_address TEXT;
  END IF;
END $$;

-- Make plaintext code nullable for backwards compatibility while migrating to code_hash
DO $$
BEGIN
  ALTER TABLE public.otp_verifications ALTER COLUMN code DROP NOT NULL;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Drop all insecure public policies on otp_verifications
DROP POLICY IF EXISTS "Allow public insert" ON public.otp_verifications;
DROP POLICY IF EXISTS "Allow public select and update matching phone" ON public.otp_verifications;
DROP POLICY IF EXISTS "Public can insert otp" ON public.otp_verifications;
DROP POLICY IF EXISTS "Public can read otp" ON public.otp_verifications;

-- Enable strict RLS on otp_verifications: deny all direct table access to public clients
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;

-- Allow only staff roles to view OTP logs for auditing; anon/standard users have ZERO direct access
CREATE POLICY "Staff can view otp verifications"
  ON public.otp_verifications FOR SELECT
  USING (
    auth.role() = 'authenticated' AND (
      has_role(auth.uid(), 'super_admin'::app_role) OR
      has_role(auth.uid(), 'admin'::app_role) OR
      has_role(auth.uid(), 'manager'::app_role)
    )
  );

-- Revoke direct permissions from public anon role
REVOKE ALL ON public.otp_verifications FROM anon, authenticated;
GRANT SELECT ON public.otp_verifications TO authenticated;
GRANT ALL ON public.otp_verifications TO service_role;
