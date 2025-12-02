"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Cloud, Thermometer, Droplet, Wind, AlertTriangle, MapPin, CalendarDays, Clock, Sun, CloudRain, CloudSnow, CloudLightning, CloudFog, Maximize2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { mapErrorToUserMessage } from '@/lib/errorHandler';
import { Tables, Constants } from '@/integrations/supabase/types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type WeatherAlert = Tables<'weather_alerts'>;
type WeatherAlertType = Constants['public']['Enums']['weather_alert_type_enum'];
type WeatherAlertSeverity = Constants['public']['Enums']['weather_alert_severity_enum'];

interface CurrentWeather {
  temp: number;
  feels_like: number;
  humidity: number;
  wind_speed: number;
  description: string;
  icon: string;
  city_name: string;
}

interface ForecastItem {
  dt: number;
  temp: { day: number };
  weather: [{ description: string; icon: string }];
}

const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
const WEATHER_LOCATION_LAT = import.meta.env.VITE_WEATHER_LOCATION_LAT;
const WEATHER_LOCATION_LON = import.meta.env.VITE_WEATHER_LOCATION_LON;

const WeatherDashboard = () => {
  const { toast } = useToast();
  const [currentWeather, setCurrentWeather] = useState<CurrentWeather | null>(null);
  const [forecast, setForecast] = useState<ForecastItem[]>([]);
  const [weatherAlerts, setWeatherAlerts] = useState<WeatherAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  const locationLat = parseFloat(WEATHER_LOCATION_LAT || '-27.59');
  const locationLon = parseFloat(WEATHER_LOCATION_LON || '-48.54');
  const locationName = "Localização Monitorada";

  useEffect(() => {
    if (!OPENWEATHER_API_KEY || isNaN(locationLat) || isNaN(locationLon)) {
      toast({
        title: 'Erro de Configuração',
        description: 'Chave da API OpenWeatherMap ou coordenadas de localização não configuradas. Verifique seu arquivo .env.',
        variant: 'destructive',
        duration: 10000,
      });
      setLoading(false);
      return;
    }

    fetchWeatherData();
    fetchWeatherAlerts();

    const channel = supabase
      .channel('weather_alerts_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'weather_alerts',
        },
        (payload) => {
          const newAlert = payload.new as WeatherAlert;
          setWeatherAlerts((prev) => [newAlert, ...prev]);
          toast({
            title: `⚠️ Novo Alerta Meteorológico: ${getAlertTypeLabel(newAlert.alert_type)}`,
            description: newAlert.message,
            variant: 'destructive',
            duration: 10000,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'weather_alerts',
        },
        (payload) => {
          const updatedAlert = payload.new as WeatherAlert;
          setWeatherAlerts((prev) =>
            prev.map((alert) => (alert.id === updatedAlert.id ? updatedAlert : alert))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast, locationLat, locationLon]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [locationLat, locationLon],
      zoom: 10,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    (mapRef as any).current = map;
    (markersLayerRef as any).current = markersLayer;

    return () => {
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
    };
  }, [locationLat, locationLon]);

  useEffect(() => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    const defaultIcon = L.icon({
      iconUrl: '/marker-icon.png',
      iconRetinaUrl: '/marker-icon-2x.png',
      shadowUrl: '/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    L.marker([locationLat, locationLon], { icon: defaultIcon })
      .bindPopup(`<b>${locationName}</b><br>Localização Monitorada`)
      .addTo(markersLayer);

    weatherAlerts.filter(alert => alert.is_active).forEach(alert => {
      const alertIcon = L.icon({
        iconUrl: '/img/icones/alert-marker.png',
        iconRetinaUrl: '/img/icones/alert-marker-2x.png',
        shadowUrl: '/marker-shadow.png',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -28],
        shadowSize: [41, 41],
      });

      L.marker([alert.latitude, alert.longitude], { icon: alertIcon })
        .bindPopup(`<b>Alerta: ${getAlertTypeLabel(alert.alert_type)}</b><br>${alert.message}<br>Severidade: ${getSeverityLabel(alert.severity)}`)
        .addTo(markersLayer);
    });

    map.setView([locationLat, locationLon], 10);
  }, [weatherAlerts, locationLat, locationLon]);

  const fetchWeatherData = async () => {
    setLoading(true);
    try {
      const currentResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${locationLat}&lon=${locationLon}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=pt_br`
      );
      const currentData = await currentResponse.json();

      if (currentData.cod !== 200) {
        throw new Error(currentData.message || 'Erro ao buscar clima atual');
      }

      setCurrentWeather({
        temp: currentData.main.temp,
        feels_like: currentData.main.feels_like,
        humidity: currentData.main.humidity,
        wind_speed: currentData.wind.speed,
        description: currentData.weather[0].description,
        icon: currentData.weather[0].icon,
        city_name: currentData.name,
      });

      const forecastResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast/daily?lat=${locationLat}&lon=${locationLon}&cnt=5&appid=${OPENWEATHER_API_KEY}&units=metric&lang=pt_br`
      );
      const forecastData = await forecastResponse.json();

      if (forecastData.cod !== '200') {
        throw new Error(forecastData.message || 'Erro ao buscar previsão do tempo');
      }

      setForecast(forecastData.list);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar dados do clima',
        description: mapErrorToUserMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchWeatherAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('weather_alerts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWeatherAlerts(data || []);
    } catch (error: any) {
      console.error('Error fetching weather alerts:', error);
      toast({
        title: 'Erro ao carregar alertas meteorológicos',
        description: mapErrorToUserMessage(error),
        variant: 'destructive',
      });
    }
  };

  const getWeatherIconUrl = (iconCode: string) => `https://openweathermap.org/img/wn/${iconCode}@2x.png`;

  const getAlertTypeLabel = (type: WeatherAlertType) => {
    switch (type) {
      case 'strong_wind': return 'Vento Forte';
      case 'heavy_rain': return 'Chuva Intensa';
      case 'extreme_temperature': return 'Temperatura Extrema';
      case 'storm': return 'Tempestade';
      case 'other': return 'Outro Alerta';
      default: return 'Alerta Desconhecido';
    }
  };

  const getSeverityLabel = (severity: WeatherAlertSeverity) => {
    switch (severity) {
      case 'low': return 'Baixa';
      case 'medium': return 'Média';
      case 'high': return 'Alta';
      case 'critical': return 'Crítica';
      default: return 'Desconhecida';
    }
  };

  const getSeverityColor = (severity: WeatherAlertSeverity) => {
    switch (severity) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-orange-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const handleFullscreenMap = () => {
    if (mapContainerRef.current) {
      if (mapContainerRef.current.requestFullscreen) {
        mapContainerRef.current.requestFullscreen();
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Carregando dados meteorológicos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Cloud className="h-7 w-7 text-blue-400" />
            Clima Atual em {currentWeather?.city_name || locationName}
          </CardTitle>
          <Button onClick={fetchWeatherData} variant="outline" disabled={loading}>
            <Loader2 className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </CardHeader>
        <CardContent>
          {currentWeather ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
              <div className="flex items-center gap-4">
                <img src={getWeatherIconUrl(currentWeather.icon)} alt={currentWeather.description} className="w-20 h-20" />
                <div>
                  <p className="text-5xl font-bold text-foreground">{currentWeather.temp.toFixed(0)}°C</p>
                  <p className="text-muted-foreground capitalize">{currentWeather.description}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Thermometer className="h-5 w-5" />
                  Sensação: {currentWeather.feels_like.toFixed(0)}°C
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Droplet className="h-5 w-5" />
                  Umidade: {currentWeather.humidity}%
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Wind className="h-5 w-5" />
                  Vento: {currentWeather.wind_speed.toFixed(1)} m/s
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-5 w-5" />
                  Lat: {locationLat.toFixed(2)}, Lon: {locationLon.toFixed(2)}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">Não foi possível carregar os dados do clima atual.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            Previsão para 5 Dias
          </CardTitle>
        </CardHeader>
        <CardContent>
          {forecast.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {forecast.map((day, index) => (
                <Card key={index} className="p-4 text-center">
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    {new Date(day.dt * 1000).toLocaleDateString('pt-BR', { weekday: 'short' })}
                  </p>
                  <img src={getWeatherIconUrl(day.weather[0].icon)} alt={day.weather[0].description} className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-lg font-bold text-foreground">{day.temp.day.toFixed(0)}°C</p>
                  <p className="text-xs text-muted-foreground capitalize">{day.weather[0].description}</p>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">Não foi possível carregar a previsão do tempo.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            Alertas Meteorológicos Ativos
          </CardTitle>
          <Button onClick={fetchWeatherAlerts} variant="outline" disabled={loading}>
            <Loader2 className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar Alertas
          </Button>
        </CardHeader>
        <CardContent>
          {weatherAlerts.length > 0 ? (
            <div className="space-y-4">
              {weatherAlerts.map((alert) => (
                <Card key={alert.id} className="p-4 border-l-4 border-destructive">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      {getAlertTypeLabel(alert.alert_type)}
                    </h3>
                    <Badge className={getSeverityColor(alert.severity)}>
                      Severidade: {getSeverityLabel(alert.severity)}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mb-2">{alert.message}</p>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <p className="flex items-center gap-1">
                      <Clock className="h-4 w-4" /> Início: {new Date(alert.start_time).toLocaleString('pt-BR')}
                    </p>
                    {alert.end_time && (
                      <p className="flex items-center gap-1">
                        <Clock className="h-4 w-4" /> Fim: {new Date(alert.end_time).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">Nenhum alerta meteorológico ativo no momento.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <MapPin className="h-6 w-6 text-primary" />
            Mapa de Alertas
          </CardTitle>
          <Button onClick={handleFullscreenMap} variant="outline" size="icon">
            <Maximize2 className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full rounded-lg overflow-hidden border border-border">
            <div ref={mapContainerRef} className="h-full w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WeatherDashboard;