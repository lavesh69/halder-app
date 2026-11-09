import React, { useState, useEffect } from 'react';
import { Product } from '../../types';
import { ApiClient } from '../../api/client';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';
import {
  X,
  Boxes,
  Plus,
  Minus,
  Check,
  History,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

interface StockControlModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onStockUpdated?: (updatedProduct: any) => void;
}

const STOCK_STATUSES = [
  { value: 'available', label: 'Available (उपलब्ध)', color: 'text-emerald-600' },
  { value: 'limited', label: 'Limited Stock (सीमित स्टॉक)', color: 'text-amber-600' },
  { value: 'out_of_stock', label: 'Out of Stock (समाप्त)', color: 'text-red-600' },
  { value: 'seasonal', label: 'Seasonal Availability (मौसमी)', color: 'text-blue-600' },
  { value: 'expected_harvest', label: 'Expected Harvest (आगामी फसल)', color: 'text-purple-600' },
];

export const StockControlModal: React.FC<StockControlModalProps> = ({
  product,
  isOpen,
  onClose,
  onStockUpdated,
}) => {
  const { showToast } = useApp();

  const [activeTab, setActiveTab] = useState<'adjust' | 'history'>('adjust');
  const [currentQty, setCurrentQty] = useState<number>(0);
  const [minOrderQty, setMinOrderQty] = useState<number>(1);
  const [stockStatus, setStockStatus] = useState<string>('available');
  const [reason, setReason] = useState<string>('Manual stock adjustment');
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (product) {
      setCurrentQty(product.availableQuantity || 0);
      setMinOrderQty(product.min_order_quantity || 1);
      setStockStatus(product.stock_status || (product.availableQuantity > 0 ? 'available' : 'out_of_stock'));
    }
  }, [product]);

  const fetchHistory = async () => {
    if (!product) return;
    try {
      setLoadingHistory(true);
      const res = await ApiClient.getStockHistory(product.id);
      setHistoryLogs(res.history || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load stock audit history', 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'history') {
      fetchHistory();
    }
  }, [isOpen, activeTab, product]);

  if (!isOpen || !product) return null;

  const handleAdjust = (delta: number) => {
    setCurrentQty((prev) => Math.max(0, prev + delta));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentQty < 0) {
      showToast('Quantity cannot be negative', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await ApiClient.updateStock(product.id, {
        quantity: currentQty,
        minOrderQuantity: minOrderQty,
        stockStatus,
        reason: reason.trim() || undefined,
      });

      showToast(`Stock updated: ${currentQty} ${product.unit} available!`, 'success');
      if (onStockUpdated) onStockUpdated(res.product);
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to update stock', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkSoldOut = async () => {
    try {
      setIsSubmitting(true);
      const res = await ApiClient.updateStock(product.id, {
        quantity: 0,
        stockStatus: 'out_of_stock',
        reason: 'Marked sold out by farmer',
      });
      setCurrentQty(0);
      setStockStatus('out_of_stock');
      showToast('Listing marked as Out of Stock', 'info');
      if (onStockUpdated) onStockUpdated(res.product);
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to update stock', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-md bg-white dark:bg-[#1B201D] rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[92vh] animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-zinc-900 dark:text-white">
                Live Stock & Inventory (स्टॉक नियंत्रण)
              </h3>
              <p className="text-[11px] text-zinc-500 line-clamp-1">
                {product.name} ({formatCurrency(product.price)}/{product.unit})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 text-xs font-bold">
          <button
            onClick={() => setActiveTab('adjust')}
            className={`flex-1 py-2.5 border-b-2 transition flex items-center justify-center gap-1.5 ${
              activeTab === 'adjust'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-zinc-500'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Manage Stock</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2.5 border-b-2 transition flex items-center justify-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-zinc-500'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Audit Trail</span>
          </button>
        </div>

        {/* Body */}
        {activeTab === 'adjust' ? (
          <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto flex-1">
            {/* Quick Adjustment Controls */}
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/80 space-y-3">
              <span className="text-xs font-bold text-zinc-500 block">
                Available Farm Stock ({product.unit}):
              </span>

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => handleAdjust(-10)}
                  className="w-10 h-10 rounded-xl bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 text-zinc-800 dark:text-white font-bold flex items-center justify-center"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <div className="flex-1 text-center">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={currentQty}
                    onChange={(e) => setCurrentQty(Math.max(0, Number(e.target.value)))}
                    className="w-full text-center text-3xl font-black text-emerald-700 dark:text-emerald-400 bg-transparent focus:outline-none"
                  />
                  <span className="text-xs text-zinc-400">{product.unit} available</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleAdjust(10)}
                  className="w-10 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Increments buttons */}
              <div className="flex justify-center gap-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60">
                {[5, 25, 50, 100].map((inc) => (
                  <button
                    key={inc}
                    type="button"
                    onClick={() => handleAdjust(inc)}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100"
                  >
                    +{inc} {product.unit}
                  </button>
                ))}
              </div>
            </div>

            {/* Minimum Order Quantity (MOQ) */}
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                Minimum Order Quantity (कम से कम खरीद)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  value={minOrderQty}
                  onChange={(e) => setMinOrderQty(Math.max(1, Number(e.target.value)))}
                  className="w-28 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-white"
                />
                <span className="text-xs text-zinc-500">{product.unit}</span>
              </div>
            </div>

            {/* Stock Status */}
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                Stock Status Tag
              </label>
              <select
                value={stockStatus}
                onChange={(e) => setStockStatus(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-900 dark:text-white"
              >
                {STOCK_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Adjustment Reason */}
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                Reason for Change (Audit Record)
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Morning fresh harvest, local mandi dispatch..."
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white"
              />
            </div>

            {/* Quick Sold-Out Button */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleMarkSoldOut}
                disabled={isSubmitting}
                className="px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
              >
                Mark as Sold Out
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-soft transition flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Save Stock</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="p-4 space-y-2 overflow-y-auto flex-1">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              Stock Modification History:
            </span>

            {loadingHistory ? (
              <div className="py-8 text-center text-xs text-zinc-400">Loading audit history...</div>
            ) : historyLogs.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-400">No stock changes recorded yet.</div>
            ) : (
              historyLogs.map((log) => {
                const isPositive = log.changeQuantity > 0;
                return (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        {isPositive ? (
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5 text-amber-600" />
                        )}
                        <span className="font-bold text-zinc-900 dark:text-white">
                          {log.newQuantity} {product.unit}
                        </span>
                        <span className={`text-[11px] font-bold ${isPositive ? 'text-emerald-600' : 'text-amber-600'}`}>
                          ({isPositive ? '+' : ''}{log.changeQuantity})
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-0.5">{log.reason || 'Stock updated'}</p>
                    </div>

                    <span className="text-[10px] text-zinc-400 font-mono">
                      {new Date(log.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
