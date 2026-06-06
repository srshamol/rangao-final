-- Create delete_user_by_admin function to allow admins to delete customer accounts from auth.users
CREATE OR REPLACE FUNCTION public.delete_user_by_admin(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Verify the executing user has the 'admin' role
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can delete users';
  END IF;

  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;
