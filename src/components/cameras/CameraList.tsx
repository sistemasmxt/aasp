import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Video, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Camera {
  id: string;
  name: string;
  neighborhood: string | null;
  street: string | null;
  city: string | null;
  latitude: number;
  longitude: number;
  is_active: boolean;
  ip_address: string;
  stream_url: string | null;
}

interface CameraListProps {
  onCameraSelect: (camera: Camera) => void;
}

const CameraList = ({ onCameraSelect }: CameraListProps) => {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [groupedCameras, setGroupedCameras] = useState<Record<string, Camera[]>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCameras();
  }, []);

  const fetchCameras = async () => {
    try {
      const { data, error } = await supabase
        .from('cameras')
        .select('*')
        .eq('is_active', true)
        .order('neighborhood', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;

      const camerasData = (data as Camera[]) || [];
      setCameras(camerasData);

      // Group cameras by neighborhood
      const grouped = camerasData.reduce((acc, camera) => {
        const neighborhood = camera.neighborhood || 'Sem Bairro';
        if (!acc[neighborhood]) {
          acc[neighborhood] = [];
        }
        acc[neighborhood].push(camera);
        return acc;
      }, {} as Record<string, Camera[]>);

      setGroupedCameras(grouped);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar câmeras',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Carregando câmeras...</p>
      </div>
    );
  }

  if (cameras.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center">
          <Video className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Nenhuma câmera cadastrada
          </h3>
          <p className="text-muted-foreground">
            As câmeras cadastradas aparecerão aqui
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedCameras).map(([neighborhood, cameras]) => (
        <Card key={neighborhood} className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            {neighborhood}
            <Badge variant="outline" className="ml-2">
              {cameras.length} {cameras.length === 1 ? 'câmera' : 'câmeras'}
            </Badge>
          </h3>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cameras.map((camera) => (
              <Card
                key={camera.id}
                className="p-4 hover:shadow-card transition-shadow cursor-pointer"
                onClick={() => onCameraSelect(camera)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground mb-1">{camera.name}</h4>
                    {camera.street && (
                      <p className="text-sm text-muted-foreground">{camera.street}</p>
                    )}
                  </div>
                  <Badge variant={camera.stream_url ? 'default' : 'secondary'}>
                    {camera.stream_url ? 'Online' : 'Sem stream'}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    IP: {camera.ip_address}
                  </p>
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={!camera.stream_url}
                  >
                    <Video className="h-4 w-4 mr-2" />
                    Ver Transmissão
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
};

export default CameraList;
