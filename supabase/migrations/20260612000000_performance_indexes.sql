-- ==========================================================
-- Database Indexes for Query Optimization
-- ==========================================================

-- 1. Index on products status and created_at to speed up active products sorting and listing
CREATE INDEX IF NOT EXISTS idx_products_status_created_at 
  ON public.products (status, created_at DESC);

-- 2. Index on products category and status for fast category-based filtering
CREATE INDEX IF NOT EXISTS idx_products_category_status 
  ON public.products (category, status);

-- 3. Index on orders user_id and created_at for fast order history loading
CREATE INDEX IF NOT EXISTS idx_orders_user_id_created_at 
  ON public.orders (user_id, created_at DESC);

-- 4. Index on testimonials (reviews) product_id and created_at for fast reviews loading
CREATE INDEX IF NOT EXISTS idx_testimonials_product_id_created_at 
  ON public.testimonials (product_id, created_at DESC);
