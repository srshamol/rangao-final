-- Update user_roles policy to check both JWT claims and live database state
DROP POLICY IF EXISTS "Admins can manage user_roles" ON public.user_roles;
CREATE POLICY "Admins can manage user_roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin') OR 
    (auth.jwt() ->> 'role') IN ('super_admin', 'admin') OR
    public.has_role(auth.uid(), 'super_admin'::public.app_role) OR
    public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin') OR 
    (auth.jwt() ->> 'role') IN ('super_admin', 'admin') OR
    public.has_role(auth.uid(), 'super_admin'::public.app_role) OR
    public.has_role(auth.uid(), 'admin'::public.app_role)
  );
