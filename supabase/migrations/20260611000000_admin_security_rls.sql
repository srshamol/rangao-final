-- ==========================================================
-- Security Migration: JWT Claims Sync + Admin Claim RLS
-- ==========================================================

-- 1. Create function and trigger to sync user_roles to auth.users.raw_app_meta_data -> role
CREATE OR REPLACE FUNCTION public.sync_user_role_to_metadata()
RETURNS TRIGGER SECURITY DEFINER AS $$
DECLARE
  current_role TEXT;
  target_user_id UUID;
BEGIN
  target_user_id := COALESCE(NEW.user_id, OLD.user_id);
  
  -- Select the highest ranking role for the user
  SELECT role::TEXT INTO current_role 
  FROM public.user_roles 
  WHERE user_id = target_user_id
  ORDER BY 
    CASE role 
      WHEN 'admin' THEN 1
      WHEN 'manager' THEN 2
      WHEN 'editor' THEN 3
      WHEN 'sales' THEN 4
      WHEN 'marketing' THEN 5
      ELSE 6 
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

-- Attach trigger to public.user_roles
DROP TRIGGER IF EXISTS on_user_role_change ON public.user_roles;
CREATE TRIGGER on_user_role_change
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_role_to_metadata();

-- 2. Retroactively update raw_app_meta_data for all existing users with roles
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT user_id FROM public.user_roles LOOP
    -- Trigger sync for each user
    UPDATE public.user_roles 
    SET role = role 
    WHERE user_id = r.user_id 
    AND id = (SELECT id FROM public.user_roles WHERE user_id = r.user_id LIMIT 1);
  END LOOP;
END $$;

-- 3. High-Performance RLS Policies using JWT App Metadata claim:
-- Checking auth.jwt() -> 'app_metadata' ->> 'role' is extremely fast as it avoids DB hits.

-- USER_ROLES POLICIES
DROP POLICY IF EXISTS "Admins can manage user_roles" ON public.user_roles;
CREATE POLICY "Admins can manage user_roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' OR 
    (auth.jwt() ->> 'role') = 'admin'
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' OR 
    (auth.jwt() ->> 'role') = 'admin'
  );

-- PRODUCTS POLICIES
DROP POLICY IF EXISTS "Admin/Manager/Editor can manage products" ON public.products;
CREATE POLICY "Admin/Manager/Editor can manage products" ON public.products
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager', 'editor') OR 
    (auth.jwt() ->> 'role') IN ('admin', 'manager', 'editor')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager', 'editor') OR 
    (auth.jwt() ->> 'role') IN ('admin', 'manager', 'editor')
  );

-- CATEGORIES POLICIES
DROP POLICY IF EXISTS "Admin/Manager/Editor can manage categories" ON public.categories;
CREATE POLICY "Admin/Manager/Editor can manage categories" ON public.categories
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager', 'editor') OR 
    (auth.jwt() ->> 'role') IN ('admin', 'manager', 'editor')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager', 'editor') OR 
    (auth.jwt() ->> 'role') IN ('admin', 'manager', 'editor')
  );

-- ORDERS POLICIES
DROP POLICY IF EXISTS "Admin/Manager/Sales can manage orders" ON public.orders;
CREATE POLICY "Admin/Manager/Sales can manage orders" ON public.orders
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager', 'sales') OR 
    (auth.jwt() ->> 'role') IN ('admin', 'manager', 'sales')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager', 'sales') OR 
    (auth.jwt() ->> 'role') IN ('admin', 'manager', 'sales')
  );

-- ORDER_ITEMS POLICIES
DROP POLICY IF EXISTS "Admin/Manager/Sales can manage order items" ON public.order_items;
CREATE POLICY "Admin/Manager/Sales can manage order items" ON public.order_items
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager', 'sales') OR 
    (auth.jwt() ->> 'role') IN ('admin', 'manager', 'sales')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager', 'sales') OR 
    (auth.jwt() ->> 'role') IN ('admin', 'manager', 'sales')
  );

-- INVENTORY_LOG POLICIES
DROP POLICY IF EXISTS "Admin/Manager can manage inventory" ON public.inventory_log;
CREATE POLICY "Admin/Manager can manage inventory" ON public.inventory_log
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager') OR 
    (auth.jwt() ->> 'role') IN ('admin', 'manager')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager') OR 
    (auth.jwt() ->> 'role') IN ('admin', 'manager')
  );

-- COUPONS POLICIES
DROP POLICY IF EXISTS "Admin/Manager/Marketing can manage coupons" ON public.coupons;
CREATE POLICY "Admin/Manager/Marketing can manage coupons" ON public.coupons
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager', 'marketing') OR 
    (auth.jwt() ->> 'role') IN ('admin', 'manager', 'marketing')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager', 'marketing') OR 
    (auth.jwt() ->> 'role') IN ('admin', 'manager', 'marketing')
  );

-- TESTIMONIALS POLICIES
DROP POLICY IF EXISTS "Admin can manage testimonials" ON public.testimonials;
CREATE POLICY "Admin can manage testimonials" ON public.testimonials
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager', 'editor') OR 
    (auth.jwt() ->> 'role') IN ('admin', 'manager', 'editor')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager', 'editor') OR 
    (auth.jwt() ->> 'role') IN ('admin', 'manager', 'editor')
  );

-- BRANDS POLICIES
DROP POLICY IF EXISTS "Admin can manage brands" ON public.brands;
CREATE POLICY "Admin can manage brands" ON public.brands
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager', 'editor') OR 
    (auth.jwt() ->> 'role') IN ('admin', 'manager', 'editor')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager', 'editor') OR 
    (auth.jwt() ->> 'role') IN ('admin', 'manager', 'editor')
  );

-- BLOG_POSTS POLICIES
DROP POLICY IF EXISTS "Admin can manage blog posts" ON public.blog_posts;
CREATE POLICY "Admin can manage blog posts" ON public.blog_posts
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager', 'editor') OR 
    (auth.jwt() ->> 'role') IN ('admin', 'manager', 'editor')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager', 'editor') OR 
    (auth.jwt() ->> 'role') IN ('admin', 'manager', 'editor')
  );

-- MEDIA_LIBRARY POLICIES
DROP POLICY IF EXISTS "Admins and Managers can perform all actions" ON public.media_library;
CREATE POLICY "Admins and Managers can perform all actions" ON public.media_library
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager') OR 
    (auth.jwt() ->> 'role') IN ('admin', 'manager')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager') OR 
    (auth.jwt() ->> 'role') IN ('admin', 'manager')
  );

-- INCOMPLETE_ORDERS POLICIES
DROP POLICY IF EXISTS "Admin/Manager/Sales can manage incomplete orders" ON public.incomplete_orders;
CREATE POLICY "Admin/Manager/Sales can manage incomplete orders" ON public.incomplete_orders
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager', 'sales') OR 
    (auth.jwt() ->> 'role') IN ('admin', 'manager', 'sales')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager', 'sales') OR 
    (auth.jwt() ->> 'role') IN ('admin', 'manager', 'sales')
  );

-- STORE_SETTINGS WRITE/MANAGE POLICIES
-- Drop any existing all-manage policies and enforce admin/manager role
DROP POLICY IF EXISTS "Admin/Manager can manage settings" ON public.store_settings;
CREATE POLICY "Admin/Manager can manage settings" ON public.store_settings
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager') OR 
    (auth.jwt() ->> 'role') IN ('admin', 'manager')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager') OR 
    (auth.jwt() ->> 'role') IN ('admin', 'manager')
  );
