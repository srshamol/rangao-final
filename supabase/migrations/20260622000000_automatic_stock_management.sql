-- Create a trigger function to adjust stock quantity when order items are placed or cancelled/deleted.
CREATE OR REPLACE FUNCTION public.adjust_product_stock_on_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.product_id IS NOT NULL THEN
      UPDATE public.products
      SET stock_quantity = stock_quantity - NEW.quantity
      WHERE id = NEW.product_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.product_id IS NOT NULL THEN
      UPDATE public.products
      SET stock_quantity = stock_quantity + OLD.quantity
      WHERE id = OLD.product_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Drop trigger if it already exists
DROP TRIGGER IF EXISTS trigger_adjust_product_stock ON public.order_items;

-- Bind the trigger to order_items
CREATE TRIGGER trigger_adjust_product_stock
AFTER INSERT OR DELETE ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.adjust_product_stock_on_order();
