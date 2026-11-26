import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n';
import { ListingCard } from '../common/ListingCard';
import { ListingCardSkeleton } from '../common/ListingCardSkeleton';
import { handleAvatarError, DEFAULT_AVATAR_IMAGE } from '../../utils/imageFallback';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { ExploreCategoriesModal } from './ExploreCategoriesModal';
import { ProductCategory } from '../../types';
import {
  Search,
  SlidersHorizontal,
  MapPin,
  Sparkles,
  Users,
  Clock,
  ChevronRight,
  LayoutGrid,
  List,
  Camera,
  Mic,
  Sprout,
  X,
  Check,
  RefreshCw,
  ArrowDown,
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
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isExploreCategoriesOpen, setIsExploreCategoriesOpen] = useState(false);
  const [isAgriVisionOpen, setIsAgriVisionOpen] = useState(false);
  const [scannedPhotoUrl, setScannedPhotoUrl] = useState<string | null>(null);
  const [detectedCategory, setDetectedCategory] = useState<ProductCategory>('Vegetables');

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'All': return t('home.all_categories');
      case 'Vegetables': return t('home.vegetables');
      case 'Fruits': return t('home.fruits');
      case 'Grains': return t('home.grains');
      case 'Dairy': return t('home.dairy');
      case 'Farm Equipment': return t('home.equipment');
      case 'Livestock': return t('home.livestock');
      case 'Organic': return t('home.organic');
      case 'Homemade': return t('home.homemade');
      case 'Seeds': return t('home.seeds');
      default: return t('home.other');
    }
  };

  const {
    products,
    isLoadingProducts,
    refreshProducts,
    farmers,
    selectedCategory,
    setSelectedCategory,
    setIsSearchScreenOpen,
    setIsFilterModalOpen,
    filterState,
    setFilterState,
    setSelectedFarmer,
    currentLocation,
    setCurrentLocation,
    activeCity,
    setActiveCity,
    setIsLocationModalOpen,
    showToast,
    setSearchQuery,
  } = useApp();

  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleCameraScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDetectedCategory('Vegetables');

      const reader = new FileReader();
      reader.onload = (event) => {
        setScannedPhotoUrl(event.target?.result as string);
        setIsAgriVisionOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirmAgriCategory = (cat: ProductCategory) => {
    setSelectedCategory(cat);
    setIsAgriVisionOpen(false);
    showToast(`🌿 Filtered fresh ${cat} listings for you.`, 'success');
  };

  const handleVoiceSearch = (e: React.MouseEvent) => {
    e.stopPropagation();
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'hi-IN';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        showToast(t('home.voice_listening'), 'info');

        recognition.onresult = (event: any) => {
          const transcript = event.results?.[0]?.[0]?.transcript;
          if (transcript) {
            setSearchQuery(transcript);
            setIsSearchScreenOpen(true);
            showToast(`🔎 Searching for: "${transcript}"`, 'success');
          }
        };

        recognition.onerror = () => {
          setIsSearchScreenOpen(true);
        };

        recognition.start();
        return;
      } catch (err) {
        console.warn('SpeechRecognition error:', err);
      }
    }
    setIsSearchScreenOpen(true);
    showToast('🎙️ Voice input ready in search bar', 'info');
  };

  const isCitySelected = Boolean(activeCity && activeCity !== 'All India' && activeCity !== 'All');

  const hasActiveFilters =
    isCitySelected ||
    selectedCategory !== 'All' ||
    filterState.maxDistanceKm < 100 ||
    filterState.organicOnly ||
    filterState.availableTodayOnly ||
    filterState.urgentOnly ||
    filterState.featuredOnly ||
    filterState.negotiableOnly ||
    filterState.verifiedOnly;

  const resetAllFilters = () => {
    setSelectedCategory('All');
    setActiveCity('All India');
    setCurrentLocation(t('home.all_india'));
    setFilterState((prev) => ({
      ...prev,
      minPrice: 0,
      maxPrice: 100000,
      organicOnly: false,
      availableTodayOnly: false,
      urgentOnly: false,
      featuredOnly: false,
      negotiableOnly: false,
      verifiedOnly: false,
      maxDistanceKm: 100,
    }));
  };

  // Apply category & filter
  const filteredProducts = products.filter((p) => {
    if (selectedCategory !== 'All' && p.category !== selectedCategory) return false;
    if (filterState.organicOnly && !p.isOrganic) return false;
    if (filterState.availableTodayOnly && !p.isAvailableToday) return false;
    if (filterState.urgentOnly && !p.isUrgent) return false;
    if (filterState.featuredOnly && !p.isFeatured) return false;
    if (filterState.negotiableOnly && !p.isNegotiable) return false;
    if (filterState.verifiedOnly) {
      const farmer = farmers.find((f) => f.id === p.farmerId);
      if (!farmer?.verified && farmer?.verification_status !== 'verified') return false;
    }
    if (p.distanceKm > filterState.maxDistanceKm) return false;

    // Active City filter if selected and distance radius is restricted
    if (isCitySelected && filterState.maxDistanceKm < 100) {
      const cityNorm = activeCity.toLowerCase().trim();
      const productLoc = `${p.city || ''} ${p.location || ''} ${p.district || ''} ${p.state || ''}`.toLowerCase();
      if (!productLoc.includes(cityNorm) && p.distanceKm > filterState.maxDistanceKm) {
        return false;
      }
    }

    return true;
  });

  // Sort: City match, then Featured & Urgent ads at top
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (isCitySelected) {
      const cityNorm = activeCity.toLowerCase().trim();
      const aMatches = `${a.city || ''} ${a.location || ''} ${a.district || ''}`.toLowerCase().includes(cityNorm);
      const bMatches = `${b.city || ''} ${b.location || ''} ${b.district || ''}`.toLowerCase().includes(cityNorm);
      if (aMatches && !bMatches) return -1;
      if (!aMatches && bMatches) return 1;
    }

    if (a.isFeatured && !b.isFeatured) return -1;
    if (!a.isFeatured && b.isFeatured) return 1;
    if (a.isUrgent && !b.isUrgent) return -1;
    if (!a.isUrgent && b.isUrgent) return 1;

    if (filterState.sortBy === 'nearest') return a.distanceKm - b.distanceKm;
    return 0;
  });

  // Category subsets
  const bestPrices = [...products].sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 4);
  const organicListings = products.filter((p) => p.isOrganic).slice(0, 4);
  const freshToday = products.filter((p) => p.isAvailableToday).slice(0, 4);

  // Mobile Pull-to-Refresh Gesture
  const { pullDistance, isRefreshing } = usePullToRefresh({
    onRefresh: async () => {
      await refreshProducts();
      showToast('🌾 Mandi rates & crop listings refreshed!', 'success');
    },
  });

  return (
    <div className="space-y-6 pb-24 animate-fade-in relative w-full max-w-full min-w-0 overflow-x-hidden">
      {/* Mobile Pull-to-Refresh Indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="flex items-center justify-center transition-all duration-150 overflow-hidden"
          style={{ height: `${pullDistance}px` }}
        >
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700/80 text-xs font-bold shadow-md">
            {isRefreshing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                <span>{t('home.pull_refreshing')}</span>
              </>
            ) : pullDistance >= 65 ? (
              <>
                <ArrowDown className="w-4 h-4 rotate-180 transition-transform text-emerald-600" />
                <span>{t('home.pull_release')}</span>
              </>
            ) : (
              <>
                <ArrowDown className="w-4 h-4 text-emerald-600 transition-transform" />
                <span>{t('home.pull_down')}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* 1. Location Banner & Prominent Classifieds Search Bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-[#66736B] dark:text-[#A6B3AA]">
            <MapPin className="w-4 h-4 text-[#176B45] dark:text-[#5FB383]" />
            <span>{t('home.marketplace_for')} <strong className="text-[#202923] dark:text-[#F2F5F3] font-bold">{currentLocation}</strong></span>
          </div>
          <button
            onClick={() => setIsLocationModalOpen(true)}
            className="text-xs font-bold text-[#176B45] dark:text-[#5FB383] hover:underline min-h-[36px] flex items-center"
          >
            {t('common.edit')}
          </button>
        </div>

        {/* Active City Notice Banner */}
        {isCitySelected && (
          <div className="flex items-center justify-between px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/90 dark:border-emerald-800/60 rounded-2xl text-xs shadow-soft animate-fade-in">
            <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 min-w-0">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="truncate">
                {t('home.showing_near', { location: activeCity })}
              </span>
            </div>
            <button
              onClick={() => {
                setActiveCity('All India');
                setCurrentLocation(t('home.all_india'));
              }}
              className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:text-emerald-950 dark:hover:text-white bg-white dark:bg-emerald-900/60 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-700/60 shadow-2xs shrink-0 ml-2 transition active:scale-95"
            >
              {t('home.show_all_india')}
            </button>
          </div>
        )}

        {/* Prominent High-Utility Search Bar (Stitch Design Pattern) */}
        <div
          onClick={() => setIsSearchScreenOpen(true)}
          className="w-full flex items-center justify-between p-2.5 sm:p-3 bg-white dark:bg-[#181F1A] text-[#89948C] dark:text-[#728277] rounded-2xl border border-[#E5EBE6] dark:border-[#29352D] shadow-soft cursor-pointer hover:border-[#176B45]/50 transition-all min-h-[50px]"
        >
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <Search className="w-5 h-5 text-[#176B45] dark:text-[#5FB383] shrink-0" />
            <span className="text-xs sm:text-sm font-medium text-[#66736B] dark:text-[#A6B3AA] truncate">
              {t('search.placeholder')}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Visual Crop Scanner */}
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleCameraScan}
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                cameraInputRef.current?.click();
              }}
              className="p-1.5 text-zinc-400 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors rounded-lg cursor-pointer"
              title="Camera Crop Scanner"
              aria-label="Camera Crop Scanner"
            >
              <Camera className="w-4 h-4" />
            </button>

            {/* Vernacular Voice Search (Agri Green Pill) */}
            <button
              type="button"
              onClick={handleVoiceSearch}
              className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold hover:bg-emerald-100 transition-transform active:scale-95 cursor-pointer"
              title="Voice Search"
              aria-label="Voice Search"
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Browse Categories Circular Story Carousel */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black text-[#202923] dark:text-[#F2F5F3] uppercase tracking-wider">
              {t('home.browse_categories')}
            </span>
            <span className="text-[10px] text-[#66736B] dark:text-[#A6B3AA] font-bold">
              ({categories.length - 1} {t('nav.categories')})
            </span>
          </div>
          <button
            onClick={() => setIsExploreCategoriesOpen(true)}
            className="text-xs font-bold text-[#176B45] dark:text-[#5FB383] hover:underline flex items-center gap-0.5 min-h-[36px]"
          >
            <span>{t('home.see_all')}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Circular Story-Style Category Cards */}
        <div className="w-full max-w-full overflow-hidden min-w-0">
          <div className="flex gap-3 overflow-x-auto no-scrollbar py-1 px-1">
          {categories.map((item) => {
            const isSelected = selectedCategory === item.cat;
            const categoryCount = item.cat === 'All' 
              ? products.length 
              : products.filter((p) => p.category === item.cat).length;

            return (
              <button
                key={item.cat}
                onClick={() => setSelectedCategory(item.cat)}
                className="shrink-0 flex flex-col items-center gap-1.5 group cursor-pointer w-16"
              >
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all shadow-soft relative ${
                    isSelected
                      ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white ring-2 ring-emerald-600 ring-offset-2 dark:ring-offset-[#0F1411] scale-105'
                      : 'bg-white dark:bg-[#181F1A] border border-[#E5EBE6] dark:border-[#29352D] text-[#202923] dark:text-[#F2F5F3] group-hover:border-emerald-500/50 group-hover:scale-105'
                  }`}
                >
                  <span className="select-none">{item.emoji}</span>
                  {categoryCount > 0 && item.cat !== 'All' && (
                    <span className="absolute -top-1 -right-1 px-1 py-0.2 bg-emerald-600 text-white text-[9px] font-black rounded-full shadow-2xs">
                      {categoryCount}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[11px] text-center font-bold line-clamp-1 leading-tight ${
                    isSelected
                      ? 'text-[#176B45] dark:text-[#5FB383]'
                      : 'text-[#66736B] dark:text-[#A6B3AA] group-hover:text-[#202923]'
                  }`}
                >
                  {getCategoryLabel(item.cat)}
                </span>
              </button>
            );
          })}
          </div>
        </div>
      </div>

      {/* 3. Main Nearby Feed */}
      <div className="space-y-3.5">
        {/* Quick Distance Radius Filter Bar */}
        <div className="w-full max-w-full overflow-hidden min-w-0">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-[11px] font-bold text-[#89948C] shrink-0 mr-1">{t('home.radius')}</span>
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
            {t('home.all_areas')}
          </button>
          </div>
        </div>

        {/* Quick Filter Chips Bar */}
        <div className="w-full max-w-full overflow-hidden min-w-0">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => {
              setFilterState((prev) => ({
                ...prev,
                urgentOnly: false,
                featuredOnly: false,
                negotiableOnly: false,
                verifiedOnly: false,
              }));
            }}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold shrink-0 transition min-h-[36px] ${
              !filterState.urgentOnly && !filterState.featuredOnly && !filterState.negotiableOnly && !filterState.verifiedOnly
                ? 'bg-[#176B45] text-white shadow-soft'
                : 'bg-white dark:bg-[#181F1A] text-[#66736B] dark:text-[#A6B3AA] border border-[#E5EBE6] dark:border-[#29352D]'
            }`}
          >
            {t('home.all_ads')}
          </button>

          <button
            onClick={() => setFilterState((prev) => ({ ...prev, urgentOnly: !prev.urgentOnly }))}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold shrink-0 transition min-h-[36px] flex items-center gap-1 ${
              filterState.urgentOnly
                ? 'bg-red-600 text-white shadow-soft'
                : 'bg-white dark:bg-[#181F1A] text-red-600 border border-red-200 dark:border-red-900/60'
            }`}
          >
            <span>{t('home.filter_urgent')}</span>
          </button>

          <button
            onClick={() => setFilterState((prev) => ({ ...prev, featuredOnly: !prev.featuredOnly }))}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold shrink-0 transition min-h-[36px] flex items-center gap-1 ${
              filterState.featuredOnly
                ? 'bg-amber-500 text-white shadow-soft'
                : 'bg-white dark:bg-[#181F1A] text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60'
            }`}
          >
            <span>{t('home.filter_featured')}</span>
          </button>

          <button
            onClick={() => setFilterState((prev) => ({ ...prev, verifiedOnly: !prev.verifiedOnly }))}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold shrink-0 transition min-h-[36px] flex items-center gap-1 ${
              filterState.verifiedOnly
                ? 'bg-blue-600 text-white shadow-soft'
                : 'bg-white dark:bg-[#181F1A] text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60'
            }`}
          >
            <span>{t('home.filter_verified')}</span>
          </button>
          </div>
        </div>

        {/* Section Header with View Toggle, Filter & Sort Buttons */}
        <div className="flex items-center justify-between gap-2 px-1">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-[#202923] dark:text-[#F2F5F3]">
                {t('home.fresh_recommendations')}
              </h2>
              <span className="px-2.5 py-0.5 text-[10px] font-black rounded-full bg-[#EAF5EE] dark:bg-[#182A20] text-[#176B45] dark:text-[#5FB383]">
                {t('ads.total_ads', { count: sortedProducts.length })}
              </span>
            </div>
            <p className="text-[11px] text-[#66736B] dark:text-[#A6B3AA]">
              {t('ads.fresh_ads_subtitle')}
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
              <span>{t('search.filter_title').split(' ')[0]}</span>
            </button>

            {/* Sort Dropdown Selector */}
            <select
              value={filterState.sortBy}
              onChange={(e) => setFilterState((prev) => ({ ...prev, sortBy: e.target.value as any }))}
              className="px-2.5 py-2 rounded-xl bg-white dark:bg-[#181F1A] text-[#202923] dark:text-[#F2F5F3] border border-[#E5EBE6] dark:border-[#29352D] text-xs font-bold focus:outline-none cursor-pointer shadow-soft min-h-[44px]"
            >
              <option value="nearest">{t('home.nearest')}</option>
            </select>
          </div>
        </div>

        {/* Active Filter Chips Bar */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5 p-2.5 bg-[#EAF5EE]/60 dark:bg-[#182A20]/60 rounded-xl border border-[#176B45]/20 dark:border-[#2E8B57]/30 text-xs animate-fade-in">
            <span className="text-[11px] font-bold text-[#176B45] dark:text-[#5FB383]">{t('common.active')}:</span>
            {isCitySelected && (
              <span className="px-2 py-0.5 bg-white dark:bg-[#181F1A] rounded-lg font-semibold text-[#202923] dark:text-[#F2F5F3] border border-[#E5EBE6] dark:border-[#29352D] flex items-center gap-1 text-[11px]">
                📍 {activeCity}
                <button
                  onClick={() => {
                    setActiveCity('All India');
                    setCurrentLocation(t('home.all_india'));
                  }}
                  className="text-[#89948C] hover:text-[#202923]"
                >
                  ×
                </button>
              </span>
            )}
            {selectedCategory !== 'All' && (
              <span className="px-2 py-0.5 bg-white dark:bg-[#181F1A] rounded-lg font-semibold text-[#202923] dark:text-[#F2F5F3] border border-[#E5EBE6] dark:border-[#29352D] flex items-center gap-1 text-[11px]">
                {getCategoryLabel(selectedCategory)}
                <button onClick={() => setSelectedCategory('All')} className="text-[#89948C] hover:text-[#202923]">×</button>
              </span>
            )}
            {filterState.maxDistanceKm < 100 && (
              <span className="px-2 py-0.5 bg-white dark:bg-[#181F1A] rounded-lg font-semibold text-[#202923] dark:text-[#F2F5F3] border border-[#E5EBE6] dark:border-[#29352D] flex items-center gap-1 text-[11px]">
                {t('geo.radius_label', { radius: filterState.maxDistanceKm })}
                <button onClick={() => setFilterState((prev) => ({ ...prev, maxDistanceKm: 100 }))} className="text-[#89948C] hover:text-[#202923]">×</button>
              </span>
            )}
            {filterState.organicOnly && (
              <span className="px-2 py-0.5 bg-white dark:bg-[#181F1A] rounded-lg font-semibold text-[#202923] dark:text-[#F2F5F3] border border-[#E5EBE6] dark:border-[#29352D] flex items-center gap-1 text-[11px]">
                🌿 {t('home.organic')}
                <button onClick={() => setFilterState((prev) => ({ ...prev, organicOnly: false }))} className="text-[#89948C] hover:text-[#202923]">×</button>
              </span>
            )}
            {filterState.availableTodayOnly && (
              <span className="px-2 py-0.5 bg-white dark:bg-[#181F1A] rounded-lg font-semibold text-[#202923] dark:text-[#F2F5F3] border border-[#E5EBE6] dark:border-[#29352D] flex items-center gap-1 text-[11px]">
                ⚡ {t('catalog.in_stock')}
                <button onClick={() => setFilterState((prev) => ({ ...prev, availableTodayOnly: false }))} className="text-[#89948C] hover:text-[#202923]">×</button>
              </span>
            )}
            <button
              onClick={resetAllFilters}
              className="ml-auto text-[11px] font-bold text-[#176B45] dark:text-[#5FB383] hover:underline px-2 py-0.5"
            >
              {t('home.clear_all')}
            </button>
          </div>
        )}

        {/* Listings Feed */}
        {isLoadingProducts && sortedProducts.length === 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3.5 md:gap-4.5">
              <ListingCardSkeleton variant="compact-grid" count={8} />
            </div>
          ) : (
            <div className="space-y-3.5">
              <ListingCardSkeleton variant="vertical-feed" count={6} />
            </div>
          )
        ) : sortedProducts.length === 0 ? (
          <div className="p-6 sm:p-10 text-center bg-white dark:bg-[#181F1A] rounded-3xl border border-[#E5EBE6] dark:border-[#29352D] space-y-3 shadow-soft">
            <div className="w-12 h-12 rounded-full bg-[#EAF5EE] dark:bg-[#182A20] flex items-center justify-center mx-auto text-[#176B45] dark:text-[#5FB383]">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-[#202923] dark:text-[#F2F5F3]">
              {t('home.no_ads_range')}
            </h3>
            <p className="text-xs text-[#66736B] dark:text-[#A6B3AA] max-w-xs mx-auto">
              {t('home.no_ads_range_sub')}
            </p>
            <button
              onClick={() => setFilterState((prev) => ({ ...prev, maxDistanceKm: 50 }))}
              className="btn-primary"
            >
              {t('home.expand_radius')}
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3.5 md:gap-4.5">
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
              {t('home.farmers_near_you')}
            </h3>
          </div>
        </div>

        <div className="w-full max-w-full overflow-hidden min-w-0">
          <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
          {farmers.map((farmer) => (
            <div
              key={farmer.id}
              onClick={() => setSelectedFarmer(farmer)}
              className="shrink-0 w-56 xs:w-64 sm:w-72 p-3.5 sm:p-4 bg-white dark:bg-[#181F1A] rounded-2xl border border-[#E5EBE6] dark:border-[#29352D] shadow-soft hover:shadow-soft-md cursor-pointer transition-all flex flex-col justify-between"
            >
              <div className="flex items-center gap-3">
                <img
                  src={farmer.avatar || DEFAULT_AVATAR_IMAGE}
                  alt={farmer.name}
                  className="w-12 h-12 rounded-xl object-cover border-2 border-[#176B45]/30"
                  onError={handleAvatarError}
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
      </div>

      {/* 5. Fresh Harvest Near You Carousel */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <Sprout className="w-4 h-4 text-[#176B45] dark:text-[#5FB383]" />
            <h3 className="text-base font-bold text-[#202923] dark:text-[#F2F5F3]">
              Fresh Harvest Near You
            </h3>
          </div>
        </div>

        <div className="w-full max-w-full overflow-hidden min-w-0">
          <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
          {bestPrices.map((product) => (
            <ListingCard key={`harvest-${product.id}`} product={product} variant="horizontal" />
          ))}
          </div>
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

        <div className="w-full max-w-full overflow-hidden min-w-0">
          <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
          {organicListings.map((product) => (
            <ListingCard key={`org-${product.id}`} product={product} variant="horizontal" />
          ))}
          </div>
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

        <div className="w-full max-w-full overflow-hidden min-w-0">
          <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
          {freshToday.map((product) => (
            <ListingCard key={`today-${product.id}`} product={product} variant="horizontal" />
          ))}
          </div>
        </div>
      </div>

      {/* 8. Branded Trust & Compliance Footer */}
      <div className="mt-8 pt-6 pb-12 border-t border-[#E5EBE6] dark:border-[#29352D] space-y-6">
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-[#13231A] dark:to-[#0F1A13] border border-emerald-200/60 dark:border-emerald-800/40">
          <div className="flex items-center gap-2 mb-3">
            <span className="p-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs">
              HALDHAR
            </span>
            <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider">
              Mandi Direct Trust Guarantee
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
            <div className="p-2.5 rounded-xl bg-white/80 dark:bg-black/20">
              <span className="text-lg">🌿</span>
              <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mt-1">100% Farm Fresh</p>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Directly from local growers</p>
            </div>
            <div className="p-2.5 rounded-xl bg-white/80 dark:bg-black/20">
              <span className="text-lg">💰</span>
              <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mt-1">0% Middlemen Cut</p>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Farmers get 100% value</p>
            </div>
            <div className="p-2.5 rounded-xl bg-white/80 dark:bg-black/20">
              <span className="text-lg">⚖️</span>
              <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mt-1">Fair Pricing</p>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Direct transparent farmer rates</p>
            </div>
            <div className="p-2.5 rounded-xl bg-white/80 dark:bg-black/20">
              <span className="text-lg">🛡️</span>
              <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mt-1">Buyer Protection</p>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400">24h dispute resolution</p>
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
            HALDHAR Agricultural Marketplace • Empowering Kisan Ecosystem
          </p>
        </div>
      </div>

      {/* Modals */}
      <ExploreCategoriesModal
        isOpen={isExploreCategoriesOpen}
        onClose={() => setIsExploreCategoriesOpen(false)}
      />

      {/* Visual Crop Filter Modal */}
      {isAgriVisionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#1B201D] border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-zinc-900 dark:text-white">
                    Visual Crop Filter
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Match your photo with a produce category
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAgriVisionOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Photo preview */}
            {scannedPhotoUrl && (
              <div className="relative rounded-2xl overflow-hidden aspect-video bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-inner">
                <img
                  src={scannedPhotoUrl}
                  alt="Scanned Crop"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-3">
                  <div className="px-3 py-1 rounded-full bg-emerald-600/90 text-white text-xs font-bold flex items-center gap-1.5 shadow-md">
                    <Check className="w-3.5 h-3.5" />
                    <span>Selected Category: {detectedCategory}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Category selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Choose crop category to browse:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: t('categories.vegetables'), cat: 'Vegetables' as ProductCategory, emoji: '🥬' },
                  { label: t('categories.fruits'), cat: 'Fruits' as ProductCategory, emoji: '🍎' },
                  { label: t('categories.grains'), cat: 'Grains' as ProductCategory, emoji: '🌾' },
                  { label: t('categories.dairy'), cat: 'Dairy' as ProductCategory, emoji: '🥛' },
                  { label: t('categories.homemade'), cat: 'Homemade' as ProductCategory, emoji: '🍯' },
                  { label: t('categories.farm_equipment'), cat: 'Farm Equipment' as ProductCategory, emoji: '🚜' },
                ].map((item) => (
                  <button
                    key={item.cat}
                    type="button"
                    onClick={() => setDetectedCategory(item.cat)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center gap-2 transition ${
                      detectedCategory === item.cat
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                        : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <span>{item.emoji}</span>
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Action button */}
            <button
              type="button"
              onClick={() => handleConfirmAgriCategory(detectedCategory)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
            >
              <span>View Listings for {detectedCategory}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
