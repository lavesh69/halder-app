import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n';
import { ApiClient } from '../../api/client';
import { WeatherAdvisoryWidget } from './WeatherAdvisoryWidget';
import { FarmCropCalendarModal } from './FarmCropCalendarModal';
import { FarmerSubscriptionModal } from './FarmerSubscriptionModal';
import { FarmerBusinessInsightsModal } from './FarmerBusinessInsightsModal';
import {
  Plus,
  ChevronRight,
  MessageCircle,
  Calendar,
  Crown,
  FileSpreadsheet,
  Megaphone,
  Sparkles,
} from 'lucide-react';

interface CropCalcPreset {
  id: string;
  name: string;
  hindiName: string;
  emoji: string;
  avgYieldPerAcre: number; // in quintals
  avgCostPerAcre: number; // in rupees
  benchmarkPrice: number; // in rupees per quintal
}

export const FarmerDashboard: React.FC = () => {
  const { t } = useTranslation();
  const {
    products,
    setIsFastSellOpen,
    setEditingListing,
    setFarmerTab,
    activeCity,
    currentUser,
    unreadChatCount,
    openFarmerChat,
    showToast,
  } = useApp();

  const currentFarmerId = currentUser?.farmerProfileId || currentUser?.id || 'farmer-1';
  const currentFarmerName = currentUser?.name ? currentUser.name.split(' ')[0] : 'Rajesh';

  // Farm products
  const myProducts = products.filter((p) => p.farmerId === currentFarmerId || p.farmerId === 'farmer-1');
  const availableProductsCount = myProducts.filter((p) => p.isAvailable).length;



  // Modals for Ecosystem Modules
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [isInsightsModalOpen, setIsInsightsModalOpen] = useState(false);
  const [buyerDemands, setBuyerDemands] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    ApiClient.listRequirements({ limit: 4 })
      .then((data) => {
        if (isMounted && Array.isArray(data)) setBuyerDemands(data);
      })
      .catch((err) => console.warn('Requirements fetch:', err));
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      {/* Farmer Greeting Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-[#176B45] dark:text-[#5FB383]">
            Green Valley Organic Farm • {activeCity}
          </span>
          <h2 className="text-2xl sm:text-3xl font-heading font-black text-[#202923] dark:text-[#F2F5F3]">
            Good morning, {currentFarmerName} 🌾
          </h2>
          <p className="text-xs text-[#66736B] dark:text-[#A6B3AA] mt-0.5">
            Mandi marketplace is live • Local buyers are actively purchasing
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFarmerTab('chat')}
            className="relative min-h-[44px] min-w-[44px] flex items-center justify-center p-2.5 bg-white dark:bg-[#181F1A] border border-[#E5EBE6] dark:border-[#29352D] rounded-xl text-[#202923] dark:text-[#F2F5F3] hover:bg-[#F0F4F1] dark:hover:bg-[#222B25] shadow-soft transition-all"
            title="Buyer Messages & Inquiries"
            aria-label="View messages"
          >
            <MessageCircle className="w-5 h-5 text-[#176B45] dark:text-[#5FB383]" />
            {unreadChatCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#176B45] text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadChatCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setEditingListing(null);
              setIsFastSellOpen(true);
            }}
            className="btn-primary"
            title={t('farmer.post_ad_hero_btn')}
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{t('farmer.post_ad_hero_btn')}</span>
          </button>
        </div>
      </div>

      {/* Kisan Quick Action Shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <button
          onClick={() => {
            setEditingListing(null);
            setIsFastSellOpen(true);
          }}
          className="min-h-[72px] p-2.5 bg-[#EAF5EE] dark:bg-[#182A20] rounded-xl border border-[#176B45]/20 dark:border-[#2E8B57]/30 flex flex-col items-center justify-center gap-1 hover:bg-[#176B45]/15 transition shadow-soft group"
        >
          <div className="w-7 h-7 rounded-full bg-[#176B45] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition">
            <Plus className="w-4 h-4 stroke-[3]" />
          </div>
          <span className="text-[11px] font-bold text-[#124C36] dark:text-[#5FB383] mt-0.5">
            {t('nav.post_ad')}
          </span>
        </button>

        <button
          onClick={() => setFarmerTab('my-ads')}
          className="min-h-[72px] p-2.5 bg-white dark:bg-[#181F1A] rounded-xl border border-[#E5EBE6] dark:border-[#29352D] flex flex-col items-center justify-center gap-1 hover:border-[#176B45]/50 transition shadow-soft group"
          title={t('nav.my_ads')}
        >
          <div className="w-7 h-7 rounded-full bg-[#F0F4F1] dark:bg-[#222B25] text-[#202923] dark:text-[#F2F5F3] flex items-center justify-center group-hover:bg-[#EAF5EE] group-hover:text-[#176B45] transition">
            <Megaphone className="w-4 h-4 text-[#176B45] dark:text-[#5FB383]" />
          </div>
          <span className="text-[11px] font-bold text-[#202923] dark:text-[#F2F5F3] mt-0.5">
            {t('nav.my_ads')}
          </span>
        </button>

        <button
          onClick={() => setIsCropModalOpen(true)}
          className="min-h-[72px] p-2.5 bg-white dark:bg-[#181F1A] rounded-xl border border-[#E5EBE6] dark:border-[#29352D] flex flex-col items-center justify-center gap-1 hover:border-[#176B45]/50 transition shadow-soft group"
        >
          <div className="w-7 h-7 rounded-full bg-[#F0F4F1] dark:bg-[#222B25] text-[#202923] dark:text-[#F2F5F3] flex items-center justify-center group-hover:bg-[#EAF5EE] group-hover:text-[#176B45] transition">
            <Calendar className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold text-[#202923] dark:text-[#F2F5F3] mt-0.5">
            Harvest Plan
          </span>
        </button>

        <button
          onClick={() => setFarmerTab('chat')}
          className="min-h-[72px] p-2.5 bg-white dark:bg-[#181F1A] rounded-xl border border-[#E5EBE6] dark:border-[#29352D] flex flex-col items-center justify-center gap-1 hover:border-[#176B45]/50 transition shadow-soft group relative"
        >
          <div className="w-7 h-7 rounded-full bg-[#F0F4F1] dark:bg-[#222B25] text-[#202923] dark:text-[#F2F5F3] flex items-center justify-center group-hover:bg-[#EAF5EE] group-hover:text-[#176B45] transition">
            <MessageCircle className="w-4 h-4 text-emerald-600" />
          </div>
          {unreadChatCount > 0 && (
            <span className="absolute top-2 right-2 bg-emerald-700 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full animate-pulse">
              {unreadChatCount}
            </span>
          )}
          <span className="text-[11px] font-bold text-[#202923] dark:text-[#F2F5F3] mt-0.5">
            {t('nav.chats')}
          </span>
        </button>

        <button
          onClick={() => setIsInsightsModalOpen(true)}
          className="min-h-[72px] p-2.5 bg-white dark:bg-[#181F1A] rounded-xl border border-[#E5EBE6] dark:border-[#29352D] flex flex-col items-center justify-center gap-1 hover:border-[#176B45]/50 transition shadow-soft group"
        >
          <div className="w-7 h-7 rounded-full bg-[#F0F4F1] dark:bg-[#222B25] text-[#202923] dark:text-[#F2F5F3] flex items-center justify-center group-hover:bg-[#EAF5EE] group-hover:text-[#176B45] transition">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold text-[#202923] dark:text-[#F2F5F3] mt-0.5">
            Insights
          </span>
        </button>

        <button
          onClick={() => setIsSubModalOpen(true)}
          className="min-h-[72px] p-2.5 bg-amber-50/60 dark:bg-amber-950/20 rounded-xl border border-amber-200/80 dark:border-amber-800/50 flex flex-col items-center justify-center gap-1 hover:border-amber-400 transition shadow-soft group"
        >
          <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/60 text-[#D99A32] flex items-center justify-center group-hover:bg-[#D99A32] group-hover:text-white transition">
            <Crown className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold text-[#202923] dark:text-[#F2F5F3] mt-0.5">
            Kisan Plan
          </span>
        </button>
      </div>

      {/* Kisan Direct Ad Posting Hero Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#176B45] via-[#1F7A52] to-[#124C36] text-white shadow-soft-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-[#2E8B57]/40 animate-fade-in">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider backdrop-blur-xs">
              🌾 Direct Mandi Ad Marketplace
            </span>
            <span className="text-[11px] text-emerald-200 font-bold">
              0% Commission • Direct Calls & WhatsApp
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-white">
            {t('farmer.post_ad_hero_title')}
          </h3>
          <p className="text-xs text-white/85 max-w-xl">
            {t('farmer.post_ad_hero_desc')}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <button
            onClick={() => {
              setEditingListing(null);
              setIsFastSellOpen(true);
            }}
            className="flex-1 sm:flex-initial min-h-[44px] px-5 py-2.5 bg-white text-[#124C36] hover:bg-[#F0F4F1] active:scale-95 rounded-xl font-black text-xs shadow-soft transition-all flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[3] text-[#176B45]" />
            <span>{t('farmer.post_ad_hero_btn')}</span>
          </button>

          <button
            onClick={() => setFarmerTab('my-ads')}
            className="min-h-[44px] px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs transition border border-white/20 flex items-center justify-center gap-1.5"
            title="View my listed crop advertisements"
          >
            <Megaphone className="w-4 h-4 text-white" />
            <span>{t('ads.my_ads')} ({myProducts.length})</span>
          </button>
        </div>
      </div>

      {/* Main Responsive Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols on Desktop) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Live Agro-Weather & AI Advisory Widget */}
          <WeatherAdvisoryWidget city={activeCity} />

          {/* Active Crop Advertisements Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                <h3 className="text-base font-bold text-[#202923] dark:text-[#F2F5F3]">
                  My Active Crop Ads ({myProducts.length})
                </h3>
              </div>
              <button
                onClick={() => setFarmerTab('my-ads')}
                className="text-xs font-bold text-[#176B45] dark:text-[#5FB383] hover:underline flex items-center min-h-[36px]"
              >
                <span>Manage All Ads</span>
                <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </button>
            </div>

            {myProducts.length === 0 ? (
              <div className="p-6 text-center bg-white dark:bg-[#181F1A] rounded-2xl border border-[#E5EBE6] dark:border-[#29352D] text-xs text-[#66736B] dark:text-[#A6B3AA] space-y-2 shadow-soft">
                <p className="font-bold text-[#202923] dark:text-[#F2F5F3]">No crops listed yet.</p>
                <p>Post your first harvest advertisement to start receiving direct buyer inquiries!</p>
                <button
                  onClick={() => {
                    setEditingListing(null);
                    setIsFastSellOpen(true);
                  }}
                  className="px-4 py-2 bg-[#176B45] text-white rounded-xl font-bold text-xs shadow-soft hover:bg-[#124C36] transition inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Post First Ad</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {myProducts.slice(0, 3).map((crop) => (
                  <div
                    key={crop.id}
                    className="p-3.5 bg-white dark:bg-[#181F1A] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-soft flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={crop.image}
                        alt={crop.name}
                        className="w-12 h-12 rounded-xl object-cover shrink-0 border border-zinc-200 dark:border-zinc-700"
                      />
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-white truncate">
                          {crop.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                            {crop.availableQuantity} {crop.unit} available
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            • {crop.category}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          setEditingListing(crop);
                          setIsFastSellOpen(true);
                        }}
                        className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-bold hover:bg-zinc-200 transition"
                      >
                        Edit Price
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live Buyer Demands & Mandi Tenders */}
          {buyerDemands.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="text-base">📢</span>
                  <h3 className="text-base font-bold text-[#202923] dark:text-[#F2F5F3]">
                    Buyer Demands & Bulk Tenders
                  </h3>
                </div>
                <span className="text-xs text-blue-600 dark:text-blue-400 font-bold">
                  {buyerDemands.length} Active Leads
                </span>
              </div>

              <div className="space-y-2.5">
                {buyerDemands.map((dem) => (
                  <div
                    key={dem.id}
                    className="p-3.5 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-200/80 dark:border-blue-900/40 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-blue-950 dark:text-blue-100">
                          {dem.product_name || dem.productName}
                        </span>
                        <span className="text-[10px] bg-blue-200/80 dark:bg-blue-900/60 text-blue-900 dark:text-blue-200 font-bold px-2 py-0.5 rounded-full">
                          Req: {dem.required_quantity || dem.requiredQuantity} {dem.unit || 'kg'}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                        📍 {dem.city || dem.location || 'Local Mandi'} • Target: {dem.target_price || dem.targetPrice ? `₹${dem.target_price || dem.targetPrice}/${dem.unit}` : 'Negotiable'}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        const buyerId = dem.buyer_id || dem.buyerId;
                        if (!buyerId) {
                          showToast('Buyer profile unavailable for this requirement.', 'info');
                          return;
                        }
                        openFarmerChat(
                          {
                            id: buyerId,
                            user_id: buyerId,
                            name: dem.buyer_name || dem.buyerName || 'Buyer',
                            phone: dem.buyer_phone || dem.buyerPhone || '',
                            location: dem.city || dem.location || '',
                            city: dem.city || '',
                          } as any,
                          `Namaste! Regarding your requirement for ${dem.product_name || dem.productName} (${dem.required_quantity || dem.requiredQuantity} ${dem.unit || 'kg'}), I can supply fresh morning harvest.`
                        );
                      }}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0 shadow-soft"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Quote / Send Offer</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (Side Panel: Stats, Packing & Sales) */}
        <div className="space-y-6">
          {/* Summary Metrics Cards */}
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
            {/* Buyer Inquiries */}
            <div
              onClick={() => setFarmerTab('chat')}
              className="p-3 bg-white dark:bg-[#181F1A] rounded-2xl border border-[#E5EBE6] dark:border-[#29352D] shadow-soft min-w-0 cursor-pointer hover:border-emerald-500/50 transition"
            >
              <span className="text-[10px] font-bold text-[#66736B] dark:text-[#A6B3AA] uppercase block truncate">
                Inquiries
              </span>
              <div className="flex items-baseline gap-1 mt-1 truncate">
                <span className="text-lg sm:text-xl font-heading font-black text-emerald-700 dark:text-emerald-400">
                  {unreadChatCount || 0}
                </span>
                <span className="text-[9px] font-bold text-zinc-400">Leads</span>
              </div>
            </div>

            {/* Listed Crops */}
            <div className="p-3 bg-white dark:bg-[#181F1A] rounded-2xl border border-[#E5EBE6] dark:border-[#29352D] shadow-soft min-w-0">
              <span className="text-[10px] font-bold text-[#66736B] dark:text-[#A6B3AA] uppercase block truncate">
                Crops
              </span>
              <div className="flex items-baseline gap-1 mt-1 truncate">
                <span className="text-lg sm:text-xl font-heading font-black text-[#202923] dark:text-[#F2F5F3]">
                  {myProducts.length}
                </span>
                <span className="text-[10px] text-[#89948C]">
                  ({availableProductsCount})
                </span>
              </div>
            </div>
          </div>

          {/* Pro Seller Tips */}
          <div className="p-4 bg-white dark:bg-[#181F1A] rounded-2xl border border-[#E5EBE6] dark:border-[#29352D] shadow-soft space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <h4 className="text-sm font-bold text-[#202923] dark:text-[#F2F5F3]">
                Tips for Fast Selling
              </h4>
            </div>
            <ul className="text-xs text-zinc-500 dark:text-zinc-400 space-y-1.5 list-disc list-inside">
              <li>Upload 2-3 clear photos in natural daylight.</li>
              <li>Mention accurate harvest date and mandi fair price.</li>
              <li>Respond quickly to buyer chats to close direct deals.</li>
            </ul>
            <button
              onClick={() => {
                setEditingListing(null);
                setIsFastSellOpen(true);
              }}
              className="w-full py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 transition flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Post New Crop Advertisement</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modals for Farmer Ecosystem & Intelligence */}
      <FarmCropCalendarModal
        isOpen={isCropModalOpen}
        onClose={() => setIsCropModalOpen(false)}
        farmerId={currentFarmerId}
      />

      <FarmerSubscriptionModal
        isOpen={isSubModalOpen}
        onClose={() => setIsSubModalOpen(false)}
        farmerId={currentFarmerId}
      />

      <FarmerBusinessInsightsModal
        isOpen={isInsightsModalOpen}
        onClose={() => setIsInsightsModalOpen(false)}
        farmerId={currentFarmerId}
      />
    </div>
  );
};
