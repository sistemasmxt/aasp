import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Edit, Phone, MessageCircle, Siren, Building2, Scale, Heart, Users, MapPin, Wrench, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { logAudit } from '@/lib/auditLogger';
import * as LucideIcons from 'lucide-react';
import { mapErrorToUserMessage } from '@/lib/errorHandler';
import { publicUtilityContactSchema } from '@/lib/validationSchemas'; // Import publicUtilityContactSchema
import { z } from 'zod';

interface PublicUtilityContact {
  id: string;
  name: string;
  phone: string;
  whatsapp: string | null;
  description: string | null;
  icon_name: string;
  color_class: string;
  created_at: string;
  updated_at: string;
}

// Dynamically get Lucide icons
const getLucideIcon = (iconName: string) => {
  const IconComponent = (LucideIcons as any)[iconName];
  return IconComponent || LucideIcons.HelpCircle; // Fallback to a default icon
};

const ICON_OPTIONS = [
  { value: 'Siren', label: 'Siren (Alerta)' },
  { value: 'Phone', label: 'Phone (Telefone)' },
  { value: 'MessageCircle', label: 'MessageCircle (Mensagem)' },
  { value: 'Building2', label: 'Building2 (Prédio)' },
  { value: 'Scale', label: 'Scale (Justiça)' },
  { value: 'Heart', label: 'Heart (Saúde)' },
  { value: 'Users', label: 'Users (Pessoas)' },
  { value: 'MapPin', label: 'MapPin (Localização)' },
  { value: 'Ambulance', label: 'Ambulance (Ambulância)' },
  { value: 'ShieldAlert', label: 'ShieldAlert (Segurança)' },
  { value: 'Wrench', label: 'Wrench (Ferramenta)' },
];

const COLOR_OPTIONS = [
  { value: 'text-blue-600', label: 'Azul' },
  { value: 'text-green-600', label: 'Verde' },
  { value: 'text-red-600', label: 'Vermelho' },
  { value: 'text-orange-600', label: 'Laranja' },
  { value: 'text-gray-600', label: 'Cinza' },
  { value: 'text-purple-600', label: 'Roxo' },
  { value: 'text-yellow-600', label: 'Amarelo' },
  { value: 'text-indigo-600', label: 'Índigo' },
  { value: 'text-pink-600', label: 'Rosa' },
];

const PublicUtilityContactsManagement = () => {
  const [contacts, setContacts] = useState<PublicUtilityContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<PublicUtilityContact | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    whatsapp: '',
    description: '',
    icon_name: 'Phone',
    color_class: 'text-blue-600',
  });

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('public_utility_contacts')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setContacts(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar contatos',
        description: mapErrorToUserMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (contact: PublicUtilityContact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      phone: contact.phone,
      whatsapp: contact.whatsapp || '',
      description: contact.description || '',
      icon_name: contact.icon_name,
      color_class: contact.color_class,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input using Zod schema
      const validatedData = publicUtilityContactSchema.parse(formData);

      const contactData = {
        name: validatedData.name,
        phone: validatedData.phone,
        whatsapp: validatedData.whatsapp || null,
        description: validatedData.description || null,
        icon_name: validatedData.icon_name,
        color_class: validatedData.color_class,
      };

      if (editingContact) {
        const { error } = await supabase
          .from('public_utility_contacts')
          .update(contactData)
          .eq('id', editingContact.id);

        if (error) throw error;

        await logAudit({
          action: 'UPDATE',
          table_name: 'public_utility_contacts',
          record_id: editingContact.id,
          details: contactData,
        });

        toast({
          title: 'Contato atualizado!',
          description: 'As informações do contato foram salvas com sucesso.',
        });
      } else {
        const { data, error } = await supabase
          .from('public_utility_contacts')
          .insert(contactData)
          .select()
          .single();

        if (error) throw error;

        await logAudit({
          action: 'CREATE',
          table_name: 'public_utility_contacts',
          record_id: data.id,
          details: contactData,
        });

        toast({
          title: 'Contato cadastrado!',
          description: 'O novo contato foi adicionado com sucesso.',
        });
      }

      setDialogOpen(false);
      setEditingContact(null);
      setFormData({
        name: '',
        phone: '',
        whatsapp: '',
        description: '',
        icon_name: 'Phone',
        color_class: 'text-blue-600',
      });
      fetchContacts();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Erro de validação',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      } else {
        let userMessage = mapErrorToUserMessage(error);
        if (error.code === '23505' && error.message.includes('public_utility_contacts_name_key')) {
          userMessage = 'Já existe um contato com este nome. Por favor, use um nome diferente.';
        }

        toast({
          title: editingContact ? 'Erro ao atualizar contato' : 'Erro ao cadastrar contato',
          description: userMessage,
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este contato?')) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('public_utility_contacts').delete().eq('id', id);

      if (error) throw error;

      await logAudit({
        action: 'DELETE',
        table_name: 'public_utility_contacts',
        record_id: id,
      });

      toast({
        title: 'Contato excluído',
        description: 'O contato foi removido com sucesso.',
      });

      fetchContacts();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir contato',
        description: mapErrorToUserMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin inline-block mr-2" /> Carregando contatos de utilidade pública...</div>;
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Wrench className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Gerenciar Contatos de Utilidade Pública</h2>
          <Badge variant="outline">{contacts.length} contatos</Badge>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingContact(null);
              setFormData({
                name: '',
                phone: '',
                whatsapp: '',
                description: '',
                icon_name: 'Phone',
                color_class: 'text-blue-600',
              });
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Contato
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingContact ? 'Editar Contato' : 'Cadastrar Novo Contato'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    placeholder="Opcional"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="icon_name">Ícone *</Label>
                  <Select
                    value={formData.icon_name}
                    onValueChange={(value) => setFormData({ ...formData, icon_name: value })}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um ícone" />
                    </SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color_class">Cor do Ícone *</Label>
                  <Select
                    value={formData.color_class}
                    onValueChange={(value) => setFormData({ ...formData, color_class: value })}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma cor" />
                    </SelectTrigger>
                    <SelectContent>
                      {COLOR_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <span className={option.value}>{option.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Breve descrição do contato (opcional)"
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={loading}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  {editingContact ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Ícone</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((contact) => {
              const IconComponent = getLucideIcon(contact.icon_name);
              return (
                <TableRow key={contact.id}>
                  <TableCell className="font-medium">{contact.name}</TableCell>
                  <TableCell>{contact.phone}</TableCell>
                  <TableCell>{contact.whatsapp || '-'}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{contact.description || '-'}</TableCell>
                  <TableCell>
                    <IconComponent className={`h-5 w-5 ${contact.color_class}`} />
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(contact)}
                      disabled={loading}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(contact.id)}
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

export default PublicUtilityContactsManagement;