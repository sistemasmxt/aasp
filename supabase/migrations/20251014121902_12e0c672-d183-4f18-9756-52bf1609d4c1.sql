-- Create groups table for proper group management
CREATE TABLE public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create group_members table to track group membership
CREATE TABLE public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at timestamp with time zone DEFAULT now() NOT NULL,
  role text DEFAULT 'member' NOT NULL,
  UNIQUE (group_id, user_id)
);

-- Enable RLS on new tables
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Add group_id column to messages table
ALTER TABLE public.messages ADD COLUMN group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL;

-- Create index for better performance on group membership checks
CREATE INDEX idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX idx_messages_group_id ON public.messages(group_id);

-- Drop the existing vulnerable policy
DROP POLICY "Users can view their messages" ON public.messages;

-- Create separate policies for direct messages and group messages
CREATE POLICY "Users can view their direct messages"
  ON public.messages
  FOR SELECT
  USING (
    (auth.uid() = sender_id OR auth.uid() = receiver_id)
    AND is_group = false
  );

CREATE POLICY "Users can view group messages if member"
  ON public.messages
  FOR SELECT
  USING (
    is_group = true
    AND group_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = messages.group_id
        AND group_members.user_id = auth.uid()
    )
  );

-- RLS policies for groups table
CREATE POLICY "Members can view their groups"
  ON public.groups
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = groups.id
        AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can create groups"
  ON public.groups
  FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Group creators and admins can update groups"
  ON public.groups
  FOR UPDATE
  USING (
    auth.uid() = created_by
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    auth.uid() = created_by
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can delete groups"
  ON public.groups
  FOR DELETE
  USING (
    public.has_role(auth.uid(), 'admin')
  );

-- RLS policies for group_members table
CREATE POLICY "Members can view group membership"
  ON public.group_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_members.group_id
        AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can add group members"
  ON public.group_members
  FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can remove group members"
  ON public.group_members
  FOR DELETE
  USING (
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Members can leave groups"
  ON public.group_members
  FOR DELETE
  USING (
    auth.uid() = user_id
  );

-- Update trigger for groups table
CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update the INSERT policy for messages to require group_id for group messages
DROP POLICY "Users can send messages" ON public.messages;

CREATE POLICY "Users can send direct messages"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND is_group = false
  );

CREATE POLICY "Members can send group messages"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND is_group = true
    AND group_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = messages.group_id
        AND group_members.user_id = auth.uid()
    )
  );