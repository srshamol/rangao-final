-- Fix RLS policies for incomplete_orders to support anonymous/unauthenticated visitor actions (insert, update, delete)
-- Explicitly grant permissions to anon and authenticated roles to avoid 401 Unauthorized errors in PostgREST

-- 1. INSERT POLICY
DROP POLICY IF EXISTS "Anyone can create incomplete orders" ON public.incomplete_orders;

CREATE POLICY "Anyone can create incomplete orders"
  ON public.incomplete_orders FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 2. UPDATE POLICY
DROP POLICY IF EXISTS "Anyone can update own incomplete orders by session" ON public.incomplete_orders;

CREATE POLICY "Anyone can update own incomplete orders by session"
  ON public.incomplete_orders FOR UPDATE
  TO anon, authenticated
  USING (status IN ('abandoned', 'contacted'))
  WITH CHECK (status IN ('abandoned', 'contacted', 'converted'));

-- 3. DELETE POLICY (For clearIncomplete in useIncompleteOrder hook)
DROP POLICY IF EXISTS "Anyone can delete own session incomplete orders" ON public.incomplete_orders;

CREATE POLICY "Anyone can delete own session incomplete orders"
  ON public.incomplete_orders FOR DELETE
  TO anon, authenticated
  USING (status IN ('abandoned', 'contacted'));
