import React, { useState } from 'react';
import { MapPin, X, Check, Navigation, Building2, Compass } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const popularLocations = [
  { city: 'All India', area: 'All India (सभी राज्य)' },
  { city: 'Delhi NCR', area: 'Connaught Place & NCR, Delhi' },
  { city: 'Gurugram', area: 'Cyber City & Sohna Rd, Gurugram' },
  { city: 'Noida', area: 'Sector 18 & Greater Noida' },
  { city: 'Mumbai', area: 'Andheri & Navi Mumbai' },
  { city: 'Bengaluru', area: 'Indiranagar & Whitefield, Bengaluru' },
  { city: 'Chandigarh', area: 'Sector 17 & Mohali, Punjab' },
  { city: 'Karnal', area: 'GT Road Mandi, Karnal, Haryana' },
  { city: 'Lucknow', area: 'Hazratganj & Gomti Nagar, Lucknow' },
  { city: 'Jaipur', area: 'Mansarovar & Tonk Road, Jaipur' },
  { city: 'Ahmedabad', area: 'SG Highway & Sanand, Ahmedabad' },
  { city: 'Pune', area: 'Kothrud & Hadapsar, Pune' },
  { city: 'Hyderabad', area: 'Hitec City & Shamshabad, Hyderabad' },
  { city: 'Dehradun', area: 'Rajpur Road, Dehradun' },
  { city: 'Rishikesh', area: 'Tapovan Valley, Rishikesh' },
  { city: 'Haridwar', area: 'Kankhal Agro Corridor, Haridwar' },
];

export const LocationModal: React.FC = () => {
  const {
    isLocationModalOpen,
    setIsLocationModalOpen,
    currentLocation,
    setCurrentLocation,
    setActiveCity,
    searchRadiusKm,
    setSearchRadiusKm,
    showToast,
  } = useApp();

  const [customInput, setCustomInput] = useState('');

  if (!isLocationModalOpen) return null;

  const handleSelect = (area: string, city: string) => {
    setCurrentLocation(area);
    setActiveCity(city);
    setIsLocationModalOpen(false);
    showToast(`📍 Location set to ${area}`);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customInput.trim()) {
      handleSelect(customInput.trim(), customInput.split(',')[1]?.trim() || 'Local Market');
      setCustomInput('');
    }
  };

  const handleUseGPS = () => {
    if ('geolocation' in navigator) {
      showToast('🛰️ Requesting device GPS coordinates...');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(4);
          const lng = pos.coords.longitude.toFixed(4);
          handleSelect(`GPS (${lat}, ${lng}), Dehradun`, 'Dehradun');
          showToast(`🛰️ GPS Location synced: ${lat}, ${lng}`);
        },
        () => {
          handleSelect('Rajpur Road (GPS Fallback), Dehradun', 'Dehradun');
        },
        { timeout: 5000 }
      );
    } else {
      handleSelect('Rajpur Road, Dehradun', 'Dehradun');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs animate-fade-in p-0 sm:p-4">
      <div
        className="w-full max-w-md bg-white dark:bg-[#1B201D] rounded-t-3xl sm:rounded-3xl shadow-xl border border-zinc-200 dark:border-zinc-800 max-h-[90dvh] flex flex-col overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/80 shrink-0">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-bold text-zinc-900 dark:text-white text-base sm:text-lg">
              Set Your Location
            </h3>
          </div>
          <button
            onClick={() => setIsLocationModalOpen(false)}
            className="p-2 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Use Current GPS Location */}
          <button
            onClick={handleUseGPS}
            className="w-full min-h-[44px] flex items-center justify-between p-3.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 rounded-2xl border border-emerald-200 dark:border-emerald-800/40 font-bold hover:bg-emerald-100 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Navigation className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-pulse" />
              <span className="truncate">Use Current Device Location (Live GPS)</span>
            </div>
            <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full shrink-0">GPS</span>
          </button>

          {/* Geo-Radius 300 km Range Selector */}
          <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5 text-xs">
                <Compass className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Farm Discovery Radius (खेत खोज दायरा)
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold text-[10px]">
                {searchRadiusKm} km
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Direct farm deliveries within your selected regional zone.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { r: 15, label: '15 km', desc: 'Hyperlocal' },
                { r: 50, label: '50 km', desc: 'District' },
                { r: 150, label: '150 km', desc: 'State' },
                { r: 300, label: '300 km', desc: 'Regional' },
              ].map((pill) => (
                <button
                  key={pill.r}
                  type="button"
                  onClick={() => {
                    setSearchRadiusKm(pill.r);
                    showToast(`📍 Discovery radius set to ${pill.r} km (${pill.desc})`);
                  }}
                  className={`min-h-[44px] py-2 px-1.5 rounded-xl text-center transition-all ${
                    searchRadiusKm === pill.r
                      ? 'bg-emerald-600 text-white font-bold shadow-xs'
                      : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:border-emerald-300'
                  }`}
                >
                  <div className="text-xs font-bold leading-tight">{pill.label}</div>
                  <div className="text-[10px] opacity-80 leading-tight mt-0.5">{pill.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Search Form */}
          <form onSubmit={handleCustomSubmit} className="space-y-2">
            <label className="font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
              Search City or Nearby Area
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="e.g. Rajpur Road, Dehradun"
                className="flex-1 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={!customInput.trim()}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold rounded-xl transition-colors"
              >
                Set
              </button>
            </div>
          </form>

          {/* Popular Cities and Areas */}
          <div className="space-y-2">
            <label className="font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
              Popular Local Markets
            </label>
            <div className="space-y-1.5">
              {popularLocations.map((loc) => {
                const isSelected = currentLocation === loc.area;
                return (
                  <button
                    key={loc.area}
                    onClick={() => handleSelect(loc.area, loc.city)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-200 dark:border-emerald-800'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="truncate">{loc.area}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
