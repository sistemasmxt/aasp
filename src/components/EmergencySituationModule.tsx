"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CloudLightning, Plus, MapPin, Loader2, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { mapErrorToUserMessage } from '@/lib/errorHandler';
import { emergencyAlertSchema } from '@/lib/validationSchemas';
import { z } from 'zod';
import { Tables } from '@/integrations/supabase/types';
import { Badge } from '@/components/ui/badge';

type EmergencyAlert = Tables<'emergency_alerts'>;

const ALERT_TYPES = [
  { value: 'natural_disaster', label: 'Desastre Natural' },
  { value: 'critical_event', label: 'Evento Crítico' },
  { value: 'infrastructure_failure', label: 'Falha de Infraestrutura' },
  { value: 'other_emergency', label: 'Outra Emergência' },
];

const EmergencySituationModule = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    alert_type: '',
    message: '',
    latitude: '',
    longitude: '',
  });

  useEffect(() => {
    fetchEmergencyAlerts();
  }, []);

  const fetchEmergencyAlerts = async () => {
    setLoading(true);
    try {
      // Fetch only alerts created by the current user
      const { data, error } = await supabase
        .from('emergency_alerts')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar alertas de situação de emergência',
        description: mapErrorToUserMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString(),
          }));
          toast({
            title: 'Localização obtida!',
            description: 'Latitude e Longitude preenchidas automaticamente.',
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          toast({
            title: 'Erro de localização',
            description: 'Não foi possível obter sua localização. Por favor, insira manualmente.',
            variant: 'destructive',
          });
        }
      );
    } else {
      toast({
        title: 'Localização não suportada',
        description: 'Seu navegador não suporta geolocalização.',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: 'Erro', description: 'Você precisa estar logado para enviar um alerta.', variant: 'destructive' });
      return;
    }
    setLoading(true);

    try {
      const validatedData = emergencyAlertSchema.parse({
        ...formData,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        alert_type: formData.alert_type || 'other_emergency', // Default if not selected
      });

      const { error } = await supabase.from('emergency_alerts').insert({
        user_id: user.id,
        alert_type: validatedData.alert_type,
        message: validatedData.message || null,
        latitude: validatedData.latitude,
        longitude: validatedData.longitude,
        is_active: true,
      });

      if (error) throw error;

      toast({
        title: 'Alerta de Emergência enviado!',
        description: 'Seu alerta foi registrado e a comunidade foi notificada.',
      });

      setDialogOpen(false);
      setFormData({
        alert_type: '', message: '', latitude: '', longitude: '',
      });
      fetchEmergencyAlerts();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Erro de validação',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erro ao enviar alerta de emergência',
          description: mapErrorToUserMessage(error),
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (isActive: boolean, resolvedAt: string | null) => {
    if (resolvedAt) {
      return <Badge variant="default" className="bg-green-500 hover:bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Resolvido</Badge>;
    }
    if (isActive) {
      return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" /> Ativo</Badge>;
    }
    return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Inativo</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Carregando situações de emergência...</p>
      </div>
    );
  }

  return (
    <Card className="p-6">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold text-foreground flex items-center gap-3">
          <CloudLightning className="h-7 w-7 text-yellow-400" />
          Situação de Emergência
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Alerta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Reportar Situação de Emergência</DialogTitle>
              <CardDescription>Informe sobre desastres naturais, eventos críticos ou outras emergências.</CardDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="alert_type">Tipo de Alerta *</Label>
                  <Select
                    value={formData.alert_type}
                    onValueChange={(value) => setFormData({ ...formData, alert_type: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo de alerta" />
                    </SelectTrigger>
                    <SelectContent>
                      {ALERT_TYPES.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="message">Mensagem / Detalhes *</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Descreva a situação de emergência."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitude *</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    required
                    placeholder="Ex: -27.59"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitude *</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    required
                    placeholder="Ex: -48.54"
                  />
                </div>
                <div className="md:col-span-2">
                  <Button type="button" variant="outline" onClick={handleGetLocation} className="w-full">
                    <MapPin className="h-4 w-4 mr-2" />
                    Obter Localização Atual
                  </Button>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  Enviar Alerta
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <CloudLightning className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Nenhum alerta de emergência enviado
            </h3>
            <p className="text-muted-foreground">
              Seus alertas de situação de emergência aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alerts.map((alert) => (
              <Card key={alert.id} className="p-4 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg text-foreground">
                    {ALERT_TYPES.find(t => t.value === alert.alert_type)?.label || alert.alert_type}
                  </h3>
                  {getStatusBadge(alert.is_active, alert.resolved_at)}
                </div>
                <p className="text-sm text-muted-foreground mb-2 truncate">{alert.message}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-auto">
                  <MapPin className="h-4 w-4" /> Lat: {alert.latitude.toFixed(4)}, Lng: {alert.longitude.toFixed(4)}
                </p>
                <p className="text-xs text-muted-foreground">Enviado em: {new Date(alert.created_at).toLocaleDateString('pt-BR')}</p>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EmergencySituationModule;