import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ListingCard } from '../common/ListingCard';
import {
  ArrowLeft,
  Search,
  X,
  SlidersHorizontal,
  TrendingUp,
  MapPin,
  Clock,
  Sparkles,
  Mic,
  LayoutGrid,
  List,
} from 'lucide-react';

const popularSuggestions = [
  'Tomato',
  'Potato',
  'Onion',
  'Spinach',
  'Organic vegetables',
  'Fresh cow milk',
  'Carrots',
  'Himalayan Honey',
  'Green Peas',
];

export const SearchScreen: React.FC = () => {
  const {
    products,
    searchQuery,
    setSearchQuery,
    setIsSearchScreenOpen,
    setIsFilterModalOpen,
    filterState,
    setFilterState,
    currentLocation,
    showToast,
    customerTab,
    setCustomerTab,
  } = useApp();

  const [inputVal, setInputVal] = useState(searchQuery);
  const [isListening, setIsListening] = useState(false);
  const [searchViewMode, setSearchViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    setInputVal(searchQuery);
  }, [searchQuery]);

  const handleSearch = (term: string) => {
    setInputVal(term);
    setSearchQuery(term);
  };

  const handleClear = () => {
    setInputVal('');
    setSearchQuery('');
  };

  const startVoiceSearch = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showToast('Voice Search: Listening for crop name...');
      setIsListening(true);
      setTimeout(() => {
        setIsListening(false);
        handleSearch('Tomatoes');
        showToast('Recognized: "Tomatoes"');
      }, 1500);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'hi-IN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        showToast('Mic on: Please speak crop name...');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          handleSearch(transcript);
          showToast(`Voice Search: "${transcript}"`);
        }
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  // Filter listings based on search term & filter bottom sheet
  const matchingListings = products.filter((p) => {
    if (inputVal.trim()) {
      const q = inputVal.toLowerCase();
      const match =
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.farmerName.toLowerCase().includes(q) ||
        p.farmName.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q);
      if (!match) return false;
    }

    if (filterState.category !== 'All' && p.category !== filterState.category) return false;
    if (p.price < filterState.minPrice || p.price > filterState.maxPrice) return false;
    if (filterState.organicOnly && !p.isOrganic) return false;
    if (filterState.availableTodayOnly && !p.isAvailableToday) return false;
    if (p.distanceKm > filterState.maxDistanceKm) return false;

    return true;
  });

  // Sort (OLX Priority: Featured & Urgent ads at top)
  const sortedListings = [...matchingListings].sort((a, b) => {
    if (a.isFeatured && !b.isFeatured) return -1;
    if (!a.isFeatured && b.isFeatured) return 1;
    if (a.isUrgent && !b.isUrgent) return -1;
    if (!a.isUrgent && b.isUrgent) return 1;

    if (filterState.sortBy === 'nearest') return a.distanceKm - b.distanceKm;
    if (filterState.sortBy === 'price_low') return a.price - b.price;
    if (filterState.sortBy === 'price_high') return b.price - a.price;
    return 0;
  });

  return (
    <div className="fixed inset-0 z-50 bg-[#FAF9F6] dark:bg-[#111412] flex flex-col max-w-5xl mx-auto overflow-hidden animate-fade-in">
      {/* Search Header Bar */}
      <div className="p-4 bg-white dark:bg-[#1B201D] border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2.5 shadow-xs">
        <button
          onClick={() => {
            setIsSearchScreenOpen(false);
            if (customerTab === 'search') {
              setCustomerTab('home');
            }
          }}
          className="p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            autoFocus
            value={inputVal}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="What are you looking for?"
            className="w-full pl-10 pr-16 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 rounded-2xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />

          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {inputVal && (
              <button
                onClick={handleClear}
                className="p-1 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={startVoiceSearch}
              className={`p-1.5 rounded-full transition-all ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
              }`}
              title="Voice Search (Speak crop name)"
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>
        </div>

        <button
          onClick={() => setIsFilterModalOpen(true)}
          className="p-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 transition-colors"
          title="Filter Results"
        >
          <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
        </button>
      </div>

      {/* Body: Suggestions vs Results */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!inputVal.trim() ? (
          /* Popular Search Suggestions */
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Popular Farm Searches
              </span>
              <div className="flex flex-wrap gap-2">
                {popularSuggestions.map((item) => (
                  <button
                    key={item}
                    onClick={() => handleSearch(item)}
                    className="px-3.5 py-2 rounded-2xl bg-white dark:bg-[#1B201D] text-zinc-700 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-800 text-xs font-semibold hover:border-emerald-500 hover:text-emerald-700 transition-all flex items-center gap-1.5 shadow-2xs"
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{item}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-3xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
              <span className="font-bold block">💡 Voice Search Ready:</span>
              <p className="text-zinc-600 dark:text-zinc-400">
                Tap the microphone icon to speak in Hindi or English (e.g. "Tomatoes", "Desi cow milk", "Spinach").
              </p>
            </div>
          </div>
        ) : (
          /* Search Results View */
          <div className="space-y-3.5">
            <div className="flex items-center justify-between px-1">
              <div>
                <h3 className="font-black text-base text-zinc-900 dark:text-white">
                  "{inputVal}" near you
                </h3>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {matchingListings.length} direct farm listings
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-xl border border-zinc-200 dark:border-zinc-700">
                  <button
                    onClick={() => setSearchViewMode('grid')}
                    className={`p-1.5 rounded-lg transition ${
                      searchViewMode === 'grid'
                        ? 'bg-white dark:bg-zinc-900 text-emerald-600 shadow-2xs'
                        : 'text-zinc-400 hover:text-zinc-600'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setSearchViewMode('list')}
                    className={`p-1.5 rounded-lg transition ${
                      searchViewMode === 'list'
                        ? 'bg-white dark:bg-zinc-900 text-emerald-600 shadow-2xs'
                        : 'text-zinc-400 hover:text-zinc-600'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>

                <select
                  value={filterState.sortBy}
                  onChange={(e) => setFilterState((prev) => ({ ...prev, sortBy: e.target.value as any }))}
                  className="px-2 py-1.5 rounded-xl bg-white dark:bg-[#1B201D] text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 text-xs font-bold focus:outline-none"
                >
                  <option value="nearest">Nearest</option>
                  <option value="price_low">Price: Low</option>
                  <option value="price_high">Price: High</option>
                </select>
              </div>
            </div>

            {sortedListings.length === 0 ? (
              <div className="p-5 sm:p-8 text-center bg-white dark:bg-[#1B201D] rounded-3xl border border-zinc-200 dark:border-zinc-800 space-y-3 mt-4">
                <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
                  <Search className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-sm text-zinc-900 dark:text-white">
                  No listings found
                </h4>
                <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                  Try searching for another vegetable or increase your distance radius.
                </p>
                <button
                  onClick={() => setFilterState((prev) => ({ ...prev, maxDistanceKm: 50 }))}
                  className="min-h-[44px] px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center justify-center"
                >
                  Expand Distance Radius
                </button>
              </div>
            ) : searchViewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {sortedListings.map((product) => (
                  <ListingCard key={product.id} product={product} variant="compact-grid" />
                ))}
              </div>
            ) : (
              <div className="space-y-3.5">
                {sortedListings.map((product) => (
                  <ListingCard key={product.id} product={product} variant="vertical-feed" />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
