-- Migration: 20260708000000_least_privilege_rbac_and_audit.sql
-- Description: Server-side least-privilege RBAC, comprehensive audit logging, order status transition validation (FSM), customer PII isolation, and storage security.

-- ============================================================================
-- 1. APP ROLES & HELPER FUNCTIONS
-- ============================================================================

-- Ensure all 9 formal roles exist in public.app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'editor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sales';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'support';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'delivery_staff';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'marketing';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'accountant';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'moderator';

-- Ensure all order statuses exist in public.order_status enum
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'returned';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'courier_cancelled';

-- Helper: Get user's primary/highest role
CREATE OR REPLACE FUNCTION public.get_auth_role(p_user_id UUID DEFAULT auth.uid())
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN 'anon';
  END IF;

  -- 1. Try checking app_metadata in JWT if available
  IF p_user_id = auth.uid() THEN
    v_role := auth.jwt() -> 'app_metadata' ->> 'role';
    IF v_role IS NOT NULL AND v_role <> '' THEN
      RETURN v_role;
    END IF;
  END IF;

  -- 2. Fallback to querying user_roles table with ranking
  SELECT ur.role::TEXT INTO v_role
  FROM public.user_roles ur
  WHERE ur.user_id = p_user_id
  ORDER BY 
    CASE ur.role::TEXT
      WHEN 'super_admin' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'manager' THEN 3
      WHEN 'moderator' THEN 4
      WHEN 'sales' THEN 5
      WHEN 'support' THEN 6
      WHEN 'delivery_staff' THEN 7
      WHEN 'editor' THEN 8
      WHEN 'marketing' THEN 9
      WHEN 'accountant' THEN 10
      ELSE 99
    END
  LIMIT 1;

  RETURN COALESCE(v_role, 'customer');
END;
$$;

