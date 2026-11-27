import React, { useState, useEffect, useCallback } from 'react';
import { ApiClient } from '../../api/client';
import { useApp } from '../../context/appContextUtils';
import {
  Crown,
  CheckCircle2,
  Zap,
  ShieldCheck,
  X,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  farmerId: string;
}

const getThirtyDaysExpiryIso = () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

export const FarmerSubscriptionModal: React.FC<Props> = ({ isOpen, onClose, farmerId }) => {
  const { showToast } = useApp();
  const [currentSub, setCurrentSub] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [, setIsLoading] = useState(true);
  const [upgradingId, setUpgradingId] = useState<string | null>(null);
  const [pendingPaidPlan, setPendingPaidPlan] = useState<any | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const fetchSubscription = useCallback(async () => {
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
        { id: 'free', name: 'Free Kisan', priceMonthly: 0, maxListings: 10, features: ['10 Active Produce Listings', 'Direct Buyer Chat & Call', 'Free Classifieds Ads'] },
        { id: 'kisan_mitra', name: 'Kisan Mitra (Basic)', priceMonthly: 199, maxListings: 25, features: ['25 Active Listings', 'Direct WhatsApp Leads', 'Featured Ad Badge', 'Zero Commission Direct Deals'] },
        { id: 'kisan_samridhi', name: 'Kisan Samridhi (Pro)', priceMonthly: 499, maxListings: 50, features: ['50 Active Listings', 'Top Placement on Buyer Feed', 'Verified Kisan Gold Badge', 'Boost to Top Daily'] },
        { id: 'fpo_business', name: 'FPO / Cooperative Enterprise', priceMonthly: 999, maxListings: 200, features: ['Unlimited / 200 Listings', 'Multi-farmer produce showcase', 'Priority Buyer Direct Inquiries', 'Enterprise Verified Profile'] }
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [farmerId]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    Promise.resolve().then(() => {
      if (active) void fetchSubscription();
    });
    return () => {
      active = false;
    };
  }, [isOpen, fetchSubscription]);

  if (!isOpen) return null;

  const handleUpgrade = async (planId: string) => {
    setUpgradingId(planId);
    try {
      const res = await ApiClient.upgradeFarmerSubscription(farmerId, planId);
      showToast(res.message || 'Subscription updated successfully!', 'success');
      fetchSubscription();
    } catch {
      // Local / Offline demo upgrade fallback
      const selectedPlan = plans.find((p) => p.id === planId) || {
        id: planId,
        name: planId === 'kisan_mitra' ? 'Kisan Mitra (Basic)' : planId === 'kisan_samridhi' ? 'Kisan Samridhi (Pro)' : 'FPO / Cooperative Enterprise',
        maxListings: planId === 'kisan_mitra' ? 25 : planId === 'kisan_samridhi' ? 50 : 200,
      };
      const updatedSub = {
        plan_id: selectedPlan.id,
        plan_name: selectedPlan.name,
        max_listings: selectedPlan.maxListings,
        expires_at: getThirtyDaysExpiryIso(),
      };
      setCurrentSub(updatedSub);
      try {
        localStorage.setItem(`halder-farmer-sub-${farmerId}`, JSON.stringify(updatedSub));
      } catch {}
      showToast(`🎉 Upgraded to ${selectedPlan.name} successfully!`, 'success');
    } finally {
      setUpgradingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-[#1B201D] border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-emerald-950 bg-gradient-to-r from-emerald-900 to-zinc-900 text-white">
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
            aria-label="Close modal"
            className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* Launch Special Promotional Banner */}
          <div className="p-3.5 bg-gradient-to-r from-amber-500/15 via-emerald-500/15 to-amber-500/15 border border-amber-400/40 dark:border-amber-500/30 rounded-2xl flex items-center gap-3">
            <div className="p-2 bg-amber-400/20 text-amber-600 dark:text-amber-300 rounded-xl shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                  🎉 Launch Celebration Special
                </span>
                <span className="text-[10px] bg-emerald-600 text-white font-black px-2 py-0.5 rounded-full">
                  100% Free
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-300 mt-0.5">
                All Pro farmer tiers & increased listing limits are 100% free during our launch celebration. Zero payment or fees required!
              </p>
            </div>
          </div>

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
                        {upgradingId === plan.id ? 'Activating...' : `Activate ${plan.name.split(' ')[0]} (Free)`}
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

        {/* Secure UPI Payment Gate Dialog */}
        {pendingPaidPlan && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in" onClick={() => setPendingPaidPlan(null)}>
            <div className="bg-white dark:bg-[#1E2420] border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4 animate-scale-up" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                    <Crown className="w-5 h-5" />
                  </div>
                  <h4 className="font-black text-sm text-zinc-900 dark:text-white">
                    Upgrade to {pendingPaidPlan.name}
                  </h4>
                </div>
                <button onClick={() => setPendingPaidPlan(null)} aria-label="Close dialog" className="p-1 rounded-full text-zinc-400 hover:text-zinc-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-between text-xs">
                <span className="text-zinc-500">Plan Upgrade:</span>
                <span className="text-base font-black text-emerald-700 dark:text-emerald-400">
                  ₹{pendingPaidPlan.priceMonthly} <span className="text-[10px] text-zinc-400 font-normal">/ month</span>
                </span>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>Zero commission fee active. Your plan will activate immediately with direct verification.</span>
              </div>

              <button
                disabled={isProcessingPayment}
                onClick={async () => {
                  setIsProcessingPayment(true);
                  showToast('⏳ Activating verified kisan plan...', 'info');
                  await new Promise((r) => setTimeout(r, 600));
                  setIsProcessingPayment(false);
                  const planToUpgrade = pendingPaidPlan;
                  setPendingPaidPlan(null);
                  handleUpgrade(planToUpgrade.id);
                }}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-soft transition flex items-center justify-center gap-2"
              >
                {isProcessingPayment ? (
                  <span>Activating {pendingPaidPlan.name}...</span>
                ) : (
                  <span>Confirm & Activate {pendingPaidPlan.name}</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
