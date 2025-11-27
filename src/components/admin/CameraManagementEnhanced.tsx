import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Camera, Plus, Trash2, Edit, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { logAudit } from '@/lib/auditLogger';
import { cameraSchema } from '@/lib/validationSchemas'; // Import cameraSchema
import { z } from 'zod';
import { mapErrorToUserMessage } from '@/lib/errorHandler';

interface CameraData {
  id: string;
  name: string;
  ip_address: string;
  latitude: number;
  longitude: number;
  neighborhood: string | null;
  street: string | null;
  city: string | null;
  stream_url: string | null;
  is_active: boolean;
}

const CameraManagementEnhanced = () => {
  const [cameras, setCameras] = useState<CameraData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCamera, setEditingCamera] = useState<CameraData | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    ip_address: '',
    latitude: '',
    longitude: '',
    neighborhood: '',
    street: '',
    city: 'Santa Catarina',
    stream_url: '',
  });

  useEffect(() => {
    fetchCameras();
  }, []);

  const fetchCameras = async () => {
    try {
      const { data, error } = await supabase
        .from('cameras')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCameras(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar câmeras',
        description: mapErrorToUserMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (camera: CameraData) => {
    setEditingCamera(camera);
    setFormData({
      name: camera.name,
      ip_address: camera.ip_address,
      latitude: camera.latitude.toString(),
      longitude: camera.longitude.toString(),
      neighborhood: camera.neighborhood || '',
      street: camera.street || '',
      city: camera.city || 'Santa Catarina',
      stream_url: camera.stream_url || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input using Zod schema
      const validatedData = cameraSchema.parse({
        name: formData.name,
        ip_address: formData.ip_address,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        neighborhood: formData.neighborhood,
        street: formData.street,
        city: formData.city,
        stream_url: formData.stream_url,
      });

      const cameraData = {
        name: validatedData.name,
        ip_address: validatedData.ip_address,
        latitude: validatedData.latitude,
        longitude: validatedData.longitude,
        neighborhood: validatedData.neighborhood || null,
        street: validatedData.street || null,
        city: validatedData.city || null,
        stream_url: validatedData.stream_url || null,
      };

      if (editingCamera) {
        const { error } = await supabase
          .from('cameras')
          .update(cameraData)
          .eq('id', editingCamera.id);

        if (error) throw error;

        await logAudit({
          action: 'UPDATE',
          table_name: 'cameras',
          record_id: editingCamera.id,
          details: cameraData,
        });

        toast({
          title: 'Câmera atualizada!',
          description: 'As informações foram salvas com sucesso.',
        });
      } else {
        const { data, error } = await supabase
          .from('cameras')
          .insert({ ...cameraData, is_active: true })
          .select()
          .single();

        if (error) throw error;

        await logAudit({
          action: 'CREATE',
          table_name: 'cameras',
          record_id: data.id,
          details: cameraData,
        });

        toast({
          title: 'Câmera cadastrada!',
          description: 'A câmera foi adicionada com sucesso.',
        });
      }

      setDialogOpen(false);
      setEditingCamera(null);
      setFormData({
        name: '',
        ip_address: '',
        latitude: '',
        longitude: '',
        neighborhood: '',
        street: '',
        city: 'Santa Catarina',
        stream_url: '',
      });
      fetchCameras();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Erro de validação',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: editingCamera ? 'Erro ao atualizar câmera' : 'Erro ao cadastrar câmera',
          description: mapErrorToUserMessage(error),
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleCamera = async (id: string, currentStatus: boolean) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('cameras')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      await logAudit({
        action: 'UPDATE',
        table_name: 'cameras',
        record_id: id,
        details: { is_active: !currentStatus },
      });

      toast({
        title: 'Status atualizado',
        description: `Câmera ${!currentStatus ? 'ativada' : 'desativada'} com sucesso.`,
      });

      fetchCameras();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar status',
        description: mapErrorToUserMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta câmera?')) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('cameras').delete().eq('id', id);

      if (error) throw error;

      await logAudit({
        action: 'DELETE',
        table_name: 'cameras',
        record_id: id,
      });

      toast({
        title: 'Câmera excluída',
        description: 'A câmera foi removida com sucesso.',
      });

      fetchCameras();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir câmera',
        description: mapErrorToUserMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin inline-block mr-2" /> Carregando câmeras...</div>;
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Camera className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Gerenciar Câmeras</h2>
          <Badge variant="outline">{cameras.length} câmeras</Badge>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingCamera(null);
              setFormData({
                name: '',
                ip_address: '',
                latitude: '',
                longitude: '',
                neighborhood: '',
                street: '',
                city: 'Santa Catarina',
                stream_url: '',
              });
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Câmera
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingCamera ? 'Editar Câmera' : 'Cadastrar Nova Câmera'}
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
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ip_address">IP *</Label>
                  <Input
                    id="ip_address"
                    value={formData.ip_address}
                    onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="neighborhood">Bairro</Label>
                  <Input
                    id="neighborhood"
                    value={formData.neighborhood}
                    onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="street">Rua</Label>
                  <Input
                    id="street"
                    value={formData.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
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
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="stream_url">URL do Stream</Label>
                  <Input
                    id="stream_url"
                    value={formData.stream_url}
                    onChange={(e) => setFormData({ ...formData, stream_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Salvando...' : (editingCamera ? 'Atualizar' : 'Cadastrar')}
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
              <TableHead>Bairro</TableHead>
              <TableHead>Rua</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cameras.map((camera) => (
              <TableRow key={camera.id}>
                <TableCell className="font-medium">{camera.name}</TableCell>
                <TableCell>{camera.neighborhood || '-'}</TableCell>
                <TableCell>{camera.street || '-'}</TableCell>
                <TableCell>{camera.ip_address}</TableCell>
                <TableCell>
                  <Badge variant={camera.is_active ? 'default' : 'secondary'}>
                    {camera.is_active ? 'Ativa' : 'Inativa'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(camera)}
                    disabled={loading}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleCamera(camera.id, camera.is_active)}
                    disabled={loading}
                  >
                    {camera.is_active ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(camera.id)}
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4" />
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

export default CameraManagementEnhanced;