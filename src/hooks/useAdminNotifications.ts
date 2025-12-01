import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type AdminNotification = Tables<'admin_notifications'> & {
  profiles?: { full_name: string } | null;
};

type WeatherAlert = Tables<'weather_alerts'>;

export const useAdminNotifications = (adminId: string | undefined) => {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [weatherAlerts, setWeatherAlerts] = useState<WeatherAlert[]>([]); // New state for weather alerts
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    console.log("[useAdminNotifications] fetchNotifications called. adminId:", adminId);
    if (!adminId) {
      console.log("[useAdminNotifications] No adminId, skipping fetch.");
      setNotifications([]);
      setWeatherAlerts([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Step 1: Fetch admin_notifications without joining profiles
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('admin_notifications')
        .select(`*`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (notificationsError) {
        console.error("[useAdminNotifications] Supabase fetch notifications error:", notificationsError);
        throw notificationsError;
      }

      // Step 2: Manually fetch profiles for each notification
      const notificationsWithProfiles = await Promise.all((notificationsData || []).map(async (notification) => {
        let profileData = null;
        if (notification.user_id) {
          const { data: fetchedProfile, error: profileError } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', notification.user_id)
            .single();
          
          if (profileError) {
            console.warn(`[useAdminNotifications] Error fetching profile for user_id ${notification.user_id}:`, profileError);
          }
          profileData = fetchedProfile;
        }
        return {
          ...notification,
          profiles: profileData,
        };
      }));

      // Step 3: Fetch active weather alerts
      const { data: weatherAlertsData, error: weatherAlertsError } = await supabase
        .from('weather_alerts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5); // Limit to a few recent active alerts

      if (weatherAlertsError) {
        console.error("[useAdminNotifications] Supabase fetch weather alerts error:", weatherAlertsError);
        throw weatherAlertsError;
      }

      const unreadAdminNotifications = notificationsWithProfiles.filter(n => !n.is_read).length;
      const totalUnread = unreadAdminNotifications + (weatherAlertsData?.length || 0); // Weather alerts are always considered 'new' until resolved

      setNotifications(notificationsWithProfiles);
      setWeatherAlerts(weatherAlertsData || []);
      setUnreadCount(totalUnread);
    } catch (error) {
      console.error('Error fetching admin notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [adminId]); // fetchNotifications only changes if adminId changes

  useEffect(() => {
    // Initial call when adminId is available or changes
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
          const newNotification = payload.new as Tables<'admin_notifications'>;
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
        async (payload) => {
          const updatedNotification = payload.new as Tables<'admin_notifications'>;
          const oldNotification = payload.old as Tables<'admin_notifications'>;

          // Re-fetch profile for updated notification in case full_name changed or was missing
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

          // Adjust unread count
          if (oldNotification.is_read && !updatedNotification.is_read) {
            setUnreadCount((prev) => prev + 1);
          } else if (!oldNotification.is_read && updatedNotification.is_read) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .on( // New listener for weather alerts
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'weather_alerts',
        },
        (payload) => {
          const newAlert = payload.new as WeatherAlert;
          setWeatherAlerts((prev) => [newAlert, ...prev]);
          setUnreadCount((prev) => prev + 1); // Increment unread count for new weather alert
        }
      )
      .on( // New listener for weather alerts updates (e.g., becoming inactive)
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'weather_alerts',
        },
        (payload) => {
          const updatedAlert = payload.new as WeatherAlert;
          const oldAlert = payload.old as WeatherAlert;

          setWeatherAlerts((prev) =>
            prev.map((alert) => (alert.id === updatedAlert.id ? updatedAlert : alert))
          );

          // If an active alert becomes inactive, decrement unread count
          if (oldAlert.is_active && !updatedAlert.is_active) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [adminId, fetchNotifications]); // fetchNotifications is a stable dependency due to useCallback

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
      // Mark admin_notifications as read
      await supabase
        .from('admin_notifications')
        .update({ is_read: true })
        .eq('is_read', false);
      
      // Mark weather_alerts as inactive (or handle as 'read' for admin)
      // For weather alerts, 'marking as read' usually means resolving them or acknowledging them.
      // For simplicity here, we'll just update the unread count.
      // A more robust solution might involve a separate 'admin_read_weather_alerts' table.
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  return { notifications, weatherAlerts, unreadCount, loading, markNotificationAsRead, markAllNotificationsAsRead, fetchNotifications };
};