-- Add DELETE policy on customer_activities table for Admins and Managers
DROP POLICY IF EXISTS "Admin/Manager can delete customer activities" ON public.customer_activities;
CREATE POLICY "Admin/Manager can delete customer activities" ON public.customer_activities
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role) OR 
    public.has_role(auth.uid(), 'manager'::public.app_role)
  );
