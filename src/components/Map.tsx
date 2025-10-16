import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Centro do Sul do Brasil (aproximadamente Paraná)
  const center: [number, number] = [-27.0, -50.0];

  // Inicializa o mapa somente no cliente
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center,
      zoom: 7,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors",
    }).addTo(map);

    // Fix para ícones padrão do Leaflet (usa assets do próprio pacote)
    const icon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    // Camada para agrupar e resetar marcadores
    const markersLayer = L.layerGroup().addTo(map);

    // Guarda refs
    ;(mapRef as any).current = map;
    ;(markersLayerRef as any).current = markersLayer;

    // Cleanup ao desmontar
    return () => {
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  // Busca câmeras
  useEffect(() => {
    const fetchCameras = async () => {
      const { data, error } = await supabase
        .from('cameras')
        .select('*')
        .eq('is_active', true);

      if (error) {
        console.error('Erro ao buscar câmeras:', error);
        return;
      }

      setCameras((data as Camera[]) || []);
    };

    fetchCameras();
  }, []);

  // Renderiza marcadores quando o mapa e os dados estão prontos
  useEffect(() => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    const bounds = L.latLngBounds([]);

    cameras.forEach((camera) => {
      const lat = Number(camera.latitude);
      const lng = Number(camera.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        const marker = L.marker([lat, lng]);
        marker.bindPopup(
          `<div class="p-2">
            <h3 class="font-semibold">${camera.name}</h3>
            <p class="text-sm">IP: ${camera.ip_address}</p>
            <p class="text-sm">Status: ${camera.is_active ? 'Ativa' : 'Inativa'}</p>
          </div>`
        );
        marker.addTo(markersLayer);
        bounds.extend([lat, lng]);
      }
    });

    // Ajusta o mapa aos marcadores, ou centraliza padrão
    if (cameras.length > 0 && bounds.isValid()) {
      map.fitBounds(bounds.pad(0.1));
    } else {
      map.setView(center, 7);
    }
  }, [cameras]);

  return (
    <div className="h-[600px] w-full rounded-lg overflow-hidden border border-border">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
};

export default Map;
