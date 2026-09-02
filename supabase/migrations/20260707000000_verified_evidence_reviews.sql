-- =========================================================================
-- Migration: 20260707000000_verified_evidence_reviews.sql
-- Description: Trust Signals, Verified Purchase Review System & Evidence-Based Ratings
-- =========================================================================

-- 1. Enhance testimonials table with verification and moderation fields
ALTER TABLE public.testimonials 
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_verified_purchase BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));

-- Preserve existing active reviews by marking them approved
UPDATE public.testimonials 
SET status = 'approved' 
WHERE is_active = true AND status = 'pending';

-- 2. Indexes for fast review filtering and statistics
CREATE INDEX IF NOT EXISTS idx_testimonials_product_status 
  ON public.testimonials (product_id, status, is_active, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_testimonials_order_product 
  ON public.testimonials (order_id, product_id);

-- 3. RLS Policies on testimonials
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read testimonials" ON public.testimonials;
DROP POLICY IF EXISTS "Anyone can read approved testimonials" ON public.testimonials;
DROP POLICY IF EXISTS "Admin can manage testimonials" ON public.testimonials;
DROP POLICY IF EXISTS "Staff can manage all testimonials" ON public.testimonials;
DROP POLICY IF EXISTS "Anyone can insert testimonials" ON public.testimonials;

-- Public can ONLY view reviews that are active AND approved
CREATE POLICY "Anyone can read approved testimonials" ON public.testimonials
  FOR SELECT USING (is_active = true AND status = 'approved');

-- Staff can view, moderate, update, and delete all reviews
CREATE POLICY "Staff can manage all testimonials" ON public.testimonials
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'manager') OR 
    public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'manager') OR 
    public.has_role(auth.uid(), 'super_admin')
  );

