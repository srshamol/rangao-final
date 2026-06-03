-- Add product_id column to testimonials to link reviews to specific products
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE CASCADE;

-- Add insert policy for anyone (public) to submit reviews/testimonials
DROP POLICY IF EXISTS "Anyone can insert testimonials" ON public.testimonials;
CREATE POLICY "Anyone can insert testimonials" ON public.testimonials
  FOR INSERT WITH CHECK (true);
