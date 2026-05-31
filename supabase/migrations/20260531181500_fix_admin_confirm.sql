-- Update the admin user to ensure all confirmation columns are set correctly
UPDATE auth.users 
SET email_confirmed_at = now(), 
    confirmed_at = now(),
    last_sign_in_at = now()
WHERE email = 'bdinfosky@gmail.com';

-- Ensure the role is assigned correctly
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email = 'bdinfosky@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
