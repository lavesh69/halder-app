import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ListingCard } from '../common/ListingCard';
import { ExploreCategoriesModal } from './ExploreCategoriesModal';
import { GroupBuyModal } from './GroupBuyModal';
import { B2BWholesaleModal } from './B2BWholesaleModal';
import { ScheduledProcurementModal } from './ScheduledProcurementModal';
import { ProductCategory } from '../../types';
import {
  Search,
  SlidersHorizontal,
  MapPin,
  Sparkles,
  ArrowUpDown,
  Sprout,
  Users,
  Tag,
  Clock,
  ChevronRight,
  TrendingUp,
  LayoutGrid,
  List,
  Building2,
  CalendarClock,
  ShoppingBag,
} from 'lucide-react';

const categories: { label: string; cat: ProductCategory; emoji: string }[] = [
  { label: 'All', cat: 'All', emoji: '🌱' },
  { label: 'Vegetables', cat: 'Vegetables', emoji: '🥬' },
  { label: 'Fruits', cat: 'Fruits', emoji: '🍎' },
  { label: 'Grains', cat: 'Grains', emoji: '🌾' },
  { label: 'Dairy', cat: 'Dairy', emoji: '🥛' },
  { label: 'Equipment', cat: 'Farm Equipment', emoji: '🚜' },
  { label: 'Livestock / Cattle', cat: 'Livestock', emoji: '🐄' },
  { label: 'Organic', cat: 'Organic', emoji: '🌿' },
  { label: 'Homemade', cat: 'Homemade', emoji: '🍯' },
  { label: 'Seeds', cat: 'Seeds', emoji: '🌱' },
  { label: 'Other', cat: 'Other', emoji: '🧺' },
];

