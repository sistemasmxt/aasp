-- Fix the security definer view issue by recreating as SECURITY INVOKER

DROP VIEW IF EXISTS public.public_profiles;

-- Create view without SECURITY DEFINER (defaults to SECURITY INVOKER)
CREATE VIEW public.public_profiles 
WITH (security_invoker=true)
AS
SELECT 
  id,
  full_name,
  avatar_url,
  created_at
FROM public.profiles
WHERE auth.uid() IS NOT NULL;

-- Grant access to authenticated users
GRANT SELECT ON public.public_profiles TO authenticated;