"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MessageSquareOff, Plus, MapPin, Image, Loader2, CheckCircle, Clock, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { mapErrorToUserMessage } from '@/lib/errorHandler';
import { anonymousReportSchema } from '@/lib/validationSchemas';
import { z } from 'zod';
import { Tables } from '@/integrations/supabase/types';
import { Badge } from '@/components/ui/badge';

type AnonymousReport = Tables<'anonymous_reports'>;
type ReportStatus = 'pending' | 'investigating' | 'resolved';

const REPORT_TYPES = [
  { value: 'suspicious_activity', label: 'Atividade Suspeita' },
  { value: 'vandalism', label: 'Vandalismo' },
  { value: 'noise_complaint', label: 'Reclamação de Barulho' },
  { value: 'environmental_crime', label: 'Crime Ambiental' },
  { value: 'other', label: 'Outro' },
];

const AnonymousReportsModule = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<AnonymousReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    report_type: '',
    location_description: '',
    latitude: '',
    longitude: '',
    description: '',
    image_url: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    fetchAnonymousReports();
  }, []);

  const fetchAnonymousReports = async () => {
    setLoading(true);
    try {
      // Users can only see their own reports if they were logged in when submitting
      const { data, error } = await supabase
        .from('anonymous_reports')
        .select('*')
        .eq('reporter_user_id', user?.id) // Filter by current user if available
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar denúncias',
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
    if (!imageFile) return null; // No user check for anonymity

    try {
      const filePath = `anonymous_reports/${Date.now()}-${imageFile.name}`;
      const { data, error } = await supabase.storage
        .from('anonymous_report_images')
        .upload(filePath, imageFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('anonymous_report_images')
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

      const validatedData = anonymousReportSchema.parse({
        ...formData,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        image_url: imageUrl || '',
        report_type: formData.report_type || 'other', // Default if not selected
      });

      const { error } = await supabase.from('anonymous_reports').insert({
        reporter_user_id: user?.id || null, // Link to user if logged in, otherwise truly anonymous
        report_type: validatedData.report_type,
        location_description: validatedData.location_description || null,
        latitude: validatedData.latitude,
        longitude: validatedData.longitude,
        description: validatedData.description,
        image_url: validatedData.image_url || null,
        status: 'pending',
      });

      if (error) throw error;

      toast({
        title: 'Denúncia Anônima enviada!',
        description: 'Sua denúncia foi registrada e será revisada.',
      });

      setDialogOpen(false);
      setFormData({
        report_type: '', location_description: '', latitude: '', longitude: '',
        description: '', image_url: '',
      });
      setImageFile(null);
      setImagePreview(null);
      fetchAnonymousReports();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Erro de validação',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erro ao enviar denúncia',
          description: mapErrorToUserMessage(error),
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: ReportStatus) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Pendente</Badge>;
      case 'investigating': return <Badge variant="default" className="bg-blue-500 hover:bg-blue-500"><Search className="h-3 w-3 mr-1" /> Em Investigação</Badge>;
      case 'resolved': return <Badge variant="default" className="bg-green-500 hover:bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Resolvido</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Carregando denúncias...</p>
      </div>
    );
  }

  return (
    <Card className="p-6">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold text-foreground flex items-center gap-3">
          <MessageSquareOff className="h-7 w-7 text-red-500" />
          Denúncias Anônimas
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Denúncia
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Enviar Denúncia Anônima</DialogTitle>
              <CardDescription>Sua identidade será protegida. Forneça o máximo de detalhes possível.</CardDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="report_type">Tipo de Denúncia *</Label>
                  <Select
                    value={formData.report_type}
                    onValueChange={(value) => setFormData({ ...formData, report_type: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo de denúncia" />
                    </SelectTrigger>
                    <SelectContent>
                      {REPORT_TYPES.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="location_description">Localização do Incidente</Label>
                  <Input
                    id="location_description"
                    value={formData.location_description}
                    onChange={(e) => setFormData({ ...formData, location_description: e.target.value })}
                    placeholder="Ex: Rua X, em frente ao número Y"
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
                  <Label htmlFor="description">Descrição Detalhada *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descreva o incidente com o máximo de detalhes possível."
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="image">Anexar Imagem (Opcional)</Label>
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                  {imagePreview && (
                    <img src={imagePreview} alt="Prévia da Imagem" className="mt-2 h-32 w-32 object-cover rounded-md" />
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  Enviar Denúncia
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {reports.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquareOff className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Nenhuma denúncia enviada
            </h3>
            <p className="text-muted-foreground">
              Suas denúncias anônimas aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports.map((report) => (
              <Card key={report.id} className="p-4 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg text-foreground">
                    {REPORT_TYPES.find(t => t.value === report.report_type)?.label || report.report_type}
                  </h3>
                  {getStatusBadge(report.status)}
                </div>
                {report.image_url && (
                  <img src={report.image_url} alt="Imagem da denúncia" className="w-full h-48 object-cover rounded-md mb-3" />
                )}
                {report.location_description && <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2"><MapPin className="h-4 w-4" /> {report.location_description}</p>}
                <p className="text-sm text-muted-foreground mb-2 truncate">{report.description}</p>
                <p className="text-xs text-muted-foreground mt-auto">Enviado em: {new Date(report.created_at).toLocaleDateString('pt-BR')}</p>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AnonymousReportsModule;