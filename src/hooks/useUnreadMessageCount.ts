import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string | null;
  read_at: string | null;
  is_group: boolean;
}

export const useUnreadMessageCount = (userId: string | undefined) => {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    if (!userId) {
      setUnreadCount(0);
      return;
    }
    try {
      const { count, error } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('receiver_id', userId)
        .is('read_at', null)
        .eq('is_group', false); // Only direct messages

      if (error) throw error;
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error fetching unread message count:', error);
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    fetchUnreadCount();

    if (!userId) return;

    const channel = supabase
      .channel(`unread_messages_count_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${userId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          // Only increment if it's a direct message and not from the current user
          if (!newMessage.is_group && newMessage.sender_id !== userId) {
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${userId}`,
        },
        (payload) => {
          const updatedMessage = payload.new as Message;
          const oldMessage = payload.old as Message;

          // If a message was unread and is now read, decrement count
          if (!updatedMessage.is_group && oldMessage.read_at === null && updatedMessage.read_at !== null) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const markAllMessagesAsRead = async () => {
    if (!userId) return;
    try {
      const { error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('receiver_id', userId)
        .is('read_at', null)
        .eq('is_group', false);

      if (error) throw error;
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all messages as read:', error);
    }
  };

  return { unreadCount, fetchUnreadCount, markAllMessagesAsRead };
};