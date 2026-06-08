-- ==========================================================
-- Security Migration: High-Performance JWT RLS for Customer Profiles & Activities
-- ==========================================================

-- 1. Drop old slow database-hit policies
DROP POLICY IF EXISTS "Admin can manage all profiles" ON public.customer_profiles;
DROP POLICY IF EXISTS "Admin/Manager can view customer activities" ON public.customer_activities;
DROP POLICY IF EXISTS "Admin/Manager can delete customer activities" ON public.customer_activities;

-- 2. Create new JWT claims based high-performance policies

-- Admin/Manager can manage all customer profiles
CREATE POLICY "Admin/Manager can manage all customer profiles" ON public.customer_profiles
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager') OR 
    (auth.jwt() ->> 'role') IN ('admin', 'manager')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager') OR 
    (auth.jwt() ->> 'role') IN ('admin', 'manager')
  );

-- Admin/Manager can view customer activities
CREATE POLICY "Admin/Manager can view customer activities" ON public.customer_activities
  FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager') OR 
    (auth.jwt() ->> 'role') IN ('admin', 'manager')
  );

-- Admin/Manager can delete customer activities
CREATE POLICY "Admin/Manager can delete customer activities" ON public.customer_activities
  FOR DELETE TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager') OR 
    (auth.jwt() ->> 'role') IN ('admin', 'manager')
  );
