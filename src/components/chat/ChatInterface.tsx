import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { UserList } from "./UserList";
import { ChatMessages } from "./ChatMessages";
import { MessageCircle, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { mapErrorToUserMessage } from "@/lib/errorHandler";
import { useMessageNotifications } from "@/hooks/useMessageNotifications";
import { useIsMobile } from "@/hooks/use-mobile"; // Import useIsMobile
import { Button } from "@/components/ui/button"; // Import Button for the back button
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; // Import Avatar for recipient profile

interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  is_approved: boolean; // Adicionado is_approved
  is_admin?: boolean;
}

export const ChatInterface = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserProfile, setSelectedUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isMobile = useIsMobile(); // Use the hook

  // Enable message notifications
  useMessageNotifications(user?.id);

  useEffect(() => {
    const initializeChat = async () => {
      setIsLoading(true);
      try {
        if (selectedUserId) {
          console.log('Inicializando chat com usuário:', selectedUserId);
          
          // Primeiro carrega o perfil do usuário
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url, is_approved") // Buscar is_approved
            .eq("id", selectedUserId)
            .single();

          if (profileError) {
            console.error("Erro ao carregar perfil:", profileError);
            throw profileError;
          }

          console.log('Perfil carregado:', profileData);
          setSelectedUserProfile(profileData);

          // Por enquanto, permite mensagens para todos (verificação será feita no backend)
          console.log('Chat inicializado sem verificação de permissão');
        } else {
          setSelectedUserProfile(null); // Clear profile if no user is selected
        }
      } catch (error) {
        console.error("Chat initialization error:", error);
        toast({
          title: "Erro ao inicializar chat",
          description: mapErrorToUserMessage(error),
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    initializeChat();
  }, [selectedUserId, toast]);

  if (!user) return null;

  if (isLoading && selectedUserId) { // Only show loading if a user is selected and still loading profile
    return (
      <div className="flex items-center justify-center h-[calc(100vh-var(--header-height)-2rem)]"> {/* Adjusted height */}
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          <p className="text-sm text-muted-foreground">Carregando chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-var(--header-height)-2rem)] flex flex-col"> {/* Adjusted height and made it flex column */}
      {isMobile && selectedUserId && (
        <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
          <Button variant="ghost" size="icon" onClick={() => setSelectedUserId(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Avatar className="h-10 w-10">
            <AvatarImage src={selectedUserProfile?.avatar_url || ""} />
            <AvatarFallback className="bg-secondary text-secondary-foreground">
              {selectedUserProfile?.full_name?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-foreground">
              {selectedUserProfile?.full_name || "Usuário"}
            </p>
          </div>
        </div>
      )}

      {isMobile ? (
        selectedUserId ? (
          <ChatMessages
            currentUserId={user.id}
            recipientId={selectedUserId}
            recipientProfile={selectedUserProfile}
            onBack={() => setSelectedUserId(null)} // Pass onBack for mobile
          />
        ) : (
          <Card className="p-4 overflow-hidden flex flex-col flex-1">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Conversas
            </h3>
            <UserList
              currentUserId={user.id}
              selectedUserId={selectedUserId}
              onSelectUser={setSelectedUserId}
            />
          </Card>
        )
      ) : (
        <div className="grid md:grid-cols-[320px_1fr] gap-4 flex-1"> {/* Desktop layout */}
          <Card className="p-4 overflow-hidden flex flex-col">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Conversas
            </h3>
            <UserList
              currentUserId={user.id}
              selectedUserId={selectedUserId}
              onSelectUser={setSelectedUserId}
            />
          </Card>

          <Card className="p-0 overflow-hidden flex flex-col">
            {selectedUserId ? (
              <ChatMessages
                currentUserId={user.id}
                recipientId={selectedUserId}
                recipientProfile={selectedUserProfile}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <MessageCircle className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Selecione uma conversa
                </h3>
                <p className="text-muted-foreground">
                  Escolha um usuário da lista para começar a conversar
                </p>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};