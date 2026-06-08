-- Fix role keyword collision in trigger function
-- Resolves keyword collision where the un-aliased 'role' keyword gets evaluated as the DB system role 'postgres'

CREATE OR REPLACE FUNCTION public.sync_user_role_to_metadata()
RETURNS TRIGGER SECURITY DEFINER AS $$
DECLARE
  current_role TEXT;
  target_user_id UUID;
BEGIN
  target_user_id := COALESCE(NEW.user_id, OLD.user_id);
  
  -- Select the highest ranking role for the user with explicit table alias 'ur'
  SELECT ur.role::TEXT INTO current_role 
  FROM public.user_roles ur
  WHERE ur.user_id = target_user_id
  ORDER BY 
    CASE ur.role 
      WHEN 'admin' THEN 1
      WHEN 'manager' THEN 2
      WHEN 'editor' THEN 3
      WHEN 'sales' THEN 4
      WHEN 'marketing' THEN 5
      ELSE 6 
    END
  LIMIT 1;

  IF current_role IS NULL THEN
    -- Remove role claim if no roles remain
    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) - 'role'
    WHERE id = target_user_id;
  ELSE
    -- Set role claim in app_metadata
    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', current_role)
    WHERE id = target_user_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Retroactively force trigger execution to update the metadata from 'postgres' to 'admin'
UPDATE public.user_roles 
SET role = role;
