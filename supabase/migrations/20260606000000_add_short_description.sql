-- Add short_description column to products table
ALTER TABLE public.products ADD COLUMN short_description TEXT DEFAULT '';
