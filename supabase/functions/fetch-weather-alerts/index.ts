import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      auth: {
        persistSession: false,
      },
    }
  );

  try {
    // This function is intended to be called by a scheduled job, not directly by users.
    // For security, you might want to add a secret key check here if it's exposed.
    // For now, we'll assume it's triggered internally or by an authorized system.

    const OPENWEATHER_API_KEY = Deno.env.get('OPENWEATHER_API_KEY');
    const WEATHER_LOCATION_LAT = Deno.env.get('WEATHER_LOCATION_LAT');
    const WEATHER_LOCATION_LON = Deno.env.get('WEATHER_LOCATION_LON');
    const LOCATION_NAME = 'Santa Catarina'; // Default location name

    if (!OPENWEATHER_API_KEY || !WEATHER_LOCATION_LAT || !WEATHER_LOCATION_LON) {
      throw new Error('OpenWeatherMap API key or location coordinates not set in environment variables.');
    }

    const weatherApiUrl = `https://api.openweathermap.org/data/2.5/onecall?lat=${WEATHER_LOCATION_LAT}&lon=${WEATHER_LOCATION_LON}&exclude=minutely,hourly&appid=${OPENWEATHER_API_KEY}&units=metric&lang=pt_br`;

    console.log('Fetching weather data from:', weatherApiUrl);
    const weatherResponse = await fetch(weatherApiUrl);
    if (!weatherResponse.ok) {
      throw new Error(`Failed to fetch weather data: ${weatherResponse.statusText}`);
    }
    const weatherData = await weatherResponse.json();
    console.log('Weather data fetched successfully.');

    const current = weatherData.current;
    const daily = weatherData.daily;

    // Define thresholds for extreme conditions
    const WIND_SPEED_THRESHOLD = 15; // m/s (approx 54 km/h)
    const TEMP_HIGH_THRESHOLD = 35; // Celsius
    const TEMP_LOW_THRESHOLD = 5; // Celsius
    const RAIN_PROB_THRESHOLD = 0.7; // 70% probability of rain

    let activeAlerts: {
      alert_type: string;
      severity: string;
      message: string;
      start_time: string;
      end_time?: string;
    }[] = [];

    // Check current weather for alerts
    if (current.wind_speed > WIND_SPEED_THRESHOLD) {
      activeAlerts.push({
        alert_type: 'strong_wind',
        severity: 'high',
        message: `Ventos fortes de ${current.wind_speed} m/s (${(current.wind_speed * 3.6).toFixed(0)} km/h) na região de ${LOCATION_NAME}.`,
        start_time: new Date(current.dt * 1000).toISOString(),
      });
    }
    if (current.temp > TEMP_HIGH_THRESHOLD) {
      activeAlerts.push({
        alert_type: 'extreme_temperature',
        severity: 'high',
        message: `Temperatura extrema de ${current.temp}°C na região de ${LOCATION_NAME}.`,
        start_time: new Date(current.dt * 1000).toISOString(),
      });
    }
    if (current.temp < TEMP_LOW_THRESHOLD) {
      activeAlerts.push({
        alert_type: 'extreme_temperature',
        severity: 'high',
        message: `Temperatura baixa de ${current.temp}°C na região de ${LOCATION_NAME}.`,
        start_time: new Date(current.dt * 1000).toISOString(),
      });
    }
    if (current.weather[0].main.toLowerCase().includes('rain') && current.rain && current.rain['1h'] > 5) { // 5mm in 1 hour
      activeAlerts.push({
        alert_type: 'heavy_rain',
        severity: 'high',
        message: `Chuva intensa (${current.rain['1h']}mm/h) na região de ${LOCATION_NAME}.`,
        start_time: new Date(current.dt * 1000).toISOString(),
      });
    }
    if (current.weather[0].main.toLowerCase().includes('thunderstorm')) {
      activeAlerts.push({
        alert_type: 'storm',
        severity: 'critical',
        message: `Tempestade com raios na região de ${LOCATION_NAME}.`,
        start_time: new Date(current.dt * 1000).toISOString(),
      });
    }

    // Check daily forecast for future alerts
    for (const day of daily) {
      const forecastDate = new Date(day.dt * 1000);
      const forecastEndTime = new Date(forecastDate);
      forecastEndTime.setHours(23, 59, 59, 999); // End of the day

      if (day.wind_speed > WIND_SPEED_THRESHOLD) {
        activeAlerts.push({
          alert_type: 'strong_wind',
          severity: 'medium',
          message: `Previsão de ventos fortes (${(day.wind_speed * 3.6).toFixed(0)} km/h) para ${forecastDate.toLocaleDateString('pt-BR')} em ${LOCATION_NAME}.`,
          start_time: forecastDate.toISOString(),
          end_time: forecastEndTime.toISOString(),
        });
      }
      if (day.temp.max > TEMP_HIGH_THRESHOLD) {
        activeAlerts.push({
          alert_type: 'extreme_temperature',
          severity: 'medium',
          message: `Previsão de temperatura máxima extrema (${day.temp.max}°C) para ${forecastDate.toLocaleDateString('pt-BR')} em ${LOCATION_NAME}.`,
          start_time: forecastDate.toISOString(),
          end_time: forecastEndTime.toISOString(),
        });
      }
      if (day.temp.min < TEMP_LOW_THRESHOLD) {
        activeAlerts.push({
          alert_type: 'extreme_temperature',
          severity: 'medium',
          message: `Previsão de temperatura mínima baixa (${day.temp.min}°C) para ${forecastDate.toLocaleDateString('pt-BR')} em ${LOCATION_NAME}.`,
          start_time: forecastDate.toISOString(),
          end_time: forecastEndTime.toISOString(),
        });
      }
      if (day.pop > RAIN_PROB_THRESHOLD && day.rain && day.rain > 10) { // High probability and significant rain amount
        activeAlerts.push({
          alert_type: 'heavy_rain',
          severity: 'medium',
          message: `Previsão de chuva forte (${day.rain}mm) para ${forecastDate.toLocaleDateString('pt-BR')} em ${LOCATION_NAME}.`,
          start_time: forecastDate.toISOString(),
          end_time: forecastEndTime.toISOString(),
        });
      }
      if (day.weather[0].main.toLowerCase().includes('thunderstorm')) {
        activeAlerts.push({
          alert_type: 'storm',
          severity: 'high',
          message: `Previsão de tempestade para ${forecastDate.toLocaleDateString('pt-BR')} em ${LOCATION_NAME}.`,
          start_time: forecastDate.toISOString(),
          end_time: forecastEndTime.toISOString(),
        });
      }
    }

    // Deactivate old alerts that are no longer relevant
    await supabaseClient
      .from('weather_alerts')
      .update({ is_active: false })
      .eq('is_active', true);

    // Insert new active alerts
    if (activeAlerts.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('weather_alerts')
        .insert(activeAlerts.map(alert => ({
          ...alert,
          location_name: LOCATION_NAME,
          latitude: parseFloat(WEATHER_LOCATION_LAT),
          longitude: parseFloat(WEATHER_LOCATION_LON),
        })));

      if (insertError) {
        console.error('Error inserting weather alerts:', insertError);
        throw new Error('Failed to insert weather alerts.');
      }
      console.log(`Inserted ${activeAlerts.length} new weather alerts.`);
    } else {
      console.log('No extreme weather conditions detected. No new alerts.');
    }

    return new Response(JSON.stringify({ message: 'Weather data fetched and alerts processed successfully', alerts: activeAlerts.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Edge Function error caught:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});