-- Service role bypass
CREATE POLICY "Service role full access on testimonials" ON public.testimonials
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Secure RPC: Authoritative Product Review Summary
CREATE OR REPLACE FUNCTION public.get_product_review_summary(p_product_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT := 0;
  v_avg NUMERIC := 0;
  v_star_1 INT := 0;
  v_star_2 INT := 0;
  v_star_3 INT := 0;
  v_star_4 INT := 0;
  v_star_5 INT := 0;
BEGIN
  -- Count and average from approved reviews only
  SELECT 
    COUNT(*),
    COALESCE(ROUND(AVG(rating)::NUMERIC, 1), 0),
    COUNT(*) FILTER (WHERE rating = 1),
    COUNT(*) FILTER (WHERE rating = 2),
    COUNT(*) FILTER (WHERE rating = 3),
    COUNT(*) FILTER (WHERE rating = 4),
    COUNT(*) FILTER (WHERE rating = 5)
  INTO 
    v_count, v_avg, v_star_1, v_star_2, v_star_3, v_star_4, v_star_5
  FROM public.testimonials
  WHERE product_id = p_product_id
    AND is_active = true
    AND status = 'approved';

  RETURN jsonb_build_object(
    'product_id', p_product_id,
    'review_count', v_count,
    'average_rating', v_avg,
    'distribution', jsonb_build_object(
      '1', v_star_1,
      '2', v_star_2,
      '3', v_star_3,
      '4', v_star_4,
      '5', v_star_5
    ),
    'percentages', jsonb_build_object(
      '1', CASE WHEN v_count > 0 THEN ROUND((v_star_1::NUMERIC / v_count) * 100) ELSE 0 END,
      '2', CASE WHEN v_count > 0 THEN ROUND((v_star_2::NUMERIC / v_count) * 100) ELSE 0 END,
      '3', CASE WHEN v_count > 0 THEN ROUND((v_star_3::NUMERIC / v_count) * 100) ELSE 0 END,
      '4', CASE WHEN v_count > 0 THEN ROUND((v_star_4::NUMERIC / v_count) * 100) ELSE 0 END,
      '5', CASE WHEN v_count > 0 THEN ROUND((v_star_5::NUMERIC / v_count) * 100) ELSE 0 END
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_product_review_summary(UUID) TO anon, authenticated, service_role;

-- 5. Secure RPC: Submit Product Review with Delivered-Order Verification
CREATE OR REPLACE FUNCTION public.submit_product_review(
  p_product_id UUID,
  p_customer_name TEXT,
  p_rating INT,
  p_review TEXT,
  p_order_number TEXT DEFAULT NULL,
  p_customer_phone TEXT DEFAULT NULL,
  p_customer_image_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID := NULL;
  v_is_verified BOOLEAN := false;
  v_clean_phone TEXT;
  v_existing_review UUID;
  v_new_review_id UUID;
BEGIN
  -- 1. Input Validation
  IF p_product_id IS NULL THEN
    RAISE EXCEPTION 'প্রোডাক্ট আইডি আবশ্যক';
  END IF;

  IF p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'রেটিং ১ থেকে ৫ এর মধ্যে হতে হবে';
  END IF;

  IF length(trim(COALESCE(p_customer_name, ''))) < 2 THEN
    RAISE EXCEPTION 'অনুগ্রহ করে সঠিক নাম লিখুন';
  END IF;

  IF length(trim(COALESCE(p_review, ''))) < 5 THEN
    RAISE EXCEPTION 'রিভিউ বক্তব্য কমপক্ষে ৫ অক্ষরের হতে হবে';
  END IF;

  -- Ensure product exists
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = p_product_id) THEN
    RAISE EXCEPTION 'প্রোডাক্ট পাওয়া যায়নি';
  END IF;

  -- 2. Optional Delivered Order Verification
  IF p_order_number IS NOT NULL AND length(trim(p_order_number)) > 0 AND
     p_customer_phone IS NOT NULL AND length(trim(p_customer_phone)) > 0 THEN
    
    -- Normalize phone digits
    v_clean_phone := regexp_replace(p_customer_phone, '\D', '', 'g');
    IF v_clean_phone LIKE '880%' AND length(v_clean_phone) = 13 THEN
      v_clean_phone := substring(v_clean_phone from 3);
    ELSIF v_clean_phone LIKE '80%' AND length(v_clean_phone) = 12 THEN
      v_clean_phone := '0' || substring(v_clean_phone from 3);
    ELSIF length(v_clean_phone) = 10 AND NOT v_clean_phone LIKE '0%' THEN
      v_clean_phone := '0' || v_clean_phone;
    END IF;

    -- Look for a delivered order with this order number and customer phone
    SELECT o.id INTO v_order_id
    FROM public.orders o
    WHERE (o.order_number ILIKE trim(p_order_number) OR o.id::text = trim(p_order_number))
      AND (
        regexp_replace(o.customer_phone, '\D', '', 'g') LIKE '%' || v_clean_phone
        OR v_clean_phone LIKE '%' || regexp_replace(o.customer_phone, '\D', '', 'g')
      )
      AND o.order_status = 'delivered'
    LIMIT 1;

    IF v_order_id IS NOT NULL THEN
      -- Check if this delivered order actually contained the product
      IF EXISTS (
        SELECT 1 FROM public.order_items 
        WHERE order_id = v_order_id AND product_id = p_product_id
      ) THEN
        -- Check for duplicate review on this order item
        SELECT id INTO v_existing_review
        FROM public.testimonials
        WHERE order_id = v_order_id AND product_id = p_product_id
        LIMIT 1;

        IF v_existing_review IS NOT NULL THEN
          RAISE EXCEPTION 'আপনি ইতিমধ্যে এই অর্ডারের পণ্যের জন্য একটি রিভিউ জমা দিয়েছেন।';
        END IF;

        v_is_verified := true;
      ELSE
        -- Order does not contain this product
        v_order_id := NULL;
        v_is_verified := false;
      END IF;
    END IF;
  END IF;

  -- 3. Insert review as pending moderation
  INSERT INTO public.testimonials (
    product_id,
    order_id,
    customer_name,
    customer_location,
    customer_image_url,
    rating,
    review,
    is_active,
    status,
    is_verified_purchase,
    sort_order
  ) VALUES (
    p_product_id,
    v_order_id,
    trim(p_customer_name),
    CASE WHEN v_is_verified THEN 'ভেরিফাইড ক্রেতা' ELSE '' END,
    COALESCE(p_customer_image_url, ''),
    p_rating,
    trim(p_review),
    false, -- Pending staff approval
    'pending',
    v_is_verified,
    0
  ) RETURNING id INTO v_new_review_id;

  RETURN jsonb_build_object(
    'success', true,
    'review_id', v_new_review_id,
    'is_verified', v_is_verified,
    'message', CASE 
      WHEN v_is_verified THEN 'ধন্যবাদ! আপনার ভেরিফাইড রিভিউ সফলভাবে জমা হয়েছে। এডমিন পর্যালোচনার পর এটি প্রদর্শিত হবে।'
      ELSE 'আপনার রিভিউটি সফলভাবে জমা হয়েছে। এডমিন অনুমোদনের পর ওয়েবসাইটে প্রকাশ করা হবে।'
    END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_product_review(UUID, TEXT, INT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
