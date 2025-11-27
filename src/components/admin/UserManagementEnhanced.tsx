import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js'; // Import createClient
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Users, Shield, ShieldOff, Pencil, Plus, Trash2, CheckCircle, XCircle, Loader2, Upload, Save, MapPin, Key, Mail } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { logAudit } from '@/lib/auditLogger';
import { Tables, Constants, Database } from '@/integrations/supabase/types'; // Import Database type
import { userSchema } from '@/lib/validationSchemas';
import { z } from 'zod';
import { mapErrorToUserMessage } from '@/lib/errorHandler';
import {
  fetchAddressByCep,
  BRAZILIAN_STATES,
  formatAddressForStorage,
  parseAddressFromStorage,
  type AddressFormData
} from "@/lib/addressService";

// Initialize Supabase client with service role key for admin operations
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false, // Admin client should not persist sessions
    autoRefreshToken: false,
  }
});

// Regular Supabase client (from client.ts) for non-admin operations
import { supabase } from '@/integrations/supabase/client';

type Profile = Tables<'profiles'>;
type UserRole = Tables<'user_roles'>;
type InitialPaymentStatus = Constants['public']['Enums']['initial_payment_status_enum'];

interface UserManagementEnhancedProps {
  onAuditLogSuccess: () => void;
}

