import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Product } from '../../types';
import { ApiClient } from '../../api/client';
import { formatCurrency } from '../../utils/formatters';
import { X, HandCoins, ArrowRight, ShieldCheck, Calendar, Truck, CheckCircle2 } from 'lucide-react';

interface MakeOfferModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onOfferSubmitted?: (negotiation: any) => void;
}

export const MakeOfferModal: React.FC<MakeOfferModalProps> = ({
  product,
  isOpen,
  onClose,
  onOfferSubmitted,
}) => {
  const { showToast } = useApp();

  const [proposedPrice, setProposedPrice] = useState<number | ''>(Math.round(product.price * 0.9));
  const [quantity, setQuantity] = useState<number | ''>(Math.min(product.availableQuantity, 10));
  const [requiredDate, setRequiredDate] = useState('');
  const [deliveryPreference, setDeliveryPreference] = useState<'pickup' | 'farmer_delivery'>('pickup');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const totalValue = (Number(proposedPrice) || 0) * (Number(quantity) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposedPrice || Number(proposedPrice) <= 0) {
      showToast('Please enter a valid offer price');
      return;
    }
    if (!quantity || Number(quantity) <= 0) {
      showToast('Please enter a valid quantity');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await ApiClient.createOffer({
        productId: product.id,
        proposedPrice: Number(proposedPrice),
        quantity: Number(quantity),
        requiredDate: requiredDate || undefined,
        deliveryPreference,
        message: message.trim() || undefined,
      });

      showToast(`Offer of ₹${proposedPrice}/${product.unit} sent to ${product.farmerName}!`);
      if (onOfferSubmitted) onOfferSubmitted(res);
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit offer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-md bg-white dark:bg-[#1B201D] rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
              <HandCoins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-zinc-900 dark:text-white">
                Make an Offer (मोल-भाव)
              </h3>
              <p className="text-[11px] text-zinc-500">
                Direct price negotiation with {product.farmerName}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto max-h-[80vh]">
          {/* Target Product Summary */}
          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src={product.image}
                alt={product.name}
                className="w-12 h-12 rounded-xl object-cover"
              />
              <div>
                <h4 className="font-bold text-xs text-zinc-900 dark:text-white line-clamp-1">
                  {product.name}
                </h4>
                <span className="text-[11px] text-zinc-500">
                  Asking: <b className="text-emerald-600">{formatCurrency(product.price)}/{product.unit}</b>
                </span>
              </div>
            </div>
            <span className="text-right text-[11px] text-zinc-500">
              Stock: {product.availableQuantity} {product.unit}
            </span>
          </div>

          {/* Slabs Callout if configured */}
          {product.price_slabs && product.price_slabs.length > 0 && (
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 text-[11px]">
              <span className="font-bold text-amber-900 dark:text-amber-200 block mb-0.5">
                Farmer's Configured Volume Discounts:
              </span>
              <div className="flex flex-wrap gap-2 text-amber-800 dark:text-amber-300">
                {product.price_slabs.map((s, i) => (
                  <span key={i} className="bg-white/80 dark:bg-black/30 px-2 py-0.5 rounded-md font-semibold">
                    {s.minQuantity}+ {product.unit}: ₹{s.pricePerUnit}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Offer Price & Quantity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                Your Offer Price (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">₹</span>
                <input
                  type="number"
                  value={proposedPrice}
                  onChange={(e) => setProposedPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="35"
                  className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                Quantity ({product.unit}) *
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="20"
                max={product.availableQuantity}
                className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                required
              />
            </div>
          </div>

          {/* Total Offer Calculation */}
          <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-200/50 dark:border-amber-800/40 flex items-center justify-between text-xs">
            <span className="text-zinc-600 dark:text-zinc-400 font-semibold">
              Total Proposed Value:
            </span>
            <span className="text-base font-black text-amber-700 dark:text-amber-400">
              {formatCurrency(totalValue)}
            </span>
          </div>

          {/* Delivery or Pickup Arrangement */}
          <div>
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5">
              Pickup or Delivery Arrangement
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDeliveryPreference('pickup')}
                className={`p-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition ${
                  deliveryPreference === 'pickup'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <span>Farm Pickup</span>
              </button>
              <button
                type="button"
                onClick={() => setDeliveryPreference('farmer_delivery')}
                className={`p-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition ${
                  deliveryPreference === 'farmer_delivery'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <span>Farmer Delivery</span>
              </button>
            </div>
          </div>

          {/* Required Date */}
          <div>
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
              Required by Date (Optional)
            </label>
            <input
              type="date"
              value={requiredDate}
              onChange={(e) => setRequiredDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-900 dark:text-white"
            />
          </div>

          {/* Message */}
          <div>
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
              Note to Farmer
            </label>
            <textarea
              rows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Can collect on Saturday morning in crates."
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white resize-none"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-2xl shadow-soft transition flex items-center justify-center gap-2"
            >
              <span>{isSubmitting ? 'Sending Offer...' : 'Send Offer to Farmer'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-[10px] text-zinc-400 text-center mt-2">
              Free direct negotiation. No platform commission or upfront payment charged.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
