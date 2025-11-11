import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useEmergencyAlerts = (userId?: string) => {
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio on mount
  useEffect(() => {
    audioRef.current = new Audio('/sounds/alerta.mp3');
    audioRef.current.volume = 0.8; // Set volume to 80%

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Play alert sound
  const playAlertSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0; // Reset to beginning
      audioRef.current.play().catch(error => {
        console.warn('Could not play alert sound:', error);
      });
    }
  };

  // Subscribe to emergency alerts
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('emergency_alerts_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'emergency_alerts',
        },
        async (payload) => {
          const alert = payload.new;

          // Don't notify the user who sent the alert
          if (alert.user_id === userId) return;

          try {
            // Get the profile of the user who sent the alert
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', alert.user_id)
              .single();

            const userName = profile?.full_name || 'Usuário';

            // Play alert sound
            playAlertSound();

            // Show notification with user name
            toast({
              title: "🚨 ALERTA SOS DE EMERGÊNCIA!",
              description: `${userName} ativou um alerta de emergência!`,
              variant: "destructive",
              duration: 10000, // Show for 10 seconds
            });

            // Also show a browser notification if permission granted
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('🚨 ALERTA SOS DE EMERGÊNCIA!', {
                body: `${userName} ativou um alerta de emergência!`,
                icon: '/favicon.ico',
                tag: 'emergency-alert'
              });
            }
          } catch (error) {
            console.error('Error handling emergency alert notification:', error);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, toast]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return { playAlertSound };
};
