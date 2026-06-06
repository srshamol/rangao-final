-- Fix RLS cast issues on products table
DROP POLICY IF EXISTS "Admin/Manager/Editor can manage products" ON public.products;
CREATE POLICY "Admin/Manager/Editor can manage products" ON public.products
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role) OR 
    public.has_role(auth.uid(), 'manager'::public.app_role) OR 
    public.has_role(auth.uid(), 'editor'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role) OR 
    public.has_role(auth.uid(), 'manager'::public.app_role) OR 
    public.has_role(auth.uid(), 'editor'::public.app_role)
  );

-- Fix RLS cast issues on orders table
DROP POLICY IF EXISTS "Admin/Manager/Sales can manage orders" ON public.orders;
CREATE POLICY "Admin/Manager/Sales can manage orders" ON public.orders
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role) OR 
    public.has_role(auth.uid(), 'manager'::public.app_role) OR 
    public.has_role(auth.uid(), 'sales'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role) OR 
    public.has_role(auth.uid(), 'manager'::public.app_role) OR 
    public.has_role(auth.uid(), 'sales'::public.app_role)
  );

-- Fix RLS cast issues on order_items table
DROP POLICY IF EXISTS "Admin/Manager/Sales can manage order items" ON public.order_items;
CREATE POLICY "Admin/Manager/Sales can manage order items" ON public.order_items
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role) OR 
    public.has_role(auth.uid(), 'manager'::public.app_role) OR 
    public.has_role(auth.uid(), 'sales'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role) OR 
    public.has_role(auth.uid(), 'manager'::public.app_role) OR 
    public.has_role(auth.uid(), 'sales'::public.app_role)
  );

-- Fix RLS cast issues on blocked_entities table
DROP POLICY IF EXISTS "Admin/Manager can manage blocked entities" ON public.blocked_entities;
CREATE POLICY "Admin/Manager can manage blocked entities" ON public.blocked_entities
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role) OR 
    public.has_role(auth.uid(), 'manager'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role) OR 
    public.has_role(auth.uid(), 'manager'::public.app_role)
  );
