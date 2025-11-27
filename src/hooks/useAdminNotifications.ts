import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type AdminNotification = Tables<'admin_notifications'> & {
  profiles?: { full_name: string } | null;
};

export const useAdminNotifications = (adminId: string | undefined) => {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!adminId) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_notifications')
        .select(`
          *,
          profiles(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(20); // Limit to recent notifications

      if (error) throw error;

      const unread = (data || []).filter(n => !n.is_read).length;
      setNotifications(data || []);
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error fetching admin notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    if (!adminId) return;

    const channel = supabase
      .channel(`admin_notifications_channel`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_notifications',
        },
        async (payload) => {
          const newNotification = payload.new as AdminNotification;
          // Fetch profile for the new notification
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', newNotification.user_id)
            .single();
          
          const notificationWithProfile = {
            ...newNotification,
            profiles: profileData,
          };

          setNotifications((prev) => [notificationWithProfile, ...prev]);
          if (!newNotification.is_read) {
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'admin_notifications',
        },
        (payload) => {
          const updatedNotification = payload.new as AdminNotification;
          const oldNotification = payload.old as AdminNotification;

          setNotifications((prev) =>
            prev.map(n => n.id === updatedNotification.id ? { ...n, ...updatedNotification } : n)
          );

          // Adjust unread count
          if (oldNotification.is_read && !updatedNotification.is_read) {
            setUnreadCount((prev) => prev + 1);
          } else if (!oldNotification.is_read && updatedNotification.is_read) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [adminId]);

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('admin_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      await supabase
        .from('admin_notifications')
        .update({ is_read: true })
        .eq('is_read', false);
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  return { notifications, unreadCount, loading, markNotificationAsRead, markAllNotificationsAsRead, fetchNotifications };
};