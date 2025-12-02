import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Variáveis de ambiente para a API OpenWeatherMap e localização
const OPENWEATHER_API_KEY = Deno.env.get("OPENWEATHER_API_KEY");
const WEATHER_LOCATION_LAT = Deno.env.get("WEATHER_LOCATION_LAT");
const WEATHER_LOCATION_LON = Deno.env.get("WEATHER_LOCATION_LON");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  }

  if (!OPENWEATHER_API_KEY || !WEATHER_LOCATION_LAT || !WEATHER_LOCATION_LON) {
    console.error("Variáveis de ambiente OPENWEATHER_API_KEY, WEATHER_LOCATION_LAT ou WEATHER_LOCATION_LON não configuradas.");
    return new Response(JSON.stringify({ error: "Configuração de API ou localização ausente." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", // Usar service role key para bypassar RLS
    {
      auth: {
        persistSession: false,
      },
    }
  );

  try {
    // Autenticação (opcional, mas boa prática para funções de backend)
    // const authHeader = req.headers.get('Authorization');
    // if (!authHeader) {
    //   return new Response(JSON.stringify({ error: 'Authorization header missing' }), {
    //     headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    //     status: 401,
    //   });
    // }
    // const token = authHeader.replace('Bearer ', '');
    // const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    // if (authError || !user) {
    //   return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    //     headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    //     status: 401,
    //   });
    // }

    // 1. Buscar dados do clima atual e previsão
    const weatherApiUrl = `https://api.openweathermap.org/data/2.5/onecall?lat=${WEATHER_LOCATION_LAT}&lon=${WEATHER_LOCATION_LON}&exclude=minutely,hourly&appid=${OPENWEATHER_API_KEY}&units=metric&lang=pt_br`;
    const weatherResponse = await fetch(weatherApiUrl);
    const weatherData = await weatherResponse.json();

    if (!weatherResponse.ok) {
      console.error("Erro ao buscar dados do clima:", weatherData);
      throw new Error(weatherData.message || "Falha ao buscar dados do clima.");
    }

    const current = weatherData.current;
    const daily = weatherData.daily;
    const locationName = weatherData.timezone; // Ou buscar de um serviço de geocoding

    const activeAlerts: {
      alert_type: string;
      severity: string;
      message: string;
      end_time?: string;
    }[] = [];

    // Lógica para detectar alertas
    // Vento Forte (ex: > 10 m/s)
    if (current.wind_speed > 10) {
      activeAlerts.push({
        alert_type: "strong_wind",
        severity: "medium",
        message: `Ventos fortes de ${current.wind_speed} m/s esperados.`,
      });
    }
    // Chuva Intensa (ex: > 5mm/h, ou alerta de chuva forte na previsão)
    if (current.rain && current.rain["1h"] > 5) {
      activeAlerts.push({
        alert_type: "heavy_rain",
        severity: "high",
        message: `Chuva intensa de ${current.rain["1h"]} mm/h.`,
      });
    } else if (daily && daily.some((day: any) => day.rain > 10)) { // Previsão de chuva forte
        activeAlerts.push({
            alert_type: "heavy_rain",
            severity: "medium",
            message: "Previsão de chuva forte nos próximos dias.",
        });
    }

    // Temperatura Extrema (ex: < 5°C ou > 35°C)
    if (current.temp < 5) {
      activeAlerts.push({
        alert_type: "extreme_temperature",
        severity: "high",
        message: `Temperatura muito baixa: ${current.temp}°C. Risco de geada.`,
      });
    } else if (current.temp > 35) {
      activeAlerts.push({
        alert_type: "extreme_temperature",
        severity: "high",
        message: `Temperatura muito alta: ${current.temp}°C. Risco de insolação.`,
      });
    }

    // Tempestade (ex: thunder, tornado, etc. nos alertas da OpenWeatherMap)
    if (weatherData.alerts && weatherData.alerts.length > 0) {
        for (const alert of weatherData.alerts) {
            activeAlerts.push({
                alert_type: "storm", // OpenWeatherMap tem tipos mais específicos, mas vamos generalizar
                severity: "critical",
                message: alert.description,
                end_time: new Date(alert.end * 1000).toISOString(),
            });
        }
    } else if (current.weather.some((w: any) => ['Thunderstorm', 'Squall', 'Tornado'].includes(w.main))) {
        activeAlerts.push({
            alert_type: "storm",
            severity: "critical",
            message: `Condições de tempestade: ${current.weather[0].description}.`,
        });
    }


    // 2. Atualizar a tabela weather_alerts no Supabase
    // Primeiro, desativar todos os alertas ativos existentes para esta localização
    await supabaseClient
      .from("weather_alerts")
      .update({ is_active: false, end_time: new Date().toISOString() })
      .eq("latitude", parseFloat(WEATHER_LOCATION_LAT)) // Usar WEATHER_LOCATION_LAT
      .eq("longitude", parseFloat(WEATHER_LOCATION_LON)) // Usar WEATHER_LOCATION_LON
      .eq("is_active", true);

    // Inserir novos alertas ativos
    for (const alert of activeAlerts) {
      await supabaseClient.from("weather_alerts").insert({
        location_name: locationName,
        latitude: parseFloat(WEATHER_LOCATION_LAT),
        longitude: parseFloat(WEATHER_LOCATION_LON),
        alert_type: alert.alert_type,
        severity: alert.severity,
        message: alert.message,
        end_time: alert.end_time || null,
        is_active: true,
      });
    }

    return new Response(JSON.stringify({ message: "Alertas meteorológicos processados com sucesso.", activeAlerts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Erro na função Edge fetch-weather-alerts:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});