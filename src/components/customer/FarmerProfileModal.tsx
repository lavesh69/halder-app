import React from 'react';
import { useApp } from '../../context/AppContext';
import { ProductCard } from './ProductCard';
import {
  X,
  Star,
  MapPin,
  ShieldCheck,
  Calendar,
  CheckCircle2,
} from 'lucide-react';

export const FarmerProfileModal: React.FC = () => {
  const { selectedFarmer, setSelectedFarmer, products } = useApp();

  if (!selectedFarmer) return null;

  const farmerProducts = products.filter(
    (p) => p.farmerId === selectedFarmer.id
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-fade-in">
      <div
        className="w-full max-w-lg bg-white dark:bg-[#1B201D] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 max-h-[92vh] flex flex-col overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cover Photo */}
        <div className="relative w-full h-44 bg-zinc-200 dark:bg-zinc-800 shrink-0">
          <img
            src={selectedFarmer.coverImage || 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&auto=format&fit=crop&q=80'}
            alt={selectedFarmer.farmName}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Close button */}
          <button
            onClick={() => setSelectedFarmer(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Farmer Header Info (Overlapping Cover) */}
        <div className="px-6 -mt-12 relative z-10 flex items-end justify-between">
          <div className="flex items-end gap-3.5">
            <img
              src={selectedFarmer.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160'}
              alt={selectedFarmer.name}
              className="w-20 h-20 rounded-2xl object-cover border-4 border-white dark:border-[#1B201D] shadow-md"
            />
            <div className="pb-1">
              <div className="flex items-center gap-1.5">
                <h3 className="text-xl font-black text-zinc-900 dark:text-white">
                  {selectedFarmer.name}
                </h3>
                {selectedFarmer.verified && (
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                )}
              </div>
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                {selectedFarmer.farmName}
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/60 text-center">
            <div>
              <div className="flex items-center justify-center gap-1 text-sm font-bold text-amber-600 dark:text-amber-400">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>{selectedFarmer.rating}</span>
              </div>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                {selectedFarmer.reviewsCount} reviews
              </span>
            </div>

            <div className="border-x border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center justify-center gap-1 text-sm font-bold text-emerald-700 dark:text-emerald-400">
                <MapPin className="w-4 h-4" />
                <span>{selectedFarmer.distanceKm} km</span>
              </div>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                From your door
              </span>
            </div>

            <div>
              <div className="flex items-center justify-center gap-1 text-sm font-bold text-zinc-800 dark:text-zinc-200">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>{selectedFarmer.joinedYear}</span>
              </div>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                HALDER Member
              </span>
            </div>
          </div>

          {/* Badges */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Trust & Certifications
            </span>
            <div className="flex flex-wrap gap-1.5">
              {selectedFarmer.badges.map((badge, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  {badge}
                </span>
              ))}
            </div>
          </div>

          {/* Bio / Story */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              About the Farm
            </span>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
              {selectedFarmer.bio}
            </p>
          </div>

          {/* Location details */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Farm Location
            </span>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{selectedFarmer.location}</span>
            </p>
          </div>

          {/* Products by this Farmer */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Harvest Available ({farmerProducts.length})
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {farmerProducts.map((product) => (
                <ProductCard key={product.id} product={product} variant="grid" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
