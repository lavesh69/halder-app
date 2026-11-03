export interface AgroWeatherInfo {
  temperature: number;
  humidity: number;
  condition: string;
  rainChance: number;
  advisory: string;
  harvestWindow: string;
  source: 'live_upstream' | 'cache' | 'safe_fallback';
  cachedAt?: string;
}

interface CacheEntry {
  data: AgroWeatherInfo;
  expiresAt: number;
}

class WeatherService {
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

  public async getAgroWeather(city: string = 'Dehradun'): Promise<AgroWeatherInfo> {
    const normalizedCity = city.trim().toLowerCase();
    const now = Date.now();

    // 1. Check in-memory cache
    const cached = this.cache.get(normalizedCity);
    if (cached && cached.expiresAt > now) {
      return { ...cached.data, source: 'cache' };
    }

    // 2. Resolve coordinates
    const coords = normalizedCity.includes('rishi')
      ? { lat: 30.0869, lng: 78.2676 }
      : normalizedCity.includes('haridwar')
      ? { lat: 29.9457, lng: 78.1642 }
      : normalizedCity.includes('mussoorie')
      ? { lat: 30.4598, lng: 78.0644 }
      : { lat: 30.3165, lng: 78.0322 }; // Dehradun default

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&current=temperature_2m,relative_humidity_2m,precipitation&daily=precipitation_probability_max&timezone=auto`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json() as any;
        const temp = Math.round(json.current?.temperature_2m ?? 24);
        const hum = Math.round(json.current?.relative_humidity_2m ?? 60);
        const rainProb = json.daily?.precipitation_probability_max?.[0] ?? 10;

        let cond = 'Clear & Sunny';
        if (rainProb > 40) cond = 'Scattered Rain';
        else if (temp > 30) cond = 'Warm & Dry';
        else if (hum > 75) cond = 'Humid Morning';

        let adv = 'Optimal morning soil moisture. Pluck tomatoes, spinach & greens early for crispness.';
        if (rainProb > 50) adv = 'High rainfall probability. Keep harvested crops covered with tarpaulins.';
        else if (temp > 32) adv = 'High afternoon heat predicted. Complete harvesting before 8:30 AM.';

        const weatherData: AgroWeatherInfo = {
          temperature: temp,
          humidity: hum,
          condition: cond,
          rainChance: rainProb,
          advisory: adv,
          harvestWindow: '5:00 AM — 8:30 AM',
          source: 'live_upstream',
          cachedAt: new Date().toISOString(),
        };

        this.cache.set(normalizedCity, {
          data: weatherData,
          expiresAt: now + this.CACHE_TTL_MS,
        });

        return weatherData;
      }
    } catch (err) {
      console.warn(`[WeatherService] Upstream weather query failed for ${city}, using reliable agro fallback.`);
    }

    // 3. Fallback reliable agro-weather for Uttarakhand agro valleys
    const fallback: AgroWeatherInfo = {
      temperature: 24,
      humidity: 58,
      condition: 'Pleasant & Sunny',
      rainChance: 12,
      advisory: 'Optimal soil moisture. Pluck tomatoes & greens early for peak crunchiness.',
      harvestWindow: '5:00 AM — 8:30 AM',
      source: 'safe_fallback',
      cachedAt: new Date().toISOString(),
    };

    return fallback;
  }
}

export const weatherService = new WeatherService();
