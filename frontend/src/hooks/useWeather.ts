import { useState, useEffect } from 'react';

export interface WeatherData {
  date: string;
  weather_code: number;
  temperature_max: number;
  temperature_min: number;
  precipitation_probability: number;
  wind_speed_max: number;
  wind_direction: number;
}

export interface WeatherIcon {
  code: number;
  icon: string;
  description: string;
}

// Mapping dei codici meteo WMO alle icone Lucide
export const weatherIcons: Record<number, WeatherIcon> = {
  0: { code: 0, icon: 'Sun', description: 'Sereno' },
  1: { code: 1, icon: 'Sun', description: 'Prevalentemente sereno' },
  2: { code: 2, icon: 'CloudSun', description: 'Parzialmente nuvoloso' },
  3: { code: 3, icon: 'Cloud', description: 'Nuvoloso' },
  45: { code: 45, icon: 'CloudFog', description: 'Nebbia' },
  48: { code: 48, icon: 'CloudFog', description: 'Nebbia con brina' },
  51: { code: 51, icon: 'CloudDrizzle', description: 'Pioviggine leggera' },
  53: { code: 53, icon: 'CloudDrizzle', description: 'Pioviggine moderata' },
  55: { code: 55, icon: 'CloudDrizzle', description: 'Pioviggine forte' },
  61: { code: 61, icon: 'CloudRain', description: 'Pioggia leggera' },
  63: { code: 63, icon: 'CloudRain', description: 'Pioggia moderata' },
  65: { code: 65, icon: 'CloudRain', description: 'Pioggia forte' },
  71: { code: 71, icon: 'Snowflake', description: 'Neve leggera' },
  73: { code: 73, icon: 'Snowflake', description: 'Neve moderata' },
  75: { code: 75, icon: 'Snowflake', description: 'Neve forte' },
  80: { code: 80, icon: 'CloudRain', description: 'Acquazzoni leggeri' },
  81: { code: 81, icon: 'CloudRain', description: 'Acquazzoni moderati' },
  82: { code: 82, icon: 'CloudRain', description: 'Acquazzoni violenti' },
  95: { code: 95, icon: 'Zap', description: 'Temporale' },
  96: { code: 96, icon: 'Zap', description: 'Temporale con grandine leggera' },
  99: { code: 99, icon: 'Zap', description: 'Temporale con grandine forte' },
};

export const useWeather = (latitude: number = 44.4056, longitude: number = 8.9176) => {
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setLoading(true);
        setError(null);

        // Open-Meteo API gratuita per Arenzano - 10 giorni di previsioni
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Europe/Rome&forecast_days=10`
        );

        if (!response.ok) {
          throw new Error('Errore nel caricamento dati meteo');
        }

        const data = await response.json();
        
        const formattedData: WeatherData[] = data.daily.time.map((date: string, index: number) => ({
          date,
          weather_code: data.daily.weather_code[index],
          temperature_max: Math.round(data.daily.temperature_2m_max[index]),
          temperature_min: Math.round(data.daily.temperature_2m_min[index]),
          precipitation_probability: data.daily.precipitation_probability_max[index] || 0,
        }));

        setWeatherData(formattedData);
      } catch (err) {
        console.error('Error fetching weather:', err);
        setError(err instanceof Error ? err.message : 'Errore sconosciuto');
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
    
    // Aggiorna ogni 5 minuti
    const interval = setInterval(fetchWeather, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [latitude, longitude]);

  const getWeatherIcon = (weatherCode: number): WeatherIcon => {
    return weatherIcons[weatherCode] || weatherIcons[0];
  };

  const getWeatherForDate = (date: string): WeatherData | undefined => {
    return weatherData.find(w => w.date === date);
  };

  return {
    weatherData,
    loading,
    error,
    getWeatherIcon,
    getWeatherForDate,
  };
};