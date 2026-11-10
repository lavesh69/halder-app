import React, { useState, useEffect } from 'react';
import { NearbyFarmer } from '../../types';
import { ApiClient } from '../../api/client';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDistance } from '../../utils/formatters';
import {
  X,
  MapPin,
  Navigation,
  Phone,
  MessageCircle,
  ShieldCheck,
  Star,
  Sprout,
  Compass,
  Layers,
  ChevronRight,
  ExternalLink,
  Sparkles,
  RotateCcw,
} from 'lucide-react';

interface FarmNearbyMapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RADIUS_OPTIONS = [5, 10, 25, 50, 100];

const CATEGORIES = ['All', 'Vegetables', 'Fruits', 'Grains', 'Dairy', 'Organic'];

export const FarmNearbyMapModal: React.FC<FarmNearbyMapModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { showToast, setSelectedFarmer, farmers, currentLocation } = useApp();

  const [radiusKm, setRadiusKm] = useState<number>(25);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);
  const [availableTodayOnly, setAvailableTodayOnly] = useState<boolean>(false);
  const [mapViewMode, setMapViewMode] = useState<'radar' | 'osm'>('radar');
  const [locationSearchText, setLocationSearchText] = useState<string>('');
  const [nearbyFarmers, setNearbyFarmers] = useState<NearbyFarmer[]>([]);
  const [selectedFarmerItem, setSelectedFarmerItem] = useState<NearbyFarmer | null>(null);
  const [loading, setLoading] = useState(false);

  // User coordinate center (Default Meerut / Delhi NCR farming belt)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>({
    lat: 28.9845,
    lng: 77.7064,
  });

  const handleManualLocationSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = locationSearchText.trim().toLowerCase();
    if (!query) return;

    // Quick lookup table for major Indian agricultural districts & Mandis
    const knownMandiCoords: Record<string, { lat: number; lng: number }> = {
      meerut: { lat: 28.9845, lng: 77.7064 },
      dehradun: { lat: 30.3165, lng: 78.0322 },
      doiwala: { lat: 30.1772, lng: 78.1256 },
      karnal: { lat: 29.6857, lng: 76.9905 },
      hapur: { lat: 28.7306, lng: 77.7759 },
      muzaffarnagar: { lat: 29.4727, lng: 77.7085 },
      saharanpur: { lat: 29.9671, lng: 77.5510 },
      aligarh: { lat: 27.8974, lng: 78.0880 },
      delhi: { lat: 28.6139, lng: 77.2090 },
      noida: { lat: 28.5355, lng: 77.3910 },
      roorkee: { lat: 29.8543, lng: 77.8880 },
      haridwar: { lat: 29.9457, lng: 78.1642 },
    };

    if (knownMandiCoords[query]) {
      setUserLocation(knownMandiCoords[query]);
      showToast(`Location set to ${locationSearchText}`);
      return;
    }

    try {
      setLoading(true);
      // Query OpenStreetMap Nominatim for Indian district / PIN code
      const osmRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&countrycodes=in&q=${encodeURIComponent(query)}&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await osmRes.json();
      if (Array.isArray(data) && data.length > 0) {
        const found = data[0];
        setUserLocation({ lat: parseFloat(found.lat), lng: parseFloat(found.lon) });
        showToast(`Centered on ${found.display_name.split(',')[0]}`);
      } else {
        showToast(`Location "${locationSearchText}" not found. Try district name or PIN.`);
      }
    } catch {
      showToast('Could not geocode location', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchNearby = async () => {
    try {
      setLoading(true);
      const res = await ApiClient.getNearbyFarmers({
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        radiusKm,
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        verifiedOnly,
      });

      const list: NearbyFarmer[] = Array.isArray(res) ? res : (res as any).farmers || [];
      setNearbyFarmers(list);
      if (list.length > 0 && !selectedFarmerItem) {
        setSelectedFarmerItem(list[0]);
      } else if (list.length === 0) {
        setSelectedFarmerItem(null);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to find nearby farms', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Try HTML5 Geolocation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setUserLocation({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            });
          },
          () => {
            // Keep default NCR farm coordinates
          },
          { timeout: 5000 }
        );
      }
      fetchNearby();
    }
  }, [isOpen, radiusKm, selectedCategory, verifiedOnly]);

  if (!isOpen) return null;

  const handleOpenFarmerProfile = (f: NearbyFarmer) => {
    const fullFarmer = farmers.find((farm) => farm.id === f.id) || {
      id: f.id,
      name: f.name || f.farmerName || 'Local Farmer',
      farmName: f.farmName,
      phone: f.phone,
      rating: f.rating,
      avatar: f.avatar,
      location: f.location,
      distanceKm: f.distanceKm,
    };
    setSelectedFarmer(fullFarmer as any);
    onClose();
  };

  const cleanPhone = (selectedFarmerItem?.phone || '').replace(/[^0-9]/g, '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-4xl bg-white dark:bg-[#1B201D] rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[92vh] animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg text-zinc-900 dark:text-white">
                  Farm Nearby Map (खेत नक्शा)
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                  Haversine GPS Discovery
                </span>
              </div>
              <p className="text-[11px] text-zinc-500">
                Direct farm discovery around {currentLocation || 'Meerut, Uttar Pradesh'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchNearby}
              className="p-1.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
              title="Refresh radar"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Controls Bar: Radius, Search, Category & Map Mode */}
        <div className="p-3 sm:p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/30 flex flex-wrap items-center justify-between gap-2.5">
          {/* Location Manual Search */}
          <form onSubmit={handleManualLocationSearch} className="flex items-center gap-1.5 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-48">
              <input
                type="text"
                value={locationSearchText}
                onChange={(e) => setLocationSearchText(e.target.value)}
                placeholder="Village, district, PIN..."
                className="w-full pl-7 pr-2.5 py-1 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-900 dark:text-white"
              />
              <MapPin className="w-3.5 h-3.5 text-zinc-400 absolute left-2 top-1/2 -translate-y-1/2" />
            </div>
            <button
              type="submit"
              className="px-2.5 py-1 bg-zinc-800 hover:bg-black text-white dark:bg-zinc-700 text-xs font-bold rounded-xl transition"
            >
              Set Location
            </button>
          </form>

          {/* Radius Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Radius:</span>
            <div className="flex items-center gap-1">
              {RADIUS_OPTIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setRadiusKm(r)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition ${
                    radiusKm === r
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  {r} km
                </button>
              ))}
            </div>
          </div>

          {/* Category Pills & Verified Toggle & Map View Switch */}
          <div className="flex items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-900 dark:text-white"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <label className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                className="w-3.5 h-3.5 text-emerald-600 rounded-sm focus:ring-emerald-500"
              />
              <span>Verified</span>
            </label>

            {/* Radar vs OSM Mode Switch */}
            <div className="flex items-center bg-zinc-200/80 dark:bg-zinc-800 p-0.5 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setMapViewMode('radar')}
                className={`px-2 py-0.5 rounded-lg transition ${
                  mapViewMode === 'radar'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                Radar
              </button>
              <button
                type="button"
                onClick={() => setMapViewMode('osm')}
                className={`px-2 py-0.5 rounded-lg transition ${
                  mapViewMode === 'osm'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                Map
              </button>
            </div>
          </div>
        </div>

        {/* Map Viewport & Farmer Preview (Split Layout) */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Left: Viewport (Interactive OpenStreetMap OR Radar Canvas) */}
          {mapViewMode === 'osm' ? (
            <div className="flex-1 relative bg-zinc-900 overflow-hidden min-h-[260px] md:min-h-[420px]">
              <iframe
                title="OpenStreetMap Agricultural Topography"
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="no"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${(selectedFarmerItem?.longitude || userLocation.lng) - 0.12}%2C${(selectedFarmerItem?.latitude || userLocation.lat) - 0.08}%2C${(selectedFarmerItem?.longitude || userLocation.lng) + 0.12}%2C${(selectedFarmerItem?.latitude || userLocation.lat) + 0.08}&layer=mapnik&marker=${selectedFarmerItem?.latitude || userLocation.lat}%2C${selectedFarmerItem?.longitude || userLocation.lng}`}
                className="w-full h-full border-0 filter contrast-105"
              />
              <div className="absolute top-3 left-3 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-3 py-1 rounded-xl border border-zinc-200 dark:border-zinc-700 text-[11px] font-bold text-zinc-800 dark:text-zinc-200 shadow-md flex items-center gap-1.5">
                <Navigation className="w-3 h-3 text-emerald-600" />
                <span>OSM Farm Terrain: {selectedFarmerItem ? (selectedFarmerItem.farmName || selectedFarmerItem.farmerName) : 'Your Region'}</span>
              </div>
            </div>
          ) : (
            <div className="flex-1 relative bg-[#0B1E15] p-4 flex flex-col justify-between overflow-hidden min-h-[260px] md:min-h-[420px]">
              {/* Radar Grid Circles */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                <div className="w-[85%] aspect-square rounded-full border border-emerald-500/40" />
                <div className="w-[60%] aspect-square rounded-full border border-emerald-500/50 absolute" />
                <div className="w-[35%] aspect-square rounded-full border border-emerald-500/60 absolute" />
                <div className="w-[10%] aspect-square rounded-full bg-emerald-500/20 border border-emerald-400 absolute" />
                <div className="w-full h-px bg-emerald-500/30 absolute" />
                <div className="h-full w-px bg-emerald-500/30 absolute" />
              </div>

              {/* User Center Pin */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center pointer-events-none">
                <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg animate-ping absolute" />
                <div className="w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-lg relative z-10" />
                <span className="text-[10px] font-black text-white bg-blue-900/80 px-2 py-0.5 rounded-full mt-1 backdrop-blur-xs">
                  You
                </span>
              </div>

              {/* Floating Top Info */}
              <div className="relative z-10 flex items-center justify-between text-white text-xs">
                <span className="bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 border border-emerald-500/30">
                  <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Found {nearbyFarmers.length} farms within {radiusKm} km</span>
                </span>
              </div>

              {/* Nearby Farm Pins Rendered Spatially */}
              <div className="absolute inset-4 pointer-events-auto">
                {nearbyFarmers.map((f, i) => {
                  const isSelected = selectedFarmerItem?.id === f.id;
                  // Compute deterministic visual offset based on index and distance
                  const angle = (i * (360 / (nearbyFarmers.length || 1))) * (Math.PI / 180);
                  const distanceFactor = Math.min(0.42, 0.15 + (f.distanceKm / (radiusKm || 25)) * 0.28);
                  const posX = 50 + Math.cos(angle) * (distanceFactor * 100);
                  const posY = 50 + Math.sin(angle) * (distanceFactor * 100);

                  return (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFarmerItem(f)}
                      style={{ left: `${posX}%`, top: `${posY}%` }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all group z-20 ${
                        isSelected
                          ? 'bg-amber-400 ring-4 ring-amber-400/50 scale-125'
                          : 'bg-emerald-600 hover:bg-emerald-500 hover:scale-110 shadow-lg'
                      }`}
                      title={`${f.farmName || f.farmerName || f.name} (${f.distanceKm} km)`}
                    >
                      <Sprout className={`w-4 h-4 ${isSelected ? 'text-zinc-950' : 'text-white'}`} />
                      <span className="absolute left-1/2 -bottom-5 -translate-x-1/2 whitespace-nowrap text-[9px] font-bold bg-black/80 text-white px-1.5 py-0.2 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none">
                        {f.farmName || f.farmerName || f.name} • {f.distanceKm} km
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Map Legend */}
              <div className="relative z-10 flex items-center gap-3 text-[11px] text-emerald-200/80 bg-black/40 backdrop-blur-md p-2 rounded-2xl border border-emerald-500/20 max-w-fit">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Your Location
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Active Farm Gate
                </span>
              </div>
            </div>
          )}

          {/* Right: Selected Farm Preview Card */}
          <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-zinc-100 dark:border-zinc-800 p-4 sm:p-5 overflow-y-auto flex flex-col justify-between space-y-4 bg-white dark:bg-[#1B201D]">
            {selectedFarmerItem ? (
              <>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <img
                      src={selectedFarmerItem.avatar || 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=200'}
                      alt={selectedFarmerItem.farmerName || selectedFarmerItem.name}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-600/30 shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-black text-sm text-zinc-900 dark:text-white">
                          {selectedFarmerItem.farmerName || selectedFarmerItem.name}
                        </h4>
                        {(selectedFarmerItem.isVerified ?? (selectedFarmerItem.verificationStatus === 'verified')) && (
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        )}
                      </div>
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold">
                        {selectedFarmerItem.farmName || 'Direct Farmland'}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-500">
                        <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                          <Star className="w-3 h-3 fill-amber-400" />
                          {selectedFarmerItem.rating || 4.8}
                        </span>
                        <span>•</span>
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                          {formatDistance(selectedFarmerItem.distanceKm)} away
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/80 text-xs">
                    <span className="text-zinc-500 block mb-0.5">Farm Location:</span>
                    <strong className="text-zinc-800 dark:text-zinc-200">
                      {selectedFarmerItem.location || 'Local Farming Village'}
                    </strong>
                  </div>

                  {/* Top Crops Available */}
                  {selectedFarmerItem.topProducts && selectedFarmerItem.topProducts.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                        Available Produce at Farm Gate:
                      </span>
                      <div className="space-y-1.5">
                        {selectedFarmerItem.topProducts.map((p) => (
                          <div
                            key={p.id}
                            className="p-2 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between text-xs"
                          >
                            <span className="font-bold text-zinc-900 dark:text-white truncate">
                              {p.name}
                            </span>
                            <span className="font-black text-emerald-700 dark:text-emerald-400 shrink-0">
                              {formatCurrency(p.price)}/{p.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Direct Action Toolbar */}
                <div className="space-y-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={`tel:${cleanPhone}`}
                      className="py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-800 dark:text-zinc-200 text-xs font-bold transition flex items-center justify-center gap-1.5"
                      title="Call Farmer directly"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Call</span>
                    </a>

                    <a
                      href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hello ${selectedFarmerItem.farmerName || selectedFarmerItem.name}, I discovered your farm "${selectedFarmerItem.farmName}" on HALDER. I would like to inquire about your produce.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WhatsApp</span>
                    </a>
                  </div>

                  {/* Google Maps Directions */}
                  {selectedFarmerItem.latitude && selectedFarmerItem.longitude && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${selectedFarmerItem.latitude},${selectedFarmerItem.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      <Navigation className="w-3.5 h-3.5 text-blue-600" />
                      <span>Get GPS Directions to Farm</span>
                    </a>
                  )}

                  <button
                    onClick={() => handleOpenFarmerProfile(selectedFarmerItem)}
                    className="w-full py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-soft transition flex items-center justify-center gap-1.5"
                  >
                    <span>View Farm Profile & Listings</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 space-y-2 text-zinc-400">
                <MapPin className="w-10 h-10 text-zinc-300 dark:text-zinc-700 stroke-1" />
                <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                  Select a farm on the map to see crops and contact farmer
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
