import React, { useState, useEffect } from 'react';
import { SavedSearch } from '../../types';
import { ApiClient } from '../../api/client';
import { useApp } from '../../context/AppContext';
import {
  X,
  Bell,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  Search,
  RotateCcw,
  Tag,
  ShieldCheck,
} from 'lucide-react';

interface SavedSearchesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES = ['All', 'Vegetables', 'Fruits', 'Grains', 'Dairy', 'Organic', 'Seeds'];

export const SavedSearchesModal: React.FC<SavedSearchesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { showToast } = useApp();

  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form fields
  const [queryText, setQueryText] = useState('');
  const [categoryName, setCategoryName] = useState('All');
  const [maxPrice, setMaxPrice] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSearches = async () => {
    try {
      setLoading(true);
      const res = await ApiClient.listSavedSearches();
      const list: SavedSearch[] = Array.isArray(res) ? res : (res as any).savedSearches || [];
      setSavedSearches(list);
    } catch (err: any) {
      showToast(err.message || 'Failed to load saved searches', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSearches();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryText.trim() && categoryName === 'All') {
      showToast('Please enter a crop keyword or choose a category', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      await ApiClient.createSavedSearch({
        searchName: queryText.trim() || `${categoryName} Alert`,
        productQuery: queryText.trim() || undefined,
        categoryName: categoryName !== 'All' ? categoryName : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        notificationFrequency: 'instant',
      });

      showToast('Smart Alert created! You will be notified when matching produce is posted.');
      setQueryText('');
      setMaxPrice('');
      setShowCreateForm(false);
      await fetchSearches();
    } catch (err: any) {
      showToast(err.message || 'Failed to create alert', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (id: string, currentActive: boolean) => {
    try {
      await ApiClient.toggleSavedSearch(id);
      setSavedSearches((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isActive: !currentActive } : s))
      );
      showToast(!currentActive ? 'Alert enabled' : 'Alert paused');
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle alert', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await ApiClient.deleteSavedSearch(id);
      setSavedSearches((prev) => prev.filter((s) => s.id !== id));
      showToast('Alert removed');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete alert', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-lg bg-white dark:bg-[#1B201D] rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[92vh] animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-zinc-900 dark:text-white">
                Crop & Price Alerts (स्मार्ट अलर्ट)
              </h3>
              <p className="text-[11px] text-zinc-500">
                Get notified automatically when fresh crops or bargain prices appear
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

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Create Alert Toggle */}
          {!showCreateForm ? (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full p-3 rounded-2xl border border-dashed border-emerald-400 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 hover:bg-emerald-50 transition"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create New Crop / Price Alert</span>
            </button>
          ) : (
            <form onSubmit={handleCreate} className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-900 dark:text-white">
                  Set Up New Smart Notification
                </span>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="text-xs text-zinc-500 hover:text-zinc-700"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 block mb-1">
                  Crop Name / Keyword
                </label>
                <input
                  type="text"
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                  placeholder="e.g. Desi Ghee, Organic Apple, Onion..."
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 block mb-1">
                    Category
                  </label>
                  <select
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 block mb-1">
                    Max Price Limit (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 50"
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-soft transition"
              >
                {isSubmitting ? 'Saving...' : 'Save & Enable Alert'}
              </button>
            </form>
          )}

          {/* Active Alerts List */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">
              Your Subscribed Alerts ({savedSearches.length})
            </span>

            {loading ? (
              <div className="py-6 text-center text-xs text-zinc-400">Loading alerts...</div>
            ) : savedSearches.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-400 space-y-1 bg-zinc-50 dark:bg-zinc-800/20 rounded-2xl p-4">
                <Bell className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto" />
                <p className="font-semibold text-zinc-600 dark:text-zinc-400">No alerts subscribed yet</p>
                <p className="text-[11px]">
                  Add crops you frequently purchase to get notified first when a farmer posts new harvest.
                </p>
              </div>
            ) : (
              savedSearches.map((s) => (
                <div
                  key={s.id}
                  className="p-3.5 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-sm text-zinc-900 dark:text-white">
                        {s.productQuery || s.queryText || s.searchName || s.categoryName || 'All Produce'}
                      </h4>
                      {s.categoryName && s.categoryName !== 'All' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                          {s.categoryName}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                      {s.maxPrice && (
                        <span>Under ₹{s.maxPrice}</span>
                      )}
                      <span>Alert: {s.notificationFrequency || s.alertFrequency || 'Instant'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggle(s.id, s.isActive)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition ${
                        s.isActive
                          ? 'bg-emerald-600 text-white'
                          : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'
                      }`}
                    >
                      {s.isActive ? 'Active' : 'Paused'}
                    </button>

                    <button
                      onClick={() => handleDelete(s.id)}
                      className="p-1.5 text-zinc-400 hover:text-red-500 rounded-lg transition"
                      title="Delete alert"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
