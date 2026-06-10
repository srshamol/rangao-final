-- Create/Replace a trigger function to adjust stock quantity and record logs in inventory_log when order items are placed or cancelled/deleted.
CREATE OR REPLACE FUNCTION public.adjust_product_stock_on_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stock_before integer;
  v_stock_after integer;
  v_order_number text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.product_id IS NOT NULL THEN
      -- Get stock before update
      SELECT stock_quantity INTO v_stock_before FROM public.products WHERE id = NEW.product_id;
      
      -- Calculate stock after update
      v_stock_after := COALESCE(v_stock_before, 0) - NEW.quantity;
      
      -- Update product stock
      UPDATE public.products
      SET stock_quantity = v_stock_after
      WHERE id = NEW.product_id;
      
      -- Fetch order number for context
      SELECT order_number INTO v_order_number FROM public.orders WHERE id = NEW.order_id;
      
      -- Insert log
      INSERT INTO public.inventory_log (product_id, type, quantity_change, stock_before, stock_after, note)
      VALUES (
        NEW.product_id, 
        'sale', 
        -NEW.quantity, 
        COALESCE(v_stock_before, 0), 
        v_stock_after, 
        COALESCE('অর্ডার #' || v_order_number || ' এর মাধ্যমে বিক্রি', 'অর্ডার বিক্রয়')
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.product_id IS NOT NULL THEN
      -- Get current stock before update
      SELECT stock_quantity INTO v_stock_before FROM public.products WHERE id = OLD.product_id;
      
      -- Calculate stock after update
      v_stock_after := COALESCE(v_stock_before, 0) + OLD.quantity;
      
      -- Update product stock
      UPDATE public.products
      SET stock_quantity = v_stock_after
      WHERE id = OLD.product_id;
      
      -- Fetch order number for context
      SELECT order_number INTO v_order_number FROM public.orders WHERE id = OLD.order_id;
      
      -- Insert log
      INSERT INTO public.inventory_log (product_id, type, quantity_change, stock_before, stock_after, note)
      VALUES (
        OLD.product_id, 
        'return', 
        OLD.quantity, 
        COALESCE(v_stock_before, 0), 
        v_stock_after, 
        COALESCE('অর্ডার #' || v_order_number || ' বাতিল/মুছে ফেলার কারণে স্টক ফেরত', 'অর্ডার আইটেম বাতিল')
      );
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;
