"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Cloud,
  Thermometer,
  Wind,
  Droplet,
  CalendarDays,
  AlertTriangle,
  MapPin,
  Loader2,
  Sun,
  CloudRain,
  CloudLightning,
  CloudSnow,
  CloudFog,
  Moon,
  Sunrise,
  Sunset,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { mapErrorToUserMessage } from '@/lib/errorHandler';
import { Tables, Constants } from '@/integrations/supabase/types';
import { Badge } from '@/components/ui/badge';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type WeatherAlert = Tables<'weather_alerts'>;
type WeatherAlertType = Constants['public']['Enums']['weather_alert_type_enum'];
type WeatherAlertSeverity = Constants['public']['Enums']['weather_alert_severity_enum'];

interface WeatherData {
  current: {
    temp: number;
    feels_like: number;
    humidity: number;
    wind_speed: number;
    weather: {
      description: string;
      icon: string;
      main: string;
    }[];
    sunrise: number;
    sunset: number;
    dt: number;
  };
  daily: {
    dt: number;
    temp: {
      day: number;
      min: number;
      max: number;
    };
    weather: {
      description: string;
      icon: string;
      main: string;
    }[];
    pop: number; // Probability of precipitation
    wind_speed: number;
    humidity: number;
  }[];
}

const LOCATION_LAT = parseFloat(import.meta.env.VITE_WEATHER_LOCATION_LAT || "-27.59");
const LOCATION_LON = parseFloat(import.meta.env.VITE_WEATHER_LOCATION_LON || "-48.54");
const LOCATION_NAME = 'Santa Catarina'; // Hardcoded for now, can be dynamic

