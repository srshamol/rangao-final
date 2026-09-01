-- Add variations and paired products columns to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS has_variants BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS variation_options JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS paired_product_ids JSONB DEFAULT '[]'::jsonb;
