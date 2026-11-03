import React, { useState, useEffect } from 'react';
import { fetchAgroWeather, AgroWeatherInfo } from '../../utils/weather';
import { Sun, CloudRain, Wind, Droplets, Sparkles, RefreshCw } from 'lucide-react';

export const WeatherAdvisoryWidget: React.FC<{ city?: string }> = ({ city = 'Dehradun' }) => {
  const [weather, setWeather] = useState<AgroWeatherInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const loadWeather = async () => {
    setLoading(true);
    const data = await fetchAgroWeather(city);
    setWeather(data);
    setLoading(false);
  };

  useEffect(() => {
    loadWeather();
  }, [city]);

  if (!weather && loading) {
    return (
      <div className="p-4 bg-white dark:bg-[#1B201D] rounded-3xl border border-zinc-200 dark:border-zinc-800 animate-pulse text-xs">
        Loading live farm weather...
      </div>
    );
  }

  if (!weather) return null;

  return (
    <div className="p-4 bg-linear-to-br from-emerald-900 to-zinc-900 text-white rounded-3xl shadow-soft space-y-3">
      {/* Top weather row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-white/10 backdrop-blur-xs">
            {weather.rainChance > 30 ? (
              <CloudRain className="w-5 h-5 text-blue-300" />
            ) : (
              <Sun className="w-5 h-5 text-amber-300 animate-spin-slow" />
            )}
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black">{weather.temperature}°C</span>
              <span className="text-xs font-semibold text-emerald-200">{weather.condition}</span>
            </div>
            <span className="text-[10px] text-zinc-300">
              {city} Agro Valley • Live METAR
            </span>
          </div>
        </div>

        <button
          onClick={loadWeather}
          className="w-8 h-8 rounded-full hover:bg-white/10 transition-colors flex items-center justify-center shrink-0"
          title="Refresh Weather"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-zinc-300 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Severe Alert Banner if Active */}
      {weather.severeAlert && (
        <div className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs flex items-center gap-2">
          <Wind className="w-4 h-4 text-amber-300 shrink-0" />
          <span className="font-medium text-[11px] leading-tight">{weather.severeAlert}</span>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2 pt-2 border-t border-white/10 text-center text-[10px]">
        <div className="min-w-0 px-1">
          <span className="text-zinc-300 block truncate">Humidity</span>
          <span className="font-bold text-xs block truncate">{weather.humidity}%</span>
        </div>
        <div className="border-x border-white/10 min-w-0 px-1">
          <span className="text-zinc-300 block truncate">Rain Chance</span>
          <span className="font-bold text-xs block truncate">{weather.rainChance}%</span>
        </div>
        <div className="border-r border-white/10 min-w-0 px-1">
          <span className="text-zinc-300 block truncate">Wind Speed</span>
          <span className="font-bold text-xs block truncate">{weather.windSpeedKmh ?? 8} km/h</span>
        </div>
        <div className="min-w-0 px-1">
          <span className="text-zinc-300 block truncate">Best Harvest</span>
          <span className="font-bold text-[11px] text-emerald-300 block truncate" title={weather.harvestWindow}>
            {weather.harvestWindow.split('—')[0]}
          </span>
        </div>
      </div>

      {/* AI Agro Advisory */}
      <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-xs text-[11px] flex items-start gap-2">
        <Sparkles className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
        <span className="leading-relaxed">{weather.advisory}</span>
      </div>

      {/* Attribution & KVK Advisory Disclaimer */}
      <div className="pt-1 text-[9px] text-zinc-400 border-t border-white/5 space-y-0.5">
        <p className="truncate">Source: {weather.provider || 'Open-Meteo Weather API (WMO Standard)'}</p>
        <p className="italic text-zinc-400/80 leading-normal">
          {weather.disclaimer || 'Agronomic advisory estimates are computer-assisted. Consult local Krishi Vigyan Kendra (KVK) extension officers for high-impact decisions.'}
        </p>
      </div>
    </div>
  );
};
