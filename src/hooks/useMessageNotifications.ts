import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface MessageNotification {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_group: boolean;
}

export const useMessageNotifications = (userId: string | undefined) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize audio element
    const audio = new Audio('/sounds/msg.mp3');
    audio.preload = 'auto';
    audioRef.current = audio;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((error) => {
        console.error('Erro ao tocar som de notificação:', error);
      });
    }
  };

  const showBrowserNotification = async (senderName: string, message: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('Nova Mensagem', {
          body: `${senderName}: ${message}`,
          icon: '/pwa-192x192.png',
          badge: '/pwa-64x64.png',
          tag: 'new-message',
        });
      } catch (error) {
        console.error('Erro ao mostrar notificação do navegador:', error);
      }
    }
  };

  useEffect(() => {
    if (!userId) return;

    console.log('Iniciando listener de notificações de mensagens para usuário:', userId);

    // Subscribe to new messages where the current user is the receiver
    const channel = supabase
      .channel('message-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${userId}`,
        },
        async (payload) => {
          console.log('Nova mensagem recebida:', payload);
          
          const newMessage = payload.new as MessageNotification;

          // Don't notify for own messages
          if (newMessage.sender_id === userId) {
            return;
          }

          try {
            // Get sender profile
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', newMessage.sender_id)
              .single();

            const senderName = senderProfile?.full_name || 'Usuário';
            const messagePreview = newMessage.content 
              ? newMessage.content.substring(0, 50) + (newMessage.content.length > 50 ? '...' : '')
              : 'Nova mensagem';

            // Play sound
            playNotificationSound();

            // Show toast notification
            toast({
              title: `💬 ${senderName}`,
              description: messagePreview,
              duration: 4000,
            });

            // Show browser notification
            await showBrowserNotification(senderName, messagePreview);

          } catch (error) {
            console.error('Erro ao processar notificação de mensagem:', error);
          }
        }
      )
      .subscribe();

    // Request notification permission if not already granted
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        console.log('Permissão de notificação:', permission);
      });
    }

    return () => {
      console.log('Removendo listener de notificações de mensagens');
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { playNotificationSound };
};
