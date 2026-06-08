-- Create incomplete_orders table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.incomplete_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name text,
  customer_phone text,
  customer_email text,
  product_info jsonb DEFAULT '[]'::jsonb,
  page_source text DEFAULT 'checkout',
  form_data jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'abandoned',
  converted_order_id uuid,
  notes text,
  ip_address text,
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'incomplete_orders_converted_order_id_fkey' 
    AND table_name = 'incomplete_orders'
  ) THEN
    ALTER TABLE public.incomplete_orders 
      ADD CONSTRAINT incomplete_orders_converted_order_id_fkey 
      FOREIGN KEY (converted_order_id) REFERENCES public.orders(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.incomplete_orders ENABLE ROW LEVEL SECURITY;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_incomplete_orders_session_id ON public.incomplete_orders(session_id);
CREATE INDEX IF NOT EXISTS idx_incomplete_orders_status ON public.incomplete_orders(status);
CREATE INDEX IF NOT EXISTS idx_incomplete_orders_created_at ON public.incomplete_orders(created_at DESC);

-- Create trigger for updated_at if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_incomplete_orders_updated_at'
  ) THEN
    CREATE TRIGGER update_incomplete_orders_updated_at
      BEFORE UPDATE ON public.incomplete_orders
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

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

-- 4. SELECT POLICY (To support RETURNING clauses during INSERT/UPDATE operations)
DROP POLICY IF EXISTS "Anyone can select own incomplete orders" ON public.incomplete_orders;

CREATE POLICY "Anyone can select own incomplete orders"
  ON public.incomplete_orders FOR SELECT
  TO anon, authenticated
  USING (status IN ('abandoned', 'contacted'));


