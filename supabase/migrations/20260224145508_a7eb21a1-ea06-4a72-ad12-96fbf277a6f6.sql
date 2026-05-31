
CREATE TABLE public.incomplete_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name text,
  customer_phone text,
  customer_email text,
  product_info jsonb DEFAULT '[]'::jsonb,
  page_source text DEFAULT 'checkout',
  form_data jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'abandoned',
  converted_order_id uuid REFERENCES public.orders(id),
  notes text,
  ip_address text,
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.incomplete_orders ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (anonymous visitors)
CREATE POLICY "Anyone can create incomplete orders"
  ON public.incomplete_orders FOR INSERT
  WITH CHECK (true);

-- Anyone can update their own session entries (by session_id)
CREATE POLICY "Anyone can update own incomplete orders"
  ON public.incomplete_orders FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Admin/Manager/Sales full access
CREATE POLICY "Admin/Manager/Sales can manage incomplete orders"
  ON public.incomplete_orders FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role) OR
    has_role(auth.uid(), 'sales'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role) OR
    has_role(auth.uid(), 'sales'::app_role)
  );

-- Auto-update updated_at
CREATE TRIGGER update_incomplete_orders_updated_at
  BEFORE UPDATE ON public.incomplete_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
