import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

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
  const [loadingUsers, setLoadingUsers] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadUsers = async () => {
      setLoadingUsers(true);
      console.log("Loading users, current user:", currentUserId);

      try {
        // 1. Obter a lista de IDs de usuários com os quais o usuário atual pode enviar mensagens
        const { data: messageableIds, error: messageableIdsError } = await supabase.rpc('get_messageable_profile_ids');

        if (messageableIdsError) {
          console.error("Erro ao buscar IDs de usuários que podem ser contatados:", messageableIdsError);
          toast({
            title: "Erro ao carregar usuários",
            description: "Não foi possível determinar quem você pode contatar.",
            variant: "destructive",
          });
          setLoadingUsers(false);
          return;
        }

        const messageableIdSet = new Set(messageableIds);
        console.log("IDs de usuários que podem ser contatados:", messageableIdSet);

        // 2. Carregar todos os perfis (exceto o usuário atual)
        const { data: allProfiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .neq("id", currentUserId)
          .order("full_name");

        if (profilesError) {
          console.error("Erro ao carregar perfis:", profilesError);
          toast({
            title: "Erro ao carregar perfis",
            description: "Não foi possível carregar a lista de usuários.",
            variant: "destructive",
          });
          setLoadingUsers(false);
          return;
        }

        // 3. Filtrar perfis para incluir apenas usuários que podem ser contatados
        const filteredUsers = (allProfiles || []).filter(profile => messageableIdSet.has(profile.id));
        
        console.log("Usuários filtrados para o chat:", filteredUsers.length);
        setUsers(filteredUsers);

      } catch (error) {
        console.error("Erro ao carregar usuários:", error);
        toast({
          title: "Erro ao carregar usuários",
          description: "Ocorreu um erro ao carregar a lista de contatos.",
          variant: "destructive",
        });
      } finally {
        setLoadingUsers(false);
      }
    };

    loadUsers();
  }, [currentUserId, toast]);

  if (loadingUsers) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full"></div>
        <p className="ml-2 text-muted-foreground">Carregando contatos...</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-2">
        {users.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum usuário disponível para conversar.
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