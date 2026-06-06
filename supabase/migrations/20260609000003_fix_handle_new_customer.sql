-- Update handle_new_customer trigger function to include phone number
CREATE OR REPLACE FUNCTION public.handle_new_customer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.customer_profiles (user_id, email, full_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  RETURN NEW;
END;
$$;

-- Backfill phone numbers for existing customer profiles from auth.users metadata
UPDATE public.customer_profiles cp
SET phone = COALESCE(u.raw_user_meta_data->>'phone', '')
FROM auth.users u
WHERE cp.user_id = u.id AND (cp.phone IS NULL OR cp.phone = '');
