import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { supabase } from '@/integrations/supabase/client';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Camera {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  is_active: boolean;
  ip_address: string;
}

const Map = () => {
  const [cameras, setCameras] = useState<Camera[]>([]);

  useEffect(() => {
    fetchCameras();
  }, []);

  const fetchCameras = async () => {
    const { data, error } = await supabase
      .from('cameras')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Erro ao buscar câmeras:', error);
      return;
    }

    if (data) {
      setCameras(data as Camera[]);
    }
  };

  // Centro do Sul do Brasil (aproximadamente Paraná)
  const center: [number, number] = [-27.0, -50.0];

  return (
    <div className="h-[600px] w-full rounded-lg overflow-hidden border border-border">
      <MapContainer
        center={center}
        zoom={7}
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {cameras.map((camera) => (
          <Marker
            key={camera.id}
            position={[Number(camera.latitude), Number(camera.longitude)]}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold text-foreground">{camera.name}</h3>
                <p className="text-sm text-muted-foreground">IP: {camera.ip_address}</p>
                <p className="text-sm text-muted-foreground">
                  Status: {camera.is_active ? 'Ativa' : 'Inativa'}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default Map;
