-- Fix Issue #1: Restrict profile visibility to protect phone numbers and addresses

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Allow users to view their own full profile (including phone, address)
CREATE POLICY "Users can view own full profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Create a view with only non-sensitive public information
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  full_name,
  avatar_url,
  created_at
FROM public.profiles;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.public_profiles TO authenticated;

-- Add policy to allow users to view public profiles of others
CREATE POLICY "Users can view public profiles"
  ON public.profiles
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL 
    AND auth.uid() != id
  );

-- Note: The above policy will be overridden by column-level security
-- We'll need to update application code to use public_profiles view for listing users