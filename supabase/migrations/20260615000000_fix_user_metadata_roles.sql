-- Fix user roles metadata mismatch in auth.users
-- This ensures that users have their correct app role claim ('admin') synced to their auth token.

-- 1. Sync all active roles from public.user_roles to auth.users.raw_app_meta_data
UPDATE auth.users u
SET raw_app_meta_data = COALESCE(u.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', r.role::text)
FROM public.user_roles r
WHERE u.id = r.user_id;

-- 2. Explicitly force the admin email to have the 'admin' role in metadata
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
WHERE email = 'bdinfosky@gmail.com';
