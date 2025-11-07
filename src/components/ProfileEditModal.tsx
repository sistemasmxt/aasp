import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { mapErrorToUserMessage } from "@/lib/errorHandler";
import { Settings, Upload, Save, Key, MapPin } from "lucide-react";
import {
  fetchAddressByCep,
  BRAZILIAN_STATES,
  formatAddressForStorage,
  parseAddressFromStorage,
  type AddressFormData
} from "@/lib/addressService";

interface ProfileEditModalProps {
  profile: {
    id: string;
    full_name: string;
    phone: string | null;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    avatar_url: string | null;
    created_at: string;
    updated_at: string;
  } | null;
  onProfileUpdate: (updatedProfile: any) => void;
  open?: boolean; // Add open prop
  onOpenChange?: (open: boolean) => void; // Add onOpenChange prop
}

export const ProfileEditModal = ({ profile, onProfileUpdate, open, onOpenChange }: ProfileEditModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false); // Internal state for dialog
  const [loading, setLoading] = useState(false);

  // Profile data
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");

  // Address fields
  const [addressData, setAddressData] = useState<AddressFormData>(() =>
    profile?.address ? parseAddressFromStorage(profile.address) : {
      rua: '',
      complemento: '',
      bairro: '',
      cep: '',
      cidade: '',
      estado: '',
      pais: 'Brasil',
    }
  );

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null);

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Sync internal dialog state with external props
  useEffect(() => {
    if (open !== undefined) {
      setDialogOpen(open);
    }
  }, [open]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      setAvatarPreview(profile.avatar_url || null);

      // Parse address data from profile
      if (profile.address) {
        setAddressData(parseAddressFromStorage(profile.address));
      } else {
        setAddressData({
          rua: '',
          complemento: '',
          bairro: '',
          cep: '',
          cidade: '',
          estado: '',
          pais: 'Brasil',
        });
      }
    }
  }, [profile]);

  const resizeImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      console.log('🖼️ Starting image resize for file:', {
        name: file.name,
        size: (file.size / 1024).toFixed(0) + 'KB',
        type: file.type
      });

      // If file is already small enough, return as-is
      const maxAllowedSize = 500 * 1024; // 500KB (limite mais alto para evitar compressão desnecessária)
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
          // Calculate new dimensions (max 800px para manter qualidade)
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

          // Draw image
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
          }, 'image/jpeg', 0.85); // Boa qualidade

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
      // Check file extension as fallback for MIME type validation
      const fileName = file.name.toLowerCase();
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

      // Check MIME type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      const hasValidType = allowedTypes.includes(file.type);

      // Accept if either MIME type or extension is valid
      if (!hasValidType && !hasValidExtension) {
        resolve({
          isValid: false,
          error: "Formato não suportado. Selecione apenas arquivos JPG, PNG, GIF ou WebP."
        });
        return;
      }

      // Check file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        resolve({
          isValid: false,
          error: "Arquivo muito grande. O arquivo deve ter no máximo 10MB."
        });
        return;
      }

      // Check minimum size (avoid corrupted files)
      const minSize = 1024; // 1KB
      if (file.size < minSize) {
        resolve({
          isValid: false,
          error: "Arquivo muito pequeno. A imagem parece estar corrompida."
        });
        return;
      }

      // Verify it's actually a valid image by trying to load it
      const img = new Image();
      img.onload = () => {
        // Additional checks
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

      // Timeout after 10 seconds
      setTimeout(() => {
        resolve({
          isValid: false,
          error: "Timeout ao validar imagem. Tente novamente."
        });
      }, 10000);
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

    // Validate file
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
      // Show loading toast
      toast({
        title: "Processando imagem...",
        description: "Otimizando imagem para upload",
      });

      // Resize image
      const processedFile = await resizeImage(file);

      console.log('🔍 Post-resize validation:', {
        originalSize: (file.size / 1024).toFixed(0) + 'KB',
        processedSize: (processedFile.size / 1024).toFixed(0) + 'KB',
        maxAllowed: '500KB'
      });

      // Final validation - ensure it's under 500KB after resize (limite mais alto)
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

      // Additional validation - ensure minimum size (too small files might be corrupted)
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

      // Create preview
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

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !user) return profile?.avatar_url || null;

    try {
      console.log('📤 Uploading avatar to Supabase Storage:', {
        size: avatarFile.size,
        type: avatarFile.type,
        name: avatarFile.name
      });

      // Delete old avatar if exists
      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split('/avatars/')[1];
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

      // Create file path: {userId}/{timestamp}.jpg
      const timestamp = Date.now();
      const fileExtension = avatarFile.name.split('.').pop() || 'jpg';
      const filePath = `${user.id}/${timestamp}.${fileExtension}`;

      // Upload to Supabase Storage
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

      // Get public URL
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

  const handleSaveProfile = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let avatarUrl = profile?.avatar_url;

      // Only upload avatar if we have a new file
      if (avatarFile) {
        console.log('Starting avatar upload...');
        avatarUrl = await uploadAvatar();
        console.log('Avatar upload completed, URL:', avatarUrl);
      }

      // Format address for storage
      const formattedAddress = formatAddressForStorage(addressData);
      console.log('Formatted address:', formattedAddress);

      console.log('Updating profile with data:', {
        full_name: fullName,
        phone: phone,
        address: formattedAddress,
        avatar_url: avatarUrl,
        user_id: user.id
      });

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone: phone,
          address: formattedAddress,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) {
        console.error('Profile update error:', error);
        throw error;
      }

      console.log('Profile update successful');

      const updatedProfile = {
        ...profile,
        full_name: fullName,
        phone: phone,
        address: formattedAddress,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      };

      onProfileUpdate(updatedProfile);

      // Reset avatar file state after successful save
      setAvatarFile(null);

      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas com sucesso.",
      });

      setDialogOpen(false); // Close internal dialog state
      if (onOpenChange) onOpenChange(false); // Notify parent
    } catch (error: unknown) {
      console.error('Profile update error:', error);
      toast({
        title: "Erro ao atualizar perfil",
        description: mapErrorToUserMessage(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user?.email) return;

    if (newPassword !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Erro",
        description: "A nova senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: "Senha atualizada!",
        description: "Sua senha foi alterada com sucesso.",
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: unknown) {
      toast({
        title: "Erro ao alterar senha",
        description: mapErrorToUserMessage(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={(isOpen) => {
      setDialogOpen(isOpen);
      if (onOpenChange) onOpenChange(isOpen);
    }}>
      <DialogTrigger asChild>
        {/* Only render trigger if not controlled by parent or if parent explicitly wants it */}
        {open === undefined && (
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Perfil</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">Dados Pessoais</TabsTrigger>
            <TabsTrigger value="password">Alterar Senha</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            {/* Avatar Section */}
            <Card className="p-6">
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={avatarPreview || ""} />
                  <AvatarFallback className="text-2xl">
                    {fullName?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>

                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleAvatarChange}
                    className="hidden"
                    id="avatar-upload"
                  />
                  <Label
                    htmlFor="avatar-upload"
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
                  <Label htmlFor="fullName">Nome Completo</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Digite seu nome completo"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
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
                      />
                    </div>

                    <div>
                      <Label htmlFor="rua">Rua</Label>
                      <Input
                        id="rua"
                        value={addressData.rua}
                        onChange={(e) => setAddressData(prev => ({ ...prev, rua: e.target.value }))}
                        placeholder="Nome da rua"
                      />
                    </div>

                    <div>
                      <Label htmlFor="complemento">Complemento</Label>
                      <Input
                        id="complemento"
                        value={addressData.complemento}
                        onChange={(e) => setAddressData(prev => ({ ...prev, complemento: e.target.value }))}
                        placeholder="Apartamento, bloco, etc."
                      />
                    </div>

                    <div>
                      <Label htmlFor="bairro">Bairro</Label>
                      <Input
                        id="bairro"
                        value={addressData.bairro}
                        onChange={(e) => setAddressData(prev => ({ ...prev, bairro: e.target.value }))}
                        placeholder="Nome do bairro"
                      />
                    </div>

                    <div>
                      <Label htmlFor="cidade">Cidade</Label>
                      <Input
                        id="cidade"
                        value={addressData.cidade}
                        onChange={(e) => setAddressData(prev => ({ ...prev, cidade: e.target.value }))}
                        placeholder="Nome da cidade"
                      />
                    </div>

                    <div>
                      <Label htmlFor="estado">Estado</Label>
                      <Select
                        value={addressData.estado}
                        onValueChange={(value) => setAddressData(prev => ({ ...prev, estado: value }))}
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
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleSaveProfile} disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="password" className="space-y-6">
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Key className="h-5 w-5" />
                  <h3 className="text-lg font-medium">Alterar Senha</h3>
                </div>

                <div>
                  <Label htmlFor="newPassword">Nova Senha</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Digite a nova senha"
                  />
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirme a nova senha"
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleChangePassword} disabled={loading}>
                    <Key className="h-4 w-4 mr-2" />
                    {loading ? "Alterando..." : "Alterar Senha"}
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};