-- Add tracking columns to orders table to improve Meta Conversions API (CAPI) Event Match Quality
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS fbp TEXT,
ADD COLUMN IF NOT EXISTS fbc TEXT;
