-- Migration: 20260705000000_secure_authoritative_checkout.sql
-- Description: Authoritative server-side checkout, atomic inventory locking, coupon validation, and strict RLS policies

-- 1. Schema Enhancements
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_key 
ON public.orders(idempotency_key) 
WHERE idempotency_key IS NOT NULL AND idempotency_key <> '';

ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS variant_id TEXT,
ADD COLUMN IF NOT EXISTS variant_title TEXT;

-- 2. Revoke Direct Browser Client INSERT on orders and order_items
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;

-- Ensure Staff management policies remain solid
DROP POLICY IF EXISTS "Admin/Manager/Sales can manage orders" ON public.orders;
CREATE POLICY "Admin/Manager/Sales can manage orders" ON public.orders
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR 
    public.has_role(auth.uid(), 'manager'::app_role) OR 
    public.has_role(auth.uid(), 'sales'::app_role) OR 
    public.has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR 
    public.has_role(auth.uid(), 'manager'::app_role) OR 
    public.has_role(auth.uid(), 'sales'::app_role) OR 
    public.has_role(auth.uid(), 'super_admin'::app_role)
  );

DROP POLICY IF EXISTS "Admin/Manager/Sales can manage order items" ON public.order_items;
CREATE POLICY "Admin/Manager/Sales can manage order items" ON public.order_items
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR 
    public.has_role(auth.uid(), 'manager'::app_role) OR 
    public.has_role(auth.uid(), 'sales'::app_role) OR 
    public.has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR 
    public.has_role(auth.uid(), 'manager'::app_role) OR 
    public.has_role(auth.uid(), 'sales'::app_role) OR 
    public.has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Authenticated customers can read their own orders and items
DROP POLICY IF EXISTS "Users can read own orders" ON public.orders;
CREATE POLICY "Users can read own orders" ON public.orders
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can read own order items" ON public.order_items;
CREATE POLICY "Users can read own order items" ON public.order_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_items.order_id 
      AND orders.user_id = auth.uid()
    )
  );

