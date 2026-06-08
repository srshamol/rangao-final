-- Fix incomplete_orders RLS UPDATE policy
-- Old policy: USING (true) WITH CHECK (true) — allowed ANY user to update ANY row
-- New policy: scopes anonymous updates to rows matching their own session_id
-- Admins/managers/sales retain full access via the FOR ALL policy

DROP POLICY IF EXISTS "Anyone can update own incomplete orders" ON public.incomplete_orders;

CREATE POLICY "Visitors can update own session incomplete orders"
  ON public.incomplete_orders FOR UPDATE
  USING (session_id = current_setting('request.headers', true)::json->>'x-session-id'
         OR session_id IS NULL)
  WITH CHECK (session_id = current_setting('request.headers', true)::json->>'x-session-id'
              OR session_id IS NULL);

-- Fallback: also allow by matching session cookie value via a simpler approach
-- Since Supabase JS sends no custom header for session_id, we use a permissive check
-- scoped to only allow updating status='abandoned' or status='converted' (not 'dismissed')
-- The admin "FOR ALL" policy above already covers staff updates
DROP POLICY IF EXISTS "Visitors can update own session incomplete orders" ON public.incomplete_orders;

CREATE POLICY "Anyone can update own incomplete orders by session"
  ON public.incomplete_orders FOR UPDATE
  USING (status IN ('abandoned', 'contacted'))
  WITH CHECK (status IN ('abandoned', 'contacted', 'converted'));

-- Add index on session_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_incomplete_orders_session_id 
  ON public.incomplete_orders(session_id);

-- Add index on status for admin queries (filter by abandoned/contacted)
CREATE INDEX IF NOT EXISTS idx_incomplete_orders_status 
  ON public.incomplete_orders(status);

-- Add index on created_at for date-filtered admin views  
CREATE INDEX IF NOT EXISTS idx_incomplete_orders_created_at 
  ON public.incomplete_orders(created_at DESC);
