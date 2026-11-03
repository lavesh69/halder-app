import React from 'react';
import { useApp } from '../../context/AppContext';
import { ListingCard } from '../common/ListingCard';
import {
  X,
  Star,
  MapPin,
  ShieldCheck,
  Calendar,
  MessageCircle,
  Phone,
  Package,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';

import { ApiClient } from '../../api/client';

export const FarmerSellerProfileModal: React.FC = () => {
  const {
    selectedFarmer,
    setSelectedFarmer,
    products,
    openFarmerChat,
    showToast,
  } = useApp();

  const [publicProfile, setPublicProfile] = React.useState<any>(null);

  React.useEffect(() => {
    if (selectedFarmer?.id) {
      ApiClient.getFarmerPublicProfile(selectedFarmer.id)
        .then((data) => setPublicProfile(data))
        .catch(() => {});
    }
  }, [selectedFarmer?.id]);

  if (!selectedFarmer) return null;

  const farmerProducts = products.filter((p) => p.farmerId === selectedFarmer.id);

  const handleOpenChat = () => {
    openFarmerChat(selectedFarmer, `Hello ${selectedFarmer.name}! I saw your farm listings on HALDER.`);
    setSelectedFarmer(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-fade-in">
      <div
        className="w-full max-w-lg bg-white dark:bg-[#1B201D] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 max-h-[90dvh] flex flex-col overflow-hidden animate-slide-up"
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

        {/* Scrollable Seller Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          {/* Marketplace Seller Stats (Listings, Orders, Response Rate) */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 p-3 sm:p-3.5 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/60 text-center">
            <div className="min-w-0">
              <span className="text-sm sm:text-base font-black text-zinc-900 dark:text-white block truncate">
                {selectedFarmer.totalListingsCount || farmerProducts.length}
              </span>
              <span className="text-[9px] sm:text-[10px] text-zinc-500 uppercase tracking-wider font-semibold block truncate">
                Listings
              </span>
            </div>

            <div className="border-x border-zinc-200 dark:border-zinc-700 min-w-0 px-1">
              <span className="text-sm sm:text-base font-black text-emerald-700 dark:text-emerald-400 block truncate">
                {selectedFarmer.totalOrdersCompleted || 186}
              </span>
              <span className="text-[9px] sm:text-[10px] text-zinc-500 uppercase tracking-wider font-semibold block truncate">
                Orders Done
              </span>
            </div>

            <div className="min-w-0">
              <span className="text-sm sm:text-base font-black text-amber-600 dark:text-amber-400 block truncate">
                {selectedFarmer.responseRate || 98}%
              </span>
              <span className="text-[9px] sm:text-[10px] text-zinc-500 uppercase tracking-wider font-semibold block truncate">
                Response Rate
              </span>
            </div>
          </div>

          {/* Quick Contact & Chat Action Bar */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleOpenChat}
              className="min-h-[48px] py-2 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold transition-all shadow-xs flex flex-col items-center justify-center gap-1 active:scale-95"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-[10px]">Chat</span>
            </button>

            <button
              onClick={() => {
                const text = encodeURIComponent(`Hello ${selectedFarmer.name}, I am contacting you regarding your farm produce on HALDER.`);
                window.open(`https://wa.me/919845012345?text=${text}`, '_blank');
              }}
              className="min-h-[48px] py-2 px-2 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 rounded-2xl font-bold border border-emerald-200 dark:border-emerald-800/50 transition-colors flex flex-col items-center justify-center gap-1 active:scale-95"
            >
              <span className="text-sm leading-none">💬</span>
              <span className="text-[10px]">WhatsApp</span>
            </button>

            <a
              href={`tel:${selectedFarmer.phone.replace(/\s+/g, '')}`}
              onClick={() => showToast(`Dialing ${selectedFarmer.name} (${selectedFarmer.phone})`)}
              className="min-h-[48px] py-2 px-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-800 dark:text-zinc-200 rounded-2xl font-bold border border-zinc-200 dark:border-zinc-700 transition-colors flex flex-col items-center justify-center gap-1 active:scale-95"
            >
              <Phone className="w-4 h-4 text-emerald-600" />
              <span className="text-[10px]">Call</span>
            </a>
          </div>

          {/* Trust Badges */}
          <div className="space-y-1.5">
            <span className="font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block text-[11px]">
              Trust & Badges
            </span>
            <div className="flex flex-wrap gap-1.5">
              {selectedFarmer.badges.map((b, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  {b}
                </span>
              ))}
            </div>
          </div>

          {/* Bio / Farm Story */}
          <div className="space-y-1.5">
            <span className="font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block text-[11px]">
              About the Farm & Harvest
            </span>
            <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
              {selectedFarmer.bio}
            </p>
          </div>

          {/* Products by this Farmer */}
          <div className="space-y-3 pt-2">
            <span className="font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block text-[11px]">
              Products by {selectedFarmer.name} ({farmerProducts.length})
            </span>

            <div className="space-y-3">
              {farmerProducts.map((product) => (
                <ListingCard key={product.id} product={product} variant="vertical-feed" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
