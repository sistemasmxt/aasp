import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Users, Shield, ShieldOff, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  address: string | null;
  created_at: string;
}

interface UserRole {
  user_id: string;
  role: string;
}

const UserManagement = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState({ full_name: '', phone: '', address: '' });
  const { toast } = useToast();

  useEffect(() => {
    fetchProfiles();
    fetchUserRoles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar usuários',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (error) throw error;
      
      const rolesMap: Record<string, string> = {};
      (data || []).forEach((ur: UserRole) => {
        rolesMap[ur.user_id] = ur.role;
      });
      setUserRoles(rolesMap);
    } catch (error: any) {
      console.error('Error fetching user roles:', error);
    }
  };

  const handleEditUser = (profile: Profile) => {
    setSelectedProfile(profile);
    setEditForm({
      full_name: profile.full_name,
      phone: profile.phone || '',
      address: profile.address || '',
    });
    setEditDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedProfile) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update(editForm)
        .eq('id', selectedProfile.id);

      if (error) throw error;

      toast({
        title: 'Usuário atualizado!',
        description: 'As informações foram salvas com sucesso.',
      });

      setEditDialogOpen(false);
      fetchProfiles();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar usuário',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleToggleAdmin = async (userId: string, isCurrentlyAdmin: boolean) => {
    try {
      if (isCurrentlyAdmin) {
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'admin');

        if (error) throw error;

        toast({
          title: 'Permissões atualizadas',
          description: 'Usuário removido como administrador.',
        });
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'admin' });

        if (error) throw error;

        toast({
          title: 'Permissões atualizadas',
          description: 'Usuário promovido a administrador.',
        });
      }

      fetchUserRoles();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar permissões',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Carregando usuários...</div>;
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Gerenciar Usuários</h2>
          <Badge variant="outline">{profiles.length} usuários</Badge>
        </div>
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_name">Nome Completo</Label>
              <Input
                id="edit_name"
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_phone">Telefone</Label>
              <Input
                id="edit_phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_address">Endereço</Label>
              <Input
                id="edit_address"
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdateUser}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Endereço</TableHead>
              <TableHead>Data Cadastro</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((profile) => {
              const isAdmin = userRoles[profile.id] === 'admin';
              return (
                <TableRow key={profile.id}>
                  <TableCell className="font-medium">{profile.full_name}</TableCell>
                  <TableCell>{profile.phone || '-'}</TableCell>
                  <TableCell>{profile.address || '-'}</TableCell>
                  <TableCell>{new Date(profile.created_at).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>
                    <Badge variant={isAdmin ? 'default' : 'secondary'}>
                      {isAdmin ? 'Admin' : 'Usuário'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEditUser(profile)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleAdmin(profile.id, isAdmin)}
                    >
                      {isAdmin ? (
                        <ShieldOff className="h-4 w-4 text-destructive" />
                      ) : (
                        <Shield className="h-4 w-4 text-primary" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};

export default UserManagement;
