-- Add is_free_delivery column to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_free_delivery BOOLEAN DEFAULT false;
