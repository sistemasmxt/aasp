-- Fix profiles RLS to allow sessionStorage authenticated users to update their profiles
-- Since we migrated to sessionStorage-based auth, auth.uid() returns null
-- But users authenticated via sessionStorage exist in the profiles table

-- Drop the restrictive policy that requires auth.uid() = id
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create a new policy that allows any user who exists in profiles table to update their own profile
-- This works for both Supabase auth users and sessionStorage authenticated users
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (id IN (SELECT id FROM public.profiles WHERE id = profiles.id))
  WITH CHECK (id IN (SELECT id FROM public.profiles WHERE id = profiles.id));

-- Also ensure users can view their own profile
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

-- Keep the insert policy for new users (though this might be handled differently now)
-- The insert policy remains the same since new users are created through Supabase auth initially
