import React, { useState } from 'react';
import { ApiClient } from '../../api/client';
import { useApp } from '../../context/AppContext';
import { ProductCategory } from '../../types';
import {
  X,
  Megaphone,
  MapPin,
  Calendar,
  Sparkles,
  Truck,
  ShieldCheck,
  CheckCircle2,
  Tag,
  Clock,
  Layers,
} from 'lucide-react';

interface PostRequirementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (req: any) => void;
}

const CATEGORIES: ProductCategory[] = [
  'Vegetables',
  'Fruits',
  'Leafy Greens',
  'Grains',
  'Dairy',
  'Organic',
  'Homemade Food',
  'Seeds',
  'Other',
];

const UNITS = ['kg', 'quintal', 'ton', 'box', 'bag', 'litre', 'piece', 'gram'];

const QUALITY_GRADES = [
  'Grade A (Export / Premium Quality)',
  'Grade B (Standard Market Produce)',
  'Organic Certified Grade',
  'Fair Average Quality (FAQ)',
  'Processing / Juicing Grade',
];

export const PostRequirementModal: React.FC<PostRequirementModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const { showToast, currentUser } = useApp();

  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('Vegetables');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [unit, setUnit] = useState('quintal');
  const [targetPrice, setTargetPrice] = useState<number | ''>('');
  const [isNegotiable, setIsNegotiable] = useState(true);
  const [requiredDate, setRequiredDate] = useState('');
  const [qualityGrade, setQualityGrade] = useState(QUALITY_GRADES[0]);
  const [deliveryPreference, setDeliveryPreference] = useState<'pickup' | 'farmer_delivery'>('pickup');
  const [village, setVillage] = useState('');
  const [district, setDistrict] = useState('Meerut');
  const [state, setState] = useState('Uttar Pradesh');
  const [postalCode, setPostalCode] = useState('250001');
  const [instructions, setInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim()) {
      showToast('Please specify the required crop or produce name', 'error');
      return;
    }
    if (!quantity || Number(quantity) <= 0) {
      showToast('Please enter a valid required quantity', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await ApiClient.createRequirement({
        productName: productName.trim(),
        category,
        quantity: Number(quantity),
        unit,
        targetPrice: targetPrice ? Number(targetPrice) : undefined,
        isNegotiable,
        requiredDate: requiredDate || undefined,
        qualityGrade,
        deliveryPreference,
        village: village.trim() || undefined,
        district: district.trim() || undefined,
        state: state.trim() || undefined,
        postalCode: postalCode.trim() || undefined,
        instructions: instructions.trim() || undefined,
      });

      showToast(`Requirement "${productName}" posted! Nearby farmers are receiving alerts.`, 'success');
      if (onCreated) onCreated(res.requirement);
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to post requirement', 'error');
    } finally {
      setIsSubmitting(false);
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
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-zinc-900 dark:text-white">
                Post Requirement (फसल मांग दर्ज करें)
              </h3>
              <p className="text-[11px] text-zinc-500">
                Reverse Marketplace: Broadcast your demand to nearby farmers for direct quotes
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
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Produce Name & Category */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
              What agricultural produce do you need? *
            </label>
            <input
              type="text"
              required
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g. Sharbati Wheat, Red Onion, A2 Cow Milk..."
              className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                Unit of Measure *
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quantity & Target Budget */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                Required Quantity *
              </label>
              <input
                type="number"
                required
                min="0.1"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder={`Quantity in ${unit}`}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                Target Budget / {unit} (₹)
              </label>
              <input
                type="number"
                min="1"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Target price (Optional)"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isNegotiableReq"
              checked={isNegotiable}
              onChange={(e) => setIsNegotiable(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500"
            />
            <label htmlFor="isNegotiableReq" className="text-xs text-zinc-700 dark:text-zinc-300 font-medium cursor-pointer">
              Price is negotiable with farmers (मोल-भाव स्वीकार्य)
            </label>
          </div>

          {/* Quality Grade & Required Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                Quality / Grade Spec
              </label>
              <select
                value={qualityGrade}
                onChange={(e) => setQualityGrade(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
              >
                {QUALITY_GRADES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                Required By Date
              </label>
              <input
                type="date"
                value={requiredDate}
                onChange={(e) => setRequiredDate(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Delivery Preference */}
          <div>
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
              Fulfillment Method
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDeliveryPreference('pickup')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  deliveryPreference === 'pickup'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-300'
                    : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Buyer Self-Pickup</span>
              </button>

              <button
                type="button"
                onClick={() => setDeliveryPreference('farmer_delivery')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  deliveryPreference === 'farmer_delivery'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-300'
                    : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Farmer Delivery</span>
              </button>
            </div>
          </div>

          {/* Location Fields */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[11px] font-bold text-zinc-500 block mb-0.5">District / Mandi</label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="District"
                className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-zinc-500 block mb-0.5">State</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="State"
                className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-zinc-500 block mb-0.5">PIN Code</label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="PIN"
                className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white"
              />
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
              Additional Instructions / Packaging Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Moisture content < 12%, clean 50kg gunny bags preferred..."
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Notification Assurance */}
          <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/50 flex items-center gap-2 text-xs text-emerald-900 dark:text-emerald-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Your demand will be broadcast instantly to registered farmers within 50 km.
            </span>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-2xl font-bold text-xs shadow-soft transition flex items-center justify-center gap-1.5 active:scale-98"
            >
              <Megaphone className="w-4 h-4" />
              <span>{isSubmitting ? 'Broadcasting...' : 'Broadcast Requirement (मांग भेजें)'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
