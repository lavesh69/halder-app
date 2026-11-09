import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';
import { Product } from '../../types';
import {
  Plus,
  Trash2,
  Eye,
  Tag,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  Megaphone,
  Search,
  Check,
  Edit3,
  X,
  TrendingUp,
  Zap,
  Sparkles,
  Boxes,
} from 'lucide-react';

export const CustomerMyAdsView: React.FC = () => {
  const {
    products,
    currentUser,
    deleteProduct,
    setSelectedProduct,
    setIsFastSellOpen,
    updateProductPrice,
    toggleProductSold,
    boostProduct,
    setStockControlProduct,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'active' | 'sold'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [newPriceVal, setNewPriceVal] = useState<number | ''>('');
  const [boostingAd, setBoostingAd] = useState<Product | null>(null);

  const currentUserId = currentUser?.farmerProfileId || currentUser?.id || 'farmer-1';

  // Filter ads owned by user
  const allUserAds = products.filter(
    (p) => p.farmerId === currentUserId || (currentUser?.name && p.farmerName === currentUser.name)
  );

  const activeAds = allUserAds.filter((p) => p.isAvailable !== false);
  const soldAds = allUserAds.filter((p) => p.isAvailable === false);

  const displayedAds = (activeTab === 'active' ? activeAds : soldAds).filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalViews = allUserAds.reduce((acc, p) => acc + (p.viewsCount || 0), 0);

  const handleStartEditPrice = (ad: Product) => {
    setEditingPriceId(ad.id);
    setNewPriceVal(ad.price);
  };

  const handleSavePrice = (adId: string) => {
    if (newPriceVal !== '' && Number(newPriceVal) > 0) {
      updateProductPrice(adId, Number(newPriceVal));
    }
    setEditingPriceId(null);
  };

  return (
    <div className="space-y-4 pb-24 animate-fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-zinc-900 dark:text-white">
              My Ads (मेरे विज्ञापन)
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
              {allUserAds.length} Total
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            OLX-style classified ad manager & real-time controls
          </p>
        </div>

        <button
          onClick={() => setIsFastSellOpen(true)}
          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-soft transition active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Post Ad</span>
        </button>
      </div>

      {/* Stats Summary Card */}
      <div className="grid grid-cols-3 gap-2 sm:gap-2.5 bg-white dark:bg-[#1B201D] p-3 sm:p-3.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs">
        <div className="text-center border-r border-zinc-100 dark:border-zinc-800 min-w-0 px-1">
          <span className="text-[10px] sm:text-[11px] font-semibold text-zinc-400 block truncate">Active Ads</span>
          <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 block truncate">
            {activeAds.length}
          </span>
        </div>
        <div className="text-center border-r border-zinc-100 dark:border-zinc-800 min-w-0 px-1">
          <span className="text-[10px] sm:text-[11px] font-semibold text-zinc-400 block truncate">Total Views</span>
          <span className="text-base sm:text-lg font-black text-zinc-900 dark:text-white flex items-center justify-center gap-1 truncate">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{totalViews}</span>
          </span>
        </div>
        <div className="text-center min-w-0 px-1">
          <span className="text-[10px] sm:text-[11px] font-semibold text-zinc-400 block truncate">Sold / Closed</span>
          <span className="text-base sm:text-lg font-black text-zinc-600 dark:text-zinc-300 block truncate">
            {soldAds.length}
          </span>
        </div>
      </div>

      {/* OLX-style Sub-Tabs (Active / Sold) */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-2.5 text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'active'
              ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <span>Active (लाइव)</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
            {activeAds.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('sold')}
          className={`flex-1 py-2.5 text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'sold'
              ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <span>Sold / Inactive (बिके हुए)</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
            {soldAds.length}
          </span>
        </button>
      </div>

      {/* Search in ads */}
      {allUserAds.length > 2 && (
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search your advertisements..."
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#1B201D] border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:border-emerald-500 text-zinc-900 dark:text-white"
          />
        </div>
      )}

      {/* Ads List */}
      <div>
        {displayedAds.length === 0 ? (
          <div className="py-12 px-4 text-center bg-white dark:bg-[#1B201D] rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto text-2xl">
              📢
            </div>
            <div>
              <h4 className="font-bold text-sm text-zinc-900 dark:text-white">
                {activeTab === 'active' ? 'No active advertisements' : 'No sold advertisements yet'}
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs mx-auto">
                {activeTab === 'active'
                  ? 'Sell farm crops, dairy, homemade spices, or seeds directly to nearby buyers!'
                  : 'Items you mark as sold will appear here for your records.'}
              </p>
            </div>
            {activeTab === 'active' && (
              <button
                onClick={() => setIsFastSellOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Post Your Advertisement Now</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {displayedAds.map((ad) => {
            const isConfirming = confirmDeleteId === ad.id;
            const isEditingPrice = editingPriceId === ad.id;
            const isSold = ad.isAvailable === false;

            return (
              <div
                key={ad.id}
                className="p-4 bg-white dark:bg-[#1B201D] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs space-y-3 hover:border-emerald-500/50 transition-all"
              >
                {/* Main Ad Row */}
                <div className="flex gap-3.5">
                  <div className="relative shrink-0">
                    <img
                      src={ad.image || (ad.images && ad.images[0]) || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=200'}
                      alt={ad.name}
                      className="w-20 h-20 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700"
                    />
                    {isSold && (
                      <span className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center text-[10px] font-black text-white uppercase tracking-wider">
                        SOLD
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                        {ad.name}
                      </h4>
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          isSold
                            ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                            : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                        }`}
                      >
                        {!isSold && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                        {isSold ? 'Sold' : 'Active'}
                      </span>
                    </div>

                    {/* Price display / Inline editor */}
                    {isEditingPrice ? (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-xs font-bold text-zinc-500">₹</span>
                        <input
                          type="number"
                          value={newPriceVal}
                          onChange={(e) => setNewPriceVal(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-24 px-2 py-0.5 text-xs font-bold border border-emerald-500 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSavePrice(ad.id)}
                          className="p-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                          title="Save price"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingPriceId(null)}
                          className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-base font-black text-emerald-700 dark:text-emerald-400">
                          {formatCurrency(ad.price)}
                          <span className="text-xs font-normal text-zinc-500"> / {ad.unit}</span>
                        </span>
                        <button
                          onClick={() => handleStartEditPrice(ad)}
                          className="p-1 text-zinc-400 hover:text-emerald-600 rounded transition"
                          title="Edit Price"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-1 text-[11px] text-zinc-500 font-medium">
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3 text-emerald-600" />
                        {ad.category}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {ad.viewsCount || 1} views
                      </span>
                      <span>• {ad.availableQuantity} {ad.unit}</span>
                    </div>
                  </div>
                </div>

                {/* Inline Confirmation or OLX Action Buttons */}
                {isConfirming ? (
                  <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 flex items-center justify-between gap-2 animate-fade-in">
                    <div className="flex items-center gap-1.5 text-xs text-red-700 dark:text-red-400 font-medium">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                      <span>Delete ad permanently?</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2.5 py-1 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          deleteProduct(ad.id);
                          setConfirmDeleteId(null);
                        }}
                        className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-xs transition"
                      >
                        Confirm
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                    <button
                      onClick={() => setSelectedProduct(ad)}
                      className="font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>View Live Ad</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {/* Live Stock & Inventory Button */}
                      <button
                        onClick={() => setStockControlProduct(ad)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold transition flex items-center gap-1 shadow-2xs hover:bg-emerald-100"
                        title="Manage Stock & Audit Trail"
                      >
                        <Boxes className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Stock ({ad.availableQuantity})</span>
                      </button>

                      {/* OLX Boost Ad button */}
                      {!isSold && (
                        <button
                          onClick={() => setBoostingAd(ad)}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold transition flex items-center gap-1 shadow-2xs"
                          title="Sell faster with OLX Feature/Urgent boost"
                        >
                          <Zap className="w-3.5 h-3.5 fill-white" />
                          <span>Boost Ad</span>
                        </button>
                      )}

                      {/* Mark Sold / Active toggle */}
                      <button
                        onClick={() => toggleProductSold(ad.id)}
                        className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold transition"
                      >
                        {isSold ? 'Relist as Active' : 'Mark as Sold'}
                      </button>

                      {/* Remove Ad Button */}
                      <button
                        onClick={() => setConfirmDeleteId(ad.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
                        title="Remove Advertisement"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          </div>
        )}
      </div>

      {/* OLX Boost Ad Modal */}
      {boostingAd && (
        <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4 animate-fade-in" onClick={() => setBoostingAd(null)}>
          <div className="w-full max-w-sm bg-white dark:bg-[#1E2420] rounded-3xl p-5 border border-zinc-200 dark:border-zinc-700 shadow-2xl space-y-4 animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded-xl">
                  <Zap className="w-4 h-4 fill-amber-500" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Boost Your Advertisement</h3>
                  <p className="text-[11px] text-zinc-500">Sell up to 5x faster on HALDER</p>
                </div>
              </div>
              <button onClick={() => setBoostingAd(null)} className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Ad Preview */}
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80 flex items-center gap-3">
              <img
                src={boostingAd.image || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=200'}
                alt={boostingAd.name}
                className="w-12 h-12 rounded-xl object-cover shrink-0"
              />
              <div className="min-w-0">
                <h4 className="font-bold text-xs text-zinc-900 dark:text-white truncate">{boostingAd.name}</h4>
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(boostingAd.price)} / {boostingAd.unit}</span>
              </div>
            </div>

            {/* Plans List */}
            <div className="space-y-2">
              <div
                onClick={() => {
                  boostProduct(boostingAd.id, 'featured');
                  setBoostingAd(null);
                }}
                className="p-3 rounded-2xl border border-amber-300 dark:border-amber-700/60 bg-amber-50/50 dark:bg-amber-950/20 hover:border-amber-500 cursor-pointer transition flex items-center justify-between"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-zinc-900 dark:text-white">
                    <span className="text-amber-500">⚡</span>
                    <span>Feature on Top (7 Days)</span>
                  </div>
                  <p className="text-[10px] text-zinc-500">Shows gold FEATURED badge at top of search</p>
                </div>
                <span className="font-black text-xs text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/60 px-2.5 py-1 rounded-xl">
                  ₹99
                </span>
              </div>

              <div
                onClick={() => {
                  boostProduct(boostingAd.id, 'urgent');
                  setBoostingAd(null);
                }}
                className="p-3 rounded-2xl border border-red-200 dark:border-red-800/60 bg-red-50/40 dark:bg-red-950/20 hover:border-red-500 cursor-pointer transition flex items-center justify-between"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-zinc-900 dark:text-white">
                    <span className="text-red-500">🔥</span>
                    <span>Urgent Seller Badge</span>
                  </div>
                  <p className="text-[10px] text-zinc-500">Attracts instant buyers looking for ready stock</p>
                </div>
                <span className="font-black text-xs text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/60 px-2.5 py-1 rounded-xl">
                  ₹149
                </span>
              </div>

              <div
                onClick={() => {
                  boostProduct(boostingAd.id, 'combo');
                  setBoostingAd(null);
                }}
                className="p-3 rounded-2xl border-2 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 hover:border-emerald-600 cursor-pointer transition flex items-center justify-between shadow-2xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-zinc-900 dark:text-white">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Super Seller Combo</span>
                    <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-bold">BEST</span>
                  </div>
                  <p className="text-[10px] text-zinc-500">Top Rank + Featured Badge + 500 WhatsApp SMS</p>
                </div>
                <span className="font-black text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-2.5 py-1 rounded-xl">
                  ₹199
                </span>
              </div>
            </div>

            <button
              onClick={() => setBoostingAd(null)}
              className="w-full py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 font-bold text-xs text-zinc-500 hover:bg-zinc-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
