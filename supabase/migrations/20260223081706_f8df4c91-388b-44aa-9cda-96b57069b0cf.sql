
-- Create order_notes table
CREATE TABLE public.order_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  staff_name TEXT NOT NULL DEFAULT 'Admin',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order_history table
CREATE TABLE public.order_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details TEXT,
  staff_name TEXT NOT NULL DEFAULT 'System',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS for order_notes
ALTER TABLE public.order_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Manager/Sales can manage order notes"
  ON public.order_notes
  AS RESTRICTIVE
  FOR ALL
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

-- RLS for order_history
ALTER TABLE public.order_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Manager/Sales can manage order history"
  ON public.order_history
  AS RESTRICTIVE
  FOR ALL
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
