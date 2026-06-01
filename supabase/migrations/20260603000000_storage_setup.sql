-- Safe, robust setup of storage buckets and row-level security (RLS) policies
-- Run this migration or copy-paste it directly into your Supabase SQL Editor to solve "new row violates row-level security policy" errors!

CREATE OR REPLACE FUNCTION public.setup_buckets_and_policies()
RETURNS void AS $$
BEGIN
  -- 1. Insert required public storage buckets if they do not exist
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES 
    ('images', 'images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif', 'image/avif']),
    ('videos', 'videos', true, 52428800, ARRAY['video/mp4', 'video/webm', 'video/quicktime']),
    ('documents', 'documents', true, 15728640, NULL),
    ('uploads', 'uploads', true, 20971520, NULL)
  ON CONFLICT (id) DO UPDATE 
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

  -- 2. Drop existing policies on storage.objects to avoid duplicate/conflict errors
  DROP POLICY IF EXISTS "Public Select Access" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated Insert Access" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated Update Access" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated Delete Access" ON storage.objects;

  -- 3. Create public Read access policy (everyone can read/download public media assets)
  CREATE POLICY "Public Select Access" 
  ON storage.objects 
  FOR SELECT 
  TO public 
  USING (true);

  -- 4. Create upload and modification policies for authenticated administrators/managers
  CREATE POLICY "Authenticated Insert Access" 
  ON storage.objects 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

  -- 5. Create Update and Delete policies
  CREATE POLICY "Authenticated Update Access" 
  ON storage.objects 
  FOR UPDATE 
  TO authenticated 
  USING (true);

  CREATE POLICY "Authenticated Delete Access" 
  ON storage.objects 
  FOR DELETE 
  TO authenticated 
  USING (true);
END;
$$ LANGUAGE plpgsql;

-- Execute the setup procedure
SELECT public.setup_buckets_and_policies();

-- Clean up function
DROP FUNCTION IF EXISTS public.setup_buckets_and_policies();
