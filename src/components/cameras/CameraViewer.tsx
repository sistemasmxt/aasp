import { X, MapPin, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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

interface CameraViewerProps {
  camera: Camera;
  onClose: () => void;
}

const CameraViewer = ({ camera, onClose }: CameraViewerProps) => {
  const handleFullscreen = () => {
    const videoElement = document.getElementById('camera-stream');
    if (videoElement) {
      if (videoElement.requestFullscreen) {
        videoElement.requestFullscreen();
      }
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">{camera.name}</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {camera.street && <span>{camera.street},</span>}
            <span>{camera.neighborhood || 'Sem bairro'}</span>
            {camera.city && <span>- {camera.city}</span>}
          </div>
          <p className="text-sm text-muted-foreground mt-1">IP: {camera.ip_address}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={camera.is_active ? 'default' : 'secondary'}>
            {camera.is_active ? 'Ativa' : 'Inativa'}
          </Badge>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="relative bg-muted rounded-lg overflow-hidden" id="camera-stream">
        {camera.stream_url ? (
          <div className="relative">
            <iframe
              src={camera.stream_url}
              className="w-full aspect-video"
              allow="autoplay; fullscreen"
              allowFullScreen
              title={`Stream ${camera.name}`}
            />
            <Button
              variant="secondary"
              size="icon"
              className="absolute bottom-4 right-4 z-10"
              onClick={handleFullscreen}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="aspect-video flex items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground mb-2">
                Stream não disponível para esta câmera
              </p>
              <p className="text-sm text-muted-foreground">
                Configure a URL do stream no painel administrativo
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 p-4 bg-muted/50 rounded-lg">
        <h3 className="font-semibold text-foreground mb-2">Informações da Câmera</h3>
        <div className="grid md:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Endereço IP:</span>
            <p className="font-medium">{camera.ip_address}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Coordenadas:</span>
            <p className="font-medium">
              {camera.latitude.toFixed(6)}, {camera.longitude.toFixed(6)}
            </p>
          </div>
          {camera.neighborhood && (
            <div>
              <span className="text-muted-foreground">Bairro:</span>
              <p className="font-medium">{camera.neighborhood}</p>
            </div>
          )}
          {camera.street && (
            <div>
              <span className="text-muted-foreground">Rua:</span>
              <p className="font-medium">{camera.street}</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default CameraViewer;
