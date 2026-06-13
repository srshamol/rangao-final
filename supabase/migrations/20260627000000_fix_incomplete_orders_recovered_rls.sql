-- Update RLS policies for incomplete_orders to support 'recovered' status updates by anonymous/authenticated users

-- 1. Update UPDATE Policy to include 'recovered'
DROP POLICY IF EXISTS "Anyone can update own incomplete orders by session" ON public.incomplete_orders;

CREATE POLICY "Anyone can update own incomplete orders by session"
  ON public.incomplete_orders FOR UPDATE
  TO anon, authenticated
  USING (status IN ('abandoned', 'contacted'))
  WITH CHECK (status IN ('abandoned', 'contacted', 'converted', 'recovered'));

-- 2. Update SELECT Policy to include 'recovered' so we can read back updated rows
DROP POLICY IF EXISTS "Anyone can select own incomplete orders" ON public.incomplete_orders;

CREATE POLICY "Anyone can select own incomplete orders"
  ON public.incomplete_orders FOR SELECT
  TO anon, authenticated
  USING (status IN ('abandoned', 'contacted', 'converted', 'recovered'));
