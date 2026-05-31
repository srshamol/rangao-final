-- Create media_library table
CREATE TABLE IF NOT EXISTS public.media_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    file_path TEXT,
    bucket_name TEXT DEFAULT 'uploads',
    mime_type TEXT,
    file_size BIGINT,
    source TEXT DEFAULT 'upload',
    metadata JSONB DEFAULT '{}'::jsonb,
    uploaded_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;

-- Policies for media_library table
DROP POLICY IF EXISTS "Admins and Managers can perform all actions" ON public.media_library;
CREATE POLICY "Admins and Managers can perform all actions" 
ON public.media_library
FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Public read-only access" ON public.media_library;
CREATE POLICY "Public read-only access"
ON public.media_library
FOR SELECT
TO anon
USING (true);