export const MarketplaceHome: React.FC = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isExploreCategoriesOpen, setIsExploreCategoriesOpen] = useState(false);
  const [isGroupBuyOpen, setIsGroupBuyOpen] = useState(false);
  const [isB2bOpen, setIsB2bOpen] = useState(false);
  const [isScheduledOpen, setIsScheduledOpen] = useState(false);

  const {
    products,
    farmers,
    selectedCategory,
    setSelectedCategory,
    setIsSearchScreenOpen,
    setIsFilterModalOpen,
    filterState,
    setFilterState,
    setSelectedFarmer,
    activeCity,
    currentLocation,
    setIsLocationModalOpen,
  } = useApp();

  const hasActiveFilters =
    selectedCategory !== 'All' ||
    filterState.maxDistanceKm < 100 ||
    filterState.organicOnly ||
    filterState.availableTodayOnly ||
    filterState.minPrice > 0 ||
    filterState.maxPrice < 1000;

  const resetAllFilters = () => {
    setSelectedCategory('All');
    setFilterState((prev) => ({
      ...prev,
      minPrice: 0,
      maxPrice: 1000,
      organicOnly: false,
      availableTodayOnly: false,
      maxDistanceKm: 100,
    }));
  };

  // Apply category & filter
  const filteredProducts = products.filter((p) => {
    if (selectedCategory !== 'All' && p.category !== selectedCategory) return false;
    if (p.price < filterState.minPrice || p.price > filterState.maxPrice) return false;
    if (filterState.organicOnly && !p.isOrganic) return false;
    if (filterState.availableTodayOnly && !p.isAvailableToday) return false;
    if (p.distanceKm > filterState.maxDistanceKm) return false;
    return true;
  });

  // Sort (OLX Priority: Featured & Urgent ads at top)
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (a.isFeatured && !b.isFeatured) return -1;
    if (!a.isFeatured && b.isFeatured) return 1;
    if (a.isUrgent && !b.isUrgent) return -1;
    if (!a.isUrgent && b.isUrgent) return 1;

    if (filterState.sortBy === 'nearest') return a.distanceKm - b.distanceKm;
    if (filterState.sortBy === 'price_low') return a.price - b.price;
    if (filterState.sortBy === 'price_high') return b.price - a.price;
    return 0;
  });

  // Category subsets
  const recentlyAdded = products.slice(0, 4);
  const bestPrices = [...products].sort((a, b) => a.price - b.price).slice(0, 4);
  const organicListings = products.filter((p) => p.isOrganic).slice(0, 4);
  const freshToday = products.filter((p) => p.isAvailableToday).slice(0, 4);

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      {/* 1. Location Banner & Prominent Classifieds Search Bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span>Marketplace for: <strong className="text-zinc-900 dark:text-white font-bold">{currentLocation}</strong></span>
          </div>
          <button
            onClick={() => setIsLocationModalOpen(true)}
            className="text-xs font-bold text-emerald-600 hover:underline"
          >
            Change
          </button>
        </div>

        {/* Prominent Search Bar (OLX-style classifieds search) */}
        <div
          onClick={() => setIsSearchScreenOpen(true)}
          className="w-full flex items-center justify-between p-3.5 bg-white dark:bg-[#1B201D] text-zinc-400 dark:text-zinc-500 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 shadow-soft cursor-pointer hover:border-emerald-500/60 transition-all"
        >
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
              Search vegetables, fruits, farmers...
            </span>
          </div>
          <span className="text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2.5 py-1 rounded-xl">
            Find
          </span>
        </div>
      </div>

      {/* 1.5 Special Marketplace Modes & Programs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <button
          onClick={() => setIsGroupBuyOpen(true)}
          className="p-3 bg-linear-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl flex items-center justify-between text-left hover:border-emerald-500 transition group cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-black text-emerald-950 dark:text-emerald-200 block">
                Community Group Buy (सामूहिक खरीद)
              </span>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block">
                Pool orders with neighbors & save 25%+
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-emerald-600 shrink-0" />
        </button>

        <button
          onClick={() => setIsB2bOpen(true)}
          className="p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/80 rounded-2xl flex items-center justify-between text-left hover:border-zinc-400 dark:hover:border-zinc-500 transition group cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-zinc-800 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-black text-zinc-900 dark:text-white block">
                B2B Wholesale (थोक मंडी)
              </span>
              <span className="text-[10px] text-zinc-500 block">
                Bulk supply for restaurants & stores
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
        </button>

        <button
          onClick={() => setIsScheduledOpen(true)}
          className="p-3 bg-linear-to-r from-teal-50 to-cyan-50 dark:from-teal-950/40 dark:to-cyan-950/40 border border-teal-200/80 dark:border-teal-800/60 rounded-2xl flex items-center justify-between text-left hover:border-teal-500 transition group cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition">
              <CalendarClock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-black text-teal-950 dark:text-teal-200 block">
                Daily Subscriptions (दैनिक दूध व सब्जी)
              </span>
              <span className="text-[10px] text-teal-700 dark:text-teal-400 block">
                Fresh morning drops to your door
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-teal-600 shrink-0" />
        </button>
      </div>

      {/* 2. Browse Categories Horizontal Scroll */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Browse Categories
          </span>
          <button
            onClick={() => setIsExploreCategoriesOpen(true)}
            className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-0.5"
          >
            <span>See All (सभी)</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          {categories.map((item) => {
            const isSelected = selectedCategory === item.cat;
            return (
              <button
                key={item.cat}
                onClick={() => setSelectedCategory(item.cat)}
                className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-soft ring-2 ring-emerald-500/30'
                    : 'bg-white dark:bg-[#1B201D] text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                }`}
              >
                <span>{item.emoji}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Main Nearby Feed: OLX-Style "Fresh Recommendations" */}
      <div className="space-y-3.5">
        {/* Quick Distance Radius Filter Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-[11px] font-bold text-zinc-400 shrink-0 mr-1">Radius:</span>
          {[5, 10, 20, 50].map((km) => (
            <button
              key={km}
              onClick={() => setFilterState((prev) => ({ ...prev, maxDistanceKm: km }))}
              className={`px-3 py-1 rounded-full text-[11px] font-bold shrink-0 transition ${
                filterState.maxDistanceKm === km
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-[#1B201D] text-zinc-600 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-50'
              }`}
            >
              {km} km
            </button>
          ))}
          <button
            onClick={() => setFilterState((prev) => ({ ...prev, maxDistanceKm: 100 }))}
            className={`px-3 py-1 rounded-full text-[11px] font-bold shrink-0 transition ${
              filterState.maxDistanceKm >= 100
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-white dark:bg-[#1B201D] text-zinc-600 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-50'
            }`}
          >
            All Areas
          </button>
        </div>

        {/* Section Header with View Toggle, Filter & Sort Buttons */}
        <div className="flex items-center justify-between gap-2 px-1">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white">
                Fresh Recommendations
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                {sortedProducts.length} Ads
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              ताज़ा विज्ञापन • Direct from local sellers near you
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* View Mode Toggle (Grid / List) */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-zinc-900 text-emerald-600 shadow-2xs'
                    : 'text-zinc-400 hover:text-zinc-600'
                }`}
                title="Grid view"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-zinc-900 text-emerald-600 shadow-2xs'
                    : 'text-zinc-400 hover:text-zinc-600'
                }`}
                title="List view"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Filter Trigger Button */}
            <button
              onClick={() => setIsFilterModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#1B201D] text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 text-xs font-bold hover:bg-zinc-50 transition-colors shadow-2xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" />
              <span>Filter</span>
            </button>

            {/* Sort Dropdown Selector */}
            <select
              value={filterState.sortBy}
              onChange={(e) => setFilterState((prev) => ({ ...prev, sortBy: e.target.value as any }))}
              className="px-2 py-1.5 rounded-xl bg-white dark:bg-[#1B201D] text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 text-xs font-bold focus:outline-none cursor-pointer shadow-2xs"
            >
              <option value="nearest">Nearest</option>
              <option value="price_low">Price: Low</option>
              <option value="price_high">Price: High</option>
            </select>
          </div>
        </div>

        {/* Active Filter Chips Bar */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5 p-2.5 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/60 text-xs animate-fade-in">
            <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">Active:</span>
            {selectedCategory !== 'All' && (
              <span className="px-2 py-0.5 bg-white dark:bg-zinc-800 rounded-lg font-semibold text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 flex items-center gap-1 text-[11px]">
                {selectedCategory}
                <button onClick={() => setSelectedCategory('All')} className="text-zinc-400 hover:text-zinc-600">×</button>
              </span>
            )}
            {filterState.maxDistanceKm < 100 && (
              <span className="px-2 py-0.5 bg-white dark:bg-zinc-800 rounded-lg font-semibold text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 flex items-center gap-1 text-[11px]">
                Within {filterState.maxDistanceKm} km
                <button onClick={() => setFilterState((prev) => ({ ...prev, maxDistanceKm: 100 }))} className="text-zinc-400 hover:text-zinc-600">×</button>
              </span>
            )}
            {filterState.organicOnly && (
              <span className="px-2 py-0.5 bg-white dark:bg-zinc-800 rounded-lg font-semibold text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 flex items-center gap-1 text-[11px]">
                🌿 Organic
                <button onClick={() => setFilterState((prev) => ({ ...prev, organicOnly: false }))} className="text-zinc-400 hover:text-zinc-600">×</button>
              </span>
            )}
            {filterState.availableTodayOnly && (
              <span className="px-2 py-0.5 bg-white dark:bg-zinc-800 rounded-lg font-semibold text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 flex items-center gap-1 text-[11px]">
                ⚡ Fresh Today
                <button onClick={() => setFilterState((prev) => ({ ...prev, availableTodayOnly: false }))} className="text-zinc-400 hover:text-zinc-600">×</button>
              </span>
            )}
            <button
              onClick={resetAllFilters}
              className="ml-auto text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline px-2 py-0.5"
            >
              Clear All (सभी हटाएं)
            </button>
          </div>
        )}

        {/* Listings Feed */}
        {sortedProducts.length === 0 ? (
          <div className="p-5 sm:p-8 text-center bg-white dark:bg-[#1B201D] rounded-3xl border border-zinc-200 dark:border-zinc-800 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center mx-auto text-emerald-600">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
              No advertisements in this range
            </h3>
            <p className="text-xs text-zinc-500 max-w-xs mx-auto">
              Try increasing your radius or clearing category filters.
            </p>
            <button
              onClick={() => setFilterState((prev) => ({ ...prev, maxDistanceKm: 50 }))}
              className="min-h-[44px] px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center justify-center"
            >
              Expand Search Radius
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {sortedProducts.map((product) => (
              <ListingCard key={product.id} product={product} variant="compact-grid" />
            ))}
          </div>
        ) : (
          <div className="space-y-3.5">
            {sortedProducts.map((product) => (
              <ListingCard key={product.id} product={product} variant="vertical-feed" />
            ))}
          </div>
        )}
      </div>

      {/* 4. Farmers Near You Horizontal Cards */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-emerald-600" />
            <h3 className="text-base font-black text-zinc-900 dark:text-white">
              Farmers Near You
            </h3>
          </div>
        </div>

        <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
          {farmers.map((farmer) => (
            <div
              key={farmer.id}
              onClick={() => setSelectedFarmer(farmer)}
              className="shrink-0 w-64 p-4 bg-white dark:bg-[#1B201D] rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-soft hover:shadow-soft-md cursor-pointer transition-all flex flex-col justify-between"
            >
              <div className="flex items-center gap-3">
                <img
                  src={farmer.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160'}
                  alt={farmer.name}
                  className="w-12 h-12 rounded-2xl object-cover border-2 border-emerald-600/30"
                />
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                    {farmer.name}
                  </h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold truncate">
                    {farmer.farmName}
                  </p>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
                    📍 {farmer.distanceKm} km away
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  ⭐ {farmer.rating} ({farmer.reviewsCount})
                </span>
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                  {farmer.responseRate}% Response
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Best Prices Near You Carousel */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <Tag className="w-4 h-4 text-emerald-600" />
            <h3 className="text-base font-black text-zinc-900 dark:text-white">
              Best Prices Near You
            </h3>
          </div>
        </div>

        <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
          {bestPrices.map((product) => (
            <ListingCard key={`price-${product.id}`} product={product} variant="horizontal" />
          ))}
        </div>
      </div>

      {/* 6. Organic Near You Carousel */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <h3 className="text-base font-black text-zinc-900 dark:text-white">
              Organic Near You
            </h3>
          </div>
        </div>

        <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
          {organicListings.map((product) => (
            <ListingCard key={`org-${product.id}`} product={product} variant="horizontal" />
          ))}
        </div>
      </div>

      {/* 7. Freshly Harvested Today */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-emerald-600" />
            <h3 className="text-base font-black text-zinc-900 dark:text-white">
              Freshly Harvested Today
            </h3>
          </div>
        </div>

        <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
          {freshToday.map((product) => (
            <ListingCard key={`today-${product.id}`} product={product} variant="horizontal" />
          ))}
        </div>
      </div>
      <ExploreCategoriesModal
        isOpen={isExploreCategoriesOpen}
        onClose={() => setIsExploreCategoriesOpen(false)}
      />

      <GroupBuyModal
        isOpen={isGroupBuyOpen}
        onClose={() => setIsGroupBuyOpen(false)}
      />

      <B2BWholesaleModal
        isOpen={isB2bOpen}
        onClose={() => setIsB2bOpen(false)}
      />

      <ScheduledProcurementModal
        isOpen={isScheduledOpen}
        onClose={() => setIsScheduledOpen(false)}
      />
    </div>
  );
};
