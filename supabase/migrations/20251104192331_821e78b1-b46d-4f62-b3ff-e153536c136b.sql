-- Add read receipts columns to messages table
ALTER TABLE public.messages 
ADD COLUMN delivered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN read_at TIMESTAMP WITH TIME ZONE;

-- Create index for performance on read/delivered queries
CREATE INDEX idx_messages_delivered_at ON public.messages(delivered_at);
CREATE INDEX idx_messages_read_at ON public.messages(read_at);

-- Add RLS policy for updating message status (delivered/read)
CREATE POLICY "Users can update message status for received messages"
ON public.messages
FOR UPDATE
USING (
  auth.uid() = receiver_id AND 
  is_group = false
)
WITH CHECK (
  auth.uid() = receiver_id AND 
  is_group = false
);

-- Add RLS policy for group message status updates
CREATE POLICY "Group members can update message status"
ON public.messages
FOR UPDATE
USING (
  is_group = true AND 
  group_id IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM group_members 
    WHERE group_members.group_id = messages.group_id 
    AND group_members.user_id = auth.uid()
  )
)
WITH CHECK (
  is_group = true AND 
  group_id IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM group_members 
    WHERE group_members.group_id = messages.group_id 
    AND group_members.user_id = auth.uid()
  )
);

COMMENT ON COLUMN public.messages.delivered_at IS 'Timestamp when message was delivered to recipient';
COMMENT ON COLUMN public.messages.read_at IS 'Timestamp when message was read by recipient';