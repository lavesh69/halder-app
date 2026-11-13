import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n';
import { formatCurrency } from '../../utils/formatters';
import { ApiClient } from '../../api/client';
import { StatusBadge } from '../common/StatusBadge';
import { WeatherAdvisoryWidget } from './WeatherAdvisoryWidget';
import { FarmCropCalendarModal } from './FarmCropCalendarModal';
import { FarmerSubscriptionModal } from './FarmerSubscriptionModal';
import { FarmerBusinessInsightsModal } from './FarmerBusinessInsightsModal';
import { MandiIntelligenceModal } from './MandiIntelligenceModal';
import {
  Sprout,
  TrendingUp,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  Package,
  MessageCircle,
  Phone,
  ArrowUpRight,
  Activity,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Calculator,
  Calendar,
  Crown,
  FileSpreadsheet,
  Megaphone,
} from 'lucide-react';

interface MandiRate {
  crop: string;
  hindiName: string;
  mandi: string;
  modalPrice: number;
  unit: string;
  change: number; // + or -
}

interface CropCalcPreset {
  id: string;
  name: string;
  hindiName: string;
  emoji: string;
  avgYieldPerAcre: number; // in quintals
  avgCostPerAcre: number; // in rupees
  benchmarkPrice: number; // in rupees per quintal
}

const LIVE_MANDI_RATES: MandiRate[] = [
  { crop: 'Wheat (Sharbati)', hindiName: 'गेहूं (शरबती)', mandi: 'Karnal APMC', modalPrice: 2450, unit: 'qtl', change: 35 },
  { crop: 'Basmati Paddy', hindiName: 'धान (बासमती)', mandi: 'Taraori Mandi', modalPrice: 3820, unit: 'qtl', change: -20 },
  { crop: 'Hybrid Tomato', hindiName: 'टमाटर (देसी)', mandi: 'Azadpur Mandi', modalPrice: 1850, unit: 'qtl', change: 80 },
  { crop: 'Nasik Red Onion', hindiName: 'प्याज़ (लाल)', mandi: 'Lasalgaon APMC', modalPrice: 2150, unit: 'qtl', change: -45 },
  { crop: 'Jyoti Potato', hindiName: 'आलू (ज्योति)', mandi: 'Agra Mandi', modalPrice: 1420, unit: 'qtl', change: 15 },
  { crop: 'Black Mustard', hindiName: 'सरसों (काली)', mandi: 'Jaipur Mandi', modalPrice: 5650, unit: 'qtl', change: 110 },
  { crop: 'Soybean Yellow', hindiName: 'सोयाबीन (पीला)', mandi: 'Indore APMC', modalPrice: 4720, unit: 'qtl', change: 40 },
];

