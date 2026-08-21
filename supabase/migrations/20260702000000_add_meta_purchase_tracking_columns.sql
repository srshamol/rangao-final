-- Add Meta CAPI purchase tracking idempotency & attribution columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS meta_purchase_event_id TEXT,
ADD COLUMN IF NOT EXISTS meta_purchase_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS meta_purchase_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS meta_purchase_last_error TEXT,
ADD COLUMN IF NOT EXISTS fbclid TEXT,
ADD COLUMN IF NOT EXISTS utm_source TEXT,
ADD COLUMN IF NOT EXISTS utm_medium TEXT,
ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
ADD COLUMN IF NOT EXISTS utm_content TEXT,
ADD COLUMN IF NOT EXISTS utm_term TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_meta_purchase_event_id ON public.orders(meta_purchase_event_id);
CREATE INDEX IF NOT EXISTS idx_orders_meta_purchase_status ON public.orders(meta_purchase_status);
