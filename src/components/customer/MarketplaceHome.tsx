import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ListingCard } from '../common/ListingCard';
import { ExploreCategoriesModal } from './ExploreCategoriesModal';
import { GroupBuyModal } from './GroupBuyModal';
import { B2BWholesaleModal } from './B2BWholesaleModal';
import { ScheduledProcurementModal } from './ScheduledProcurementModal';
import { ProductCategory } from '../../types';
import { Logo } from '../common/Logo';
import {
  Search,
  SlidersHorizontal,
  MapPin,
  Sparkles,
  Users,
  Tag,
  Clock,
  ChevronRight,
  LayoutGrid,
  List,
  Building2,
  CalendarClock,
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

  // Sort: Featured & Urgent ads at top
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
  const bestPrices = [...products].sort((a, b) => a.price - b.price).slice(0, 4);
  const organicListings = products.filter((p) => p.isOrganic).slice(0, 4);
  const freshToday = products.filter((p) => p.isAvailableToday).slice(0, 4);

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      {/* 1. Location Banner & Prominent Classifieds Search Bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-[#66736B] dark:text-[#A6B3AA]">
            <MapPin className="w-4 h-4 text-[#176B45] dark:text-[#5FB383]" />
            <span>Marketplace for: <strong className="text-[#202923] dark:text-[#F2F5F3] font-bold">{currentLocation}</strong></span>
          </div>
          <button
            onClick={() => setIsLocationModalOpen(true)}
            className="text-xs font-bold text-[#176B45] dark:text-[#5FB383] hover:underline min-h-[36px] flex items-center"
          >
            Change
          </button>
        </div>

        {/* Prominent Search Bar */}
        <div
          onClick={() => setIsSearchScreenOpen(true)}
          className="w-full flex items-center justify-between p-3.5 bg-white dark:bg-[#181F1A] text-[#89948C] dark:text-[#728277] rounded-2xl border border-[#E5EBE6] dark:border-[#29352D] shadow-soft cursor-pointer hover:border-[#176B45]/50 transition-all min-h-[48px]"
        >
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-[#176B45] dark:text-[#5FB383]" />
            <span className="text-sm font-medium text-[#66736B] dark:text-[#A6B3AA]">
              Search vegetables, fruits, grains, farmers...
            </span>
          </div>
          <span className="text-xs font-bold bg-[#EAF5EE] dark:bg-[#182A20] text-[#176B45] dark:text-[#5FB383] px-3 py-1 rounded-xl">
            Find
          </span>
        </div>
      </div>

      {/* 1.5 Special Marketplace Modes & Programs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => setIsGroupBuyOpen(true)}
          className="p-3.5 bg-white dark:bg-[#181F1A] border border-[#E5EBE6] dark:border-[#29352D] rounded-2xl flex items-center justify-between text-left hover:border-[#176B45]/60 transition shadow-soft group cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#EAF5EE] dark:bg-[#182A20] text-[#176B45] dark:text-[#5FB383] flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#202923] dark:text-[#F2F5F3] block">
                Community Group Buy (सामूहिक खरीद)
              </span>
              <span className="text-[11px] text-[#66736B] dark:text-[#A6B3AA] block">
                Pool orders with neighbors & save 25%+
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#89948C] group-hover:text-[#176B45] shrink-0 transition-colors" />
        </button>

        <button
          onClick={() => setIsB2bOpen(true)}
          className="p-3.5 bg-white dark:bg-[#181F1A] border border-[#E5EBE6] dark:border-[#29352D] rounded-2xl flex items-center justify-between text-left hover:border-[#176B45]/60 transition shadow-soft group cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#F0F4F1] dark:bg-[#222B25] text-[#202923] dark:text-[#F2F5F3] flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#202923] dark:text-[#F2F5F3] block">
                B2B Wholesale (थोक मंडी)
              </span>
              <span className="text-[11px] text-[#66736B] dark:text-[#A6B3AA] block">
                Bulk supply for restaurants & stores
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#89948C] group-hover:text-[#176B45] shrink-0 transition-colors" />
        </button>

        <button
          onClick={() => setIsScheduledOpen(true)}
          className="p-3.5 bg-white dark:bg-[#181F1A] border border-[#E5EBE6] dark:border-[#29352D] rounded-2xl flex items-center justify-between text-left hover:border-[#176B45]/60 transition shadow-soft group cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#EAF5EE] dark:bg-[#182A20] text-[#176B45] dark:text-[#5FB383] flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition">
              <CalendarClock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#202923] dark:text-[#F2F5F3] block">
                Daily Subscriptions (दैनिक आपूर्ति)
              </span>
              <span className="text-[11px] text-[#66736B] dark:text-[#A6B3AA] block">
                Fresh morning drops to your door
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#89948C] group-hover:text-[#176B45] shrink-0 transition-colors" />
        </button>
      </div>

      {/* 2. Browse Categories Horizontal Scroll */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-[#66736B] dark:text-[#A6B3AA] uppercase tracking-wider">
            Browse Categories
          </span>
          <button
            onClick={() => setIsExploreCategoriesOpen(true)}
            className="text-xs font-bold text-[#176B45] dark:text-[#5FB383] hover:underline flex items-center gap-0.5 min-h-[36px]"
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
                className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] ${
                  isSelected
                    ? 'bg-[#176B45] text-white shadow-soft'
                    : 'bg-white dark:bg-[#181F1A] text-[#202923] dark:text-[#F2F5F3] border border-[#E5EBE6] dark:border-[#29352D] hover:bg-[#F0F4F1] dark:hover:bg-[#222B25]'
                }`}
              >
                <span>{item.emoji}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Main Nearby Feed */}
      <div className="space-y-3.5">
        {/* Quick Distance Radius Filter Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-[11px] font-bold text-[#89948C] shrink-0 mr-1">Radius:</span>
          {[5, 10, 20, 50].map((km) => (
            <button
              key={km}
              onClick={() => setFilterState((prev) => ({ ...prev, maxDistanceKm: km }))}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold shrink-0 transition min-h-[36px] ${
                filterState.maxDistanceKm === km
                  ? 'bg-[#176B45] text-white shadow-soft'
                  : 'bg-white dark:bg-[#181F1A] text-[#66736B] dark:text-[#A6B3AA] border border-[#E5EBE6] dark:border-[#29352D] hover:bg-[#F0F4F1]'
              }`}
            >
              {km} km
            </button>
          ))}
          <button
            onClick={() => setFilterState((prev) => ({ ...prev, maxDistanceKm: 100 }))}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold shrink-0 transition min-h-[36px] ${
              filterState.maxDistanceKm >= 100
                ? 'bg-[#176B45] text-white shadow-soft'
                : 'bg-white dark:bg-[#181F1A] text-[#66736B] dark:text-[#A6B3AA] border border-[#E5EBE6] dark:border-[#29352D] hover:bg-[#F0F4F1]'
            }`}
          >
            All Areas
          </button>
        </div>

        {/* Section Header with View Toggle, Filter & Sort Buttons */}
        <div className="flex items-center justify-between gap-2 px-1">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-[#202923] dark:text-[#F2F5F3]">
                Fresh Recommendations
              </h2>
              <span className="px-2.5 py-0.5 text-[10px] font-black rounded-full bg-[#EAF5EE] dark:bg-[#182A20] text-[#176B45] dark:text-[#5FB383]">
                {sortedProducts.length} Ads
              </span>
            </div>
            <p className="text-[11px] text-[#66736B] dark:text-[#A6B3AA]">
              ताज़ा विज्ञापन • Direct from local sellers near you
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* View Mode Toggle (Grid / List) */}
            <div className="flex items-center bg-[#F0F4F1] dark:bg-[#222B25] p-0.5 rounded-xl border border-[#E5EBE6] dark:border-[#29352D]">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition min-h-[36px] min-w-[36px] flex items-center justify-center ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-[#181F1A] text-[#176B45] dark:text-[#5FB383] shadow-soft'
                    : 'text-[#89948C] hover:text-[#202923]'
                }`}
                title="Grid view"
                aria-label="Switch to grid view"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition min-h-[36px] min-w-[36px] flex items-center justify-center ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-[#181F1A] text-[#176B45] dark:text-[#5FB383] shadow-soft'
                    : 'text-[#89948C] hover:text-[#202923]'
                }`}
                title="List view"
                aria-label="Switch to list view"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Filter Trigger Button */}
            <button
              onClick={() => setIsFilterModalOpen(true)}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white dark:bg-[#181F1A] text-[#202923] dark:text-[#F2F5F3] border border-[#E5EBE6] dark:border-[#29352D] text-xs font-bold hover:bg-[#F0F4F1] transition-colors shadow-soft min-h-[44px]"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#176B45] dark:text-[#5FB383]" />
              <span>Filter</span>
            </button>

            {/* Sort Dropdown Selector */}
            <select
              value={filterState.sortBy}
              onChange={(e) => setFilterState((prev) => ({ ...prev, sortBy: e.target.value as any }))}
              className="px-2.5 py-2 rounded-xl bg-white dark:bg-[#181F1A] text-[#202923] dark:text-[#F2F5F3] border border-[#E5EBE6] dark:border-[#29352D] text-xs font-bold focus:outline-none cursor-pointer shadow-soft min-h-[44px]"
            >
              <option value="nearest">Nearest</option>
              <option value="price_low">Price: Low</option>
              <option value="price_high">Price: High</option>
            </select>
          </div>
        </div>

        {/* Active Filter Chips Bar */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5 p-2.5 bg-[#EAF5EE]/60 dark:bg-[#182A20]/60 rounded-xl border border-[#176B45]/20 dark:border-[#2E8B57]/30 text-xs animate-fade-in">
            <span className="text-[11px] font-bold text-[#176B45] dark:text-[#5FB383]">Active:</span>
            {selectedCategory !== 'All' && (
              <span className="px-2 py-0.5 bg-white dark:bg-[#181F1A] rounded-lg font-semibold text-[#202923] dark:text-[#F2F5F3] border border-[#E5EBE6] dark:border-[#29352D] flex items-center gap-1 text-[11px]">
                {selectedCategory}
                <button onClick={() => setSelectedCategory('All')} className="text-[#89948C] hover:text-[#202923]">×</button>
              </span>
            )}
            {filterState.maxDistanceKm < 100 && (
              <span className="px-2 py-0.5 bg-white dark:bg-[#181F1A] rounded-lg font-semibold text-[#202923] dark:text-[#F2F5F3] border border-[#E5EBE6] dark:border-[#29352D] flex items-center gap-1 text-[11px]">
                Within {filterState.maxDistanceKm} km
                <button onClick={() => setFilterState((prev) => ({ ...prev, maxDistanceKm: 100 }))} className="text-[#89948C] hover:text-[#202923]">×</button>
              </span>
            )}
            {filterState.organicOnly && (
              <span className="px-2 py-0.5 bg-white dark:bg-[#181F1A] rounded-lg font-semibold text-[#202923] dark:text-[#F2F5F3] border border-[#E5EBE6] dark:border-[#29352D] flex items-center gap-1 text-[11px]">
                🌿 Organic
                <button onClick={() => setFilterState((prev) => ({ ...prev, organicOnly: false }))} className="text-[#89948C] hover:text-[#202923]">×</button>
              </span>
            )}
            {filterState.availableTodayOnly && (
              <span className="px-2 py-0.5 bg-white dark:bg-[#181F1A] rounded-lg font-semibold text-[#202923] dark:text-[#F2F5F3] border border-[#E5EBE6] dark:border-[#29352D] flex items-center gap-1 text-[11px]">
                ⚡ Fresh Today
                <button onClick={() => setFilterState((prev) => ({ ...prev, availableTodayOnly: false }))} className="text-[#89948C] hover:text-[#202923]">×</button>
              </span>
            )}
            <button
              onClick={resetAllFilters}
              className="ml-auto text-[11px] font-bold text-[#176B45] dark:text-[#5FB383] hover:underline px-2 py-0.5"
            >
              Clear All (सभी हटाएं)
            </button>
          </div>
        )}

        {/* Listings Feed */}
        {sortedProducts.length === 0 ? (
          <div className="p-6 sm:p-10 text-center bg-white dark:bg-[#181F1A] rounded-3xl border border-[#E5EBE6] dark:border-[#29352D] space-y-3 shadow-soft">
            <div className="w-12 h-12 rounded-full bg-[#EAF5EE] dark:bg-[#182A20] flex items-center justify-center mx-auto text-[#176B45] dark:text-[#5FB383]">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-[#202923] dark:text-[#F2F5F3]">
              No advertisements in this range
            </h3>
            <p className="text-xs text-[#66736B] dark:text-[#A6B3AA] max-w-xs mx-auto">
              Try increasing your radius or clearing category filters.
            </p>
            <button
              onClick={() => setFilterState((prev) => ({ ...prev, maxDistanceKm: 50 }))}
              className="btn-primary"
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
            <Users className="w-4 h-4 text-[#176B45] dark:text-[#5FB383]" />
            <h3 className="text-base font-bold text-[#202923] dark:text-[#F2F5F3]">
              Farmers Near You
            </h3>
          </div>
        </div>

        <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
          {farmers.map((farmer) => (
            <div
              key={farmer.id}
              onClick={() => setSelectedFarmer(farmer)}
              className="shrink-0 w-64 p-4 bg-white dark:bg-[#181F1A] rounded-2xl border border-[#E5EBE6] dark:border-[#29352D] shadow-soft hover:shadow-soft-md cursor-pointer transition-all flex flex-col justify-between"
            >
              <div className="flex items-center gap-3">
                <img
                  src={farmer.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160'}
                  alt={farmer.name}
                  className="w-12 h-12 rounded-xl object-cover border-2 border-[#176B45]/30"
                />
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-[#202923] dark:text-[#F2F5F3] truncate">
                    {farmer.name}
                  </h4>
                  <p className="text-xs text-[#176B45] dark:text-[#5FB383] font-semibold truncate">
                    {farmer.farmName}
                  </p>
                  <span className="text-[11px] text-[#66736B] dark:text-[#A6B3AA] block mt-0.5">
                    📍 {farmer.distanceKm} km away
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-[#E5EBE6] dark:border-[#29352D] flex items-center justify-between text-xs">
                <span className="font-bold text-[#D99A32]">
                  ⭐ {farmer.rating} ({farmer.reviewsCount})
                </span>
                <span className="text-[11px] font-bold text-[#176B45] dark:text-[#5FB383]">
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
            <Tag className="w-4 h-4 text-[#176B45] dark:text-[#5FB383]" />
            <h3 className="text-base font-bold text-[#202923] dark:text-[#F2F5F3]">
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
            <Sparkles className="w-4 h-4 text-[#176B45] dark:text-[#5FB383]" />
            <h3 className="text-base font-bold text-[#202923] dark:text-[#F2F5F3]">
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
            <Clock className="w-4 h-4 text-[#176B45] dark:text-[#5FB383]" />
            <h3 className="text-base font-bold text-[#202923] dark:text-[#F2F5F3]">
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

      {/* 8. Branded Trust & Compliance Footer */}
      <div className="mt-8 pt-6 pb-12 border-t border-[#D8DFD5] dark:border-[#164635] space-y-6">
        <div className="p-4 sm:p-5 rounded-3xl bg-[#F6F4E8] dark:bg-[#0B291F] border border-[#D8DFD5] dark:border-[#164635]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#D8DFD5]/60 dark:border-[#164635]/60">
            <Logo size="sm" showTagline />
            <span className="text-[11px] font-bold text-[#0B3D2E] dark:text-[#A8E063] uppercase tracking-wider bg-white dark:bg-[#061B14] px-3 py-1 rounded-full border border-[#D8DFD5] dark:border-[#164635]">
              Mandi Direct Trust Guarantee
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
            <div className="p-3 rounded-2xl bg-white dark:bg-[#061B14] border border-[#D8DFD5]/60 dark:border-[#164635]/60">
              <span className="text-lg">🌿</span>
              <p className="text-xs font-bold text-[#17251D] dark:text-[#F6F4E8] mt-1">100% Farm Fresh</p>
              <p className="text-[10px] text-[#4A5B52] dark:text-[#A3B8AD]">Directly from local growers</p>
            </div>
            <div className="p-3 rounded-2xl bg-white dark:bg-[#061B14] border border-[#D8DFD5]/60 dark:border-[#164635]/60">
              <span className="text-lg">💰</span>
              <p className="text-xs font-bold text-[#17251D] dark:text-[#F6F4E8] mt-1">0% Middlemen Cut</p>
              <p className="text-[10px] text-[#4A5B52] dark:text-[#A3B8AD]">Farmers get 100% value</p>
            </div>
            <div className="p-3 rounded-2xl bg-white dark:bg-[#061B14] border border-[#D8DFD5]/60 dark:border-[#164635]/60">
              <span className="text-lg">⚖️</span>
              <p className="text-xs font-bold text-[#17251D] dark:text-[#F6F4E8] mt-1">Live APMC Mandi</p>
              <p className="text-[10px] text-[#4A5B52] dark:text-[#A3B8AD]">Fair transparent benchmarks</p>
            </div>
            <div className="p-3 rounded-2xl bg-white dark:bg-[#061B14] border border-[#D8DFD5]/60 dark:border-[#164635]/60">
              <span className="text-lg">🛡️</span>
              <p className="text-xs font-bold text-[#17251D] dark:text-[#F6F4E8] mt-1">Buyer Protection</p>
              <p className="text-[10px] text-[#4A5B52] dark:text-[#A3B8AD]">24h dispute resolution</p>
            </div>
          </div>
        </div>

        {/* Legal & Brand Signature Links */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-zinc-500 dark:text-zinc-400 px-2">
          <div className="flex items-center gap-4">
            <a
              href="/privacy.html"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-emerald-700 dark:hover:text-emerald-400 underline underline-offset-2"
            >
              Privacy Policy
            </a>
            <span>•</span>
            <a
              href="/terms.html"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-emerald-700 dark:hover:text-emerald-400 underline underline-offset-2"
            >
              Terms of Service
            </a>
          </div>
          <p className="text-center sm:text-right font-medium">
            HALDER Agricultural Marketplace • Empowering Kisan Ecosystem
          </p>
        </div>
      </div>

      {/* Modals */}
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
