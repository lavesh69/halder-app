import React from 'react';
import { useApp } from '../../context/AppContext';
import { X, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const categories = ['All', 'Vegetables', 'Fruits', 'Grains', 'Dairy', 'Farm Equipment', 'Livestock', 'Organic', 'Homemade', 'Other'];
const distances = [1, 5, 10, 25, 50];

export const FilterBottomSheet: React.FC = () => {
  const {
    isFilterModalOpen,
    setIsFilterModalOpen,
    filterState,
    setFilterState,
    resetFilters,
    products,
  } = useApp();

  if (!isFilterModalOpen) return null;

  // Calculate matching count
  const matchingCount = products.filter((p) => {
    if (filterState.category !== 'All' && p.category !== filterState.category) return false;
    if (p.price < filterState.minPrice || p.price > filterState.maxPrice) return false;
    if (filterState.organicOnly && !p.isOrganic) return false;
    if (filterState.availableTodayOnly && !p.isAvailableToday) return false;
    if (p.distanceKm > filterState.maxDistanceKm) return false;
    return true;
  }).length;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-fade-in">
      <div
        className="w-full max-w-lg bg-white dark:bg-[#1B201D] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 max-h-[90dvh] flex flex-col overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/80 shrink-0">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-emerald-600" />
            <h3 className="font-black text-lg text-zinc-900 dark:text-white">
              Filter Listings
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={resetFilters}
              className="text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center gap-1 p-1.5"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
            <button
              onClick={() => setIsFilterModalOpen(false)}
              className="p-2 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Filters */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* 1. Category */}
          <div className="space-y-2">
            <label className="font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
              Category
            </label>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => {
                const isSelected = filterState.category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFilterState((prev) => ({ ...prev, category: cat }))}
                    className={`min-h-[36px] px-3 py-1.5 rounded-xl font-bold transition-all ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Maximum Distance Radius */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Max Distance from you
              </label>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                Within {filterState.maxDistanceKm} km
              </span>
            </div>
            <div className="grid grid-cols-3 xs:grid-cols-5 gap-1.5">
              {distances.map((d) => {
                const isSelected = filterState.maxDistanceKm === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setFilterState((prev) => ({ ...prev, maxDistanceKm: d }))}
                    className={`min-h-[38px] py-2 rounded-xl font-bold transition-all text-center ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    {d} km
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Price Budget Quick Selector */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Budget / Max Price
              </label>
              <span className="font-black text-emerald-600 dark:text-emerald-400 text-xs">
                {filterState.maxPrice >= 100000 ? 'Any Budget (No Limit)' : `Up to ${formatCurrency(filterState.maxPrice)}`}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { label: 'Under ₹100', val: 100 },
                { label: 'Under ₹500', val: 500 },
                { label: 'Under ₹2,000', val: 2000 },
                { label: 'Under ₹10,000', val: 10000 },
                { label: 'Under ₹50,000', val: 50000 },
                { label: 'Any Price', val: 100000 },
              ].map((p) => {
                const isSelected = filterState.maxPrice === p.val;
                return (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => setFilterState((prev) => ({ ...prev, maxPrice: p.val }))}
                    className={`min-h-[40px] py-2 px-1 text-center rounded-xl font-bold transition text-xs ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sort By Selector (OLX Standard) */}
          <div className="space-y-2">
            <label className="font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
              Sort By
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { label: 'Nearest First', val: 'nearest' },
                { label: 'Price: Low-High', val: 'price_low' },
                { label: 'Price: High-Low', val: 'price_high' },
              ].map((s) => {
                const isSelected = filterState.sortBy === s.val;
                return (
                  <button
                    key={s.val}
                    type="button"
                    onClick={() => setFilterState((prev) => ({ ...prev, sortBy: s.val as any }))}
                    className={`min-h-[40px] py-2 px-2 text-center rounded-xl font-bold transition text-xs ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Toggles: Available Today & Organic */}
          <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <label className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 cursor-pointer">
              <span className="font-bold text-zinc-800 dark:text-zinc-200">
                🟢 Available Today (Harvested this morning)
              </span>
              <input
                type="checkbox"
                checked={filterState.availableTodayOnly}
                onChange={(e) => setFilterState((prev) => ({ ...prev, availableTodayOnly: e.target.checked }))}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 cursor-pointer">
              <span className="font-bold text-zinc-800 dark:text-zinc-200">
                🌱 100% Certified Organic Only
              </span>
              <input
                type="checkbox"
                checked={filterState.organicOnly}
                onChange={(e) => setFilterState((prev) => ({ ...prev, organicOnly: e.target.checked }))}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
            </label>
          </div>
        </div>

        {/* Sticky Apply Button */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-[#1B201D]">
          <button
            onClick={() => setIsFilterModalOpen(false)}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-sm rounded-2xl shadow-soft transition-all"
          >
            Show {matchingCount} Results
          </button>
        </div>
      </div>
    </div>
  );
};
