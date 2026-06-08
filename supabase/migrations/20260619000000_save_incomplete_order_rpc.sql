CREATE OR REPLACE FUNCTION public.save_incomplete_order(
  p_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_product_info jsonb,
  p_page_source text,
  p_form_data jsonb,
  p_session_id text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_id IS NOT NULL THEN
    UPDATE public.incomplete_orders
    SET
      customer_name = p_customer_name,
      customer_phone = p_customer_phone,
      customer_email = p_customer_email,
      product_info = p_product_info,
      page_source = p_page_source,
      form_data = p_form_data,
      session_id = p_session_id,
      updated_at = now()
    WHERE id = p_id
    RETURNING id INTO v_id;
  ELSE
    INSERT INTO public.incomplete_orders (
      customer_name,
      customer_phone,
      customer_email,
      product_info,
      page_source,
      form_data,
      session_id,
      status
    )
    VALUES (
      p_customer_name,
      p_customer_phone,
      p_customer_email,
      p_product_info,
      p_page_source,
      p_form_data,
      p_session_id,
      'abandoned'
    )
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;
