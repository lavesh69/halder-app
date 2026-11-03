import React, { useState, useEffect } from 'react';
import { ApiClient } from '../../api/client';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';
import {
  Building2,
  FileText,
  Send,
  CheckCircle2,
  X,
  Truck,
  ShieldCheck,
  Scale,
  PackageCheck,
  DollarSign,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultProductId?: string;
}

export const B2BWholesaleModal: React.FC<Props> = ({ isOpen, onClose, defaultProductId }) => {
  const { products, currentUser, showToast } = useApp();
  const [b2bProfile, setB2bProfile] = useState<any>(null);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'request' | 'my_quotes'>('request');

  // Form State
  const [selectedProductId, setSelectedProductId] = useState(defaultProductId || (products[0]?.id || 'prod-1'));
  const [quantity, setQuantity] = useState('100');
  const [targetPrice, setTargetPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];

  const fetchWholesaleData = async () => {
    setIsLoading(true);
    try {
      const userId = currentUser?.id || 'cust-1';
      const [profileRes, quotesRes] = await Promise.all([
        ApiClient.getB2BProfile(userId).catch(() => null),
        ApiClient.getWholesaleQuotations({ user_id: userId }).catch(() => []),
      ]);
      setB2bProfile(profileRes);
      setQuotations(quotesRes || []);
    } catch (err) {
      console.warn('Failed to load wholesale data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchWholesaleData();
      if (defaultProductId) setSelectedProductId(defaultProductId);
    }
  }, [isOpen, defaultProductId]);

  if (!isOpen) return null;

  const handleRequestQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    setIsSubmitting(true);
    try {
      await ApiClient.createWholesaleQuotation({
        product_id: selectedProduct.id,
        farmer_id: selectedProduct.farmerId || 'farmer-1',
        quantity: Number(quantity) || 50,
        requested_price_per_unit: Number(targetPrice) || Math.round(selectedProduct.price * 0.75),
        notes: notes || 'Delivery required for restaurant kitchen weekly supply',
      });
      showToast('B2B wholesale quotation submitted to farmer!', 'success');
      setActiveTab('my_quotes');
      fetchWholesaleData();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit quotation', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-[#1B201D] border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-zinc-950 flex items-center justify-center shadow-md">
              <Building2 className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black">
                  B2B Wholesale & Commercial Quotations
                </h3>
                <span className="text-[10px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-full uppercase">
                  Bulk Farm Sourcing
                </span>
              </div>
              <p className="text-xs text-zinc-300">
                Direct wholesale pricing, commercial invoices & pallet shipments for businesses
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

        {/* Tab Controls */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 text-xs font-bold">
          <button
            onClick={() => setActiveTab('request')}
            className={`flex-1 py-3 text-center border-b-2 transition ${
              activeTab === 'request'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-[#1B201D]'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Request Bulk Quotation
          </button>
          <button
            onClick={() => setActiveTab('my_quotes')}
            className={`flex-1 py-3 text-center border-b-2 transition ${
              activeTab === 'my_quotes'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-[#1B201D]'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            My Active Quotes ({quotations.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {activeTab === 'request' ? (
            <form onSubmit={handleRequestQuote} className="space-y-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-emerald-950 dark:text-emerald-300">
                    GST Ready Commercial Procurement • Verified Farmers
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500">MOQ Applies</span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Select Produce / Crop *
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold outline-hidden"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — Retail: ₹{p.price}/{p.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Required Bulk Quantity (in {selectedProduct?.unit || 'KG'}) *
                  </label>
                  <input
                    type="number"
                    min="25"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="e.g. 100"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-hidden"
                  />
                  <span className="text-[10px] text-zinc-400 mt-0.5 block">
                    Minimum Order Quantity: 25 {selectedProduct?.unit || 'KG'}
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Target Price per {selectedProduct?.unit || 'KG'} (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    placeholder={`e.g. ₹${Math.round((selectedProduct?.price || 40) * 0.75)}`}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-hidden"
                  />
                  <span className="text-[10px] text-zinc-400 mt-0.5 block">
                    Retail benchmark is ₹{selectedProduct?.price || 40}/{selectedProduct?.unit || 'KG'}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Delivery Frequency & Commercial Notes
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Specify packaging requirements (crates / 50kg jute sacks), delivery schedule, or GST billing name..."
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-hidden"
                />
              </div>

              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between text-xs">
                <span className="text-zinc-500">Estimated Order Value:</span>
                <span className="font-black text-emerald-700 dark:text-emerald-400 text-sm">
                  {formatCurrency(
                    (Number(quantity) || 50) *
                      (Number(targetPrice) || Math.round((selectedProduct?.price || 40) * 0.75))
                  )}
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'Sending to Farmer...' : 'Submit Commercial RFQ'}</span>
              </button>
            </form>
          ) : (
            <div className="space-y-3">
              {quotations.length === 0 ? (
                <div className="py-8 text-center bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/60 text-xs text-zinc-500">
                  You haven't requested any wholesale quotes yet.
                </div>
              ) : (
                quotations.map((q) => (
                  <div
                    key={q.id}
                    className="p-4 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 rounded-2xl space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-zinc-900 dark:text-white text-sm">
                        {q.product_name || 'Agricultural Produce'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                        {q.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-zinc-500">
                      <span>Quantity: <strong>{q.quantity} {q.unit || 'KG'}</strong></span>
                      <span>Target: <strong>₹{q.requested_price_per_unit}/unit</strong></span>
                      {q.farmer_counter_price && (
                        <span className="text-emerald-600 font-bold">
                          Farmer Counter: ₹{q.farmer_counter_price}/unit
                        </span>
                      )}
                    </div>

                    {q.notes && <p className="text-zinc-600 dark:text-zinc-400 italic">"{q.notes}"</p>}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-900/60 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
          <span className="text-zinc-400 flex items-center gap-1">
            <Truck className="w-4 h-4 text-emerald-600" />
            Direct farmer dispatch with commercial vehicle transport
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
