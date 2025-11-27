import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type AdminNotification = Tables<'admin_notifications'> & {
  profiles?: { full_name: string } | null;
};

export const useAdminNotifications = (adminId: string | undefined) => {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    console.log("[useAdminNotifications] fetchNotifications called. adminId:", adminId);
    if (!adminId) {
      console.log("[useAdminNotifications] No adminId, skipping fetch.");
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_notifications')
        .select(`*, profiles(full_name)`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error("[useAdminNotifications] Supabase fetch error:", error);
        throw error;
      }

      const unread = (data || []).filter(n => !n.is_read).length;
      setNotifications(data || []);
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error fetching admin notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [adminId]); // fetchNotifications só muda se adminId mudar

  useEffect(() => {
    // Chamada inicial quando adminId está disponível ou muda
    if (adminId) {
      fetchNotifications();
    }

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
          // Buscar perfil para a nova notificação
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
        async (payload) => {
          const updatedNotification = payload.new as AdminNotification;
          const oldNotification = payload.old as AdminNotification;

          // Re-buscar perfil para notificação atualizada caso o nome completo tenha mudado ou estivesse faltando
          let profileData = null;
          if (updatedNotification.user_id) {
            const { data: fetchedProfile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', updatedNotification.user_id)
              .single();
            profileData = fetchedProfile;
          }

          setNotifications((prev) =>
            prev.map(n => n.id === updatedNotification.id ? { ...n, ...updatedNotification, profiles: profileData } : n)
          );

          // Ajustar contagem de não lidas
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
  }, [adminId, fetchNotifications]); // fetchNotifications é uma dependência estável devido ao useCallback

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