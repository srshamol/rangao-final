-- 1. Alter public.app_role enum to add new values
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'moderator';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'support';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'delivery_staff';

-- 2. Update trigger function to rank new roles correctly
CREATE OR REPLACE FUNCTION public.sync_user_role_to_metadata()
RETURNS TRIGGER SECURITY DEFINER AS $$
DECLARE
  current_role TEXT;
  target_user_id UUID;
BEGIN
  target_user_id := COALESCE(NEW.user_id, OLD.user_id);
  
  -- Select the highest ranking role for the user with explicit table alias 'ur'
  SELECT ur.role::TEXT INTO current_role 
  FROM public.user_roles ur
  WHERE ur.user_id = target_user_id
  ORDER BY 
    CASE ur.role 
      WHEN 'super_admin' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'manager' THEN 3
      WHEN 'moderator' THEN 4
      WHEN 'support' THEN 5
      WHEN 'delivery_staff' THEN 6
      WHEN 'editor' THEN 7
      WHEN 'sales' THEN 8
      WHEN 'marketing' THEN 9
      WHEN 'accountant' THEN 10
      ELSE 11 
    END
  LIMIT 1;

  IF current_role IS NULL THEN
    -- Remove role claim if no roles remain
    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) - 'role'
    WHERE id = target_user_id;
  ELSE
    -- Set role claim in app_metadata
    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', current_role)
    WHERE id = target_user_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 3. Update USER_ROLES POLICIES
DROP POLICY IF EXISTS "Admins can manage user_roles" ON public.user_roles;
CREATE POLICY "Admins can manage user_roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin') OR 
    (auth.jwt() ->> 'role') IN ('super_admin', 'admin')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin') OR 
    (auth.jwt() ->> 'role') IN ('super_admin', 'admin')
  );

-- 4. Update PRODUCTS POLICIES
DROP POLICY IF EXISTS "Admin/Manager/Editor can manage products" ON public.products;
CREATE POLICY "Admin/Manager/Editor can manage products" ON public.products
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'moderator', 'manager', 'editor', 'postgres') OR 
    (auth.jwt() ->> 'role') IN ('super_admin', 'admin', 'moderator', 'manager', 'editor', 'postgres')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'moderator', 'manager', 'editor', 'postgres') OR 
    (auth.jwt() ->> 'role') IN ('super_admin', 'admin', 'moderator', 'manager', 'editor', 'postgres')
  );

-- 5. Update CATEGORIES POLICIES
DROP POLICY IF EXISTS "Admin/Manager/Editor can manage categories" ON public.categories;
CREATE POLICY "Admin/Manager/Editor can manage categories" ON public.categories
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'moderator', 'manager', 'editor', 'postgres') OR 
    (auth.jwt() ->> 'role') IN ('super_admin', 'admin', 'moderator', 'manager', 'editor', 'postgres')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'moderator', 'manager', 'editor', 'postgres') OR 
    (auth.jwt() ->> 'role') IN ('super_admin', 'admin', 'moderator', 'manager', 'editor', 'postgres')
  );

-- 6. Update ORDERS POLICIES
DROP POLICY IF EXISTS "Admin/Manager/Sales can manage orders" ON public.orders;
CREATE POLICY "Admin/Manager/Sales can manage orders" ON public.orders
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'support', 'delivery_staff', 'manager', 'sales', 'postgres') OR 
    (auth.jwt() ->> 'role') IN ('super_admin', 'admin', 'support', 'delivery_staff', 'manager', 'sales', 'postgres')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'support', 'delivery_staff', 'manager', 'sales', 'postgres') OR 
    (auth.jwt() ->> 'role') IN ('super_admin', 'admin', 'support', 'delivery_staff', 'manager', 'sales', 'postgres')
  );

-- 7. Update ORDER_ITEMS POLICIES
DROP POLICY IF EXISTS "Admin/Manager/Sales can manage order items" ON public.order_items;
CREATE POLICY "Admin/Manager/Sales can manage order items" ON public.order_items
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'support', 'delivery_staff', 'manager', 'sales') OR 
    (auth.jwt() ->> 'role') IN ('super_admin', 'admin', 'support', 'delivery_staff', 'manager', 'sales')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'support', 'delivery_staff', 'manager', 'sales') OR 
    (auth.jwt() ->> 'role') IN ('super_admin', 'admin', 'support', 'delivery_staff', 'manager', 'sales')
  );

