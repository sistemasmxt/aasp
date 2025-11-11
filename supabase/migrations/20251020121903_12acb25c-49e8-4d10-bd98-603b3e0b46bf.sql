-- Fix infinite recursion in group_members RLS policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can view all group memberships" ON public.group_members;
DROP POLICY IF EXISTS "Members can view group membership" ON public.group_members;
DROP POLICY IF EXISTS "Admins can add group members" ON public.group_members;
DROP POLICY IF EXISTS "Admins can remove group members" ON public.group_members;
DROP POLICY IF EXISTS "Members can leave groups" ON public.group_members;

-- Recreate policies using the has_role security definer function
CREATE POLICY "Admins can view all group memberships" 
ON public.group_members 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Members can view group membership" 
ON public.group_members 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.group_members gm 
    WHERE gm.group_id = group_members.group_id 
    AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can add group members" 
ON public.group_members 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can remove group members" 
ON public.group_members 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Members can leave groups" 
ON public.group_members 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create admin_logs table for audit trail
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on admin_logs
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view logs
CREATE POLICY "Admins can view all logs" 
ON public.admin_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- Only admins can insert logs
CREATE POLICY "Admins can insert logs" 
ON public.admin_logs 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create index for better performance
CREATE INDEX idx_admin_logs_user_id ON public.admin_logs(user_id);
CREATE INDEX idx_admin_logs_created_at ON public.admin_logs(created_at DESC);