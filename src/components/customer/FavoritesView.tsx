import React from 'react';
import { useApp } from '../../context/AppContext';
import { ListingCard } from '../common/ListingCard';
import { Heart, ArrowLeft, ShoppingBag } from 'lucide-react';

export const FavoritesView: React.FC = () => {
  const { products, favorites, setCustomerTab } = useApp();

  const savedListings = products.filter((p) => favorites.includes(p.id));

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setCustomerTab('home')}
            className="p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
              <Heart className="w-6 h-6 fill-red-500 text-red-500" />
              <span>Saved Listings</span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {savedListings.length} products saved to your favorites
            </p>
          </div>
        </div>
      </div>

      {savedListings.length === 0 ? (
        <div className="p-5 sm:p-8 text-center bg-white dark:bg-[#1B201D] rounded-3xl border border-zinc-200 dark:border-zinc-800 space-y-3 mt-6">
          <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-950/40 flex items-center justify-center mx-auto text-red-500">
            <Heart className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-base text-zinc-900 dark:text-white">
            Save products you like
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto">
            Tap the heart icon on any vegetable or farm product to save it here for quick reordering.
          </p>
          <button
            onClick={() => setCustomerTab('home')}
            className="min-h-[44px] px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors inline-flex items-center justify-center"
          >
            Explore Marketplace
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {savedListings.map((product) => (
            <ListingCard key={product.id} product={product} variant="compact-grid" />
          ))}
        </div>
      )}
    </div>
  );
};
