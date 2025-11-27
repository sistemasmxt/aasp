import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Users, Shield, ShieldOff, Pencil, Plus, Trash2, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { logAudit } from '@/lib/auditLogger';
import { Tables } from '@/integrations/supabase/types';
import { userSchema } from '@/lib/validationSchemas'; // Import userSchema
import { z } from 'zod';
import { mapErrorToUserMessage } from '@/lib/errorHandler';

type Profile = Tables<'profiles'>;
type UserRole = Tables<'user_roles'>;

const UserManagementEnhanced = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState({ full_name: '', phone: '', address: '' });
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    address: '',
    is_admin: false,
  });
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
        description: mapErrorToUserMessage(error),
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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input using Zod schema
      const validatedData = userSchema.extend({
        email: z.string().email('Email inválido'),
        password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
        is_admin: z.boolean().optional(),
      }).parse(createForm);

      const { data: { user }, error: authError } = await supabase.auth.signUp({
        email: validatedData.email,
        password: validatedData.password,
        options: {
          data: {
            full_name: validatedData.full_name,
            phone: validatedData.phone,
          },
        },
      });

      if (authError) throw authError;

      if (user) {
        // Update profile with additional info
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: validatedData.full_name,
            phone: validatedData.phone || null,
            address: validatedData.address || null,
            is_approved: validatedData.is_admin, // Admins are approved by default
            initial_payment_status: validatedData.is_admin ? 'paid' : 'unpaid',
          })
          .eq('id', user.id);

        if (profileError) throw profileError;

        // Add admin role if selected
        if (validatedData.is_admin) {
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({ user_id: user.id, role: 'admin' });

          if (roleError) throw roleError;
        }

        await logAudit({
          action: 'CREATE',
          table_name: 'users',
          record_id: user.id,
          details: { email: validatedData.email, full_name: validatedData.full_name, is_admin: validatedData.is_admin },
        });

        toast({
          title: 'Usuário criado!',
          description: 'O novo usuário foi cadastrado com sucesso.',
          variant: 'default',
        });

        setCreateDialogOpen(false);
        setCreateForm({
          email: '',
          password: '',
          full_name: '',
          phone: '',
          address: '',
          is_admin: false,
        });
        fetchProfiles();
        fetchUserRoles();
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Erro de validação',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erro ao criar usuário',
          description: mapErrorToUserMessage(error),
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
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

    setLoading(true);
    try {
      // Validate input using Zod schema (excluding email and password for update)
      const validatedData = userSchema.omit({ email: true, password: true }).parse(editForm);

      const { error } = await supabase
        .from('profiles')
        .update(validatedData)
        .eq('id', selectedProfile.id);

      if (error) throw error;

      await logAudit({
        action: 'UPDATE',
        table_name: 'users',
        record_id: selectedProfile.id,
        details: validatedData,
      });

      toast({
        title: 'Usuário atualizado!',
        description: 'As informações foram salvas com sucesso.',
        variant: 'default',
      });

      setEditDialogOpen(false);
      fetchProfiles();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Erro de validação',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erro ao atualizar usuário',
          description: mapErrorToUserMessage(error),
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAdmin = async (userId: string, isCurrentlyAdmin: boolean) => {
    setLoading(true);
    try {
      if (isCurrentlyAdmin) {
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'admin');

        if (error) throw error;

        await logAudit({
          action: 'DELETE',
          table_name: 'user_roles',
          record_id: userId,
          details: { role: 'admin', action: 'remove' },
        });

        toast({
          title: 'Permissões atualizadas',
          description: 'Usuário removido como administrador.',
          variant: 'default',
        });
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'admin' });

        if (error) throw error;

        await logAudit({
          action: 'CREATE',
          table_name: 'user_roles',
          record_id: userId,
          details: { role: 'admin', action: 'add' },
        });

        toast({
          title: 'Permissões atualizadas',
          description: 'Usuário promovido a administrador.',
          variant: 'default',
        });
      }

      fetchUserRoles();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar permissões',
        description: mapErrorToUserMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleApproval = async (profile: Profile, isCurrentlyApproved: boolean) => {
    setLoading(true);
    try {
      const newApprovalStatus = !isCurrentlyApproved;
      const newPaymentStatus = newApprovalStatus ? 'paid' : 'unpaid';

      const { error } = await supabase
        .from('profiles')
        .update({ is_approved: newApprovalStatus, initial_payment_status: newPaymentStatus })
        .eq('id', profile.id);

      if (error) throw error;

      // Also update the initial payment record if it exists
      if (newApprovalStatus) {
        const { data: initialPayment, error: paymentError } = await supabase
          .from('payments')
          .update({ status: 'paid', paid_at: new Date().toISOString() })
          .eq('user_id', profile.id)
          .eq('payment_type', 'initial')
          .eq('status', 'pending'); // Only update pending initial payments
        
        if (paymentError) console.error("Error updating initial payment status:", paymentError);
      }


      await logAudit({
        action: 'UPDATE',
        table_name: 'profiles',
        record_id: profile.id,
        details: { is_approved: newApprovalStatus, initial_payment_status: newPaymentStatus },
      });

      toast({
        title: 'Status de Aprovação Atualizado',
        description: `Usuário ${profile.full_name} foi ${newApprovalStatus ? 'aprovado' : 'desaprovado'}.`,
        variant: 'default',
      });

      fetchProfiles(); // Re-fetch profiles to update UI
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar aprovação',
        description: mapErrorToUserMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) return;

    setLoading(true);
    try {
      // First delete from auth (this will cascade to profiles via trigger)
      const { error } = await supabase.auth.admin.deleteUser(userId);

      if (error) throw error;

      await logAudit({
        action: 'DELETE',
        table_name: 'users',
        record_id: userId,
      });

      toast({
        title: 'Usuário excluído',
        description: 'O usuário foi removido com sucesso.',
        variant: 'default',
      });

      fetchProfiles();
      fetchUserRoles();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir usuário',
        description: mapErrorToUserMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin inline-block mr-2" /> Carregando usuários...</div>;
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Gerenciar Usuários</h2>
          <Badge variant="outline">{profiles.length} usuários</Badge>
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha *</Label>
                <Input
                  id="password"
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create_name">Nome Completo *</Label>
                <Input
                  id="create_name"
                  value={createForm.full_name}
                  onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create_phone">Telefone</Label>
                <Input
                  id="create_phone"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create_address">Endereço</Label>
                <Input
                  id="create_address"
                  value={createForm.address}
                  onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_admin"
                  checked={createForm.is_admin}
                  onCheckedChange={(checked) => setCreateForm({ ...createForm, is_admin: checked as boolean })}
                />
                <Label htmlFor="is_admin">Definir como administrador (aprova acesso automaticamente)</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Criando...' : 'Criar Usuário'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
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
              <Button onClick={handleUpdateUser} disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar'}
              </Button>
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
              <TableHead>Aprovação</TableHead>
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
                  <TableCell>
                    <Badge variant={profile.is_approved ? 'default' : (profile.initial_payment_status === 'pending' ? 'secondary' : 'destructive')}>
                      {profile.is_approved ? 'Aprovado' : (profile.initial_payment_status === 'pending' ? 'Pagamento Pendente' : 'Não Aprovado')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEditUser(profile)} disabled={loading}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleAdmin(profile.id, isAdmin)}
                      disabled={loading}
                    >
                      {isAdmin ? (
                        <ShieldOff className="h-4 w-4 text-destructive" />
                      ) : (
                        <Shield className="h-4 w-4 text-primary" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleApproval(profile, profile.is_approved)}
                      disabled={loading || (profile.initial_payment_status === 'unpaid' && !profile.is_approved)}
                    >
                      {profile.is_approved ? (
                        <XCircle className="h-4 w-4 text-destructive" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-default" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteUser(profile.id)}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
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

export default UserManagementEnhanced;