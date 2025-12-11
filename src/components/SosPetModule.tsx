"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PawPrint, Plus, Search, MapPin, Phone, Mail, Image, Loader2, XCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { mapErrorToUserMessage } from '@/lib/errorHandler';
import { sosPetSchema } from '@/lib/validationSchemas';
import { z } from 'zod';
import { Tables } from '@/integrations/supabase/types';
import { Badge } from '@/components/ui/badge';

type SosPet = Tables<'sos_pets'>;
type PetStatus = 'active' | 'found' | 'resolved';

const SPECIES_OPTIONS = [
  { value: 'dog', label: 'Cachorro' },
  { value: 'cat', label: 'Gato' },
  { value: 'bird', label: 'Pássaro' },
  { value: 'other', label: 'Outro' },
];

const SosPetModule = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pets, setPets] = useState<SosPet[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    pet_name: '',
    species: '',
    breed: '',
    description: '',
    last_seen_location: '',
    latitude: '',
    longitude: '',
    contact_phone: '',
    contact_email: '',
    image_url: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    fetchSosPets();
  }, []);

  const fetchSosPets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sos_pets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPets(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar SOS Pets',
        description: mapErrorToUserMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImageFile(null);
      setImagePreview(null);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile || !user) return null;

    try {
      const filePath = `${user.id}/${Date.now()}-${imageFile.name}`;
      const { data, error } = await supabase.storage
        .from('sos_pet_images')
        .upload(filePath, imageFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('sos_pet_images')
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Erro no upload da imagem',
        description: mapErrorToUserMessage(error),
        variant: 'destructive',
      });
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const imageUrl = await uploadImage();

      const validatedData = sosPetSchema.parse({
        ...formData,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        image_url: imageUrl || '',
        species: formData.species || 'other', // Default species if not selected
      });

      const { error } = await supabase.from('sos_pets').insert({
        user_id: user?.id || '',
        pet_name: validatedData.pet_name,
        pet_type: validatedData.species || 'other',
        pet_breed: validatedData.breed || null,
        description: validatedData.description || null,
        last_seen_location: validatedData.last_seen_location || null,
        latitude: validatedData.latitude,
        longitude: validatedData.longitude,
        contact_phone: validatedData.contact_phone,
        image_url: validatedData.image_url || null,
        status: 'active',
      });

      if (error) throw error;

      toast({
        title: 'Relatório SOS Pet enviado!',
        description: 'Seu relatório foi enviado e será visível para a comunidade.',
      });

      setDialogOpen(false);
      setFormData({
        pet_name: '', species: '', breed: '', description: '', last_seen_location: '',
        latitude: '', longitude: '', contact_phone: '', contact_email: '', image_url: '',
      });
      setImageFile(null);
      setImagePreview(null);
      fetchSosPets();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Erro de validação',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erro ao enviar relatório SOS Pet',
          description: mapErrorToUserMessage(error),
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Perdido</Badge>;
      case 'found': return <Badge variant="secondary"><Search className="h-3 w-3 mr-1" /> Encontrado</Badge>;
      case 'resolved': return <Badge variant="default" className="bg-green-500 hover:bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Resolvido</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Carregando SOS Pets...</p>
      </div>
    );
  }

  return (
    <Card className="p-6">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold text-foreground flex items-center gap-3">
          <PawPrint className="h-7 w-7 text-orange-500" />
          SOS Pet
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Relatório
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Reportar Pet Perdido/Encontrado</DialogTitle>
              <CardDescription>Preencha os detalhes do pet e como entrar em contato.</CardDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pet_name">Nome do Pet *</Label>
                  <Input
                    id="pet_name"
                    value={formData.pet_name}
                    onChange={(e) => setFormData({ ...formData, pet_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="species">Espécie *</Label>
                  <Select
                    value={formData.species}
                    onValueChange={(value) => setFormData({ ...formData, species: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a espécie" />
                    </SelectTrigger>
                    <SelectContent>
                      {SPECIES_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="breed">Raça</Label>
                  <Input
                    id="breed"
                    value={formData.breed}
                    onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                    placeholder="Ex: Labrador, Siamês"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_phone">Telefone de Contato *</Label>
                  <Input
                    id="contact_phone"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="contact_email">E-mail de Contato</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    placeholder="Opcional"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Características, comportamento, etc."
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="last_seen_location">Última Localização Vista</Label>
                  <Input
                    id="last_seen_location"
                    value={formData.last_seen_location}
                    onChange={(e) => setFormData({ ...formData, last_seen_location: e.target.value })}
                    placeholder="Ex: Rua Principal, perto do parque"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    placeholder="Opcional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    placeholder="Opcional"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="image">Foto do Pet</Label>
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                  {imagePreview && (
                    <img src={imagePreview} alt="Prévia do Pet" className="mt-2 h-32 w-32 object-cover rounded-md" />
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  Enviar Relatório
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {pets.length === 0 ? (
          <div className="text-center py-8">
            <PawPrint className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Nenhum relatório SOS Pet
            </h3>
            <p className="text-muted-foreground">
              Seu relatório de pet perdido/encontrado aparecerá aqui.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pets.map((pet) => (
              <Card key={pet.id} className="p-4 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg text-foreground">{pet.pet_name}</h3>
                  {getStatusBadge(pet.status)}
                </div>
                {pet.image_url && (
                  <img src={pet.image_url} alt={pet.pet_name} className="w-full h-48 object-cover rounded-md mb-3" />
                )}
                <p className="text-sm text-muted-foreground mb-2">Espécie: {SPECIES_OPTIONS.find(s => s.value === pet.pet_type)?.label || pet.pet_type}</p>
                {pet.pet_breed && <p className="text-sm text-muted-foreground mb-2">Raça: {pet.pet_breed}</p>}
                {pet.description && <p className="text-sm text-muted-foreground mb-2 truncate">{pet.description}</p>}
                {pet.last_seen_location && <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="h-4 w-4" /> {pet.last_seen_location}</p>}
                <div className="flex items-center gap-2 mt-3">
                  {pet.contact_phone && (
                    <Button asChild size="sm" className="flex-1">
                      <a href={`tel:${pet.contact_phone.replace(/\D/g, '')}`}>
                        <Phone className="h-4 w-4 mr-2" /> Ligar
                      </a>
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SosPetModule;