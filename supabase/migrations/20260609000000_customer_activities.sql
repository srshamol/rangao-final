-- Create customer_activities table to log registration and logins
CREATE TABLE IF NOT EXISTS public.customer_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text,
  phone text,
  activity_type text NOT NULL, -- 'registration' or 'login'
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customer_activities ENABLE ROW LEVEL SECURITY;

-- Allow public insert
CREATE POLICY "Anyone can insert customer activities" ON public.customer_activities FOR INSERT WITH CHECK (true);

-- Allow admins/managers to view
CREATE POLICY "Admin/Manager can view customer activities" ON public.customer_activities FOR SELECT USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
);
