import React, { useState, useEffect } from 'react';
import { ApiClient } from '../../api/client';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';
import {
  Users,
  Sparkles,
  Timer,
  CheckCircle2,
  X,
  TrendingDown,
  ShoppingBag,
  ArrowRight,
} from 'lucide-react';

interface GroupBuyDeal {
  id: string;
  product_id: string;
  farmer_id: string;
  product_name: string;
  product_image?: string;
  farm_name?: string;
  retail_price: number;
  discounted_price: number;
  target_quantity: number;
  current_quantity: number;
  min_order_per_user: number;
  unit: string;
  target_buyers_count: number;
  current_buyers_count: number;
  expires_at: string;
  status: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const GroupBuyModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { showToast } = useApp();
  const [deals, setDeals] = useState<GroupBuyDeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [selectedQty, setSelectedQty] = useState<Record<string, number>>({});

  const fetchDeals = async () => {
    setIsLoading(true);
    try {
      const data = await ApiClient.getGroupBuys();
      setDeals(data || []);
      const initQtys: Record<string, number> = {};
      (data || []).forEach((d: GroupBuyDeal) => {
        initQtys[d.id] = d.min_order_per_user || 5;
      });
      setSelectedQty(initQtys);
    } catch (err: any) {
      console.warn('Failed to load group buy deals, loading fallback pools:', err);
      setDeals([
        {
          id: 'gb-1',
          product_id: 'prod-1',
          farmer_id: 'farmer-1',
          product_name: 'Pusa 1121 Basmati Rice (Organic)',
          farm_name: 'Green Valley Organic Farm',
          retail_price: 90,
          discounted_price: 72,
          target_quantity: 100,
          current_quantity: 65,
          min_order_per_user: 5,
          unit: 'kg',
          target_buyers_count: 10,
          current_buyers_count: 6,
          expires_at: '2026-11-05T20:00:00Z',
          status: 'active',
        },
        {
          id: 'gb-2',
          product_id: 'prod-2',
          farmer_id: 'farmer-2',
          product_name: 'Farm-Fresh Jyoti Potatoes',
          farm_name: 'Himalayan Sunrise Orchard',
          retail_price: 35,
          discounted_price: 24,
          target_quantity: 150,
          current_quantity: 110,
          min_order_per_user: 10,
          unit: 'kg',
          target_buyers_count: 12,
          current_buyers_count: 8,
          expires_at: '2026-11-04T18:00:00Z',
          status: 'active',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDeals();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleJoin = async (deal: GroupBuyDeal) => {
    const qty = selectedQty[deal.id] || deal.min_order_per_user || 5;
    setJoiningId(deal.id);
    try {
      const res = await ApiClient.joinGroupBuy(deal.id, qty);
      showToast(res.message || `Joined pool for ${qty} ${deal.unit}! You saved 25%+`, 'success');
      fetchDeals();
    } catch (err: any) {
      showToast(err.message || 'Failed to join group buy', 'error');
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-[#1B201D] border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-linear-to-r from-emerald-800 to-teal-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-zinc-950 flex items-center justify-center shadow-md">
              <Users className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black">
                  Community Group Buys (सामूहिक खरीद)
                </h3>
                <span className="text-[10px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-full uppercase">
                  Bulk Wholesale Rates
                </span>
              </div>
              <p className="text-xs text-zinc-300">
                Join nearby neighbors to unlock wholesale farm prices directly from growers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-zinc-400">Loading community deals...</div>
          ) : deals.length === 0 ? (
            <div className="py-12 text-center bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/60 text-xs text-zinc-500">
              No active group buy pools in your zone right now. Check back tomorrow!
            </div>
          ) : (
            deals.map((deal) => {
              const progressPct = Math.min(
                100,
                Math.round((deal.current_quantity / deal.target_quantity) * 100)
              );
              const savingsPct = Math.round(
                ((deal.retail_price - deal.discounted_price) / deal.retail_price) * 100
              );
              const userQty = selectedQty[deal.id] || deal.min_order_per_user || 5;
              const subtotal = userQty * deal.discounted_price;

              return (
                <div
                  key={deal.id}
                  className="p-4 sm:p-5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 rounded-2xl space-y-3 hover:border-emerald-500 transition shadow-2xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-sm sm:text-base text-zinc-900 dark:text-white">
                          {deal.product_name}
                        </h4>
                        <span className="text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <TrendingDown className="w-3 h-3" />
                          Save {savingsPct}%
                        </span>
                      </div>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 block mt-0.5">
                        Harvested by <strong>{deal.farm_name || 'Partner Organic Farm'}</strong>
                      </span>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <span className="text-xs text-zinc-400 line-through">
                        ₹{deal.retail_price}/{deal.unit}
                      </span>
                      <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">
                        ₹{deal.discounted_price}/{deal.unit}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-300">
                      <span className="font-bold flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-emerald-600" />
                        {deal.current_buyers_count} neighbors joined • {deal.current_quantity} of {deal.target_quantity} {deal.unit} ordered
                      </span>
                      <span className="font-black text-emerald-700 dark:text-emerald-400">
                        {progressPct}% Reached
                      </span>
                    </div>

                    <div className="w-full h-2.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-linear-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Join Action Bar */}
                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-zinc-200/50 dark:border-zinc-700/50">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        Select Quantity ({deal.unit}):
                      </span>
                      <input
                        type="number"
                        min={deal.min_order_per_user || 1}
                        value={userQty}
                        onChange={(e) =>
                          setSelectedQty((prev) => ({
                            ...prev,
                            [deal.id]: Math.max(deal.min_order_per_user || 1, Number(e.target.value)),
                          }))
                        }
                        className="w-16 px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-bold text-center outline-hidden"
                      />
                      <span className="text-xs text-zinc-500">
                        Total: <strong>{formatCurrency(subtotal)}</strong>
                      </span>
                    </div>

                    <button
                      onClick={() => handleJoin(deal)}
                      disabled={joiningId === deal.id}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>{joiningId === deal.id ? 'Reserving...' : `Join Pool for ₹${subtotal}`}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-900/60 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
          <span className="text-zinc-400 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            100% money back guarantee if collective pool target is not achieved
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
