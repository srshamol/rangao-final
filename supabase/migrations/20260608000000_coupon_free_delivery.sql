-- Add 'free_delivery' value to discount_type enum
ALTER TYPE public.discount_type ADD VALUE 'free_delivery';

-- Add discount_amount and coupon_code columns to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;
