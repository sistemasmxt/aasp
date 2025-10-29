import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { mapErrorToUserMessage } from "@/lib/errorHandler";
import { cn } from "@/lib/utils";

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
  const [messages, setMessages] = useState<{
    id: string;
    sender_id: string;
    receiver_id: string | null;
    content: string | null;
    message_type: string;
    is_group: boolean;
    created_at: string;
    group_id: string | null;
  }[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

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
        (payload) => {
          console.log("New message received:", payload);
          const msg = payload.new as {
            id: string;
            sender_id: string;
            receiver_id: string | null;
            content: string | null;
            message_type: string;
            is_group: boolean;
            created_at: string;
            group_id: string | null;
          };
          if (
            (msg.sender_id === recipientId && msg.receiver_id === currentUserId) ||
            (msg.sender_id === currentUserId && msg.receiver_id === recipientId)
          ) {
            setMessages((prev) => {
              // Avoid duplicates
              if (prev.some(m => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
          }
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
    console.log("Loading messages between:", currentUserId, "and", recipientId);
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${currentUserId},receiver_id.eq.${recipientId}),and(sender_id.eq.${recipientId},receiver_id.eq.${currentUserId})`
      )
      .eq("is_group", false)
      .order("created_at", { ascending: true });

    console.log("Messages loaded:", data?.length || 0, "Error:", error);

    if (data) {
      setMessages(data);
    }
  }, [currentUserId, recipientId]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const handleSend = async () => {
    const messageContent = newMessage.trim();
    if (!messageContent || sending || !currentUserId || !recipientId) return;

    setSending(true);
    try {
      // Verifica se a mensagem já existe para evitar duplicação
      const existingMessage = messages.find(m => 
        m.sender_id === currentUserId && 
        m.content === messageContent &&
        Date.now() - new Date(m.created_at).getTime() < 5000 // últimos 5 segundos
      );
      
      if (existingMessage) {
        throw new Error('Aguarde alguns segundos antes de enviar a mesma mensagem.');
      }

      const { data, error } = await supabase
        .from("messages")
        .insert({
          sender_id: currentUserId,
          receiver_id: recipientId,
          content: messageContent,
          message_type: "text",
          is_group: false,
        })
        .select();

      if (error) {
        if (error.code === '23503') {
          throw new Error('Usuário não encontrado.');
        } else if (error.code === '42501') {
          throw new Error('Você não tem permissão para enviar mensagens.');
        }
        throw error;
      }

      setNewMessage("");
    } catch (error: unknown) {
      console.error("Error sending message:", error);
      toast({
        title: "Erro ao enviar mensagem",
        description: mapErrorToUserMessage(error),
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

      <ScrollArea ref={scrollRef} className="flex-1 p-4">
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
                  <p
                    className={cn(
                      "text-xs mt-1",
                      message.sender_id === currentUserId
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground"
                    )}
                  >
                    {new Date(message.created_at).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
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
