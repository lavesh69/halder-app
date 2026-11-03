import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';
import { Product } from '../../types';
import {
  X,
  Plus,
  Trash2,
  Eye,
  Tag,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  Megaphone,
} from 'lucide-react';

export const MyAdsModal: React.FC = () => {
  const {
    isMyAdsOpen,
    setIsMyAdsOpen,
    products,
    currentUser,
    deleteProduct,
    setSelectedProduct,
    setIsFastSellOpen,
  } = useApp();

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!isMyAdsOpen) return null;

  // Identify ads owned by the current active user / profile
  const currentUserId = currentUser?.farmerProfileId || currentUser?.id || 'farmer-1';
  const myAds = products.filter(
    (p) => p.farmerId === currentUserId || (currentUser?.name && p.farmerName === currentUser.name)
  );

  const handleDelete = (ad: Product) => {
    deleteProduct(ad.id);
    setConfirmDeleteId(null);
  };

  const handleOpenAdDetail = (ad: Product) => {
    setSelectedProduct(ad);
    setIsMyAdsOpen(false);
  };

  const handlePostNew = () => {
    setIsMyAdsOpen(false);
    setIsFastSellOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-fade-in">
      <div
        className="w-full max-w-lg bg-white dark:bg-[#1B201D] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 max-h-[90vh] flex flex-col overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-zinc-900 dark:text-white">
                  My Advertisements
                </h3>
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  {myAds.length}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                मेरे विज्ञापन • Manage or remove your listings
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePostNew}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>+ Post Ad</span>
            </button>
            <button
              onClick={() => setIsMyAdsOpen(false)}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {myAds.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-3xl">
                📢
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-zinc-900 dark:text-white">
                  No Advertisements Posted Yet
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto">
                  You haven't posted any crop, farm produce, or homemade food item for sale. Tap below to reach nearby buyers!
                </p>
              </div>
              <button
                onClick={handlePostNew}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-soft transition"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Post Your First Advertisement (विज्ञापन पोस्ट करें)</span>
              </button>
            </div>
          ) : (
            myAds.map((ad) => {
              const isConfirming = confirmDeleteId === ad.id;

              return (
                <div
                  key={ad.id}
                  className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/80 flex flex-col gap-3 transition-all hover:border-emerald-500/50"
                >
                  <div className="flex gap-3.5">
                    {/* Image Thumbnail */}
                    <img
                      src={ad.image || (ad.images && ad.images[0]) || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=200'}
                      alt={ad.name}
                      className="w-20 h-20 rounded-xl object-cover shrink-0 border border-zinc-200 dark:border-zinc-700"
                    />

                    {/* Meta info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                          {ad.name}
                        </h4>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Live Ad
                        </span>
                      </div>

                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-base font-black text-emerald-700 dark:text-emerald-400">
                          {formatCurrency(ad.price)}
                        </span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          / {ad.unit}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3 text-emerald-600" />
                          {ad.category}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {ad.viewsCount || 1} views
                        </span>
                        <span>• {ad.availableQuantity} {ad.unit} stock</span>
                      </div>
                    </div>
                  </div>

                  {/* Inline Delete Confirmation or Action Bar */}
                  {isConfirming ? (
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 flex items-center justify-between gap-2 animate-fade-in">
                      <div className="flex items-center gap-1.5 text-xs text-red-700 dark:text-red-400 font-medium">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                        <span>Delete this advertisement permanently?</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2.5 py-1 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 rounded-lg"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleDelete(ad)}
                          className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-xs transition"
                        >
                          Confirm Delete
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60">
                      <button
                        onClick={() => handleOpenAdDetail(ad)}
                        className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Preview on Marketplace</span>
                      </button>

                      <button
                        onClick={() => setConfirmDeleteId(ad.id)}
                        className="px-3 py-1.5 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition flex items-center gap-1.5 border border-red-200/60 dark:border-red-900/40"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Ad</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Note */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Instant live sync across all buyers
          </span>
          <span>HALDER Classifieds</span>
        </div>
      </div>
    </div>
  );
};
