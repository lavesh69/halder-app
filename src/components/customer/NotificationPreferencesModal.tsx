import React, { useState, useEffect } from 'react';
import { ApiClient } from '../../api/client';
import { X, Bell, Check, Loader2, Package, Truck, CreditCard, MessageSquare, Sparkles } from 'lucide-react';

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const NotificationPreferencesModal: React.FC<NotificationPreferencesModalProps> = ({
  isOpen,
  onClose,
  showToast,
}) => {
  const [prefs, setPrefs] = useState({
    orders: true,
    delivery: true,
    payments: true,
    chat: true,
    promos: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const data = await ApiClient.getCustomerSettings();
      if (data) setPrefs(data);
    } catch {}
    setIsLoading(false);
  };

  const handleToggle = (key: keyof typeof prefs) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await ApiClient.updateCustomerSettings(prefs);
      showToast('Notification preferences updated', 'success');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to update preferences', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-[#1B201D] w-full max-w-md rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-white">
                Notification Preferences
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Choose alerts for orders, deliveries & chats
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3.5">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-zinc-400">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <span className="text-xs">Loading preferences...</span>
            </div>
          ) : (
            <>
              {/* Order Status */}
              <div className="p-3.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                      Order Updates
                    </span>
                    <span className="text-[11px] text-zinc-500">Order confirmed, packed, ready</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.orders}
                  onChange={() => handleToggle('orders')}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
              </div>

              {/* Delivery Tracking */}
              <div className="p-3.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                      Live Delivery Alerts
                    </span>
                    <span className="text-[11px] text-zinc-500">Kisan dispatch & arrival notifications</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.delivery}
                  onChange={() => handleToggle('delivery')}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
              </div>

              {/* Payment & Receipts */}
              <div className="p-3.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                      Payment & Receipts
                    </span>
                    <span className="text-[11px] text-zinc-500">UPI/Card charges & invoice receipts</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.payments}
                  onChange={() => handleToggle('payments')}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
              </div>

              {/* Live Chat */}
              <div className="p-3.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                      Farmer Chat Messages
                    </span>
                    <span className="text-[11px] text-zinc-500">Real-time WebSocket chat alerts</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.chat}
                  onChange={() => handleToggle('chat')}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
              </div>

              {/* Special Farm Offers */}
              <div className="p-3.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                      Harvest Drops & Deals
                    </span>
                    <span className="text-[11px] text-zinc-500">Fresh harvest discount drops</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.promos}
                  onChange={() => handleToggle('promos')}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Preferences</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
