-- 1. Update the order items trigger function to avoid double-restoration on deletion
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
      -- ONLY restore stock if the order itself was NOT already cancelled (avoid double restoration)
      IF EXISTS (
        SELECT 1 FROM public.orders 
        WHERE id = OLD.order_id 
        AND order_status NOT IN ('cancelled', 'courier_cancelled')
      ) THEN
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
          COALESCE('অর্ডার #' || v_order_number || ' মুছে ফেলার কারণে স্টক ফেরত', 'অর্ডার আইটেম বাতিল')
        );
      END IF;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- 2. Create the order status update trigger function
CREATE OR REPLACE FUNCTION public.adjust_stock_on_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item record;
  v_stock_before integer;
  v_stock_after integer;
  v_is_old_active boolean;
  v_is_new_active boolean;
BEGIN
  -- Determine if old status was active (not cancelled)
  v_is_old_active := OLD.order_status IS NULL OR OLD.order_status NOT IN ('cancelled', 'courier_cancelled');
  -- Determine if new status is active (not cancelled)
  v_is_new_active := NEW.order_status IS NULL OR NEW.order_status NOT IN ('cancelled', 'courier_cancelled');

  -- Transition: Active -> Cancelled (restore stock)
  IF v_is_old_active AND NOT v_is_new_active THEN
    FOR v_item IN SELECT product_id, quantity FROM public.order_items WHERE order_id = NEW.id LOOP
      IF v_item.product_id IS NOT NULL THEN
        SELECT stock_quantity INTO v_stock_before FROM public.products WHERE id = v_item.product_id;
        v_stock_after := COALESCE(v_stock_before, 0) + v_item.quantity;
        
        UPDATE public.products SET stock_quantity = v_stock_after WHERE id = v_item.product_id;
        
        INSERT INTO public.inventory_log (product_id, type, quantity_change, stock_before, stock_after, note)
        VALUES (
          v_item.product_id, 
          'return', 
          v_item.quantity, 
          COALESCE(v_stock_before, 0), 
          v_stock_after, 
          'অর্ডার #' || NEW.order_number || ' বাতিল হওয়ার কারণে স্টক ফেরত'
        );
      END IF;
    END LOOP;
  -- Transition: Cancelled -> Active (deduct stock again)
  ELSIF NOT v_is_old_active AND v_is_new_active THEN
    FOR v_item IN SELECT product_id, quantity FROM public.order_items WHERE order_id = NEW.id LOOP
      IF v_item.product_id IS NOT NULL THEN
        SELECT stock_quantity INTO v_stock_before FROM public.products WHERE id = v_item.product_id;
        v_stock_after := COALESCE(v_stock_before, 0) - v_item.quantity;
        
        UPDATE public.products SET stock_quantity = v_stock_after WHERE id = v_item.product_id;
        
        INSERT INTO public.inventory_log (product_id, type, quantity_change, stock_before, stock_after, note)
        VALUES (
          v_item.product_id, 
          'sale', 
          -v_item.quantity, 
          COALESCE(v_stock_before, 0), 
          v_stock_after, 
          'অর্ডার #' || NEW.order_number || ' রিস্টোর হওয়ার কারণে স্টক বিক্রি'
        );
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop and recreate the orders update trigger
DROP TRIGGER IF EXISTS trigger_adjust_stock_on_order_status_change ON public.orders;
CREATE TRIGGER trigger_adjust_stock_on_order_status_change
AFTER UPDATE OF order_status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.adjust_stock_on_order_status_change();