-- 8. Update INCOMPLETE_ORDERS POLICIES
DROP POLICY IF EXISTS "Admin/Manager/Sales can manage incomplete orders" ON public.incomplete_orders;
CREATE POLICY "Admin/Manager/Sales can manage incomplete orders" ON public.incomplete_orders
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'support', 'delivery_staff', 'manager', 'sales') OR 
    (auth.jwt() ->> 'role') IN ('super_admin', 'admin', 'support', 'delivery_staff', 'manager', 'sales')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'support', 'delivery_staff', 'manager', 'sales') OR 
    (auth.jwt() ->> 'role') IN ('super_admin', 'admin', 'support', 'delivery_staff', 'manager', 'sales')
  );

-- 9. Update STORE_SETTINGS POLICIES
DROP POLICY IF EXISTS "Admin/Manager can manage settings" ON public.store_settings;
CREATE POLICY "Admin/Manager can manage settings" ON public.store_settings
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'manager', 'postgres') OR 
    (auth.jwt() ->> 'role') IN ('super_admin', 'admin', 'manager', 'postgres')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'manager', 'postgres') OR 
    (auth.jwt() ->> 'role') IN ('super_admin', 'admin', 'manager', 'postgres')
  );

-- 10. Update TESTIMONIALS POLICIES
DROP POLICY IF EXISTS "Admin can manage testimonials" ON public.testimonials;
CREATE POLICY "Admin can manage testimonials" ON public.testimonials
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'moderator', 'manager', 'editor', 'postgres') OR 
    (auth.jwt() ->> 'role') IN ('super_admin', 'admin', 'moderator', 'manager', 'editor', 'postgres')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'moderator', 'manager', 'editor', 'postgres') OR 
    (auth.jwt() ->> 'role') IN ('super_admin', 'admin', 'moderator', 'manager', 'editor', 'postgres')
  );

-- 11. Update BRANDS POLICIES
DROP POLICY IF EXISTS "Admin can manage brands" ON public.brands;
CREATE POLICY "Admin can manage brands" ON public.brands
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'moderator', 'manager', 'editor', 'postgres') OR 
    (auth.jwt() ->> 'role') IN ('super_admin', 'admin', 'moderator', 'manager', 'editor', 'postgres')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'moderator', 'manager', 'editor', 'postgres') OR 
    (auth.jwt() ->> 'role') IN ('super_admin', 'admin', 'moderator', 'manager', 'editor', 'postgres')
  );

-- 12. Update BLOG_POSTS POLICIES
DROP POLICY IF EXISTS "Admin can manage blog posts" ON public.blog_posts;
CREATE POLICY "Admin can manage blog posts" ON public.blog_posts
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'moderator', 'manager', 'editor') OR 
    (auth.jwt() ->> 'role') IN ('super_admin', 'admin', 'moderator', 'manager', 'editor')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'moderator', 'manager', 'editor') OR 
    (auth.jwt() ->> 'role') IN ('super_admin', 'admin', 'moderator', 'manager', 'editor')
  );

-- 13. Update MEDIA_LIBRARY POLICIES
DROP POLICY IF EXISTS "Admins and Managers can perform all actions" ON public.media_library;
CREATE POLICY "Admins and Managers can perform all actions" ON public.media_library
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'moderator', 'manager', 'postgres') OR 
    (auth.jwt() ->> 'role') IN ('super_admin', 'admin', 'moderator', 'manager', 'postgres')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'moderator', 'manager', 'postgres') OR 
    (auth.jwt() ->> 'role') IN ('super_admin', 'admin', 'moderator', 'manager', 'postgres')
  );

-- 14. Update CUSTOMER_PROFILES POLICIES
DROP POLICY IF EXISTS "Admin/Manager can manage all customer profiles" ON public.customer_profiles;
CREATE POLICY "Admin/Manager can manage all customer profiles" ON public.customer_profiles
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'support', 'manager') OR 
    (auth.jwt() ->> 'role') IN ('super_admin', 'admin', 'support', 'manager')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'support', 'manager') OR 
    (auth.jwt() ->> 'role') IN ('super_admin', 'admin', 'support', 'manager')
  );

-- 15. Update CUSTOMER_ACTIVITIES POLICIES
DROP POLICY IF EXISTS "Admin/Manager can view customer activities" ON public.customer_activities;
CREATE POLICY "Admin/Manager can view customer activities" ON public.customer_activities
  FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'support', 'manager') OR 
    (auth.jwt() ->> 'role') IN ('super_admin', 'admin', 'support', 'manager')
  );

DROP POLICY IF EXISTS "Admin/Manager can delete customer activities" ON public.customer_activities;
CREATE POLICY "Admin/Manager can delete customer activities" ON public.customer_activities
  FOR DELETE TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin', 'manager') OR 
    (auth.jwt() ->> 'role') IN ('super_admin', 'admin', 'manager')
  );

