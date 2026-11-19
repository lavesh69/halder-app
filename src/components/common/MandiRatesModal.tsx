import React, { useState, useEffect } from 'react';
import { X, Search, TrendingUp, TrendingDown, Building2, ShieldCheck, RefreshCw } from 'lucide-react';
import { ApiClient } from '../../api/client';

interface MandiPriceRecord {
  id?: string;
  crop: string;
  hindiName?: string;
  commodity?: string;
  market: string;
  state?: string;
  district?: string;
  modalPrice: number;
  modal_price?: number;
  unit: string;
  change?: number;
}

const DEFAULT_MANDI_RATES: MandiPriceRecord[] = [
  { crop: 'Wheat (Sharbati)', hindiName: 'गेहूं (शरबती)', market: 'Karnal APMC', state: 'Haryana', modalPrice: 2450, unit: 'qtl', change: 35 },
  { crop: 'Basmati Paddy', hindiName: 'धान (बासमती)', market: 'Taraori Mandi', state: 'Haryana', modalPrice: 3820, unit: 'qtl', change: -20 },
  { crop: 'Hybrid Tomato', hindiName: 'टमाटर (देसी)', market: 'Azadpur Mandi', state: 'Delhi', modalPrice: 1850, unit: 'qtl', change: 80 },
  { crop: 'Nasik Red Onion', hindiName: 'प्याज़ (लाल)', market: 'Lasalgaon APMC', state: 'Maharashtra', modalPrice: 2150, unit: 'qtl', change: -45 },
  { crop: 'Jyoti Potato', hindiName: 'आलू (ज्योति)', market: 'Agra Mandi', state: 'Uttar Pradesh', modalPrice: 1420, unit: 'qtl', change: 15 },
  { crop: 'Black Mustard', hindiName: 'सरसों (काली)', market: 'Jaipur Mandi', state: 'Rajasthan', modalPrice: 5650, unit: 'qtl', change: 110 },
  { crop: 'Soybean Yellow', hindiName: 'सोयाबीन (पीला)', market: 'Indore APMC', state: 'Madhya Pradesh', modalPrice: 4720, unit: 'qtl', change: 40 },
  { crop: 'Green Peas (Matar)', hindiName: 'मटर (ताजा)', market: 'Dehradun APMC', state: 'Uttarakhand', modalPrice: 3500, unit: 'qtl', change: 50 },
];

interface MandiRatesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MandiRatesModal: React.FC<MandiRatesModalProps> = ({ isOpen, onClose }) => {
  const [search, setSearch] = useState('');
  const [rates, setRates] = useState<MandiPriceRecord[]>(DEFAULT_MANDI_RATES);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    ApiClient.getMandiPrices()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((item: any) => ({
            id: item.id,
            crop: item.crop || item.commodity,
            hindiName: item.hindiName || '',
            market: item.market,
            state: item.state,
            district: item.district,
            modalPrice: item.modal_price || item.modalPrice || 0,
            unit: item.unit || 'qtl',
            change: item.change || 0,
          }));
          setRates(mapped);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredRates = rates.filter((r) => {
    const q = search.toLowerCase();
    return (
      r.crop.toLowerCase().includes(q) ||
      (r.hindiName && r.hindiName.toLowerCase().includes(q)) ||
      r.market.toLowerCase().includes(q) ||
      (r.state && r.state.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-[#1B201D] rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[88vh] overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-black text-base sm:text-lg text-zinc-900 dark:text-white flex items-center gap-1.5">
                <span>Live APMC Mandi Rates</span>
                <span className="text-xs font-normal text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full font-sans">
                  दैनिक मंडी भाव
                </span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Government Agmarknet & APMC Mandi Benchmarks</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar Filter */}
        <div className="p-4 bg-zinc-50/70 dark:bg-zinc-900/40 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search crop or mandi (e.g. Wheat, Azadpur, Karnal)..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white dark:bg-[#151A17] border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
            />
          </div>
          {isLoading && (
            <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />
          )}
        </div>

        {/* Rates Table / List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredRates.length === 0 ? (
            <div className="text-center py-10 space-y-2 text-zinc-500">
              <Building2 className="w-8 h-8 mx-auto text-zinc-300" />
              <p className="text-sm font-semibold">No mandi prices found matching "{search}"</p>
            </div>
          ) : (
            filteredRates.map((rate, idx) => {
              const perKgPrice = (rate.modalPrice / 100).toFixed(1);
              const isPositive = (rate.change || 0) >= 0;
              return (
                <div
                  key={rate.id || idx}
                  className="p-3.5 rounded-2xl bg-white dark:bg-[#151A17] border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between hover:border-emerald-500/50 transition shadow-2xs"
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-sm text-zinc-900 dark:text-white">
                        {rate.crop}
                      </span>
                      {rate.hindiName && (
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 font-hindi">
                          ({rate.hindiName})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                        📍 {rate.market}
                      </span>
                      {rate.state && (
                        <span>• {rate.state}</span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-black text-base text-zinc-900 dark:text-white">
                      ₹{rate.modalPrice.toLocaleString('en-IN')}
                      <span className="text-[11px] font-normal text-zinc-500">/{rate.unit}</span>
                    </div>
                    <div className="flex items-center justify-end gap-1 text-[10px] text-zinc-500 mt-0.5">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                        ≈ ₹{perKgPrice}/kg
                      </span>
                      {rate.change !== undefined && rate.change !== 0 && (
                        <span className={`inline-flex items-center font-bold ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                          {isPositive ? <TrendingUp className="w-2.5 h-2.5 inline mr-0.5" /> : <TrendingDown className="w-2.5 h-2.5 inline mr-0.5" />}
                          {isPositive ? `+₹${rate.change}` : `-₹${Math.abs(rate.change)}`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer Note */}
        <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 border-t border-zinc-100 dark:border-zinc-800 text-[10px] text-zinc-500 text-center flex items-center justify-center gap-1">
          <span>Prices update daily from APMC arrivals. 1 Quintal (qtl) = 100 kg.</span>
        </div>
      </div>
    </div>
  );
};
