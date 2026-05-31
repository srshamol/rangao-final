DO $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Check if user already exists
  SELECT id INTO new_user_id FROM auth.users WHERE email = 'bdinfosky@gmail.com';

  -- If user does not exist, insert them
  IF new_user_id IS NULL THEN
    new_user_id := gen_random_uuid();
    
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      new_user_id,
      'authenticated',
      'authenticated',
      'bdinfosky@gmail.com',
      extensions.crypt('11223311', extensions.gen_salt('bf')),
      now(),
      NULL,
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  END IF;

  -- Ensure the 'admin' role exists for this user in public.user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new_user_id, 'admin'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;