export const FarmerDashboard: React.FC = () => {
  const { t } = useTranslation();
  const {
    products,
    orders,
    updateOrderStatus,
    setIsFastSellOpen,
    setEditingListing,
    setFarmerTab,
    activeCity,
    currentUser,
    unreadChatCount,
    showToast,
  } = useApp();

  const currentFarmerId = currentUser?.farmerProfileId || currentUser?.id || 'farmer-1';
  const currentFarmerName = currentUser?.name ? currentUser.name.split(' ')[0] : 'Rajesh';

  // Farm products
  const myProducts = products.filter((p) => p.farmerId === currentFarmerId || p.farmerId === 'farmer-1');
  const availableProductsCount = myProducts.filter((p) => p.isAvailable).length;

  // Incoming new orders
  const newOrders = orders.filter((o) => o.status === 'placed');
  const activePreparingOrders = orders.filter(
    (o) => o.status === 'accepted' || o.status === 'preparing'
  );

  // Today's total sales
  const todaySales = orders
    .filter((o) => o.status !== 'rejected')
    .reduce((sum, o) => sum + o.total, 0);

  // Modals for Ecosystem Modules
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [isInsightsModalOpen, setIsInsightsModalOpen] = useState(false);
  const [isMandiModalOpen, setIsMandiModalOpen] = useState(false);
  const [, setMandiPrices] = useState<any[]>([]);

  useEffect(() => {
    ApiClient.getMandiPrices()
      .then((data) => {
        if (data && data.length > 0) setMandiPrices(data);
      })
      .catch((err) => console.warn('Mandi rates fetch:', err));
  }, []);

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      {/* Farmer Greeting Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-[#176B45] dark:text-[#5FB383]">
            Green Valley Organic Farm • {activeCity}
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#202923] dark:text-[#F2F5F3]">
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
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
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
          onClick={() => setFarmerTab('listings')}
          className="min-h-[72px] p-2.5 bg-white dark:bg-[#181F1A] rounded-xl border border-[#E5EBE6] dark:border-[#29352D] flex flex-col items-center justify-center gap-1 hover:border-[#176B45]/50 transition shadow-soft group"
        >
          <div className="w-7 h-7 rounded-full bg-[#F0F4F1] dark:bg-[#222B25] text-[#202923] dark:text-[#F2F5F3] flex items-center justify-center group-hover:bg-[#EAF5EE] group-hover:text-[#176B45] transition">
            <Sprout className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold text-[#202923] dark:text-[#F2F5F3] mt-0.5">
            {t('nav.crops')} ({myProducts.length})
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
          onClick={() => setFarmerTab('orders')}
          className="min-h-[72px] p-2.5 bg-white dark:bg-[#181F1A] rounded-xl border border-[#E5EBE6] dark:border-[#29352D] flex flex-col items-center justify-center gap-1 hover:border-[#176B45]/50 transition shadow-soft group relative"
        >
          <div className="w-7 h-7 rounded-full bg-[#F0F4F1] dark:bg-[#222B25] text-[#202923] dark:text-[#F2F5F3] flex items-center justify-center group-hover:bg-[#EAF5EE] group-hover:text-[#176B45] transition">
            <Clock className="w-4 h-4" />
          </div>
          {newOrders.length > 0 && (
            <span className="absolute top-2 right-2 bg-[#D99A32] text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full animate-pulse">
              {newOrders.length}
            </span>
          )}
          <span className="text-[11px] font-bold text-[#202923] dark:text-[#F2F5F3] mt-0.5">
            {t('nav.orders')} ({orders.length})
          </span>
        </button>

        <button
          onClick={() => setIsMandiModalOpen(true)}
          className="min-h-[72px] p-2.5 bg-white dark:bg-[#181F1A] rounded-xl border border-[#E5EBE6] dark:border-[#29352D] flex flex-col items-center justify-center gap-1 hover:border-[#176B45]/50 transition shadow-soft group"
        >
          <div className="w-7 h-7 rounded-full bg-[#F0F4F1] dark:bg-[#222B25] text-[#202923] dark:text-[#F2F5F3] flex items-center justify-center group-hover:bg-[#EAF5EE] group-hover:text-[#176B45] transition">
            <Activity className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold text-[#202923] dark:text-[#F2F5F3] mt-0.5">
            {t('nav.mandi')}
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

        <button
          onClick={() => setFarmerTab('earnings')}
          className="min-h-[72px] p-2.5 bg-white dark:bg-[#181F1A] rounded-xl border border-[#E5EBE6] dark:border-[#29352D] flex flex-col items-center justify-center gap-1 hover:border-[#176B45]/50 transition shadow-soft group"
        >
          <div className="w-7 h-7 rounded-full bg-[#F0F4F1] dark:bg-[#222B25] text-[#202923] dark:text-[#F2F5F3] flex items-center justify-center group-hover:bg-[#EAF5EE] group-hover:text-[#176B45] transition">
            <TrendingUp className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold text-[#202923] dark:text-[#F2F5F3] mt-0.5">
            {t('nav.earnings')}
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

          {/* Live Mandi Bhav Ticker */}
          <div className="p-4 bg-white dark:bg-[#181F1A] rounded-2xl border border-[#E5EBE6] dark:border-[#29352D] shadow-soft space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5EBE6] dark:border-[#29352D]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#EAF5EE] dark:bg-[#182A20] text-[#176B45] dark:text-[#5FB383]">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#202923] dark:text-[#F2F5F3] flex items-center gap-1.5">
                    {t('farmer.mandi_bhav_title')}
                    <span className="w-2 h-2 rounded-full bg-[#2E8B57] animate-ping" />
                  </h3>
                  <span className="text-[10px] text-[#89948C]">
                    {t('farmer.mandi_bhav_sub')}
                  </span>
                </div>
              </div>

              <button
                onClick={() => showToast('Mandi Bhav rates refreshed with latest APMC data', 'info')}
                className="p-1.5 text-[#89948C] hover:text-[#176B45] rounded-lg transition"
                title="Refresh Rates"
                aria-label="Refresh rates"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Horizontal Scrollable Bhav Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {LIVE_MANDI_RATES.map((item, idx) => {
                const isPositive = item.change >= 0;
                return (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-[#F0F4F1] dark:bg-[#222B25] border border-[#E5EBE6] dark:border-[#29352D] text-left hover:border-[#176B45]/50 transition-colors"
                  >
                    <span className="text-[11px] font-bold text-[#202923] dark:text-[#F2F5F3] block truncate">
                      {item.hindiName}
                    </span>
                    <span className="text-[9px] text-[#89948C] block truncate">
                      {item.mandi}
                    </span>
                    <div className="flex items-baseline justify-between mt-1.5">
                      <span className="text-xs font-black text-[#176B45] dark:text-[#5FB383]">
                        ₹{item.modalPrice}/{item.unit}
                      </span>
                      <span
                        className={`text-[9px] font-bold flex items-center ${
                          isPositive ? 'text-[#238653]' : 'text-[#D9534F]'
                        }`}
                      >
                        {isPositive ? <ArrowUp className="w-2.5 h-2.5 mr-0.5" /> : <ArrowDown className="w-2.5 h-2.5 mr-0.5" />}
                        ₹{Math.abs(item.change)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setIsMandiModalOpen(true)}
              className="w-full mt-1 min-h-[44px] py-2 px-3 bg-[#F0F4F1] dark:bg-[#222B25] hover:bg-[#EAF5EE] dark:hover:bg-[#182A20] text-[#176B45] dark:text-[#5FB383] border border-[#E5EBE6] dark:border-[#29352D] hover:border-[#176B45]/50 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition"
            >
              <Calculator className="w-4 h-4" />
              <span>Open Mandi Intelligence & Profit Estimator</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Incoming Orders Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#D99A32]" />
                <h3 className="text-base font-bold text-[#202923] dark:text-[#F2F5F3]">
                  Incoming Orders ({newOrders.length})
                </h3>
              </div>
              <button
                onClick={() => setFarmerTab('orders')}
                className="text-xs font-bold text-[#176B45] dark:text-[#5FB383] hover:underline flex items-center min-h-[36px]"
              >
                <span>View All Orders</span>
                <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </button>
            </div>

            {newOrders.length === 0 ? (
              <div className="p-6 text-center bg-white dark:bg-[#181F1A] rounded-2xl border border-[#E5EBE6] dark:border-[#29352D] text-xs text-[#66736B] dark:text-[#A6B3AA] space-y-1 shadow-soft">
                <p className="font-bold text-[#202923] dark:text-[#F2F5F3]">No pending orders right now.</p>
                <p>New harvest orders from buyers will appear here in real-time.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {newOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-4 bg-white dark:bg-[#181F1A] rounded-2xl border-2 border-[#D99A32]/40 shadow-soft space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#202923] dark:text-[#F2F5F3]">
                            {order.orderNumber}
                          </span>
                          <span className="text-[10px] font-bold bg-[#D99A32] text-white px-2 py-0.5 rounded-full">
                            New Order
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-[#202923] dark:text-[#F2F5F3] font-bold">
                            {order.customerName}
                          </span>
                          <a
                            href={`tel:${order.customerPhone}`}
                            className="flex items-center gap-1 text-[11px] text-[#176B45] dark:text-[#5FB383] font-semibold hover:underline"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{order.customerPhone}</span>
                          </a>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-base font-black text-[#176B45] dark:text-[#5FB383]">
                          {formatCurrency(order.total)}
                        </span>
                        <span className="text-[10px] text-[#89948C] block">
                          {order.items.length} produce items
                        </span>
                      </div>
                    </div>

                    {/* Produce items preview */}
                    <div className="bg-[#F0F4F1] dark:bg-[#222B25] p-3 rounded-xl border border-[#E5EBE6] dark:border-[#29352D] text-xs space-y-1">
                      {order.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between text-[#202923] dark:text-[#F2F5F3]">
                          <span>
                            • <strong>{it.product.name}</strong> ({it.quantity} {it.product.unit})
                          </span>
                          <span className="font-semibold">{formatCurrency(it.subtotal)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => updateOrderStatus(order.id, 'rejected')}
                        className="btn-danger"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject</span>
                      </button>

                      <button
                        onClick={() => updateOrderStatus(order.id, 'accepted')}
                        className="btn-primary"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Accept & Harvest</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (Side Panel: Stats, Packing & Sales) */}
        <div className="space-y-6">
          {/* Summary Metrics Cards */}
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
            {/* Today's Orders */}
            <div className="p-3 bg-white dark:bg-[#181F1A] rounded-2xl border border-[#E5EBE6] dark:border-[#29352D] shadow-soft min-w-0">
              <span className="text-[10px] font-bold text-[#66736B] dark:text-[#A6B3AA] uppercase block truncate">
                Orders
              </span>
              <div className="flex items-baseline gap-1 mt-1 truncate">
                <span className="text-lg sm:text-xl font-black text-[#202923] dark:text-[#F2F5F3]">
                  {orders.length}
                </span>
                {newOrders.length > 0 && (
                  <span className="text-[9px] font-bold bg-[#D99A32] text-white px-1 py-0.2 rounded-full">
                    +{newOrders.length}
                  </span>
                )}
              </div>
            </div>

            {/* Listed Crops */}
            <div className="p-3 bg-white dark:bg-[#181F1A] rounded-2xl border border-[#E5EBE6] dark:border-[#29352D] shadow-soft min-w-0">
              <span className="text-[10px] font-bold text-[#66736B] dark:text-[#A6B3AA] uppercase block truncate">
                Crops
              </span>
              <div className="flex items-baseline gap-1 mt-1 truncate">
                <span className="text-lg sm:text-xl font-black text-[#202923] dark:text-[#F2F5F3]">
                  {myProducts.length}
                </span>
                <span className="text-[10px] text-[#89948C]">
                  ({availableProductsCount})
                </span>
              </div>
            </div>

            {/* Today's Sales */}
            <div
              onClick={() => setFarmerTab('earnings')}
              className="p-3 bg-white dark:bg-[#181F1A] rounded-2xl border border-[#E5EBE6] dark:border-[#29352D] shadow-soft cursor-pointer hover:border-[#176B45]/50 transition-all min-w-0"
            >
              <span className="text-[10px] font-bold text-[#66736B] dark:text-[#A6B3AA] uppercase block truncate">
                Today's Sale
              </span>
              <div className="mt-1">
                <span className="text-xs sm:text-sm font-black text-[#176B45] dark:text-[#5FB383] truncate block">
                  {formatCurrency(todaySales)}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Payout / Bank Card */}
          <div className="p-4 bg-[#176B45] text-white rounded-2xl shadow-soft space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#EAF5EE] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Settlement Balance
              </span>
              <span className="text-[10px] bg-[#124C36] px-2 py-0.5 rounded-full font-bold">
                Direct UPI
              </span>
            </div>

            <div>
              <h4 className="text-2xl font-black">
                {formatCurrency(todaySales)}
              </h4>
              <p className="text-[11px] text-[#EAF5EE]/90 mt-0.5">
                Direct payments from buyers with 0% platform commission
              </p>
            </div>

            <button
              onClick={() => setFarmerTab('earnings')}
              className="w-full min-h-[44px] py-2.5 bg-white text-[#124C36] rounded-xl font-bold text-xs hover:bg-[#F0F4F1] transition-colors shadow-soft flex items-center justify-center gap-1.5"
            >
              <ArrowUpRight className="w-4 h-4 text-[#176B45]" />
              <span>Withdraw to Bank / UPI (निकासी)</span>
            </button>
          </div>

          {/* Active Packing & Handover Queue */}
          <div className="p-4 bg-white dark:bg-[#181F1A] rounded-2xl border border-[#E5EBE6] dark:border-[#29352D] shadow-soft space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-[#176B45] dark:text-[#5FB383]" />
                <h4 className="text-sm font-bold text-[#202923] dark:text-[#F2F5F3]">
                  Packing & Delivery ({activePreparingOrders.length})
                </h4>
              </div>
              <button
                onClick={() => setFarmerTab('orders')}
                className="text-[11px] font-bold text-[#176B45] dark:text-[#5FB383] hover:underline min-h-[36px] flex items-center"
              >
                View
              </button>
            </div>

            {activePreparingOrders.length === 0 ? (
              <div className="p-4 text-center bg-[#F0F4F1] dark:bg-[#222B25] rounded-xl text-xs text-[#66736B] dark:text-[#A6B3AA]">
                No orders currently in packing phase.
              </div>
            ) : (
              <div className="space-y-2.5">
                {activePreparingOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-3 bg-[#F0F4F1] dark:bg-[#222B25] rounded-xl border border-[#E5EBE6] dark:border-[#29352D] flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-[#202923] dark:text-[#F2F5F3]">
                          {order.orderNumber}
                        </span>
                        <StatusBadge status={order.status} size="sm" />
                      </div>
                      <span className="text-[10px] text-[#89948C] block truncate mt-0.5">
                        {order.customerName} • {formatCurrency(order.total)}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        if (order.status === 'accepted') updateOrderStatus(order.id, 'preparing');
                        else if (order.status === 'preparing') updateOrderStatus(order.id, 'out_for_delivery');
                      }}
                      className="min-h-[38px] px-3 py-1.5 bg-[#176B45] hover:bg-[#124C36] text-white font-bold text-[11px] rounded-lg shadow-soft transition-colors shrink-0"
                    >
                      {order.status === 'accepted' ? 'Pack Crop' : 'Handover Rider'}
                    </button>
                  </div>
                ))}
              </div>
            )}
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

      <MandiIntelligenceModal
        isOpen={isMandiModalOpen}
        onClose={() => setIsMandiModalOpen(false)}
      />
    </div>
  );
};
