-- Fix RLS cast issues on user_roles table
DROP POLICY IF EXISTS "Admins can manage user_roles" ON public.user_roles;
CREATE POLICY "Admins can manage user_roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Fix RLS cast issues on categories table
DROP POLICY IF EXISTS "Admin/Manager/Editor can manage categories" ON public.categories;
CREATE POLICY "Admin/Manager/Editor can manage categories" ON public.categories
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

-- Fix RLS cast issues on coupons table
DROP POLICY IF EXISTS "Admin/Manager/Marketing can manage coupons" ON public.coupons;
CREATE POLICY "Admin/Manager/Marketing can manage coupons" ON public.coupons
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role) OR 
    public.has_role(auth.uid(), 'manager'::public.app_role) OR 
    public.has_role(auth.uid(), 'marketing'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role) OR 
    public.has_role(auth.uid(), 'manager'::public.app_role) OR 
    public.has_role(auth.uid(), 'marketing'::public.app_role)
  );

-- Fix RLS cast issues on customer_activities table
DROP POLICY IF EXISTS "Admin/Manager can view customer activities" ON public.customer_activities;
CREATE POLICY "Admin/Manager can view customer activities" ON public.customer_activities 
  FOR SELECT TO authenticated 
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role) OR 
    public.has_role(auth.uid(), 'manager'::public.app_role)
  );

-- Fix RLS cast issues on testimonials table
DROP POLICY IF EXISTS "Admin can manage testimonials" ON public.testimonials;
CREATE POLICY "Admin can manage testimonials" ON public.testimonials
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

-- Fix RLS cast issues on brands table
DROP POLICY IF EXISTS "Admin can manage brands" ON public.brands;
CREATE POLICY "Admin can manage brands" ON public.brands
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

-- Fix RLS cast issues on blog_posts table
DROP POLICY IF EXISTS "Admin can manage blog posts" ON public.blog_posts;
CREATE POLICY "Admin can manage blog posts" ON public.blog_posts
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

-- Fix cast issue in delete_user_by_admin function
CREATE OR REPLACE FUNCTION public.delete_user_by_admin(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Verify the executing user has the 'admin' role with correct enum cast
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can delete users';
  END IF;

  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;
