import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Users, Plus, Trash2, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Group {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  group_members: { count: number }[];
}

interface Profile {
  id: string;
  full_name: string;
}

interface GroupMember {
  id: string;
  user_id: string;
  profiles: { full_name: string } | null;
}

const GroupManagement = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const [memberForm, setMemberForm] = useState({
    user_id: '',
  });

  useEffect(() => {
    fetchGroups();
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error: any) {
      console.error('Error fetching profiles:', error);
    }
  };

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select(`
          *,
          group_members(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGroups(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar grupos',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupMembers = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select('id, user_id')
        .eq('group_id', groupId);

      if (error) throw error;

      const membersWithProfiles = await Promise.all(
        (data || []).map(async (member) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', member.user_id)
            .single();

          return {
            ...member,
            profiles: profile,
          };
        })
      );

      setGroupMembers(membersWithProfiles as GroupMember[]);
    } catch (error: any) {
      console.error('Error fetching group members:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase.from('groups').insert({
        name: formData.name,
        description: formData.description || null,
      });

      if (error) throw error;

      toast({
        title: 'Grupo criado!',
        description: 'O grupo foi adicionado com sucesso.',
      });

      setDialogOpen(false);
      setFormData({ name: '', description: '' });
      fetchGroups();
    } catch (error: any) {
      toast({
        title: 'Erro ao criar grupo',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este grupo?')) return;

    try {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Grupo excluído',
        description: 'O grupo foi removido com sucesso.',
      });

      fetchGroups();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir grupo',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleManageMembers = async (group: Group) => {
    setSelectedGroup(group);
    await fetchGroupMembers(group.id);
    setMembersDialogOpen(true);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) return;

    try {
      const { error } = await supabase.from('group_members').insert({
        group_id: selectedGroup.id,
        user_id: memberForm.user_id,
        role: 'member',
      });

      if (error) throw error;

      toast({
        title: 'Membro adicionado!',
        description: 'O usuário foi adicionado ao grupo.',
      });

      setMemberForm({ user_id: '' });
      fetchGroupMembers(selectedGroup.id);
      fetchGroups();
    } catch (error: any) {
      toast({
        title: 'Erro ao adicionar membro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedGroup) return;

    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: 'Membro removido',
        description: 'O usuário foi removido do grupo.',
      });

      fetchGroupMembers(selectedGroup.id);
      fetchGroups();
    } catch (error: any) {
      toast({
        title: 'Erro ao remover membro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Carregando grupos...</div>;
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Gerenciar Grupos</h2>
          <Badge variant="outline">{groups.length} grupos</Badge>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Grupo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Grupo</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Criar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={membersDialogOpen} onOpenChange={setMembersDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Membros de {selectedGroup?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <form onSubmit={handleAddMember} className="flex gap-2">
              <Select value={memberForm.user_id} onValueChange={(value) => setMemberForm({ user_id: value })}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="submit">
                <UserPlus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </form>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>{member.profiles?.full_name || 'Usuário não encontrado'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Membros</TableHead>
              <TableHead>Data Criação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((group) => (
              <TableRow key={group.id}>
                <TableCell className="font-medium">{group.name}</TableCell>
                <TableCell>{group.description || '-'}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {group.group_members[0]?.count || 0} membros
                  </Badge>
                </TableCell>
                <TableCell>{new Date(group.created_at).toLocaleDateString('pt-BR')}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => handleManageMembers(group)}>
                    <Users className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(group.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};

export default GroupManagement;
