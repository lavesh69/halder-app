import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { formatCurrency } from '../../utils/formatters';
import { TrendingUp, TrendingDown, RefreshCw, ChevronRight, Activity } from 'lucide-react';

interface MandiItem {
  crop: string;
  hindiName: string;
  mandi: string;
  modalPrice: number;
  unit: string;
  trendPercent: number;
  isUp: boolean;
}

const DEFAULT_MANDI_ITEMS: MandiItem[] = [
  { crop: 'Sharbati Wheat', hindiName: 'गेहूं (Grade A)', mandi: 'Azadpur', modalPrice: 2450, unit: 'qtl', trendPercent: 2.4, isUp: true },
  { crop: 'Mustard Seed', hindiName: 'सरसों (Oil 42%)', mandi: 'Najafgarh', modalPrice: 5600, unit: 'qtl', trendPercent: 1.1, isUp: true },
  { crop: 'Desi Tomato', hindiName: 'टमाटर (Crate 25kg)', mandi: 'Azadpur', modalPrice: 1850, unit: 'qtl', trendPercent: -3.2, isUp: false },
  { crop: 'Basmati Paddy 1509', hindiName: 'धान (Paddy)', mandi: 'Karnal', modalPrice: 3620, unit: 'qtl', trendPercent: 0.8, isUp: true },
  { crop: 'Desi Chana', hindiName: 'चना (Desi)', mandi: 'Hapur', modalPrice: 6100, unit: 'qtl', trendPercent: 1.5, isUp: true },
  { crop: 'Nashik Red Onion', hindiName: 'प्याज', mandi: 'Nashik', modalPrice: 2100, unit: 'qtl', trendPercent: -1.8, isUp: false },
];

interface Props {
  onOpenMandiDetails?: () => void;
}

export const MandiBhavTicker: React.FC<Props> = ({ onOpenMandiDetails }) => {
  const { t } = useTranslation();
  const [items, setItems] = useState<MandiItem[]>(DEFAULT_MANDI_ITEMS);
  const [lastUpdated, setLastUpdated] = useState<string>('just now');

  useEffect(() => {
    // Subtle realistic price tick simulation
    const interval = setInterval(() => {
      setItems((prev) =>
        prev.map((item) => {
          // 25% chance of slight fluctuation
          if (Math.random() > 0.75) {
            const delta = (Math.random() * 20 - 10);
            const newPrice = Math.round(item.modalPrice + delta);
            return {
              ...item,
              modalPrice: newPrice,
              isUp: delta >= 0,
            };
          }
          return item;
        })
      );
      setLastUpdated('just now');
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="space-y-2 pt-1">
      {/* Header Strip */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
          <h2 className="font-heading font-black text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
            <span>Live Mandi Bhav</span>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-normal">/ आज का भाव</span>
          </h2>
        </div>

        <button
          onClick={onOpenMandiDetails}
          className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-0.5 group min-h-[32px]"
          title="Compare all Mandi Bhav across India"
        >
          <span>All Mandis (सभी मंडी)</span>
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Horizontally Scrollable Mandi Ticker Cards */}
      <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-0.5 px-0.5">
        {items.map((item, idx) => (
          <div
            key={idx}
            onClick={onOpenMandiDetails}
            className="min-w-[150px] sm:min-w-[160px] bg-white dark:bg-[#181F1A] p-2.5 rounded-2xl border border-zinc-200/80 dark:border-[#29352D] shadow-soft hover:border-emerald-600/50 transition-all cursor-pointer flex flex-col justify-between shrink-0 group"
          >
            <div>
              <div className="flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                <span className="truncate max-w-[80px]">{item.mandi}</span>
                <span
                  className={`font-black flex items-center px-1.5 py-0.2 rounded ${
                    item.isUp
                      ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60'
                      : 'text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60'
                  }`}
                >
                  {item.isUp ? (
                    <TrendingUp className="w-2.5 h-2.5 mr-0.5 stroke-[3]" />
                  ) : (
                    <TrendingDown className="w-2.5 h-2.5 mr-0.5 stroke-[3]" />
                  )}
                  {item.isUp ? '+' : ''}{item.trendPercent}%
                </span>
              </div>

              <div className="mt-1">
                <p className="font-heading font-black text-xs text-zinc-900 dark:text-zinc-100 truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                  {item.crop}
                </p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                  {item.hindiName}
                </p>
              </div>
            </div>

            <div className="mt-2 pt-1.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-baseline justify-between">
              <span className="font-heading font-black text-sm text-zinc-900 dark:text-white">
                {formatCurrency(item.modalPrice)}
              </span>
              <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500">
                /{item.unit}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
