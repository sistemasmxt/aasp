-- Create app_role enum for role-based access control
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table to manage user permissions
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create security definer function to check roles safely
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Add INSERT policy for payments - only admins can create payment records
CREATE POLICY "Only admins can create payments"
  ON public.payments
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add UPDATE policy for payments - only admins can modify payment records
CREATE POLICY "Only admins can update payments"
  ON public.payments
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add DELETE policy for payments - only admins can delete payment records
CREATE POLICY "Only admins can delete payments"
  ON public.payments
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Add INSERT policy for cameras - only admins can add cameras
CREATE POLICY "Only admins can create cameras"
  ON public.cameras
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add UPDATE policy for cameras - only admins can modify cameras
CREATE POLICY "Only admins can update cameras"
  ON public.cameras
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add DELETE policy for cameras - only admins can delete cameras
CREATE POLICY "Only admins can delete cameras"
  ON public.cameras
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Add DELETE policy for attachments - users can delete their own message attachments
CREATE POLICY "Users can delete their own attachments"
  ON public.attachments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.messages
      WHERE messages.id = attachments.message_id
        AND messages.sender_id = auth.uid()
    )
  );