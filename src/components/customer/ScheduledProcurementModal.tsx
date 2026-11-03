import React, { useState, useEffect } from 'react';
import { ApiClient } from '../../api/client';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';
import {
  CalendarClock,
  Clock,
  MapPin,
  CheckCircle2,
  X,
  Truck,
  Repeat,
  Sparkles,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultProductId?: string;
}

export const ScheduledProcurementModal: React.FC<Props> = ({ isOpen, onClose, defaultProductId }) => {
  const { products, currentUser, showToast } = useApp();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'create' | 'my_subscriptions'>('create');

  // Form State
  const [selectedProductId, setSelectedProductId] = useState(defaultProductId || (products[0]?.id || 'prod-1'));
  const [quantity, setQuantity] = useState('2');
  const [frequency, setFrequency] = useState('daily');
  const [timeSlot, setTimeSlot] = useState('Morning (06:00 - 08:30 AM)');
  const [address, setAddress] = useState('Flat 402, Green Meadows, Rajpur Road, Dehradun');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];

  const fetchSubscriptions = async () => {
    setIsLoading(true);
    try {
      const data = await ApiClient.getScheduledProcurements();
      setSubscriptions(data || []);
    } catch (err) {
      console.warn('Failed to load recurring procurements:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSubscriptions();
      if (defaultProductId) setSelectedProductId(defaultProductId);
    }
  }, [isOpen, defaultProductId]);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    setIsSubmitting(true);
    try {
      await ApiClient.createScheduledProcurement({
        product_id: selectedProduct.id,
        quantity: Number(quantity) || 1,
        unit: selectedProduct.unit || 'kg',
        frequency,
        delivery_time_slot: timeSlot,
        delivery_address: address,
      });
      showToast('Recurring farm delivery scheduled successfully!', 'success');
      setActiveTab('my_subscriptions');
      fetchSubscriptions();
    } catch (err: any) {
      showToast(err.message || 'Failed to schedule procurement', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async (subId: string) => {
    try {
      const res = await ApiClient.skipScheduledProcurement(subId);
      showToast(res.message || 'Next delivery skipped successfully', 'info');
      fetchSubscriptions();
    } catch (err: any) {
      showToast(err.message || 'Failed to skip delivery', 'error');
    }
  };

  const handleToggleStatus = async (subId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      await ApiClient.updateScheduledProcurementStatus(subId, nextStatus);
      showToast(`Subscription ${nextStatus === 'active' ? 'resumed' : 'paused'} successfully`, 'info');
      fetchSubscriptions();
    } catch (err: any) {
      showToast(err.message || 'Failed to update subscription status', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-[#1B201D] border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-linear-to-r from-emerald-800 to-teal-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white text-emerald-800 flex items-center justify-center shadow-md">
              <CalendarClock className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black">
                  Scheduled Farm Deliveries (दैनिक व साप्ताहिक आपूर्ति)
                </h3>
                <span className="text-[10px] font-black bg-white/20 text-white border border-white/40 px-2 py-0.5 rounded-full uppercase">
                  Recurring
                </span>
              </div>
              <p className="text-xs text-zinc-200">
                Fresh organic milk, greens & kitchen staples delivered to your doorstep automatically
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-300 hover:text-white rounded-full hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 text-xs font-bold">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-3 text-center border-b-2 transition ${
              activeTab === 'create'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-[#1B201D]'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Schedule New Delivery
          </button>
          <button
            onClick={() => setActiveTab('my_subscriptions')}
            className={`flex-1 py-3 text-center border-b-2 transition ${
              activeTab === 'my_subscriptions'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-[#1B201D]'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Active Subscriptions ({subscriptions.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {activeTab === 'create' ? (
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Select Farm Produce *
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold outline-hidden"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — ₹{p.price}/{p.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Delivery Quantity (per drop) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-hidden"
                  />
                  <span className="text-[10px] text-zinc-400 mt-0.5 block">
                    Unit: {selectedProduct?.unit || 'KG'}
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Frequency *
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-hidden"
                  >
                    <option value="daily">Every Morning (Daily)</option>
                    <option value="alternate_days">Alternate Days</option>
                    <option value="weekly">Once a Week (Sundays)</option>
                    <option value="bi_weekly">Twice a Month</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Preferred Time Slot
                  </label>
                  <select
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-hidden"
                  >
                    <option value="Morning (06:00 - 08:30 AM)">Morning (06:00 - 08:30 AM)</option>
                    <option value="Evening (05:00 - 07:30 PM)">Evening (05:00 - 07:30 PM)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Cost per Delivery
                  </label>
                  <div className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-xs font-black text-emerald-700 dark:text-emerald-400">
                    {formatCurrency((Number(quantity) || 1) * (selectedProduct?.price || 40))}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Delivery Address *
                </label>
                <textarea
                  rows={2}
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-hidden"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Repeat className="w-4 h-4" />
                <span>{isSubmitting ? 'Starting Subscription...' : 'Confirm Recurring Farm Delivery'}</span>
              </button>
            </form>
          ) : (
            <div className="space-y-3">
              {subscriptions.length === 0 ? (
                <div className="py-8 text-center bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/60 text-xs text-zinc-500">
                  No recurring farm subscriptions found. Schedule fresh deliveries above!
                </div>
              ) : (
                subscriptions.map((sub) => (
                  <div
                    key={sub.id}
                    className="p-4 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 rounded-2xl space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-zinc-900 dark:text-white text-sm">
                        {sub.product_name || 'Farm Fresh Produce'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                        {sub.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-zinc-500">
                      <span>Quantity: <strong>{sub.quantity} {sub.unit}</strong></span>
                      <span>Frequency: <strong>{sub.frequency}</strong></span>
                      <span>Next Drop: <strong>{sub.next_delivery_date || 'Tomorrow Morning'}</strong></span>
                    </div>

                    <p className="text-zinc-600 dark:text-zinc-400 flex items-center gap-1 text-[11px]">
                      <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                      {sub.delivery_address}
                    </p>

                    <div className="flex items-center gap-2 pt-2 border-t border-zinc-200/50 dark:border-zinc-700/50">
                      <button
                        onClick={() => handleSkip(sub.id)}
                        className="px-3 py-1 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-300 font-bold text-[11px] rounded-lg transition"
                      >
                        Skip Next Drop
                      </button>
                      <button
                        onClick={() => handleToggleStatus(sub.id, sub.status)}
                        className={`px-3 py-1 font-bold text-[11px] rounded-lg transition ${
                          sub.status === 'active'
                            ? 'bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-200'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        {sub.status === 'active' ? 'Pause' : 'Resume'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-900/60 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
          <span className="text-zinc-400 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Pause, modify, or cancel your subscription anytime with zero fees
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
