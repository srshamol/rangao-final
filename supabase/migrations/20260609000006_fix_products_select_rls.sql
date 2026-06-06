-- Drop the existing SELECT policy on products if it exists
DROP POLICY IF EXISTS "Anyone can read active products" ON public.products;

-- Create the corrected SELECT policy with explicit text cast to avoid enum type mismatch 500 errors
CREATE POLICY "Anyone can read active products" ON public.products
  FOR SELECT
  USING (status::text = 'active');
