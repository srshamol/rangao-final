-- Recreate incomplete_orders_converted_order_id_fkey with ON DELETE SET NULL
-- This prevents foreign key constraint violations when deleting parent orders

ALTER TABLE public.incomplete_orders 
  DROP CONSTRAINT IF EXISTS incomplete_orders_converted_order_id_fkey;

ALTER TABLE public.incomplete_orders 
  ADD CONSTRAINT incomplete_orders_converted_order_id_fkey 
  FOREIGN KEY (converted_order_id) 
  REFERENCES public.orders(id) 
  ON DELETE SET NULL;
