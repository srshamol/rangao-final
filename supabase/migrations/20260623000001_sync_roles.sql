-- Force sync metadata in a separate transaction to avoid unsafe enum use error
UPDATE public.user_roles 
SET role = role;
