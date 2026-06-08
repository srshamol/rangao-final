-- Add 'postgres' role to RLS policies to allow developers/seed users to manage admin resources

-- 1. TESTIMONIALS POLICIES
DROP POLICY IF EXISTS "Admin can manage testimonials" ON public.testimonials;
CREATE POLICY "Admin can manage testimonials" ON public.testimonials
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager', 'editor', 'postgres') OR 
    (auth.jwt() ->> 'role') IN ('admin', 'manager', 'editor', 'postgres')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager', 'editor', 'postgres') OR 
    (auth.jwt() ->> 'role') IN ('admin', 'manager', 'editor', 'postgres')
  );

-- 2. BRANDS POLICIES
DROP POLICY IF EXISTS "Admin can manage brands" ON public.brands;
CREATE POLICY "Admin can manage brands" ON public.brands
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager', 'editor', 'postgres') OR 
    (auth.jwt() ->> 'role') IN ('admin', 'manager', 'editor', 'postgres')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager', 'editor', 'postgres') OR 
    (auth.jwt() ->> 'role') IN ('admin', 'manager', 'editor', 'postgres')
  );

-- 3. PRODUCTS POLICIES
DROP POLICY IF EXISTS "Admin/Manager/Editor can manage products" ON public.products;
CREATE POLICY "Admin/Manager/Editor can manage products" ON public.products
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager', 'editor', 'postgres') OR 
    (auth.jwt() ->> 'role') IN ('admin', 'manager', 'editor', 'postgres')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager', 'editor', 'postgres') OR 
    (auth.jwt() ->> 'role') IN ('admin', 'manager', 'editor', 'postgres')
  );

-- 4. CATEGORIES POLICIES
DROP POLICY IF EXISTS "Admin/Manager/Editor can manage categories" ON public.categories;
CREATE POLICY "Admin/Manager/Editor can manage categories" ON public.categories
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager', 'editor', 'postgres') OR 
    (auth.jwt() ->> 'role') IN ('admin', 'manager', 'editor', 'postgres')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager', 'editor', 'postgres') OR 
    (auth.jwt() ->> 'role') IN ('admin', 'manager', 'editor', 'postgres')
  );

-- 5. ORDERS POLICIES
DROP POLICY IF EXISTS "Admin/Manager/Sales can manage orders" ON public.orders;
CREATE POLICY "Admin/Manager/Sales can manage orders" ON public.orders
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager', 'sales', 'postgres') OR 
    (auth.jwt() ->> 'role') IN ('admin', 'manager', 'sales', 'postgres')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager', 'sales', 'postgres') OR 
    (auth.jwt() ->> 'role') IN ('admin', 'manager', 'sales', 'postgres')
  );

-- 6. STORE_SETTINGS POLICIES
DROP POLICY IF EXISTS "Admin/Manager can manage settings" ON public.store_settings;
CREATE POLICY "Admin/Manager can manage settings" ON public.store_settings
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager', 'postgres') OR 
    (auth.jwt() ->> 'role') IN ('admin', 'manager', 'postgres')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager', 'postgres') OR 
    (auth.jwt() ->> 'role') IN ('admin', 'manager', 'postgres')
  );
