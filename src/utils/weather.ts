import { ApiClient } from '../api/client';

export interface AgroWeatherInfo {
  temperature: number;
  humidity: number;
  condition: string;
  rainChance: number;
  windSpeedKmh?: number;
  severeAlert?: string | null;
  advisory: string;
  harvestWindow: string;
  source?: string;
  provider?: string;
  disclaimer?: string;
  cachedAt?: string;
}

export const fetchAgroWeather = async (city = 'Dehradun'): Promise<AgroWeatherInfo> => {
  try {
    const data = await ApiClient.getAgroWeather(city);
    if (data && typeof data.temperature === 'number') {
      return data as AgroWeatherInfo;
    }
  } catch (err) {
    console.warn('[AgroWeather] Backend proxy fetch failed, falling back to local valley estimate:', err);
  }

  // Fallback realistic weather for Dehradun valley if offline
  return {
    temperature: 24,
    humidity: 58,
    condition: 'Pleasant & Sunny',
    rainChance: 12,
    advisory: 'Optimal soil moisture. Pluck tomatoes & greens early for peak crunchiness.',
    harvestWindow: '5:00 AM — 8:30 AM',
    source: 'offline_fallback',
  };
};

