-- Update customer_profiles policy to check both JWT claims and live database state
DROP POLICY IF EXISTS "Admin/Manager can manage all customer profiles" ON public.customer_profiles;
CREATE POLICY "Admin/Manager can manage all customer profiles" ON public.customer_profiles
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'support', 'manager') OR 
    (auth.jwt() ->> 'role') IN ('super_admin', 'admin', 'support', 'manager') OR
    public.has_role(auth.uid(), 'super_admin'::public.app_role) OR
    public.has_role(auth.uid(), 'admin'::public.app_role) OR
    public.has_role(auth.uid(), 'support'::public.app_role) OR
    public.has_role(auth.uid(), 'manager'::public.app_role)
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'support', 'manager') OR 
    (auth.jwt() ->> 'role') IN ('super_admin', 'admin', 'support', 'manager') OR
    public.has_role(auth.uid(), 'super_admin'::public.app_role) OR
    public.has_role(auth.uid(), 'admin'::public.app_role) OR
    public.has_role(auth.uid(), 'support'::public.app_role) OR
    public.has_role(auth.uid(), 'manager'::public.app_role)
  );