const WeatherDashboard = () => {
  const { toast } = useToast();
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherAlerts, setWeatherAlerts] = useState<WeatherAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const mapRef = React.useRef<L.Map | null>(null);
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const markersLayerRef = React.useRef<L.LayerGroup | null>(null);

  const fetchWeatherData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch weather data from the Edge Function (which gets it from OpenWeatherMap)
      // This is a simplified call, in a real app you might have an endpoint to trigger the edge function
      // or the edge function runs on a schedule and populates a table.
      // For this example, we'll simulate fetching from the edge function or a direct API call if needed.
      // For now, we'll rely on the scheduled edge function to populate weather_alerts.
      // We'll fetch current weather and forecast directly from a proxy or a client-side call if API key is public.
      // Since API key is secret, we'll assume the Edge Function populates a table or provides an endpoint.
      // For demonstration, I'll use a placeholder for direct fetch, but the alerts come from DB.

      // Fetch current weather and forecast (simulated or from a public endpoint if available)
      // For a real application, you'd have a serverless function or a proxy to fetch this securely.
      // For now, we'll use a dummy structure or a public API if available without key.
      // Given the prompt, the Edge Function is meant to *generate* alerts, not serve raw weather data to client.
      // So, we'll fetch alerts from DB and display static weather info or a simplified mock.

      // To get real-time weather data on the client, we'd need a client-side API key or a proxy.
      // Let's assume a simplified fetch for display purposes, or focus on alerts from DB.
      // For now, I'll make a direct call to OpenWeatherMap for display, assuming a public key or proxy.
      // This is a compromise for demonstration. In production, use a backend proxy.

      const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
      if (!OPENWEATHER_API_KEY) {
        throw new Error("OpenWeatherMap API key is not set in environment variables.");
      }

      const weatherApiUrl = `https://api.openweathermap.org/data/2.5/onecall?lat=${LOCATION_LAT}&lon=${LOCATION_LON}&exclude=minutely,hourly&appid=${OPENWEATHER_API_KEY}&units=metric&lang=pt_br`;
      const response = await fetch(weatherApiUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch weather data: ${response.statusText}`);
      }
      const data = await response.json();
      setWeatherData(data);

      // Fetch active weather alerts from Supabase
      const { data: alertsData, error: alertsError } = await supabase
        .from('weather_alerts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (alertsError) throw alertsError;
      setWeatherAlerts(alertsData || []);

    } catch (error: any) {
      console.error('Error fetching weather data or alerts:', error);
      toast({
        title: 'Erro ao carregar dados meteorológicos',
        description: mapErrorToUserMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchWeatherData();

    // Setup real-time listener for weather alerts
    const channel = supabase
      .channel('weather_alerts_channel')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'weather_alerts',
        },
        (payload) => {
          console.log('Weather alert change received:', payload);
          fetchWeatherData(); // Re-fetch all data to update alerts
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchWeatherData]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [LOCATION_LAT, LOCATION_LON],
      zoom: 10,
      zoomControl: true,
      scrollWheelZoom: false, // Disable for better UX in a dashboard
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Custom marker icon
    const alertIcon = L.icon({
      iconUrl: '/marker-icon.png', // Reusing existing marker icon
      iconRetinaUrl: '/marker-icon-2x.png',
      shadowUrl: '/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  // Update map with alerts
  useEffect(() => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    // Add a marker for the main monitored location
    L.marker([LOCATION_LAT, LOCATION_LON], { icon: L.icon({
      iconUrl: '/marker-icon.png',
      iconRetinaUrl: '/marker-icon-2x.png',
      shadowUrl: '/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    })})
      .bindPopup(`<b>${LOCATION_NAME}</b><br>Localização Monitorada`)
      .addTo(markersLayer);

    weatherAlerts.forEach(alert => {
      const marker = L.marker([alert.latitude, alert.longitude], { icon: L.icon({
        iconUrl: '/marker-icon.png', // Could use a different icon for alerts
        iconRetinaUrl: '/marker-icon-2x.png',
        shadowUrl: '/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      })});
      marker.bindPopup(`
        <div class="p-2">
          <h3 class="font-semibold text-red-600">🚨 Alerta: ${alert.alert_type.replace(/_/g, ' ').toUpperCase()}</h3>
          <p class="text-sm">${alert.message}</p>
          <p class="text-xs text-muted-foreground">Severidade: ${alert.severity}</p>
          <p class="text-xs text-muted-foreground">Início: ${new Date(alert.start_time).toLocaleString('pt-BR')}</p>
        </div>
      `);
      marker.addTo(markersLayer);
    });
  }, [weatherAlerts]);

  const getWeatherIcon = (iconCode: string, isDay: boolean) => {
    // OpenWeatherMap icon codes: https://openweathermap.org/weather-conditions#Weather-Condition-Codes-2
    const iconMap: Record<string, React.ElementType> = {
      '01d': Sun, '01n': Moon, // clear sky
      '02d': Cloud, '02n': Cloud, // few clouds
      '03d': Cloud, '03n': Cloud, // scattered clouds
      '04d': Cloud, '04n': Cloud, // broken clouds
      '09d': CloudRain, '09n': CloudRain, // shower rain
      '10d': CloudRain, '10n': CloudRain, // rain
      '11d': CloudLightning, '11n': CloudLightning, // thunderstorm
      '13d': CloudSnow, '13n': CloudSnow, // snow
      '50d': CloudFog, '50n': CloudFog, // mist
    };
    const IconComponent = iconMap[iconCode] || Cloud;
    return <IconComponent className="h-12 w-12 text-primary" />;
  };

  const getSeverityBadge = (severity: WeatherAlertSeverity) => {
    switch (severity) {
      case 'low': return <Badge variant="secondary">Baixa</Badge>;
      case 'medium': return <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-500">Média</Badge>;
      case 'high': return <Badge variant="destructive">Alta</Badge>;
      case 'critical': return <Badge variant="destructive" className="bg-red-700 hover:bg-red-700">Crítica</Badge>;
      default: return <Badge variant="secondary">{severity}</Badge>;
    }
  };

  const getAlertTypeLabel = (type: WeatherAlertType) => {
    switch (type) {
      case 'strong_wind': return 'Vento Forte';
      case 'heavy_rain': return 'Chuva Forte';
      case 'extreme_temperature': return 'Temperatura Extrema';
      case 'storm': return 'Tempestade';
      case 'other': return 'Outro';
      default: return type;
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

  const currentWeatherData = weatherData?.current;
  const dailyForecast = weatherData?.daily.slice(1, 6); // Next 5 days

  const isDayTime = currentWeatherData && currentWeatherData.dt > currentWeatherData.sunrise && currentWeatherData.dt < currentWeatherData.sunset;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudLightning className="h-6 w-6 text-primary" />
            Central Meteorológica - {LOCATION_NAME}
          </CardTitle>
          <CardDescription>Informações de clima em tempo real e previsão.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Weather */}
          <Card className="lg:col-span-1 p-4 flex flex-col items-center text-center">
            <CardTitle className="text-xl font-bold mb-2">Agora</CardTitle>
            {currentWeatherData && (
              <>
                {getWeatherIcon(currentWeatherData.weather[0].icon, isDayTime)}
                <p className="text-5xl font-bold text-foreground mt-2">{currentWeatherData.temp.toFixed(0)}°C</p>
                <p className="text-lg text-muted-foreground">{currentWeatherData.weather[0].description}</p>
                <div className="grid grid-cols-2 gap-2 mt-4 w-full text-sm">
                  <div className="flex items-center justify-center gap-1">
                    <Thermometer className="h-4 w-4 text-muted-foreground" />
                    <span>Sensação: {currentWeatherData.feels_like.toFixed(0)}°C</span>
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <Droplet className="h-4 w-4 text-muted-foreground" />
                    <span>Umidade: {currentWeatherData.humidity}%</span>
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <Wind className="h-4 w-4 text-muted-foreground" />
                    <span>Vento: {(currentWeatherData.wind_speed * 3.6).toFixed(0)} km/h</span>
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <Sunrise className="h-4 w-4 text-muted-foreground" />
                    <span>Nascer: {new Date(currentWeatherData.sunrise * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <Sunset className="h-4 w-4 text-muted-foreground" />
                    <span>Pôr: {new Date(currentWeatherData.sunset * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </>
            )}
          </Card>

          {/* 5-Day Forecast */}
          <Card className="lg:col-span-2 p-4">
            <CardTitle className="text-xl font-bold mb-4">Previsão para 5 Dias</CardTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {dailyForecast?.map((day, index) => (
                <Card key={index} className="p-3 flex flex-col items-center text-center">
                  <p className="font-semibold text-sm mb-1">
                    {new Date(day.dt * 1000).toLocaleDateString('pt-BR', { weekday: 'short' })}
                  </p>
                  {getWeatherIcon(day.weather[0].icon, true)} {/* Assuming day icons for forecast */}
                  <p className="text-lg font-bold mt-1">{day.temp.day.toFixed(0)}°C</p>
                  <p className="text-xs text-muted-foreground">{day.weather[0].description}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                    <CloudRain className="h-3 w-3" />
                    <span>{(day.pop * 100).toFixed(0)}%</span>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </CardContent>
      </Card>

      {/* Active Weather Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-6 w-6" />
            Alertas Meteorológicos Ativos
          </CardTitle>
          <CardDescription>Alertas de situações de risco para a região.</CardDescription>
        </CardHeader>
        <CardContent>
          {weatherAlerts.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Nenhum alerta meteorológico ativo no momento.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {weatherAlerts.map((alert) => (
                <Card key={alert.id} className="p-4 border-l-4 border-destructive">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      {getAlertTypeLabel(alert.alert_type)}
                    </h3>
                    {getSeverityBadge(alert.severity)}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{alert.message}</p>
                  <p className="text-xs text-muted-foreground">Início: {new Date(alert.start_time).toLocaleString('pt-BR')}</p>
                  {alert.end_time && (
                    <p className="text-xs text-muted-foreground">Fim: {new Date(alert.end_time).toLocaleString('pt-BR')}</p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Map for Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-6 w-6 text-primary" />
            Mapa de Alertas
          </CardTitle>
          <CardDescription>Localização dos alertas meteorológicos ativos.</CardDescription>
        </CardHeader>
        <CardContent>
          <div ref={mapContainerRef} className="h-[400px] w-full rounded-lg overflow-hidden border border-border" />
        </CardContent>
      </Card>
    </div>
  );
};

export default WeatherDashboard;