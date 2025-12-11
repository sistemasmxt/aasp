import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type WeatherAlert = Tables<'weather_alerts'>;

interface AdminNotification {
  id: string;
  user_id: string | null;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
  profiles?: { full_name: string } | null;
}

export const useAdminNotifications = (adminId: string | undefined) => {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [weatherAlerts, setWeatherAlerts] = useState<WeatherAlert[]>([]);
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
      // Fetch active weather alerts as notifications
      const { data: weatherAlertsData, error: weatherAlertsError } = await supabase
        .from('weather_alerts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5);

      if (weatherAlertsError) {
        console.error("[useAdminNotifications] Supabase fetch weather alerts error:", weatherAlertsError);
        throw weatherAlertsError;
      }

      const totalUnread = weatherAlertsData?.length || 0;

      setNotifications([]);
      setWeatherAlerts(weatherAlertsData || []);
      setUnreadCount(totalUnread);
    } catch (error) {
      console.error('Error fetching admin notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [adminId]);

  useEffect(() => {
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
          table: 'weather_alerts',
        },
        (payload) => {
          const newAlert = payload.new as WeatherAlert;
          setWeatherAlerts((prev) => [newAlert, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .on(
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

          if (oldAlert.is_active && !updatedAlert.is_active) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [adminId, fetchNotifications]);

  const markNotificationAsRead = async (notificationId: string) => {
    // No-op since we removed admin_notifications table
    console.log('markNotificationAsRead called for:', notificationId);
  };

  const markAllNotificationsAsRead = async () => {
    setUnreadCount(0);
  };

  return { notifications, weatherAlerts, unreadCount, loading, markNotificationAsRead, markAllNotificationsAsRead, fetchNotifications };
};
