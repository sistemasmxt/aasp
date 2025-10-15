import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { UserList } from "./UserList";
import { ChatMessages } from "./ChatMessages";
import { MessageCircle } from "lucide-react";

export const ChatInterface = () => {
  const { user } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserProfile, setSelectedUserProfile] = useState<any>(null);

  console.log("=== ChatInterface Rendered ===");
  console.log("Current user:", user?.id);

  useEffect(() => {
    if (selectedUserId) {
      console.log("Loading profile for user:", selectedUserId);
      supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", selectedUserId)
        .single()
        .then(({ data }) => {
          console.log("Profile loaded:", data);
          setSelectedUserProfile(data);
        });
    }
  }, [selectedUserId]);

  if (!user) {
    console.log("No user found, returning null");
    return null;
  }

  return (
    <div className="grid md:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-300px)]">
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
  );
};
