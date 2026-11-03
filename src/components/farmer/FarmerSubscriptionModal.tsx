import React, { useState, useEffect } from 'react';
import { ApiClient } from '../../api/client';
import { useApp } from '../../context/AppContext';
import {
  Crown,
  CheckCircle2,
  Zap,
  ShieldCheck,
  X,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  farmerId: string;
}

export const FarmerSubscriptionModal: React.FC<Props> = ({ isOpen, onClose, farmerId }) => {
  const { showToast } = useApp();
  const [currentSub, setCurrentSub] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [upgradingId, setUpgradingId] = useState<string | null>(null);

  const fetchSubscription = async () => {
    setIsLoading(true);
    try {
      const res = await ApiClient.getFarmerSubscription(farmerId);
      if (res) {
        setCurrentSub(res.currentSubscription);
        setPlans(res.availablePlans || []);
      }
    } catch (err: any) {
      console.warn('Failed to load subscription:', err);
      // Fallback defaults
      setCurrentSub({ plan_id: 'free', plan_name: 'Free Kisan', max_listings: 10 });
      setPlans([
        { id: 'free', name: 'Free Kisan', priceMonthly: 0, maxListings: 10, features: ['10 Active Produce Listings', 'Local Consumer Chat', 'Standard Mandi Bhav'] },
        { id: 'kisan_mitra', name: 'Kisan Mitra (Basic)', priceMonthly: 199, maxListings: 25, features: ['25 Active Listings', 'SMS & WhatsApp Order Alerts', 'Direct Wholesale B2B', 'Zero Commission Boost'] },
        { id: 'kisan_samridhi', name: 'Kisan Samridhi (Pro)', priceMonthly: 499, maxListings: 50, features: ['50 Active Listings', 'Top Placement on Customer Feed', 'B2B Wholesale Quotations', 'Dedicated Logistics Priority', 'Custom Farm Branding'] },
        { id: 'fpo_business', name: 'FPO / Cooperative Enterprise', priceMonthly: 999, maxListings: 200, features: ['Unlimited / 200 Listings', 'Multi-farmer aggregate packing', 'Custom Mandi Intelligence reports', 'Direct corporate procurement contracts'] }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSubscription();
    }
  }, [isOpen, farmerId]);

  if (!isOpen) return null;

  const handleUpgrade = async (planId: string) => {
    setUpgradingId(planId);
    try {
      const res = await ApiClient.upgradeFarmerSubscription(farmerId, planId);
      showToast(res.message || 'Subscription updated successfully!', 'success');
      fetchSubscription();
    } catch (err: any) {
      showToast(err.message || 'Failed to update subscription', 'error');
    } finally {
      setUpgradingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-[#1B201D] border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-linear-to-r from-emerald-900 to-zinc-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-400 text-zinc-950 flex items-center justify-center shadow-md">
              <Crown className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black">
                  Kisan Growth & Subscription Tiers
                </h3>
                <span className="text-[10px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-full uppercase">
                  Verified Farmer Plans
                </span>
              </div>
              <p className="text-xs text-zinc-300 mt-0.5">
                Boost your farm reach, accept large B2B wholesale orders, and pay zero extra middleman margins
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
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* Current Plan Banner */}
          {currentSub && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <span className="text-xs text-emerald-800 dark:text-emerald-300 font-bold block">
                    CURRENT ACTIVE PLAN
                  </span>
                  <h4 className="text-base font-black text-zinc-900 dark:text-white">
                    {currentSub.plan_name || 'Free Kisan'} • {currentSub.max_listings || 10} Listings Allowed
                  </h4>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800/80 self-start sm:self-auto">
                Status: {currentSub.status || 'Active'}
              </span>
            </div>
          )}

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((plan) => {
              const isCurrent = currentSub?.plan_id === plan.id;
              const isPopular = plan.id === 'kisan_samridhi';

              return (
                <div
                  key={plan.id}
                  className={`p-4 rounded-2xl border flex flex-col justify-between transition relative ${
                    isPopular
                      ? 'border-2 border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-md'
                      : 'border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-800/40'
                  }`}
                >
                  {isPopular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-xs">
                      Most Popular
                    </span>
                  )}

                  <div className="space-y-3">
                    <div>
                      <h4 className="font-black text-sm text-zinc-900 dark:text-white">
                        {plan.name}
                      </h4>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl font-black text-zinc-900 dark:text-white">
                          ₹{plan.priceMonthly}
                        </span>
                        <span className="text-[11px] text-zinc-500">/ month</span>
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-700/60 text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center justify-between">
                      <span>Produce Listings</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-black">
                        Up to {plan.maxListings}
                      </span>
                    </div>

                    <ul className="space-y-2 text-xs text-zinc-600 dark:text-zinc-300">
                      {plan.features.map((feat: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-4 mt-3 border-t border-zinc-200/50 dark:border-zinc-700/50">
                    {isCurrent ? (
                      <div className="w-full py-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-xs text-center rounded-xl">
                        Active Plan
                      </div>
                    ) : (
                      <button
                        onClick={() => handleUpgrade(plan.id)}
                        disabled={upgradingId !== null}
                        className={`w-full py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 ${
                          isPopular
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                            : 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90'
                        } disabled:opacity-50`}
                      >
                        {upgradingId === plan.id ? 'Activating...' : `Switch to ${plan.name.split(' ')[0]}`}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-900/60 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
          <span className="text-zinc-500 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-500" />
            Zero commission on produce sales for all plans • Cancel or upgrade anytime
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
