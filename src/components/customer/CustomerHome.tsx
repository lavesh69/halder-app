import React from 'react';
import { useApp } from '../../context/AppContext';
import { ProductCard } from './ProductCard';
import { SearchBar } from '../common/SearchBar';
import { ProductCategory } from '../../types';
import {
  Sparkles,
  ChevronRight,
  TrendingUp,
  MapPin,
  ShieldCheck,
  Sprout,
  HeartHandshake,
} from 'lucide-react';

const categories: ProductCategory[] = [
  'All',
  'Vegetables',
  'Fruits',
  'Leafy Greens',
  'Grains',
  'Dairy',
  'Homemade Food',
  'Other',
];

const categoryIcons: Record<string, string> = {
  All: '🌱',
  Vegetables: '🥕',
  Fruits: '🍎',
  'Leafy Greens': '🥬',
  Grains: '🌾',
  Dairy: '🥛',
  'Homemade Food': '🍯',
  Other: '📦',
};

export const CustomerHome: React.FC = () => {
  const {
    products,
    farmers,
    searchQuery,
    selectedCategory,
    setSelectedCategory,
    setSelectedFarmer,
  } = useApp();

  // Filter products by search & category
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.farmName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.farmerName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'All' || product.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const freshNearYou = products.slice(0, 5);

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      {/* Greeting Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          <span>Good morning ☀️</span>
        </div>
        <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
          Fresh Farm Harvest
        </h2>
      </div>

      {/* Search Input */}
      <SearchBar />

      {/* Category Pills Carousel */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Categories
          </span>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-[#0B3D2E] text-white shadow-soft ring-2 ring-[#0B3D2E]/30'
                    : 'bg-white dark:bg-[#0B291F] text-[#17251D] dark:text-[#F6F4E8] border border-[#D8DFD5] dark:border-[#164635] hover:bg-[#F6F4E8] dark:hover:bg-[#0F3327]'
                }`}
              >
                <span>{categoryIcons[cat]}</span>
                <span>{cat}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hero Farm Provenance Banner */}
      {!searchQuery && selectedCategory === 'All' && (
        <div className="relative p-5 sm:p-6 rounded-3xl overflow-hidden bg-gradient-to-r from-[#0B3D2E] via-[#124C36] to-[#061B14] text-white shadow-soft-lg border border-[#164635]">
          <div className="relative z-10 max-w-[70%] space-y-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full">
              <Sparkles className="w-3 h-3 text-amber-300" />
              100% Direct From Farmers
            </span>
            <h3 className="text-lg font-black leading-tight">
              Zero middlemen. Fair farmer earnings.
            </h3>
            <p className="text-xs text-emerald-100/90 leading-relaxed">
              Harvested at 5 AM today from local farms within 10 km.
            </p>
          </div>
          <div className="absolute -right-4 -bottom-4 text-7xl opacity-20 select-none">
            🌾
          </div>
        </div>
      )}

      {/* Fresh Near You Horizontal Carousel */}
      {!searchQuery && selectedCategory === 'All' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <Sprout className="w-4 h-4 text-emerald-600" />
              <h3 className="text-base font-black text-zinc-900 dark:text-white">
                Fresh Near You
              </h3>
            </div>
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              Within 5 km
            </span>
          </div>

          <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
            {freshNearYou.map((product) => (
              <ProductCard
                key={`near-${product.id}`}
                product={product}
                variant="horizontal"
              />
            ))}
          </div>
        </div>
      )}

      {/* Featured Verified Farmers */}
      {!searchQuery && selectedCategory === 'All' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <HeartHandshake className="w-4 h-4 text-emerald-600" />
              <h3 className="text-base font-black text-zinc-900 dark:text-white">
                Featured Local Farmers
              </h3>
            </div>
          </div>

          <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
            {farmers.map((farmer) => (
              <div
                key={farmer.id}
                onClick={() => setSelectedFarmer(farmer)}
                className="shrink-0 w-60 p-3.5 bg-white dark:bg-[#1B201D] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-soft hover:shadow-soft-md cursor-pointer transition-all flex items-center gap-3"
              >
                <img
                  src={farmer.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160'}
                  alt={farmer.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-emerald-600/30 shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <h4 className="font-bold text-xs text-zinc-900 dark:text-white truncate">
                      {farmer.name}
                    </h4>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                    {farmer.farmName}
                  </p>
                  <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 block mt-0.5">
                    {farmer.distanceKm} km away • ? {farmer.rating}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Popular Today Product Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <h3 className="text-base font-black text-zinc-900 dark:text-white">
              {searchQuery ? `Search Results (${filteredProducts.length})` : selectedCategory !== 'All' ? `${selectedCategory} (${filteredProducts.length})` : 'Popular Today'}
            </h3>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="p-5 sm:p-8 text-center bg-white dark:bg-[#1B201D] rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-2">
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              No farm harvest matching "{searchQuery}"
            </p>
            <p className="text-xs text-zinc-400">
              Try searching for tomatoes, spinach, milk, carrots, or clear the filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} variant="grid" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
