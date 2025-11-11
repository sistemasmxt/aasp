-- Fix chat messages RLS to allow authenticated users to send messages
-- This allows users who are logged in locally (sessionStorage) but not necessarily in Supabase auth

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can send direct messages" ON public.messages;
DROP POLICY IF EXISTS "Members can send group messages" ON public.messages;

-- Create more permissive policies for message insertion
-- Allow any user who exists in the profiles table to send messages
CREATE POLICY "Authenticated users can send direct messages"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    sender_id IN (SELECT id FROM public.profiles)
    AND is_group = false
  );

CREATE POLICY "Authenticated users can send group messages"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    sender_id IN (SELECT id FROM public.profiles)
    AND is_group = true
    AND group_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = messages.group_id
        AND group_members.user_id = messages.sender_id
    )
  );
