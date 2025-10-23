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
import imageCompression from 'browser-image-compression';
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
}

export const ProfileEditModal = ({ profile, onProfileUpdate }: ProfileEditModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
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

  const compressImage = async (file: File): Promise<File> => {
    // Ultra aggressive compression settings
    const options = {
      maxSizeMB: 0.05, // 50KB max - very small
      maxWidthOrHeight: 200, // Very small resolution
      useWebWorker: true,
      fileType: 'image/jpeg',
      initialQuality: 0.3, // Very low quality
    };

    try {
      const compressedFile = await imageCompression(file, options);
      return compressedFile;
    } catch (error) {
      console.error('Error compressing image:', error);
      // Try with extreme compression if first attempt fails
      try {
        const fallbackOptions = {
          maxSizeMB: 0.02, // 20KB fallback
          maxWidthOrHeight: 150,
          useWebWorker: true,
          fileType: 'image/jpeg',
          initialQuality: 0.2,
        };
        const fallbackFile = await imageCompression(file, fallbackOptions);
        return fallbackFile;
      } catch (fallbackError) {
        console.error('Fallback compression also failed:', fallbackError);
        // Return original file if all compression fails
        return file;
      }
    }
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type first
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Formato não suportado",
        description: "Selecione apenas arquivos de imagem (JPG, PNG, GIF, etc.)",
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

      // Compress and convert image
      const processedFile = await compressImage(file);

      // Final validation - ensure it's under 100KB
      if (processedFile.size > 100 * 1024) {
        toast({
          title: "Imagem muito grande",
          description: "A imagem deve ter no máximo 100KB. Tente uma imagem menor.",
          variant: "destructive",
        });
        event.target.value = '';
        return;
      }

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
      console.error('Error processing image:', error);
      toast({
        title: "Erro ao processar imagem",
        description: "Não foi possível otimizar a imagem. Tente novamente.",
        variant: "destructive",
      });
      event.target.value = '';
    }
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !user) return profile?.avatar_url || null;

    try {
      // Use .jpg extension for all compressed images
      const fileName = `${user.id}_${Date.now()}.jpg`;
      const filePath = `avatars/${fileName}`;

      // Delete old avatar if exists
      if (profile?.avatar_url) {
        const oldFileName = profile.avatar_url.split('/').pop();
        if (oldFileName) {
          await supabase.storage
            .from('avatars')
            .remove([`avatars/${oldFileName}`]);
        }
      }

      console.log('Uploading file:', {
        fileName,
        filePath,
        size: avatarFile.size,
        type: avatarFile.type
      });

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/jpeg'
        });

      if (uploadError) {
        console.error('Upload error details:', uploadError);
        throw new Error(`Falha no upload: ${uploadError.message}`);
      }

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      if (!data.publicUrl) {
        throw new Error('Falha ao obter URL pública da imagem');
      }

      console.log('Upload successful, URL:', data.publicUrl);
      return data.publicUrl;
    } catch (error) {
      console.error('Avatar upload error:', error);
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

      setOpen(false);
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
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
                    accept="image/*"
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
