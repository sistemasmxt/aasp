import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Check, CheckCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { mapErrorToUserMessage } from "@/lib/errorHandler";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string | null;
  content: string | null;
  message_type: string;
  is_group: boolean; // Keep is_group, but it will always be false for direct messages
  created_at: string;
  delivered_at: string | null;
  read_at: string | null;
}

interface ChatMessagesProps {
  currentUserId: string;
  recipientId: string;
  recipientProfile: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export const ChatMessages = ({ currentUserId, recipientId, recipientProfile }: ChatMessagesProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Mark messages as read when viewing
  useEffect(() => {
    const markAsRead = async () => {
      const unreadMessages = messages.filter(
        m => m.receiver_id === currentUserId &&
        m.sender_id === recipientId &&
        !m.read_at
      );

      if (unreadMessages.length > 0) {
        const messageIds = unreadMessages.map(m => m.id);
        await supabase
          .from("messages")
          .update({ read_at: new Date().toISOString() })
          .in("id", messageIds);
      }
    };

    markAsRead();
  }, [messages, currentUserId, recipientId]);

  useEffect(() => {
    console.log("Loading messages for:", currentUserId, "->", recipientId);
    loadMessages();

    const channel = supabase
      .channel(`chat:${currentUserId}:${recipientId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          console.log("New message received:", payload);
          const msg = payload.new as Message;

          if (
            (msg.sender_id === recipientId && msg.receiver_id === currentUserId) ||
            (msg.sender_id === currentUserId && msg.receiver_id === recipientId)
          ) {
            // Mark as delivered if I'm the recipient
            if (msg.receiver_id === currentUserId && !msg.delivered_at) {
              await supabase
                .from("messages")
                .update({ delivered_at: new Date().toISOString() })
                .eq("id", msg.id);
            }

            setMessages((prev) => {
              if (prev.some(m => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const updatedMsg = payload.new as Message;
          setMessages((prev) =>
            prev.map(m => m.id === updatedMsg.id ? updatedMsg : m)
          );
        }
      )
      .subscribe((status) => {
        console.log("Chat channel status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, recipientId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = useCallback(async () => {
    console.log("📥 Carregando mensagens entre:", currentUserId, "e", recipientId);

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("is_group", false)
      .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${recipientId}),and(sender_id.eq.${recipientId},receiver_id.eq.${currentUserId})`)
      .order("created_at", { ascending: true });

    console.log("📊 Mensagens carregadas:", data?.length || 0, "Erro:", error);
    if (error) console.error("❌ Erro ao carregar mensagens:", error);

    if (data) {
      console.log("✅ Mensagens definidas:", data.length);
      setMessages(data);
    }
  }, [currentUserId, recipientId]);

  const scrollToBottom = () => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  };

  const handleSend = async () => {
    const messageContent = newMessage.trim();
    if (!messageContent || sending || !currentUserId || !recipientId) return;

    // Verifica sessão válida antes de enviar
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      toast({ title: "Sessão expirada", description: "Faça login novamente para enviar mensagens.", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      // Validar autenticação
      const { data: { session } } = await supabase.auth.getSession();
      console.log('🔐 Validação de sessão:', {
        sessionExists: !!session,
        sessionUserId: session?.user?.id,
        currentUserId,
        recipientId,
        match: session?.user?.id === currentUserId
      });

      if (!session || session.user.id !== currentUserId) {
        throw new Error('Sessão inválida. Por favor, faça login novamente.');
      }

      // Verifica se a mensagem já existe para evitar duplicação
      const existingMessage = messages.find(m =>
        m.sender_id === currentUserId &&
        m.content === messageContent &&
        Date.now() - new Date(m.created_at).getTime() < 5000 // últimos 5 segundos
      );

      if (existingMessage) {
        throw new Error('Aguarde alguns segundos antes de enviar a mesma mensagem.');
      }

      const messageData = {
        sender_id: currentUserId,
        receiver_id: recipientId,
        content: messageContent,
        message_type: "text",
        is_group: false,
      };

      console.log('📤 Enviando mensagem:', messageData);
      const { data, error } = await supabase
        .from("messages")
        .insert(messageData)
        .select();

      console.log('📨 Resposta completa do Supabase:', { data, error });

      if (error) {
        console.error('❌ ERRO DETALHADO DO SUPABASE:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          fullError: JSON.stringify(error, null, 2)
        });

        if (error.code === '23503') {
          throw new Error('Usuário não encontrado.');
        } else if (error.code === '42501') {
          throw new Error('Você não tem permissão para enviar mensagens.');
        }
        throw error;
      }

      if (data && data.length > 0) {
        console.log('✅ Mensagem enviada com sucesso!', data[0]);
        setMessages((prev) => (prev.some(m => m.id === data[0].id) ? prev : [...prev, data[0]]));
      }
      setNewMessage("");
      scrollToBottom();
    } catch (error: unknown) {
      console.error("❌ ERRO CAPTURADO NO CATCH:", {
        errorType: typeof error,
        errorMessage: (error as any)?.message,
        errorCode: (error as any)?.code,
        errorDetails: (error as any)?.details,
        fullError: JSON.stringify(error, null, 2)
      });

      const errorMessage = mapErrorToUserMessage(error);
      console.error('📢 Mensagem exibida ao usuário:', errorMessage);

      toast({
        title: "Erro ao enviar mensagem",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
        <Avatar className="h-10 w-10">
          <AvatarImage src={recipientProfile?.avatar_url || ""} />
          <AvatarFallback className="bg-secondary text-secondary-foreground">
            {recipientProfile?.full_name?.charAt(0) || "U"}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-foreground">
            {recipientProfile?.full_name || "Usuário"}
          </p>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma mensagem ainda. Comece a conversa!
            </p>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.sender_id === currentUserId ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[70%] rounded-lg p-3",
                    message.sender_id === currentUserId
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  <p className="text-sm break-words">{message.content}</p>
                  <div
                    className={cn(
                      "flex items-center gap-1 text-xs mt-1",
                      message.sender_id === currentUserId
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground"
                    )}
                  >
                    <span>
                      {new Date(message.created_at).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {message.sender_id === currentUserId && (
                      <>
                        {message.read_at ? (
                          <CheckCheck className="h-3 w-3 text-blue-400" />
                        ) : message.delivered_at ? (
                          <CheckCheck className="h-3 w-3" />
                        ) : (
                          <Check className="h-3 w-3" />
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        <div ref={endRef} />
      </div>
      </ScrollArea>

      <div className="p-4 border-t border-border bg-card">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua mensagem..."
            disabled={sending}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            size="icon"
            variant="default"
            className="relative"
          >
            <Send className={cn(
              "h-4 w-4 transition-transform",
              sending && "opacity-0"
            )} />
            {sending && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
              </div>
            )}
          </Button>
        </div>
      </div>
    </>
  );
};
