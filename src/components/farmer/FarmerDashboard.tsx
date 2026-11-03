import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';
import { ApiClient } from '../../api/client';
import { StatusBadge } from '../common/StatusBadge';
import { WeatherAdvisoryWidget } from './WeatherAdvisoryWidget';
import { FarmCropCalendarModal } from './FarmCropCalendarModal';
import { FarmerSubscriptionModal } from './FarmerSubscriptionModal';
import { FarmerBusinessInsightsModal } from './FarmerBusinessInsightsModal';
import { MandiIntelligenceModal } from './MandiIntelligenceModal';
import {
  ShoppingBag,
  Sprout,
  TrendingUp,
  Plus,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  Package,
  MessageCircle,
  Phone,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Activity,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Calculator,
  Coins,
  Scale,
  Calendar,
  Crown,
  FileSpreadsheet,
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

const CROP_CALCULATOR_PRESETS: CropCalcPreset[] = [
  { id: 'wheat', name: 'Wheat (Sharbati)', hindiName: 'गेहूं (शरबती)', emoji: '🌾', avgYieldPerAcre: 20, avgCostPerAcre: 12000, benchmarkPrice: 2450 },
  { id: 'paddy', name: 'Basmati Paddy', hindiName: 'बासमती धान', emoji: '🌾', avgYieldPerAcre: 16, avgCostPerAcre: 15000, benchmarkPrice: 3820 },
  { id: 'tomato', name: 'Hybrid Tomato', hindiName: 'देसी टमाटर', emoji: '🍅', avgYieldPerAcre: 140, avgCostPerAcre: 40000, benchmarkPrice: 1850 },
  { id: 'onion', name: 'Red Onion', hindiName: 'लाल प्याज़', emoji: '🧅', avgYieldPerAcre: 110, avgCostPerAcre: 32000, benchmarkPrice: 2150 },
  { id: 'potato', name: 'Jyoti Potato', hindiName: 'आलू ज्योति', emoji: '🥔', avgYieldPerAcre: 120, avgCostPerAcre: 35000, benchmarkPrice: 1420 },
  { id: 'mustard', name: 'Black Mustard', hindiName: 'काली सरसों', emoji: '🌱', avgYieldPerAcre: 8, avgCostPerAcre: 9000, benchmarkPrice: 5650 },
  { id: 'soybean', name: 'Soybean', hindiName: 'पीला सोयाबीन', emoji: '🌱', avgYieldPerAcre: 10, avgCostPerAcre: 11000, benchmarkPrice: 4720 },
];

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
  const {
    products,
    orders,
    updateOrderStatus,
    setIsFastSellOpen,
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

  const [selectedMandiCrop, setSelectedMandiCrop] = useState<string>('All');
  // Modals for Ecosystem Modules
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [isInsightsModalOpen, setIsInsightsModalOpen] = useState(false);
  const [isMandiModalOpen, setIsMandiModalOpen] = useState(false);
  const [mandiPrices, setMandiPrices] = useState<any[]>([]);

  useEffect(() => {
    ApiClient.getMandiPrices()
      .then((data) => {
        if (data && data.length > 0) setMandiPrices(data);
      })
      .catch((err) => console.warn('Mandi rates fetch:', err));
  }, []);

  // Kisan Yield & Profit Calculator State
  const [calcCropId, setCalcCropId] = useState<string>('wheat');
  const [calcAcres, setCalcAcres] = useState<number>(2);
  const [calcPrice, setCalcPrice] = useState<number>(2450);

  const activeCalcCrop = CROP_CALCULATOR_PRESETS.find((c) => c.id === calcCropId) || CROP_CALCULATOR_PRESETS[0];
  const estYieldQtl = calcAcres * activeCalcCrop.avgYieldPerAcre;
  const estGrossRevenue = estYieldQtl * calcPrice;
  const estInputCost = calcAcres * activeCalcCrop.avgCostPerAcre;
  const estNetProfit = estGrossRevenue - estInputCost;
  const estProfitMargin = estGrossRevenue > 0 ? Math.round((estNetProfit / estGrossRevenue) * 100) : 0;


  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      {/* Farmer Greeting Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            Green Valley Organic Farm • {activeCity}
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white">
            Good morning, {currentFarmerName} 🌾
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Mandi marketplace is live • Local buyers are actively purchasing
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFarmerTab('chat')}
            className="relative p-2.5 bg-white dark:bg-[#1B201D] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 shadow-soft transition-all"
            title="Buyer Messages & Inquiries"
          >
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            {unreadChatCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadChatCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setIsFastSellOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-2xl shadow-soft transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Sell Harvest (फसल बेचें)</span>
          </button>
        </div>
      </div>

      {/* Kisan Quick Action Shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        <button
          onClick={() => setIsFastSellOpen(true)}
          className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200/70 dark:border-emerald-800/50 flex flex-col items-center justify-center gap-1 hover:bg-emerald-100 transition shadow-2xs group"
        >
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition">
            <Plus className="w-4 h-4 stroke-[3]" />
          </div>
          <span className="text-[11px] font-bold text-emerald-900 dark:text-emerald-300 mt-0.5">
            + Post Ad
          </span>
        </button>

        <button
          onClick={() => setFarmerTab('listings')}
          className="p-3 bg-white dark:bg-[#1B201D] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 flex flex-col items-center justify-center gap-1 hover:border-emerald-500 transition shadow-2xs group"
        >
          <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center group-hover:bg-emerald-50 group-hover:text-emerald-600 transition">
            <Sprout className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">
            My Crops ({myProducts.length})
          </span>
        </button>

        <button
          onClick={() => setIsCropModalOpen(true)}
          className="p-3 bg-white dark:bg-[#1B201D] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 flex flex-col items-center justify-center gap-1 hover:border-emerald-500 transition shadow-2xs group"
        >
          <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center group-hover:bg-emerald-50 group-hover:text-emerald-600 transition">
            <Calendar className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">
            Harvest Plan
          </span>
        </button>

        <button
          onClick={() => setFarmerTab('orders')}
          className="p-3 bg-white dark:bg-[#1B201D] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 flex flex-col items-center justify-center gap-1 hover:border-emerald-500 transition shadow-2xs group relative"
        >
          <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center group-hover:bg-emerald-50 group-hover:text-emerald-600 transition">
            <Clock className="w-4 h-4" />
          </div>
          {newOrders.length > 0 && (
            <span className="absolute top-2 right-2 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full animate-pulse">
              {newOrders.length}
            </span>
          )}
          <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">
            Orders ({orders.length})
          </span>
        </button>

        <button
          onClick={() => setIsMandiModalOpen(true)}
          className="p-3 bg-white dark:bg-[#1B201D] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 flex flex-col items-center justify-center gap-1 hover:border-emerald-500 transition shadow-2xs group"
        >
          <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center group-hover:bg-emerald-50 group-hover:text-emerald-600 transition">
            <Activity className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">
            Mandi Bhav
          </span>
        </button>

        <button
          onClick={() => setIsInsightsModalOpen(true)}
          className="p-3 bg-white dark:bg-[#1B201D] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 flex flex-col items-center justify-center gap-1 hover:border-emerald-500 transition shadow-2xs group"
        >
          <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center group-hover:bg-emerald-50 group-hover:text-emerald-600 transition">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">
            Insights
          </span>
        </button>

        <button
          onClick={() => setIsSubModalOpen(true)}
          className="p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-200/80 dark:border-amber-800/50 flex flex-col items-center justify-center gap-1 hover:border-amber-400 transition shadow-2xs group"
        >
          <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition">
            <Crown className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">
            Kisan Plan
          </span>
        </button>

        <button
          onClick={() => setFarmerTab('earnings')}
          className="p-3 bg-white dark:bg-[#1B201D] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 flex flex-col items-center justify-center gap-1 hover:border-emerald-500 transition shadow-2xs group"
        >
          <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center group-hover:bg-emerald-50 group-hover:text-emerald-600 transition">
            <TrendingUp className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">
            Payouts
          </span>
        </button>
      </div>

      {/* Main Responsive Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols on Desktop) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Live Agro-Weather & AI Advisory Widget */}
          <WeatherAdvisoryWidget city={activeCity} />

          {/* Live Mandi Bhav Ticker (आज के ताज़ा मंडी भाव) */}
          <div className="p-4 bg-white dark:bg-[#1B201D] rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-soft space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800/80">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-zinc-900 dark:text-white flex items-center gap-1.5">
                    Live APMC Mandi Bhav (आज के मंडी भाव)
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  </h3>
                  <span className="text-[10px] text-zinc-400">
                    Official benchmark rates across major agricultural markets
                  </span>
                </div>
              </div>

              <button
                onClick={() => showToast('Mandi Bhav rates refreshed with latest APMC data', 'info')}
                className="p-1 text-zinc-400 hover:text-emerald-600 rounded transition"
                title="Refresh Rates"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Horizontal Scrollable Bhav Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {LIVE_MANDI_RATES.map((item, idx) => {
                const isPositive = item.change >= 0;
                return (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60 text-left hover:border-emerald-500 transition-colors"
                  >
                    <span className="text-[11px] font-bold text-zinc-900 dark:text-white block truncate">
                      {item.hindiName}
                    </span>
                    <span className="text-[9px] text-zinc-400 block truncate">
                      {item.mandi}
                    </span>
                    <div className="flex items-baseline justify-between mt-1.5">
                      <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                        ₹{item.modalPrice}/{item.unit}
                      </span>
                      <span
                        className={`text-[9px] font-bold flex items-center ${
                          isPositive ? 'text-emerald-600' : 'text-red-500'
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
              className="w-full mt-1 py-2 px-3 bg-zinc-50 dark:bg-zinc-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-zinc-200/80 dark:border-zinc-700/80 hover:border-emerald-500 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Open Mandi Intelligence & Profit Estimator</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Incoming Orders Section (Accept / Reject with Call Customer) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <h3 className="text-base font-black text-zinc-900 dark:text-white">
                  Incoming Orders ({newOrders.length})
                </h3>
              </div>
              <button
                onClick={() => setFarmerTab('orders')}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center"
              >
                <span>View All Orders</span>
                <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </button>
            </div>

            {newOrders.length === 0 ? (
              <div className="p-6 text-center bg-white dark:bg-[#1B201D] rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 text-xs text-zinc-500 dark:text-zinc-400 space-y-1">
                <p className="font-bold text-zinc-700 dark:text-zinc-300">No pending orders right now.</p>
                <p>New harvest orders from buyers will appear here in real-time.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {newOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-4 bg-white dark:bg-[#1B201D] rounded-2xl border-2 border-amber-300 dark:border-amber-700/60 shadow-soft space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-zinc-900 dark:text-white">
                            {order.orderNumber}
                          </span>
                          <span className="text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full">
                            New Order
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-zinc-700 dark:text-zinc-300 font-bold">
                            {order.customerName}
                          </span>
                          <a
                            href={`tel:${order.customerPhone}`}
                            className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{order.customerPhone}</span>
                          </a>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-base font-black text-emerald-700 dark:text-emerald-400">
                          {formatCurrency(order.total)}
                        </span>
                        <span className="text-[10px] text-zinc-400 block">
                          {order.items.length} produce items
                        </span>
                      </div>
                    </div>

                    {/* Produce items preview */}
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50 text-xs space-y-1">
                      {order.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between text-zinc-700 dark:text-zinc-300">
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
                        className="min-h-[44px] py-2 px-3 rounded-xl border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject</span>
                      </button>

                      <button
                        onClick={() => updateOrderStatus(order.id, 'accepted')}
                        className="min-h-[44px] py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5"
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
            <div className="p-2.5 sm:p-3 bg-white dark:bg-[#1B201D] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-soft min-w-0">
              <span className="text-[10px] font-bold text-zinc-500 uppercase block truncate">
                Orders
              </span>
              <div className="flex items-baseline gap-1 mt-1 truncate">
                <span className="text-lg sm:text-xl font-black text-zinc-900 dark:text-white">
                  {orders.length}
                </span>
                {newOrders.length > 0 && (
                  <span className="text-[9px] font-bold bg-amber-500 text-white px-1 py-0.2 rounded-full">
                    +{newOrders.length}
                  </span>
                )}
              </div>
            </div>

            {/* Listed Crops */}
            <div className="p-2.5 sm:p-3 bg-white dark:bg-[#1B201D] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-soft min-w-0">
              <span className="text-[10px] font-bold text-zinc-500 uppercase block truncate">
                Crops
              </span>
              <div className="flex items-baseline gap-1 mt-1 truncate">
                <span className="text-lg sm:text-xl font-black text-zinc-900 dark:text-white">
                  {myProducts.length}
                </span>
                <span className="text-[10px] text-zinc-400">
                  ({availableProductsCount})
                </span>
              </div>
            </div>

            {/* Today's Sales */}
            <div
              onClick={() => setFarmerTab('earnings')}
              className="p-2.5 sm:p-3 bg-white dark:bg-[#1B201D] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-soft cursor-pointer hover:border-emerald-500 transition-all min-w-0"
            >
              <span className="text-[10px] font-bold text-zinc-500 uppercase block truncate">
                Today's Sale
              </span>
              <div className="mt-1">
                <span className="text-xs sm:text-sm font-black text-emerald-700 dark:text-emerald-400 truncate block">
                  {formatCurrency(todaySales)}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Payout / Bank Card */}
          <div className="p-4 bg-linear-to-br from-emerald-800 to-emerald-950 text-white rounded-3xl shadow-soft space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Settlement Balance
              </span>
              <span className="text-[10px] bg-emerald-700/80 px-2 py-0.5 rounded-full">
                Direct UPI
              </span>
            </div>

            <div>
              <h4 className="text-2xl font-black">
                {formatCurrency(todaySales)}
              </h4>
              <p className="text-[11px] text-emerald-200 mt-0.5">
                Direct payments from buyers with 0% platform commission
              </p>
            </div>

            <button
              onClick={() => setFarmerTab('earnings')}
              className="w-full py-2.5 bg-white text-emerald-900 rounded-xl font-black text-xs hover:bg-emerald-50 transition-colors shadow-sm flex items-center justify-center gap-1.5"
            >
              <ArrowUpRight className="w-4 h-4 text-emerald-700" />
              <span>Withdraw to Bank / UPI (निकासी)</span>
            </button>
          </div>

          {/* Active Packing & Handover Queue */}
          <div className="p-4 bg-white dark:bg-[#1B201D] rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-soft space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-600" />
                <h4 className="text-sm font-black text-zinc-900 dark:text-white">
                  Packing & Delivery ({activePreparingOrders.length})
                </h4>
              </div>
              <button
                onClick={() => setFarmerTab('orders')}
                className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                View
              </button>
            </div>

            {activePreparingOrders.length === 0 ? (
              <div className="p-4 text-center bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl text-xs text-zinc-500">
                No orders currently in packing phase.
              </div>
            ) : (
              <div className="space-y-2.5">
                {activePreparingOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-zinc-900 dark:text-white">
                          {order.orderNumber}
                        </span>
                        <StatusBadge status={order.status} size="sm" />
                      </div>
                      <span className="text-[10px] text-zinc-400 block truncate mt-0.5">
                        {order.customerName} • {formatCurrency(order.total)}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        if (order.status === 'accepted') updateOrderStatus(order.id, 'preparing');
                        else if (order.status === 'preparing') updateOrderStatus(order.id, 'out_for_delivery');
                      }}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg shadow-xs transition-colors shrink-0"
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