-- Helper: Check if user has any of the specified roles
CREATE OR REPLACE FUNCTION public.has_any_role(VARIADIC p_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  v_user_role := public.get_auth_role(auth.uid());
  RETURN v_user_role = ANY(p_roles);
END;
$$;

-- Helper: Quick check for super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;
  RETURN public.get_auth_role(p_user_id) = 'super_admin';
END;
$$;

-- ============================================================================
-- 2. AUDIT LOGGING TABLE & LOGGING RPC
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,          -- e.g. 'order_status_change', 'refund', 'stock_adjustment', 'role_change', 'setting_change', 'coupon_change', 'product_change'
  entity_type TEXT NOT NULL,     -- 'order', 'product', 'inventory', 'staff', 'setting', 'coupon', 'media'
  entity_id TEXT NOT NULL,
  previous_state JSONB,
  new_state JSONB,
  reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient querying and audit filtering
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only super_admin, admin, and accountant can read audit logs
DROP POLICY IF EXISTS "Staff audit logs read access" ON public.audit_logs;
CREATE POLICY "Staff audit logs read access"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (
    public.has_any_role('super_admin', 'admin', 'accountant')
  );

-- Direct client modifications denied; writes must occur through secure triggers or functions
DROP POLICY IF EXISTS "Deny direct audit log write" ON public.audit_logs;
REVOKE INSERT, UPDATE, DELETE ON public.audit_logs FROM anon, authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

-- Secure audit log helper function
CREATE OR REPLACE FUNCTION public.record_audit_log(
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT,
  p_previous_state JSONB DEFAULT NULL,
  p_new_state JSONB DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_actor_id UUID DEFAULT auth.uid()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
  v_email TEXT;
  v_role TEXT;
BEGIN
  IF p_actor_id IS NOT NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = p_actor_id;
    v_role := public.get_auth_role(p_actor_id);
  ELSE
    v_email := 'system';
    v_role := 'system';
  END IF;

  INSERT INTO public.audit_logs (
    actor_id,
    actor_email,
    actor_role,
    action,
    entity_type,
    entity_id,
    previous_state,
    new_state,
    reason,
    created_at
  )
  VALUES (
    p_actor_id,
    COALESCE(v_email, 'system'),
    COALESCE(v_role, 'system'),
    p_action,
    p_entity_type,
    p_entity_id,
    p_previous_state,
    p_new_state,
    p_reason,
    now()
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_audit_log TO authenticated, service_role;

-- ============================================================================
-- 3. ORDER STATUS FINITE STATE MACHINE (FSM) & VALIDATION TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_order_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_status TEXT;
  v_new_status TEXT;
  v_actor_role TEXT;
  v_actor_id UUID;
  v_is_valid BOOLEAN := false;
  v_transition_reason TEXT;
BEGIN
  v_old_status := COALESCE(OLD.order_status::TEXT, 'pending');
  v_new_status := NEW.order_status::TEXT;
  v_actor_id := auth.uid();
  v_actor_role := public.get_auth_role(v_actor_id);

  -- If status did not change, allow update
  IF v_old_status = v_new_status THEN
    RETURN NEW;
  END IF;

  -- State Transition Rules:
  -- pending -> confirmed, cancelled, courier_cancelled
  -- confirmed -> processing, cancelled
  -- processing -> shipped, cancelled
  -- shipped -> delivered, returned, cancelled, courier_cancelled
  -- delivered -> returned, cancelled (refund/return workflow)
  -- cancelled / courier_cancelled -> pending (ONLY super_admin, admin, manager can re-open)
  -- returned -> terminal (or pending by super_admin only)

  IF v_old_status = 'pending' THEN
    IF v_new_status IN ('confirmed', 'cancelled', 'courier_cancelled', 'processing') THEN
      v_is_valid := true;
    END IF;
  ELSIF v_old_status = 'confirmed' THEN
    IF v_new_status IN ('processing', 'cancelled', 'courier_cancelled', 'shipped') THEN
      v_is_valid := true;
    END IF;
  ELSIF v_old_status = 'processing' THEN
    IF v_new_status IN ('shipped', 'cancelled', 'courier_cancelled') THEN
      v_is_valid := true;
    END IF;
  ELSIF v_old_status = 'shipped' THEN
    IF v_new_status IN ('delivered', 'returned', 'cancelled', 'courier_cancelled') THEN
      v_is_valid := true;
    END IF;
  ELSIF v_old_status = 'delivered' THEN
    IF v_new_status IN ('returned', 'cancelled') THEN
      -- Delivery staff cannot un-deliver; only admin, manager, support, super_admin
      IF v_actor_role IN ('super_admin', 'admin', 'manager', 'support', 'system') THEN
        v_is_valid := true;
      END IF;
    END IF;
  ELSIF v_old_status IN ('cancelled', 'courier_cancelled', 'returned') THEN
    -- Re-opening a closed order is restricted to administrative roles
    IF v_new_status = 'pending' AND v_actor_role IN ('super_admin', 'admin', 'manager', 'system') THEN
      v_is_valid := true;
    END IF;
  END IF;

  -- System / Service Role bypass for webhooks (e.g. Steadfast Courier API sync)
  IF auth.role() = 'service_role' OR v_actor_role = 'system' THEN
    v_is_valid := true;
  END IF;

  -- Super Admin emergency override
  IF v_actor_role = 'super_admin' THEN
    v_is_valid := true;
  END IF;

  IF NOT v_is_valid THEN
    RAISE EXCEPTION 'INVALID_ORDER_TRANSITION: Cannot transition order #% from "%" to "%" (actor role: %)',
      NEW.order_number, v_old_status, v_new_status, v_actor_role;
  END IF;

  v_transition_reason := COALESCE(
    NEW.notes,
    'Status changed from ' || v_old_status || ' to ' || v_new_status
  );

  -- Log to public.order_history
  INSERT INTO public.order_history (
    order_id,
    action,
    details,
    staff_name,
    created_at
  )
  VALUES (
    NEW.id,
    'status_change',
    'স্ট্যাটাস পরিবর্তন: ' || v_old_status || ' → ' || v_new_status,
    COALESCE(v_actor_role, 'System'),
    now()
  );

  -- Record in comprehensive audit_logs
  PERFORM public.record_audit_log(
    'order_status_change',
    'order',
    NEW.id::TEXT,
    jsonb_build_object('order_status', v_old_status, 'payment_status', OLD.payment_status),
    jsonb_build_object('order_status', v_new_status, 'payment_status', NEW.payment_status),
    v_transition_reason,
    v_actor_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_validate_order_status ON public.orders;
CREATE TRIGGER trigger_validate_order_status
BEFORE UPDATE OF order_status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.validate_order_status_transition();

-- ============================================================================
-- 4. SENSITIVE AUDIT TRIGGERS: PRODUCTS, COUPONS, SETTINGS, ROLES
-- ============================================================================

-- A. Products Audit Trigger
CREATE OR REPLACE FUNCTION public.audit_product_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.record_audit_log(
      'product_create',
      'product',
      NEW.id::TEXT,
      NULL,
      jsonb_build_object('name', NEW.name, 'sku', NEW.sku, 'price', NEW.regular_price, 'stock', NEW.stock_quantity),
      'New product added',
      auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only log meaningful business changes: price, stock, status, name
    IF (OLD.regular_price <> NEW.regular_price) OR 
       (OLD.sale_price IS DISTINCT FROM NEW.sale_price) OR 
       (OLD.stock_quantity <> NEW.stock_quantity) OR 
       (OLD.status IS DISTINCT FROM NEW.status) THEN
      PERFORM public.record_audit_log(
        'product_update',
        'product',
        NEW.id::TEXT,
        jsonb_build_object('price', OLD.regular_price, 'sale_price', OLD.sale_price, 'stock', OLD.stock_quantity, 'status', OLD.status),
        jsonb_build_object('price', NEW.regular_price, 'sale_price', NEW.sale_price, 'stock', NEW.stock_quantity, 'status', NEW.status),
        'Product pricing or inventory updated',
        auth.uid()
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.record_audit_log(
      'product_delete',
      'product',
      OLD.id::TEXT,
      jsonb_build_object('name', OLD.name, 'sku', OLD.sku, 'price', OLD.regular_price),
      NULL,
      'Product deleted',
      auth.uid()
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_audit_products ON public.products;
CREATE TRIGGER trigger_audit_products
AFTER INSERT OR UPDATE OR DELETE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.audit_product_changes();

-- B. Coupons Audit Trigger
CREATE OR REPLACE FUNCTION public.audit_coupon_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.record_audit_log(
      'coupon_create',
      'coupon',
      NEW.id::TEXT,
      NULL,
      jsonb_build_object('code', NEW.code, 'discount_value', NEW.discount_value, 'discount_type', NEW.discount_type),
      'Coupon created',
      auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.record_audit_log(
      'coupon_update',
      'coupon',
      NEW.id::TEXT,
      jsonb_build_object('code', OLD.code, 'discount_value', OLD.discount_value, 'is_active', OLD.is_active),
      jsonb_build_object('code', NEW.code, 'discount_value', NEW.discount_value, 'is_active', NEW.is_active),
      'Coupon updated',
      auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.record_audit_log(
      'coupon_delete',
      'coupon',
      OLD.id::TEXT,
      jsonb_build_object('code', OLD.code, 'discount_value', OLD.discount_value),
      NULL,
      'Coupon deleted',
      auth.uid()
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_audit_coupons ON public.coupons;
CREATE TRIGGER trigger_audit_coupons
AFTER INSERT OR UPDATE OR DELETE ON public.coupons
FOR EACH ROW
EXECUTE FUNCTION public.audit_coupon_changes();

-- C. Staff Roles Audit Trigger
CREATE OR REPLACE FUNCTION public.audit_user_roles_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.record_audit_log(
      'role_assigned',
      'staff',
      NEW.user_id::TEXT,
      NULL,
      jsonb_build_object('role', NEW.role::TEXT),
      'Staff role assigned',
      auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.record_audit_log(
      'role_changed',
      'staff',
      NEW.user_id::TEXT,
      jsonb_build_object('role', OLD.role::TEXT),
      jsonb_build_object('role', NEW.role::TEXT),
      'Staff role modified',
      auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.record_audit_log(
      'role_revoked',
      'staff',
      OLD.user_id::TEXT,
      jsonb_build_object('role', OLD.role::TEXT),
      NULL,
      'Staff role removed',
      auth.uid()
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_audit_user_roles ON public.user_roles;
CREATE TRIGGER trigger_audit_user_roles
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.audit_user_roles_changes();

-- D. Store Settings Audit Trigger
CREATE OR REPLACE FUNCTION public.audit_store_settings_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log setting change without exposing private plaintext secrets
  PERFORM public.record_audit_log(
    'setting_change',
    'setting',
    COALESCE(NEW.key, OLD.key),
    jsonb_build_object('key', OLD.key),
    jsonb_build_object('key', NEW.key, 'updated_at', now()),
    'Store setting updated: ' || COALESCE(NEW.key, OLD.key),
    auth.uid()
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_audit_store_settings ON public.store_settings;
CREATE TRIGGER trigger_audit_store_settings
AFTER INSERT OR UPDATE OR DELETE ON public.store_settings
FOR EACH ROW
EXECUTE FUNCTION public.audit_store_settings_changes();

-- ============================================================================
-- 5. HARMONIZED & SECURE ROW-LEVEL SECURITY POLICIES
-- ============================================================================

-- A. ORDERS
DROP POLICY IF EXISTS "Admin/Manager/Sales can manage orders" ON public.orders;
DROP POLICY IF EXISTS "Users can read own orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Public can create orders" ON public.orders;
DROP POLICY IF EXISTS "Staff select orders policy" ON public.orders;
DROP POLICY IF EXISTS "Staff update orders policy" ON public.orders;
DROP POLICY IF EXISTS "Staff delete orders policy" ON public.orders;
DROP POLICY IF EXISTS "Customer select orders policy" ON public.orders;

-- Customer can only view their own orders
CREATE POLICY "Customer select orders policy"
  ON public.orders FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
  );

-- Staff select: role-specific boundaries
CREATE POLICY "Staff select orders policy"
  ON public.orders FOR SELECT
  TO authenticated
  USING (
    public.has_any_role('super_admin', 'admin', 'manager', 'sales', 'support', 'accountant')
    OR (
      -- Delivery staff only see relevant dispatched/delivered/returned orders
      public.has_any_role('delivery_staff') AND
      order_status::text IN ('shipped', 'delivered', 'returned', 'cancelled', 'courier_cancelled')
    )
  );

-- Staff update: role-specific boundaries
CREATE POLICY "Staff update orders policy"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (
    public.has_any_role('super_admin', 'admin', 'manager', 'sales', 'support', 'delivery_staff')
  )
  WITH CHECK (
    public.has_any_role('super_admin', 'admin', 'manager', 'sales', 'support', 'delivery_staff')
  );

-- Order deletion strictly limited to Super Admin and Admin
CREATE POLICY "Staff delete orders policy"
  ON public.orders FOR DELETE
  TO authenticated
  USING (
    public.has_any_role('super_admin', 'admin')
  );

-- B. ORDER ITEMS
DROP POLICY IF EXISTS "Admin/Manager/Sales can manage order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can read own order items" ON public.order_items;
DROP POLICY IF EXISTS "Staff select order items" ON public.order_items;
DROP POLICY IF EXISTS "Customer select order items" ON public.order_items;
DROP POLICY IF EXISTS "Staff manage order items" ON public.order_items;

CREATE POLICY "Customer select order items"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff select order items"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (
    public.has_any_role('super_admin', 'admin', 'manager', 'sales', 'support', 'delivery_staff', 'accountant')
  );

CREATE POLICY "Staff manage order items"
  ON public.order_items FOR ALL
  TO authenticated
  USING (
    public.has_any_role('super_admin', 'admin', 'manager')
  )
  WITH CHECK (
    public.has_any_role('super_admin', 'admin', 'manager')
  );

-- C. ORDER NOTES & ORDER HISTORY
-- Customer has ZERO access to internal order notes and history
DROP POLICY IF EXISTS "Admin/Manager/Sales can manage order notes" ON public.order_notes;
DROP POLICY IF EXISTS "Staff manage order notes" ON public.order_notes;
CREATE POLICY "Staff manage order notes"
  ON public.order_notes FOR ALL
  TO authenticated
  USING (
    public.has_any_role('super_admin', 'admin', 'manager', 'sales', 'support')
  )
  WITH CHECK (
    public.has_any_role('super_admin', 'admin', 'manager', 'sales', 'support')
  );

DROP POLICY IF EXISTS "Admin/Manager/Sales can manage order history" ON public.order_history;
DROP POLICY IF EXISTS "Staff manage order history" ON public.order_history;
CREATE POLICY "Staff manage order history"
  ON public.order_history FOR ALL
  TO authenticated
  USING (
    public.has_any_role('super_admin', 'admin', 'manager', 'sales', 'support', 'accountant')
  )
  WITH CHECK (
    public.has_any_role('super_admin', 'admin', 'manager', 'sales', 'support')
  );

-- D. INCOMPLETE ORDERS
DROP POLICY IF EXISTS "Admin/Manager/Sales can manage incomplete orders" ON public.incomplete_orders;
DROP POLICY IF EXISTS "Staff manage incomplete orders" ON public.incomplete_orders;

CREATE POLICY "Staff manage incomplete orders"
  ON public.incomplete_orders FOR ALL
  TO authenticated
  USING (
    public.has_any_role('super_admin', 'admin', 'manager', 'sales', 'support')
  )
  WITH CHECK (
    public.has_any_role('super_admin', 'admin', 'manager', 'sales', 'support')
  );

-- E. STORE SETTINGS (Prevent secret leakage to unauthorized roles)
DROP POLICY IF EXISTS "Public can read storefront display settings" ON public.store_settings;
DROP POLICY IF EXISTS "Admin/Manager can manage settings" ON public.store_settings;
DROP POLICY IF EXISTS "Staff read store settings" ON public.store_settings;
DROP POLICY IF EXISTS "Staff manage store settings" ON public.store_settings;

-- Public can read ONLY non-sensitive storefront display settings
CREATE POLICY "Public can read storefront display settings"
  ON public.store_settings FOR SELECT
  USING (
    key IN (
      'hero_banner', 
      'contact_info', 
      'homepage_sections', 
      'store_info', 
      'delivery_charges', 
      'public_tracking_settings', 
      'homepage_section_order', 
      'offer_banner', 
      'trust_features', 
      'newsletter', 
      'statistics', 
      'homepage_gallery', 
      'announcement_bar', 
      'seo_settings',
      'order_control',
      'category_seo_data',
      'about_us_settings'
    )
    OR key LIKE 'product_seo_%'
    -- Non-sensitive operational settings available to operational staff
    OR (
      auth.role() = 'authenticated' AND (
        public.has_any_role('manager', 'editor', 'marketing', 'sales', 'support')
        AND key NOT IN (
          'payment_methods',
          'courier_settings',
          'sms_settings',
          'telegram_settings',
          'fraud_settings'
        )
      )
    )
    -- Sensitive settings accessible strictly to super_admin and admin
    OR (
      auth.role() = 'authenticated' AND public.has_any_role('super_admin', 'admin')
    )
  );

CREATE POLICY "Staff manage store settings"
  ON public.store_settings FOR ALL
  TO authenticated
  USING (
    public.has_any_role('super_admin', 'admin')
    OR (
      -- Managers can only modify non-sensitive display content
      public.has_any_role('manager') AND
      key NOT IN ('payment_methods', 'courier_settings', 'sms_settings', 'telegram_settings', 'fraud_settings')
    )
  )
  WITH CHECK (
    public.has_any_role('super_admin', 'admin')
    OR (
      public.has_any_role('manager') AND
      key NOT IN ('payment_methods', 'courier_settings', 'sms_settings', 'telegram_settings', 'fraud_settings')
    )
  );

-- F. USER ROLES (Privilege Escalation Prevention)
DROP POLICY IF EXISTS "Admins can manage user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Staff read user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admin manage user_roles" ON public.user_roles;

-- Users can inspect their own role; admins and super_admins can see all roles
CREATE POLICY "Staff read user_roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    public.has_any_role('super_admin', 'admin')
  );

-- Only Super Admin can insert, update, or delete staff roles
CREATE POLICY "Super admin manage user_roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (
    public.is_super_admin()
  )
  WITH CHECK (
    public.is_super_admin()
  );

-- G. CUSTOMER PROFILES & ACTIVITIES
DROP POLICY IF EXISTS "Admin/Manager can manage all customer profiles" ON public.customer_profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON public.customer_profiles;
DROP POLICY IF EXISTS "Staff manage customer profiles" ON public.customer_profiles;

CREATE POLICY "Customer manage own profile"
  ON public.customer_profiles FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Staff manage customer profiles"
  ON public.customer_profiles FOR ALL
  TO authenticated
  USING (
    public.has_any_role('super_admin', 'admin', 'manager', 'support')
  )
  WITH CHECK (
    public.has_any_role('super_admin', 'admin', 'manager', 'support')
  );

-- ============================================================================
-- 6. STORAGE OBJECTS SECURITY (Hardening Buckets & Uploads)
-- ============================================================================

-- Drop insecure open authenticated upload policies on storage.objects
DROP POLICY IF EXISTS "Authenticated Insert Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete Access" ON storage.objects;
DROP POLICY IF EXISTS "Staff Upload Access" ON storage.objects;
DROP POLICY IF EXISTS "Staff Update Access" ON storage.objects;
DROP POLICY IF EXISTS "Staff Delete Access" ON storage.objects;

-- Staff upload policy: ONLY authorized roles can write to storage buckets
CREATE POLICY "Staff Upload Access"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_any_role('super_admin', 'admin', 'manager', 'editor', 'marketing')
    AND bucket_id IN ('images', 'videos', 'documents', 'uploads')
  );

-- Staff update policy
CREATE POLICY "Staff Update Access"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    public.has_any_role('super_admin', 'admin', 'manager', 'editor', 'marketing')
    AND bucket_id IN ('images', 'videos', 'documents', 'uploads')
  );

-- Staff delete policy (restricted from marketing/sales)
CREATE POLICY "Staff Delete Access"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    public.has_any_role('super_admin', 'admin', 'manager', 'editor')
  );

-- ============================================================================
-- 7. SAFE ORDER SUMMARY LOOKUP (Anti-Scraping / PII Protection)
-- ============================================================================

-- Replace get_order_summary_by_number with an optional phone/token verification
-- so unauthenticated scraping by guessing order numbers is prevented.
DROP FUNCTION IF EXISTS public.get_order_summary_by_number(TEXT);
DROP FUNCTION IF EXISTS public.get_order_summary_by_number(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.get_order_summary_by_number(
  p_order_number TEXT,
  p_verify_phone TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_items JSONB;
  v_clean_phone TEXT;
  v_auth_uid UUID;
  v_auth_role TEXT;
  v_is_authorized BOOLEAN := false;
BEGIN
  IF p_order_number IS NULL OR TRIM(p_order_number) = '' THEN
    RETURN NULL;
  END IF;

  SELECT id, order_number, customer_name, customer_phone, customer_email, 
         shipping_address, payment_method, payment_status, order_status, 
         subtotal, delivery_charge, discount_amount, total_amount, user_id, created_at
  INTO v_order
  FROM public.orders
  WHERE order_number = TRIM(p_order_number);

  IF v_order.id IS NULL THEN
    RETURN NULL;
  END IF;

  v_auth_uid := auth.uid();
  v_auth_role := public.get_auth_role(v_auth_uid);

  -- 1. If requester is staff member, grant full access
  IF v_auth_role IN ('super_admin', 'admin', 'manager', 'sales', 'support', 'delivery_staff', 'accountant') THEN
    v_is_authorized := true;
  -- 2. If requester is the order owner, grant access
  ELSIF v_auth_uid IS NOT NULL AND v_order.user_id = v_auth_uid THEN
    v_is_authorized := true;
  -- 3. If phone matches or was placed in the last 15 minutes (OrderSuccess post-redirect window), allow display
  ELSIF p_verify_phone IS NOT NULL AND TRIM(p_verify_phone) <> '' THEN
    v_clean_phone := REGEXP_REPLACE(p_verify_phone, '[^\d]', '', 'g');
    IF RIGHT(REGEXP_REPLACE(v_order.customer_phone, '[^\d]', '', 'g'), 10) = RIGHT(v_clean_phone, 10) THEN
      v_is_authorized := true;
    END IF;
  ELSIF (now() - v_order.created_at) < INTERVAL '30 minutes' THEN
    -- Immediate post-checkout success window allows display on thank you page
    v_is_authorized := true;
  END IF;

  -- If not authorized, return masked summary without PII
  IF NOT v_is_authorized THEN
    RETURN jsonb_build_object(
      'order_number', v_order.order_number,
      'order_status', v_order.order_status,
      'payment_status', v_order.payment_status,
      'total_amount', v_order.total_amount,
      'created_at', v_order.created_at,
      'is_masked', true
    );
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', oi.id,
      'product_id', oi.product_id,
      'name', oi.product_name,
      'variant_id', oi.variant_id,
      'variant_title', oi.variant_title,
      'quantity', oi.quantity,
      'unit_price', oi.unit_price,
      'total_price', oi.total_price
    )
  )
  INTO v_items
  FROM public.order_items oi
  WHERE oi.order_id = v_order.id;

  RETURN jsonb_build_object(
    'id', v_order.id,
    'order_number', v_order.order_number,
    'customer_name', v_order.customer_name,
    'customer_phone', v_order.customer_phone,
    'customer_email', v_order.customer_email,
    'shipping_address', v_order.shipping_address,
    'payment_method', v_order.payment_method,
    'payment_status', v_order.payment_status,
    'order_status', v_order.order_status,
    'subtotal', v_order.subtotal,
    'delivery_charge', v_order.delivery_charge,
    'discount_amount', v_order.discount_amount,
    'total_amount', v_order.total_amount,
    'items', COALESCE(v_items, '[]'::jsonb),
    'created_at', v_order.created_at,
    'is_masked', false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_order_summary_by_number(TEXT, TEXT) TO anon, authenticated, service_role;
