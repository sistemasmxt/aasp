import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface UserListProps {
  currentUserId: string;
  selectedUserId: string | null;
  onSelectUser: (userId: string) => void;
}

export const UserList = ({ currentUserId, selectedUserId, onSelectUser }: UserListProps) => {
  const [users, setUsers] = useState<{
    id: string;
    full_name: string;
    avatar_url: string | null;
  }[]>([]);

  useEffect(() => {
    const loadUsers = async () => {
      console.log("Loading users, current user:", currentUserId);

      try {
        // Por enquanto, não verifica permissões - mostra todos os usuários

        // Carrega todos os usuários exceto o atual
        const { data: allUsers, error } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .neq("id", currentUserId)
          .order("full_name");

        console.log("Users loaded:", allUsers?.length || 0, "Error:", error);

        if (allUsers && !error) {
          // Por enquanto, mostra todos os usuários (filtragem será feita depois)
          setUsers(allUsers);
        }
      } catch (error) {
        console.error("Error loading users:", error);
      }
    };

    loadUsers();
  }, [currentUserId]);

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-2">
        {users.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum usuário disponível
          </p>
        ) : (
          users.map((profile) => (
            <button
              key={profile.id}
              onClick={() => onSelectUser(profile.id)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
                selectedUserId === profile.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={profile.avatar_url || ""} />
                <AvatarFallback className="bg-secondary text-secondary-foreground">
                  {profile.full_name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {profile.full_name || "Usuário"}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </ScrollArea>
  );
};
