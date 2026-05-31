
-- Table for blocked IPs and phone numbers
CREATE TABLE public.blocked_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('ip', 'phone')),
  value text NOT NULL,
  reason text,
  blocked_by text DEFAULT 'Admin',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (type, value)
);

ALTER TABLE public.blocked_entities ENABLE ROW LEVEL SECURITY;

-- Admin can manage blocked entities
CREATE POLICY "Admin/Manager can manage blocked entities"
ON public.blocked_entities FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- Anyone can read blocked entities (for checkout validation)
CREATE POLICY "Anyone can read blocked entities"
ON public.blocked_entities FOR SELECT TO public
USING (true);