const UserManagementEnhanced = ({ onAuditLogSuccess }: UserManagementEnhancedProps) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [selectedUserEmail, setSelectedUserEmail] = useState<string | null>(null); // To store user email for password reset
  
  // Edit Form State
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    is_approved: false,
    initial_payment_status: 'unpaid' as InitialPaymentStatus,
  });
  const [addressData, setAddressData] = useState<AddressFormData>({
    rua: '',
    complemento: '',
    bairro: '',
    cep: '',
    cidade: '',
    estado: '',
    pais: 'Brasil',
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Create Form State
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

  const resizeImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      console.log('🖼️ Starting image resize for file:', {
        name: file.name,
        size: (file.size / 1024).toFixed(0) + 'KB',
        type: file.type
      });

      const maxAllowedSize = 500 * 1024; // 500KB
      if (file.size <= maxAllowedSize) {
        console.log('✅ File already small enough, no resize needed');
        resolve(file);
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        try {
          let { width, height } = img;
          const maxDimension = 800;

          if (width > height) {
            if (width > maxDimension) {
              height = (height * maxDimension) / width;
              width = maxDimension;
            }
          } else {
            if (height > maxDimension) {
              width = (width * maxDimension) / height;
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Falha ao redimensionar imagem'));
              return;
            }

            const resizedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
              type: 'image/jpeg',
              lastModified: Date.now()
            });

            console.log('✅ Image resized successfully:', {
              originalSize: (file.size / 1024).toFixed(0) + 'KB',
              resizedSize: (resizedFile.size / 1024).toFixed(0) + 'KB',
              dimensions: `${width}x${height}`
            });

            resolve(resizedFile);
          }, 'image/jpeg', 0.85);

        } catch (error) {
          console.error('❌ Canvas resize failed:', error);
          reject(new Error('Falha ao redimensionar a imagem'));
        }
      };

      img.onerror = () => {
        reject(new Error('Imagem corrompida ou formato não suportado'));
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const validateImageFile = async (file: File): Promise<{ isValid: boolean; error?: string }> => {
    return new Promise((resolve) => {
      const fileName = file.name.toLowerCase();
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      const hasValidType = allowedTypes.includes(file.type);

      if (!hasValidType && !hasValidExtension) {
        resolve({
          isValid: false,
          error: "Formato não suportado. Selecione apenas arquivos JPG, PNG, GIF ou WebP."
        });
        return;
      }

      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        resolve({
          isValid: false,
          error: "Arquivo muito grande. O arquivo deve ter no máximo 10MB."
        });
        return;
      }

      const minSize = 1024; // 1KB
      if (file.size < minSize) {
        resolve({
          isValid: false,
          error: "Arquivo muito pequeno. A imagem parece estar corrompida."
        });
        return;
      }

      const img = new Image();
      img.onload = () => {
        if (img.width === 0 || img.height === 0) {
          resolve({
            isValid: false,
            error: "Imagem inválida. As dimensões da imagem são zero."
          });
          return;
        }

        if (img.width > 10000 || img.height > 10000) {
          resolve({
            isValid: false,
            error: "Imagem muito grande. Dimensões máximas permitidas: 10000x10000 pixels."
          });
          return;
        }

        resolve({ isValid: true });
      };

      img.onerror = () => {
        resolve({
          isValid: false,
          error: "Arquivo não é uma imagem válida ou está corrompido."
        });
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('📁 File selected:', {
      name: file.name,
      size: (file.size / 1024).toFixed(0) + 'KB',
      type: file.type,
      extension: file.name.split('.').pop()?.toLowerCase()
    });

    const validation = await validateImageFile(file);
    if (!validation.isValid) {
      toast({
        title: "Erro na validação",
        description: validation.error,
        variant: "destructive",
      });
      event.target.value = '';
      return;
    }

    try {
      toast({
        title: "Processando imagem...",
        description: "Otimizando imagem para upload",
      });

      const processedFile = await resizeImage(file);

      const maxProcessedSize = 500 * 1024; // 500KB
      if (processedFile.size > maxProcessedSize) {
        console.error('❌ File too large after resize:', processedFile.size);
        toast({
          title: "Imagem muito grande após redimensionamento",
          description: `Tamanho final: ${(processedFile.size / 1024).toFixed(0)}KB. Máximo permitido: 500KB. Tente uma imagem menor ou com menor resolução.`,
          variant: "destructive",
        });
        event.target.value = '';
        return;
      }

      const minProcessedSize = 1024; // 1KB
      if (processedFile.size < minProcessedSize) {
        console.error('❌ File too small after compression:', processedFile.size);
        toast({
          title: "Imagem muito pequena após otimização",
          description: "A imagem otimizada parece estar corrompida. Tente novamente com outra imagem.",
          variant: "destructive",
        });
        event.target.value = '';
        return;
      }

      console.log('✅ File validation passed, setting avatar file');
      setAvatarFile(processedFile);

      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(processedFile);

      toast({
        title: "Imagem processada!",
        description: `Imagem otimizada: ${(processedFile.size / 1024).toFixed(0)}KB`,
      });

    } catch (error) {
      console.error('❌ Error processing image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: "Erro ao processar imagem",
        description: errorMessage.includes('comprimir') ? errorMessage : "Não foi possível otimizar a imagem. Verifique se o arquivo não está corrompido e tente novamente.",
        variant: "destructive",
      });
      event.target.value = '';
    }
  };

  const uploadAvatar = async (userId: string): Promise<string | null> => {
    if (!avatarFile) return selectedProfile?.avatar_url || null;

    try {
      console.log('📤 Uploading avatar to Supabase Storage:', {
        size: avatarFile.size,
        type: avatarFile.type,
        name: avatarFile.name
      });

      // Delete old avatar if exists
      if (selectedProfile?.avatar_url) {
        const oldPath = selectedProfile.avatar_url.split('/avatars/')[1];
        if (oldPath) {
          const { error: deleteError } = await supabase.storage
            .from('avatars')
            .remove([oldPath]);
          
          if (deleteError) {
            console.warn('⚠️ Error deleting old avatar:', deleteError);
          } else {
            console.log('✅ Old avatar deleted');
          }
        }
      }

      const timestamp = Date.now();
      const fileExtension = avatarFile.name.split('.').pop() || 'jpg';
      const filePath = `${userId}/${timestamp}.${fileExtension}`;

      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: avatarFile.type
        });

      if (uploadError) {
        console.error('❌ Upload error:', uploadError);
        throw new Error(`Erro no upload: ${uploadError.message}`);
      }

      console.log('✅ Upload successful:', data);

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      console.log('✅ Public URL generated:', publicUrl);
      return publicUrl;

    } catch (error) {
      console.error('❌ Avatar upload error:', error);
      throw error;
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
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
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: validatedData.full_name,
            phone: validatedData.phone || null,
            address: validatedData.address || null,
            is_approved: validatedData.is_admin,
            initial_payment_status: validatedData.is_admin ? 'paid' : 'unpaid',
          })
          .eq('id', user.id);

        if (profileError) throw profileError;

        if (validatedData.is_admin) {
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({ user_id: user.id, role: 'admin' });

          if (roleError) throw roleError;
        }

        await logAudit({
          action: 'CREATE',
          table_name: 'profiles',
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
        onAuditLogSuccess();
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

  const handleEditUser = async (profile: Profile) => {
    setSelectedProfile(profile);
    setEditForm({
      full_name: profile.full_name,
      phone: profile.phone || '',
      is_approved: profile.is_approved,
      initial_payment_status: profile.initial_payment_status,
    });
    setAvatarPreview(profile.avatar_url || null);
    setAvatarFile(null); // Reset file input
    setAddressData(profile.address ? parseAddressFromStorage(profile.address) : {
      rua: '',
      complemento: '',
      bairro: '',
      cep: '',
      cidade: '',
      estado: '',
      pais: 'Brasil',
    });

    // Fetch user email for password reset functionality using supabaseAdmin
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(profile.id);
    if (userError) {
      console.error('Error fetching user email:', userError);
      setSelectedUserEmail(null);
    } else {
      setSelectedUserEmail(userData.user?.email || null);
    }

    setEditDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedProfile) return;

    setLoading(true);
    try {
      let avatarUrl = selectedProfile.avatar_url;

      if (avatarFile) {
        avatarUrl = await uploadAvatar(selectedProfile.id);
      }

      const formattedAddress = formatAddressForStorage(addressData);

      const validatedData = userSchema.omit({ email: true, password: true }).parse({
        ...editForm,
        address: formattedAddress,
      });

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: validatedData.full_name,
          phone: validatedData.phone || null,
          address: formattedAddress,
          avatar_url: avatarUrl,
          is_approved: validatedData.is_approved,
          initial_payment_status: validatedData.initial_payment_status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedProfile.id);

      if (error) throw error;

      await logAudit({
        action: 'UPDATE',
        table_name: 'profiles',
        record_id: selectedProfile.id,
        details: { ...validatedData, avatar_url: avatarUrl },
      });

      toast({
        title: 'Usuário atualizado!',
        description: 'As informações foram salvas com sucesso.',
        variant: 'default',
      });

      setEditDialogOpen(false);
      fetchProfiles();
      onAuditLogSuccess();
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

  const handleResetPassword = async () => {
    if (!selectedUserEmail) {
      toast({
        title: 'Erro',
        description: 'E-mail do usuário não encontrado para redefinição de senha.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Use supabaseAdmin for password reset
      const { error } = await supabaseAdmin.auth.admin.generateLink({
        type: 'password_reset',
        email: selectedUserEmail,
        options: {
          redirectTo: `${window.location.origin}/auth?reset=true`, // Redirect to auth page with reset param
        },
      });

      if (error) throw error;

      await logAudit({
        action: 'UPDATE',
        table_name: 'auth.users', // Log against auth.users table
        record_id: selectedProfile?.id,
        details: { action: 'password_reset_email_sent', email: selectedUserEmail },
      });

      toast({
        title: 'Link de redefinição enviado!',
        description: `Um e-mail para redefinir a senha foi enviado para ${selectedUserEmail}.`,
        variant: 'default',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar link de redefinição',
        description: mapErrorToUserMessage(error),
        variant: 'destructive',
      });
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
      onAuditLogSuccess();
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

      if (newApprovalStatus) {
        const { data: initialPayment, error: paymentError } = await supabase
          .from('payments')
          .update({ status: 'paid', paid_at: new Date().toISOString() })
          .eq('user_id', profile.id)
          .eq('payment_type', 'initial')
          .eq('status', 'pending');
        
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

      fetchProfiles();
      onAuditLogSuccess();
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
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId); // Use supabaseAdmin for deleting user

      if (error) throw error;

      await logAudit({
        action: 'DELETE',
        table_name: 'profiles',
        record_id: userId,
      });

      toast({
        title: 'Usuário excluído',
        description: 'O usuário foi removido com sucesso.',
        variant: 'default',
      });

      fetchProfiles();
      fetchUserRoles();
      onAuditLogSuccess();
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile">Dados Pessoais</TabsTrigger>
              <TabsTrigger value="settings">Configurações</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6">
              {/* Avatar Section */}
              <Card className="p-6">
                <div className="flex flex-col items-center space-y-4">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={avatarPreview || ""} />
                    <AvatarFallback className="text-2xl">
                      {editForm.full_name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handleAvatarChange}
                      className="hidden"
                      id="avatar-upload-admin"
                      disabled={loading}
                    />
                    <Label
                      htmlFor="avatar-upload-admin"
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md cursor-pointer hover:bg-primary/90"
                    >
                      <Upload className="h-4 w-4" />
                      Alterar Foto
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      JPG, PNG, GIF ou WebP (máx. 10MB)
                    </p>
                  </div>
                </div>
              </Card>

              {/* Personal Information */}
              <Card className="p-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit_name">Nome Completo</Label>
                    <Input
                      id="edit_name"
                      value={editForm.full_name}
                      onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                      placeholder="Digite o nome completo"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit_phone">Telefone</Label>
                    <Input
                      id="edit_phone"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      placeholder="(11) 99999-9999"
                      disabled={loading}
                    />
                  </div>

                  {/* Address Fields */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      <h3 className="text-lg font-medium">Endereço</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="cep">CEP</Label>
                        <Input
                          id="cep"
                          value={addressData.cep}
                          onChange={async (e) => {
                            const cep = e.target.value;
                            setAddressData(prev => ({ ...prev, cep }));

                            if (cep.length === 8 || cep.length === 9) {
                              const addressInfo = await fetchAddressByCep(cep);
                              if (addressInfo) {
                                setAddressData(prev => ({
                                  ...prev,
                                  rua: addressInfo.logradouro,
                                  bairro: addressInfo.bairro,
                                  cidade: addressInfo.localidade,
                                  estado: addressInfo.uf,
                                }));
                              }
                            }
                          }}
                          placeholder="00000-000"
                          disabled={loading}
                        />
                      </div>

                      <div>
                        <Label htmlFor="rua">Rua</Label>
                        <Input
                          id="rua"
                          value={addressData.rua}
                          onChange={(e) => setAddressData(prev => ({ ...prev, rua: e.target.value }))}
                          placeholder="Nome da rua"
                          disabled={loading}
                        />
                      </div>

                      <div>
                        <Label htmlFor="complemento">Complemento</Label>
                        <Input
                          id="complemento"
                          value={addressData.complemento}
                          onChange={(e) => setAddressData(prev => ({ ...prev, complemento: e.target.value }))}
                          placeholder="Apartamento, bloco, etc."
                          disabled={loading}
                        />
                      </div>

                      <div>
                        <Label htmlFor="bairro">Bairro</Label>
                        <Input
                          id="bairro"
                          value={addressData.bairro}
                          onChange={(e) => setAddressData(prev => ({ ...prev, bairro: e.target.value }))}
                          placeholder="Nome do bairro"
                          disabled={loading}
                        />
                      </div>

                      <div>
                        <Label htmlFor="cidade">Cidade</Label>
                        <Input
                          id="cidade"
                          value={addressData.cidade}
                          onChange={(e) => setAddressData(prev => ({ ...prev, cidade: e.target.value }))}
                          placeholder="Nome da cidade"
                          disabled={loading}
                        />
                      </div>

                      <div>
                        <Label htmlFor="estado">Estado</Label>
                        <Select
                          value={addressData.estado}
                          onValueChange={(value) => setAddressData(prev => ({ ...prev, estado: value }))}
                          disabled={loading}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o estado" />
                          </SelectTrigger>
                          <SelectContent>
                            {BRAZILIAN_STATES.map((state) => (
                              <SelectItem key={state.value} value={state.value}>
                                {state.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="pais">País</Label>
                        <Input
                          id="pais"
                          value={addressData.pais}
                          onChange={(e) => setAddressData(prev => ({ ...prev, pais: e.target.value }))}
                          placeholder="País"
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Admin-specific fields */}
                  <div className="space-y-2">
                    <Label htmlFor="is_approved">Aprovado</Label>
                    <Checkbox
                      id="is_approved"
                      checked={editForm.is_approved}
                      onCheckedChange={(checked) => {
                        const newApprovedStatus = checked as boolean;
                        setEditForm(prev => ({
                          ...prev,
                          is_approved: newApprovedStatus,
                          initial_payment_status: newApprovedStatus ? 'paid' : 'unpaid',
                        }));
                      }}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="initial_payment_status">Status Pagamento Inicial</Label>
                    <Select
                      value={editForm.initial_payment_status}
                      onValueChange={(value: InitialPaymentStatus) => setEditForm(prev => ({
                        ...prev,
                        initial_payment_status: value,
                        is_approved: value === 'paid' ? true : prev.is_approved,
                      }))}
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unpaid">Não Pago</SelectItem>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="paid">Pago</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>

              <div className="flex justify-end">
                <Button onClick={handleUpdateUser} disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Key className="h-5 w-5" />
                    <h3 className="text-lg font-medium">Redefinição de Senha</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Envie um link de redefinição de senha para o e-mail do usuário.
                  </p>
                  <p className="text-sm text-muted-foreground font-medium">
                    E-mail do usuário: {selectedUserEmail || 'N/A'}
                  </p>
                  <div className="flex justify-end">
                    <Button onClick={handleResetPassword} disabled={loading || !selectedUserEmail}>
                      <Mail className="h-4 w-4 mr-2" />
                      {loading ? 'Enviando...' : 'Enviar Link de Redefinição'}
                    </Button>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
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
                      disabled={loading}
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