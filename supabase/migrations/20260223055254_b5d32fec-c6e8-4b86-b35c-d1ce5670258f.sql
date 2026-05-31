
-- Fix orders: make admin ALL policy PERMISSIVE so it doesn't block anonymous inserts
DROP POLICY IF EXISTS "Admin/Manager/Sales can manage orders" ON public.orders;
CREATE POLICY "Admin/Manager/Sales can manage orders" ON public.orders
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'sales'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'sales'));

-- Fix order_items: same issue
DROP POLICY IF EXISTS "Admin/Manager/Sales can manage order items" ON public.order_items;
CREATE POLICY "Admin/Manager/Sales can manage order items" ON public.order_items
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'sales'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'sales'));
