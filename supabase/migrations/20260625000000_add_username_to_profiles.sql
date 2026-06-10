-- Add username column to customer_profiles if it doesn't exist
ALTER TABLE public.customer_profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- Create function to securely resolve email by username
CREATE OR REPLACE FUNCTION public.resolve_email_by_username(p_username text)
RETURNS text
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_email text;
BEGIN
  SELECT cp.email INTO v_email
  FROM public.customer_profiles cp
  JOIN public.user_roles ur ON ur.user_id = cp.user_id
  WHERE lower(cp.username) = lower(p_username)
  LIMIT 1;

  RETURN v_email;
END;
$$;
