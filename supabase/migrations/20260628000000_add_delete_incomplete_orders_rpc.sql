CREATE OR REPLACE FUNCTION public.delete_incomplete_orders(
  p_id uuid,
  p_session_id text,
  p_customer_phone text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete by ID
  IF p_id IS NOT NULL THEN
    DELETE FROM public.incomplete_orders
    WHERE id = p_id
      AND status IN ('abandoned', 'contacted');
  END IF;

  -- Delete by session_id
  IF p_session_id IS NOT NULL AND p_session_id <> '' THEN
    DELETE FROM public.incomplete_orders
    WHERE session_id = p_session_id
      AND status IN ('abandoned', 'contacted');
  END IF;

  -- Delete by customer_phone
  IF p_customer_phone IS NOT NULL AND p_customer_phone <> '' THEN
    DELETE FROM public.incomplete_orders
    WHERE customer_phone = p_customer_phone
      AND status IN ('abandoned', 'contacted');
  END IF;
END;
$$;