-- 3. Update stock adjustment trigger function to prevent negative inventory
CREATE OR REPLACE FUNCTION public.adjust_product_stock_on_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stock_before integer;
  v_stock_after integer;
  v_order_number text;
  v_product_name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.product_id IS NOT NULL THEN
      -- Lock product row to prevent race conditions
      SELECT name, stock_quantity INTO v_product_name, v_stock_before 
      FROM public.products 
      WHERE id = NEW.product_id 
      FOR UPDATE;
      
      IF v_stock_before IS NULL THEN
        RAISE EXCEPTION 'INVALID_PRODUCT: Product with ID % does not exist', NEW.product_id;
      END IF;

      IF v_stock_before < NEW.quantity THEN
        RAISE EXCEPTION 'OUT_OF_STOCK: Insufficient stock for product "%" (available: %, requested: %)', 
          COALESCE(v_product_name, 'Product'), v_stock_before, NEW.quantity;
      END IF;

      v_stock_after := v_stock_before - NEW.quantity;
      
      UPDATE public.products
      SET stock_quantity = v_stock_after
      WHERE id = NEW.product_id;
      
      SELECT order_number INTO v_order_number FROM public.orders WHERE id = NEW.order_id;
      
      INSERT INTO public.inventory_log (product_id, type, quantity_change, stock_before, stock_after, note)
      VALUES (
        NEW.product_id, 
        'sale', 
        -NEW.quantity, 
        COALESCE(v_stock_before, 0), 
        v_stock_after, 
        COALESCE('অর্ডার #' || v_order_number || ' এর মাধ্যমে বিক্রি', 'অর্ডার বিক্রয়')
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.product_id IS NOT NULL THEN
      IF EXISTS (
        SELECT 1 FROM public.orders 
        WHERE id = OLD.order_id 
        AND order_status NOT IN ('cancelled', 'courier_cancelled')
      ) THEN
        SELECT stock_quantity INTO v_stock_before 
        FROM public.products 
        WHERE id = OLD.product_id 
        FOR UPDATE;
        
        v_stock_after := COALESCE(v_stock_before, 0) + OLD.quantity;
        
        UPDATE public.products
        SET stock_quantity = v_stock_after
        WHERE id = OLD.product_id;
        
        SELECT order_number INTO v_order_number FROM public.orders WHERE id = OLD.order_id;
        
        INSERT INTO public.inventory_log (product_id, type, quantity_change, stock_before, stock_after, note)
        VALUES (
          OLD.product_id, 
          'return', 
          OLD.quantity, 
          COALESCE(v_stock_before, 0), 
          v_stock_after, 
          COALESCE('অর্ডার #' || v_order_number || ' মুছে ফেলার কারণে স্টক ফেরত', 'অর্ডার আইটেম বাতিল')
        );
      END IF;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- 4. Authoritative Checkout Function (Transactional RPC)
CREATE OR REPLACE FUNCTION public.process_checkout(
  p_items JSONB,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_customer_email TEXT DEFAULT NULL,
  p_shipping_address JSONB DEFAULT '{}'::jsonb,
  p_payment_method TEXT DEFAULT 'cod',
  p_coupon_code TEXT DEFAULT NULL,
  p_order_notes TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_tracking_params JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_user_id UUID;
  v_clean_phone TEXT;
  v_clean_name TEXT;
  v_clean_email TEXT;
  v_clean_notes TEXT;
  v_clean_coupon TEXT;
  v_clean_idempotency TEXT;
  v_shipping_division TEXT;
  v_shipping_address_full TEXT;
  
  v_item RECORD;
  v_item_json JSONB;
  v_product RECORD;
  v_variant_json JSONB;
  v_variant_found BOOLEAN;
  v_variant_id TEXT;
  v_variant_title TEXT;
  v_variant_stock INT;
  v_variant_price NUMERIC;
  v_variant_regular_price NUMERIC;
  v_variant_sale_price NUMERIC;
  v_updated_variants JSONB;
  v_var_elem JSONB;
  
  v_unit_price NUMERIC;
  v_item_total NUMERIC;
  v_item_title TEXT;
  v_item_qty INT;
  v_product_id UUID;
  v_product_name TEXT;
  
  v_subtotal NUMERIC := 0;
  v_delivery_charge NUMERIC := 0;
  v_discount_amount NUMERIC := 0;
  v_total_amount NUMERIC := 0;
  v_has_free_delivery_item BOOLEAN := false;
  
  v_coupon RECORD;
  v_coupon_discount NUMERIC := 0;
  
  v_delivery_settings JSONB;
  v_dhaka_inside NUMERIC := 70;
  v_dhaka_outside NUMERIC := 130;
  v_free_delivery_min NUMERIC := 0;
  v_is_dhaka BOOLEAN := false;
  
  v_order_id UUID;
  v_order_number TEXT;
  v_created_at TIMESTAMPTZ;
  v_return_items JSONB := '[]'::jsonb;
  
  v_existing_order RECORD;
  v_existing_items JSONB;
BEGIN
  -- A. Clean & Normalize Inputs
  v_clean_name := TRIM(COALESCE(p_customer_name, ''));
  v_clean_phone := TRIM(COALESCE(p_customer_phone, ''));
  v_clean_email := NULLIF(TRIM(COALESCE(p_customer_email, '')), '');
  v_clean_notes := NULLIF(TRIM(COALESCE(p_order_notes, '')), '');
  v_clean_coupon := NULLIF(UPPER(TRIM(COALESCE(p_coupon_code, ''))), '');
  v_clean_idempotency := NULLIF(TRIM(COALESCE(p_idempotency_key, '')), '');
  
  v_caller_user_id := COALESCE(auth.uid(), p_user_id);

  IF v_clean_name = '' THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Customer name is required';
  END IF;

  IF v_clean_phone = '' THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Customer phone number is required';
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Cart is empty';
  END IF;

  -- B. Check Idempotency Key (Return existing order if replayed)
  IF v_clean_idempotency IS NOT NULL THEN
    SELECT id, order_number, customer_name, customer_phone, customer_email, 
           shipping_address, payment_method, payment_status, order_status, 
           subtotal, delivery_charge, discount_amount, total_amount, created_at
    INTO v_existing_order
    FROM public.orders
    WHERE idempotency_key = v_clean_idempotency;

    IF v_existing_order.id IS NOT NULL THEN
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
      INTO v_existing_items
      FROM public.order_items oi
      WHERE oi.order_id = v_existing_order.id;

      RETURN jsonb_build_object(
        'success', true,
        'is_duplicate', true,
        'order_id', v_existing_order.id,
        'order_number', v_existing_order.order_number,
        'customer_name', v_existing_order.customer_name,
        'customer_phone', v_existing_order.customer_phone,
        'customer_email', v_existing_order.customer_email,
        'shipping_address', v_existing_order.shipping_address,
        'payment_method', v_existing_order.payment_method,
        'payment_status', v_existing_order.payment_status,
        'order_status', v_existing_order.order_status,
        'subtotal', v_existing_order.subtotal,
        'delivery_charge', v_existing_order.delivery_charge,
        'discount_amount', v_existing_order.discount_amount,
        'total_amount', v_existing_order.total_amount,
        'items', COALESCE(v_existing_items, '[]'::jsonb),
        'created_at', v_existing_order.created_at
      );
    END IF;
  END IF;

  -- C. Validate Items, Stock & Calculate Subtotal
  FOR v_item_json IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_product_id := (v_item_json->>'product_id')::uuid;
    v_item_qty := COALESCE((v_item_json->>'quantity')::int, 1);
    v_variant_id := NULLIF(TRIM(COALESCE(v_item_json->>'variant_id', '')), '');

    IF v_item_qty <= 0 THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: Item quantity must be at least 1';
    END IF;

    -- Lock product row
    SELECT * INTO v_product 
    FROM public.products 
    WHERE id = v_product_id 
    FOR UPDATE;

    IF v_product.id IS NULL THEN
      RAISE EXCEPTION 'INVALID_PRODUCT: Product % not found', v_product_id;
    END IF;

    IF v_product.status <> 'active' THEN
      RAISE EXCEPTION 'INACTIVE_PRODUCT: Product "%" is not active', v_product.name;
    END IF;

    -- Check if product offers free delivery
    IF (v_product.is_free_delivery = true) OR 
       ('ফ্রি ডেলিভারি' = ANY(v_product.tags)) OR 
       ('free_delivery' = ANY(v_product.tags)) THEN
      v_has_free_delivery_item := true;
    END IF;

    -- Handle Variants vs Base Product
    IF v_product.has_variants = true AND v_product.variants IS NOT NULL AND jsonb_array_length(v_product.variants) > 0 THEN
      v_variant_found := false;
      v_updated_variants := '[]'::jsonb;

      FOR v_var_elem IN SELECT * FROM jsonb_array_elements(v_product.variants) LOOP
        IF (v_var_elem->>'id') = v_variant_id THEN
          v_variant_found := true;
          
          IF COALESCE((v_var_elem->>'is_active')::boolean, true) = false THEN
            RAISE EXCEPTION 'INACTIVE_VARIANT: Selected variation for "%" is inactive', v_product.name;
          END IF;

          v_variant_stock := COALESCE((v_var_elem->>'stock_quantity')::int, 0);
          IF v_variant_stock < v_item_qty THEN
            RAISE EXCEPTION 'OUT_OF_STOCK: Insufficient stock for variation "% - %" (available: %, requested: %)', 
              v_product.name, COALESCE(v_var_elem->>'title', 'Variant'), v_variant_stock, v_item_qty;
          END IF;

          -- Calculate Authoritative Variant Price
          v_variant_regular_price := COALESCE((v_var_elem->>'regular_price')::numeric, v_product.regular_price);
          v_variant_sale_price := (v_var_elem->>'sale_price')::numeric;
          v_unit_price := COALESCE(v_variant_sale_price, v_variant_regular_price);
          v_variant_title := COALESCE(v_var_elem->>'title', 'Variant');
          v_item_title := v_product.name || ' (' || v_variant_title || ')';

          -- Decrement variant stock inside JSONB
          v_var_elem := jsonb_set(v_var_elem, '{stock_quantity}', to_jsonb(v_variant_stock - v_item_qty));
        END IF;
        v_updated_variants := v_updated_variants || jsonb_build_array(v_var_elem);
      END LOOP;

      IF NOT v_variant_found THEN
        RAISE EXCEPTION 'INVALID_VARIANT: Selected variation does not exist for product "%"', v_product.name;
      END IF;

      -- Update variants JSONB on product
      UPDATE public.products 
      SET variants = v_updated_variants 
      WHERE id = v_product.id;

    ELSE
      -- Standard non-variant product
      IF v_product.stock_quantity < v_item_qty THEN
        RAISE EXCEPTION 'OUT_OF_STOCK: Insufficient stock for product "%" (available: %, requested: %)', 
          v_product.name, v_product.stock_quantity, v_item_qty;
      END IF;

      v_unit_price := COALESCE(v_product.sale_price, v_product.regular_price);
      v_variant_id := NULL;
      v_variant_title := NULL;
      v_item_title := v_product.name;
    END IF;

    v_item_total := v_unit_price * v_item_qty;
    v_subtotal := v_subtotal + v_item_total;

    v_return_items := v_return_items || jsonb_build_array(
      jsonb_build_object(
        'product_id', v_product.id,
        'product_name', v_item_title,
        'variant_id', v_variant_id,
        'variant_title', v_variant_title,
        'unit_price', v_unit_price,
        'quantity', v_item_qty,
        'total_price', v_item_total,
        'image', COALESCE(v_product.images[1], '')
      )
    );
  END LOOP;

  -- D. Calculate Delivery Charge
  v_shipping_division := COALESCE(p_shipping_address->>'division', '');
  IF v_shipping_division ILIKE '%ঢাকা%' OR v_shipping_division ILIKE '%dhaka%' THEN
    v_is_dhaka := true;
  END IF;

  -- Fetch delivery charge settings
  SELECT value INTO v_delivery_settings 
  FROM public.store_settings 
  WHERE key = 'delivery_charges';

  IF v_delivery_settings IS NOT NULL THEN
    v_dhaka_inside := COALESCE((v_delivery_settings->>'dhaka_inside')::numeric, 70);
    v_dhaka_outside := COALESCE((v_delivery_settings->>'dhaka_outside')::numeric, 130);
    v_free_delivery_min := COALESCE((v_delivery_settings->>'free_delivery_min')::numeric, 0);
  END IF;

  IF v_has_free_delivery_item THEN
    v_delivery_charge := 0;
  ELSIF v_free_delivery_min > 0 AND v_subtotal >= v_free_delivery_min THEN
    v_delivery_charge := 0;
  ELSIF v_is_dhaka THEN
    v_delivery_charge := v_dhaka_inside;
  ELSE
    v_delivery_charge := v_dhaka_outside;
  END IF;

  -- E. Validate & Apply Coupon
  IF v_clean_coupon IS NOT NULL THEN
    SELECT * INTO v_coupon 
    FROM public.coupons 
    WHERE code = v_clean_coupon 
    FOR UPDATE;

    IF v_coupon.id IS NULL OR v_coupon.is_active = false THEN
      RAISE EXCEPTION 'INVALID_COUPON: Coupon "%" is not valid or active', v_clean_coupon;
    END IF;

    IF v_coupon.valid_from IS NOT NULL AND v_coupon.valid_from > now() THEN
      RAISE EXCEPTION 'COUPON_NOT_STARTED: Coupon "%" is not yet active', v_clean_coupon;
    END IF;

    IF v_coupon.valid_to IS NOT NULL AND v_coupon.valid_to < now() THEN
      RAISE EXCEPTION 'COUPON_EXPIRED: Coupon "%" has expired', v_clean_coupon;
    END IF;

    IF v_coupon.min_order IS NOT NULL AND v_subtotal < v_coupon.min_order THEN
      RAISE EXCEPTION 'COUPON_MIN_ORDER: Coupon "%" requires minimum order of ৳%', 
        v_clean_coupon, v_coupon.min_order;
    END IF;

    IF v_coupon.usage_limit IS NOT NULL AND COALESCE(v_coupon.used_count, 0) >= v_coupon.usage_limit THEN
      RAISE EXCEPTION 'COUPON_LIMIT_REACHED: Coupon "%" usage limit has been reached', v_clean_coupon;
    END IF;

    -- Calculate Discount
    IF v_coupon.discount_type = 'percentage' THEN
      v_discount_amount := (v_subtotal * v_coupon.discount_value) / 100;
      IF v_coupon.max_discount IS NOT NULL AND v_coupon.max_discount > 0 THEN
        v_discount_amount := LEAST(v_discount_amount, v_coupon.max_discount);
      END IF;
    ELSIF v_coupon.discount_type = 'free_delivery' OR (v_coupon.discount_type = 'flat' AND v_coupon.discount_value = 0) THEN
      v_discount_amount := v_delivery_charge;
    ELSIF v_coupon.discount_type = 'flat' THEN
      v_discount_amount := LEAST(v_coupon.discount_value, v_subtotal);
    END IF;

    -- Increment Coupon Used Count
    UPDATE public.coupons 
    SET used_count = COALESCE(used_count, 0) + 1 
    WHERE id = v_coupon.id;
  END IF;

  -- F. Calculate Final Total
  v_total_amount := GREATEST(0, v_subtotal + v_delivery_charge - v_discount_amount);

  -- G. Create Orders Record
  INSERT INTO public.orders (
    order_number,
    customer_name,
    customer_phone,
    customer_email,
    user_id,
    shipping_address,
    payment_method,
    payment_status,
    order_status,
    subtotal,
    delivery_charge,
    discount_amount,
    coupon_code,
    total_amount,
    notes,
    idempotency_key,
    ip_address,
    user_agent,
    fbp,
    fbc,
    fbclid,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term
  )
  VALUES (
    '', -- Auto-generated by trigger
    v_clean_name,
    v_clean_phone,
    v_clean_email,
    v_caller_user_id,
    p_shipping_address,
    COALESCE(p_payment_method, 'cod'),
    'pending',
    'pending',
    v_subtotal,
    v_delivery_charge,
    v_discount_amount,
    v_clean_coupon,
    v_total_amount,
    v_clean_notes,
    v_clean_idempotency,
    NULLIF(TRIM(COALESCE(p_tracking_params->>'ip_address', '')), ''),
    NULLIF(TRIM(COALESCE(p_tracking_params->>'user_agent', '')), ''),
    NULLIF(TRIM(COALESCE(p_tracking_params->>'fbp', '')), ''),
    NULLIF(TRIM(COALESCE(p_tracking_params->>'fbc', '')), ''),
    NULLIF(TRIM(COALESCE(p_tracking_params->>'fbclid', '')), ''),
    NULLIF(TRIM(COALESCE(p_tracking_params->>'utm_source', '')), ''),
    NULLIF(TRIM(COALESCE(p_tracking_params->>'utm_medium', '')), ''),
    NULLIF(TRIM(COALESCE(p_tracking_params->>'utm_campaign', '')), ''),
    NULLIF(TRIM(COALESCE(p_tracking_params->>'utm_content', '')), ''),
    NULLIF(TRIM(COALESCE(p_tracking_params->>'utm_term', '')), '')
  )
  RETURNING id, order_number, created_at INTO v_order_id, v_order_number, v_created_at;

  -- H. Create Order Items Records
  FOR v_item_json IN SELECT * FROM jsonb_array_elements(v_return_items) LOOP
    INSERT INTO public.order_items (
      order_id,
      product_id,
      product_name,
      variant_id,
      variant_title,
      quantity,
      unit_price,
      total_price
    )
    VALUES (
      v_order_id,
      (v_item_json->>'product_id')::uuid,
      v_item_json->>'product_name',
      NULLIF(v_item_json->>'variant_id', ''),
      NULLIF(v_item_json->>'variant_title', ''),
      (v_item_json->>'quantity')::int,
      (v_item_json->>'unit_price')::numeric,
      (v_item_json->>'total_price')::numeric
    );
  END LOOP;

  -- I. Record Order History
  INSERT INTO public.order_history (
    order_id,
    action,
    details,
    staff_name
  )
  VALUES (
    v_order_id,
    'order_created',
    'অর্ডার তৈরি হয়েছে (অথেনটিকেটেড সার্ভার চেকআউট)',
    'System'
  );

  -- J. Return Safe Order Summary
  RETURN jsonb_build_object(
    'success', true,
    'is_duplicate', false,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'customer_name', v_clean_name,
    'customer_phone', v_clean_phone,
    'customer_email', v_clean_email,
    'shipping_address', p_shipping_address,
    'payment_method', COALESCE(p_payment_method, 'cod'),
    'payment_status', 'pending',
    'order_status', 'pending',
    'subtotal', v_subtotal,
    'delivery_charge', v_delivery_charge,
    'discount_amount', v_discount_amount,
    'coupon_code', v_clean_coupon,
    'total_amount', v_total_amount,
    'items', v_return_items,
    'created_at', v_created_at
  );
END;
$$;

-- 5. Secure Read-Only Function for Order Summary Lookup on Success / Tracking Page
CREATE OR REPLACE FUNCTION public.get_order_summary_by_number(p_order_number TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_items JSONB;
BEGIN
  IF p_order_number IS NULL OR TRIM(p_order_number) = '' THEN
    RETURN NULL;
  END IF;

  SELECT id, order_number, customer_name, customer_phone, customer_email, 
         shipping_address, payment_method, payment_status, order_status, 
         subtotal, delivery_charge, discount_amount, total_amount, created_at
  INTO v_order
  FROM public.orders
  WHERE order_number = TRIM(p_order_number);

  IF v_order.id IS NULL THEN
    RETURN NULL;
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
    'created_at', v_order.created_at
  );
END;
$$;

-- 6. Grant Permissions to anon, authenticated, and service_role
GRANT EXECUTE ON FUNCTION public.process_checkout TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_order_summary_by_number TO anon, authenticated, service_role;
