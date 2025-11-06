-- Create a security definer function to check group membership without recursion
CREATE OR REPLACE FUNCTION public.is_group_member(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members
    WHERE user_id = _user_id
      AND group_id = _group_id
  );
$$;

-- Drop and recreate the RLS policy for group_members to use the new function
DROP POLICY IF EXISTS "Members can view group membership" ON public.group_members;

CREATE POLICY "Members can view group membership" 
ON public.group_members
FOR SELECT
USING (public.is_group_member(auth.uid(), group_members.group_id));

-- Update messages policies to use the is_group_member function

-- SELECT policy for group messages
DROP POLICY IF EXISTS "Users can view group messages if member" ON public.messages;

CREATE POLICY "Users can view group messages if member" 
ON public.messages
FOR SELECT
USING (
  is_group = true
  AND group_id IS NOT NULL
  AND public.is_group_member(auth.uid(), group_id)
);

-- INSERT policy for group messages
DROP POLICY IF EXISTS "Members can send group messages" ON public.messages;

CREATE POLICY "Members can send group messages" 
ON public.messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND is_group = true
  AND group_id IS NOT NULL
  AND public.is_group_member(auth.uid(), group_id)
);

-- UPDATE policy for group messages
DROP POLICY IF EXISTS "Group members can update message status" ON public.messages;

CREATE POLICY "Group members can update message status" 
ON public.messages
FOR UPDATE
USING (
  is_group = true
  AND group_id IS NOT NULL
  AND public.is_group_member(auth.uid(), group_id)
)
WITH CHECK (
  is_group = true
  AND group_id IS NOT NULL
  AND public.is_group_member(auth.uid(), group_id)
);