export interface AgroWeatherInfo {
  temperature: number;
  humidity: number;
  windSpeedKmh: number;
  condition: string;
  rainChance: number;
  severeAlert: string | null;
  advisory: string;
  harvestWindow: string;
  source: 'live_upstream' | 'cache' | 'safe_fallback';
  provider: string;
  forecastTimestamp: string;
  disclaimer: string;
  cachedAt?: string;
}

interface CacheEntry {
  data: AgroWeatherInfo;
  expiresAt: number;
}

const AGRONOMIC_DISCLAIMER =
  'Agronomic advisories are computer-assisted estimates based on meteorological model forecasts. Consult your local Krishi Vigyan Kendra (KVK) or certified agricultural extension officer for high-impact farm decisions.';

class WeatherService {
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

  public async getAgroWeather(city: string = 'Dehradun', customLat?: number, customLng?: number): Promise<AgroWeatherInfo> {
    const normalizedCity = city.trim().toLowerCase();
    const cacheKey = customLat && customLng ? `${customLat.toFixed(2)},${customLng.toFixed(2)}` : normalizedCity;
    const now = Date.now();

    // 1. Check in-memory cache
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return { ...cached.data, source: 'cache' };
    }

    // 2. Resolve coordinates (custom GPS or all-India agricultural hubs)
    let coords: { lat: number; lng: number };

    if (customLat && customLng && !isNaN(customLat) && !isNaN(customLng)) {
      coords = { lat: customLat, lng: customLng };
    } else if (normalizedCity.includes('delhi')) {
      coords = { lat: 28.6139, lng: 77.2090 };
    } else if (normalizedCity.includes('punjab') || normalizedCity.includes('ludhiana')) {
      coords = { lat: 30.9010, lng: 75.8573 };
    } else if (normalizedCity.includes('karnal') || normalizedCity.includes('haryana')) {
      coords = { lat: 29.6857, lng: 76.9905 };
    } else if (normalizedCity.includes('nashik') || normalizedCity.includes('grape')) {
      coords = { lat: 19.9975, lng: 73.7898 };
    } else if (normalizedCity.includes('pune')) {
      coords = { lat: 18.5204, lng: 73.8567 };
    } else if (normalizedCity.includes('mumbai') || normalizedCity.includes('maharashtra')) {
      coords = { lat: 19.0760, lng: 72.8777 };
    } else if (normalizedCity.includes('jaipur') || normalizedCity.includes('rajasthan')) {
      coords = { lat: 26.9124, lng: 75.7873 };
    } else if (normalizedCity.includes('ahmedabad') || normalizedCity.includes('gujarat')) {
      coords = { lat: 23.0225, lng: 72.5714 };
    } else if (normalizedCity.includes('lucknow') || normalizedCity.includes('up')) {
      coords = { lat: 26.8467, lng: 80.9462 };
    } else if (normalizedCity.includes('varanasi')) {
      coords = { lat: 25.3176, lng: 82.9739 };
    } else if (normalizedCity.includes('patna') || normalizedCity.includes('bihar')) {
      coords = { lat: 25.5941, lng: 85.1376 };
    } else if (normalizedCity.includes('indore') || normalizedCity.includes('bhopal') || normalizedCity.includes('mp')) {
      coords = { lat: 22.7196, lng: 75.8577 };
    } else if (normalizedCity.includes('bengaluru') || normalizedCity.includes('bangalore') || normalizedCity.includes('karnataka')) {
      coords = { lat: 12.9716, lng: 77.5946 };
    } else if (normalizedCity.includes('hyderabad') || normalizedCity.includes('telangana')) {
      coords = { lat: 17.3850, lng: 78.4867 };
    } else if (normalizedCity.includes('kolkata') || normalizedCity.includes('bengal')) {
      coords = { lat: 22.5726, lng: 88.3639 };
    } else if (normalizedCity.includes('rishi')) {
      coords = { lat: 30.0869, lng: 78.2676 };
    } else if (normalizedCity.includes('haridwar')) {
      coords = { lat: 29.9457, lng: 78.1642 };
    } else if (normalizedCity.includes('nainital') || normalizedCity.includes('haldwani')) {
      coords = { lat: 29.2183, lng: 79.5130 };
    } else if (normalizedCity.includes('mussoorie')) {
      coords = { lat: 30.4598, lng: 78.0644 };
    } else {
      coords = { lat: 30.3165, lng: 78.0322 }; // Dehradun default
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation&daily=precipitation_probability_max&timezone=auto`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json() as any;
        const temp = Math.round(json.current?.temperature_2m ?? 24);
        const hum = Math.round(json.current?.relative_humidity_2m ?? 60);
        const wind = Math.round(json.current?.wind_speed_10m ?? 8);
        const rainProb = json.daily?.precipitation_probability_max?.[0] ?? 10;

        let cond = 'Clear & Sunny';
        if (rainProb > 40) cond = 'Scattered Rain';
        else if (temp > 30) cond = 'Warm & Dry';
        else if (hum > 75) cond = 'Humid Morning';

        let severeAlert: string | null = null;
        if (wind > 35) {
          severeAlert = `High Wind Alert: Gusts up to ${wind} km/h detected. Secure polyhouses and support tall trellis crops.`;
        } else if (rainProb > 70) {
          severeAlert = `Heavy Rain Warning: ${rainProb}% precipitation forecast. Open drainage trenches to prevent waterlogging.`;
        }

        let adv = 'Optimal morning soil moisture. Pluck tomatoes, spinach & greens early for crispness.';
        if (rainProb > 50) adv = 'High rainfall probability. Keep harvested crops covered with tarpaulins.';
        else if (temp > 32) adv = 'High afternoon heat predicted. Complete harvesting before 8:30 AM.';

        const weatherData: AgroWeatherInfo = {
          temperature: temp,
          humidity: hum,
          windSpeedKmh: wind,
          condition: cond,
          rainChance: rainProb,
          severeAlert,
          advisory: adv,
          harvestWindow: '5:00 AM — 8:30 AM',
          source: 'live_upstream',
          provider: 'Open-Meteo Weather API (WMO Standard)',
          forecastTimestamp: new Date().toISOString(),
          disclaimer: AGRONOMIC_DISCLAIMER,
          cachedAt: new Date().toISOString(),
        };

        this.cache.set(normalizedCity, {
          data: weatherData,
          expiresAt: now + this.CACHE_TTL_MS,
        });

        return weatherData;
      }
    } catch {
      console.warn(`[WeatherService] Upstream weather query failed for ${city}, using reliable agro fallback.`);
    }

    // 3. Fallback reliable agro-weather for Uttarakhand agro valleys
    const fallback: AgroWeatherInfo = {
      temperature: 24,
      humidity: 58,
      windSpeedKmh: 10,
      condition: 'Pleasant & Sunny',
      rainChance: 12,
      severeAlert: null,
      advisory: 'Optimal soil moisture. Pluck tomatoes & greens early for peak crunchiness.',
      harvestWindow: '5:00 AM — 8:30 AM',
      source: 'safe_fallback',
      provider: 'Open-Meteo Weather API (WMO Standard)',
      forecastTimestamp: new Date().toISOString(),
      disclaimer: AGRONOMIC_DISCLAIMER,
      cachedAt: new Date().toISOString(),
    };

    return fallback;
  }
}

export const weatherService = new WeatherService();
