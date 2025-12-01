import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type AdminNotification = Tables<'admin_notifications'> & {
  profiles?: { full_name: string } | null;
};

type WeatherAlertNotification = Tables<'weather_alerts'> & {
  type: 'weather_alert'; // Add a type discriminator
};

export const useAdminNotifications = (adminId: string | undefined) => {
  const [notifications, setNotifications] = useState<(AdminNotification | WeatherAlertNotification)[]>([]);
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
      // Step 1: Fetch admin_notifications
      const { data: adminNotificationsData, error: adminNotificationsError } = await supabase
        .from('admin_notifications')
        .select(`*`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (adminNotificationsError) {
        console.error("[useAdminNotifications] Supabase fetch admin notifications error:", adminNotificationsError);
        throw adminNotificationsError;
      }

      // Step 2: Fetch active weather_alerts
      const { data: weatherAlertsData, error: weatherAlertsError } = await supabase
        .from('weather_alerts')
        .select(`*`)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10); // Limit weather alerts

      if (weatherAlertsError) {
        console.error("[useAdminNotifications] Supabase fetch weather alerts error:", weatherAlertsError);
        throw weatherAlertsError;
      }

      // Step 3: Manually fetch profiles for admin notifications
      const adminNotificationsWithProfiles = await Promise.all((adminNotificationsData || []).map(async (notification) => {
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

      // Combine all notifications and sort by created_at
      const combinedNotifications: (AdminNotification | WeatherAlertNotification)[] = [
        ...adminNotificationsWithProfiles,
        ...(weatherAlertsData || []).map(alert => ({ ...alert, type: 'weather_alert' as const, is_read: false })), // Weather alerts are always "unread" until resolved
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const unreadAdmin = adminNotificationsWithProfiles.filter(n => !n.is_read).length;
      const unreadWeather = weatherAlertsData?.length || 0; // All active weather alerts are considered unread for admin
      
      setNotifications(combinedNotifications);
      setUnreadCount(unreadAdmin + unreadWeather);
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

    const adminChannel = supabase
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

          setNotifications((prev) => [notificationWithProfile, ...prev].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
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
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
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

    const weatherChannel = supabase
      .channel('admin_weather_alerts_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'weather_alerts',
          filter: 'is_active=eq.true',
        },
        (payload) => {
          const newWeatherAlert = payload.new as Tables<'weather_alerts'>;
          setNotifications((prev) => [{ ...newWeatherAlert, type: 'weather_alert' as const, is_read: false }, ...prev].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
          setUnreadCount((prev) => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'weather_alerts',
          filter: 'is_active=eq.false', // Listen for deactivation
        },
        (payload) => {
          const deactivatedAlert = payload.new as Tables<'weather_alerts'>;
          setNotifications((prev) => prev.filter(n => !(n.type === 'weather_alert' && n.id === deactivatedAlert.id)).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
          setUnreadCount((prev) => Math.max(0, prev - 1)); // Decrement unread count when a weather alert is deactivated
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(adminChannel);
      supabase.removeChannel(weatherChannel);
    };
  }, [adminId, fetchNotifications]); // fetchNotifications is a stable dependency due to useCallback

  const markNotificationAsRead = async (notificationId: string, type: 'admin_notification' | 'weather_alert') => {
    if (type === 'admin_notification') {
      try {
        await supabase
          .from('admin_notifications')
          .update({ is_read: true })
          .eq('id', notificationId);
      } catch (error) {
        console.error('Error marking admin notification as read:', error);
      }
    } else if (type === 'weather_alert') {
      // Weather alerts are marked as read by deactivating them in the DB,
      // or by simply acknowledging them in the UI without changing DB state.
      // For now, we'll just update the local state to reflect it as "read" in the popover.
      setNotifications((prev) =>
        prev.map(n => n.id === notificationId && n.type === 'weather_alert' ? { ...n, is_read: true } : n)
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      // Mark all admin_notifications as read
      await supabase
        .from('admin_notifications')
        .update({ is_read: true })
        .eq('is_read', false);
      
      // For weather alerts, we just clear them from the unread count locally
      // as their "read" status is tied to their "is_active" status in DB.
      setNotifications((prev) =>
        prev.map(n => n.type === 'weather_alert' ? { ...n, is_read: true } : n)
      );

      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  return { notifications, unreadCount, loading, markNotificationAsRead, markAllNotificationsAsRead, fetchNotifications };
};