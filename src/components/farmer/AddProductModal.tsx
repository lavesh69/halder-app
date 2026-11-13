import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { ProductCategory } from '../../types';
import { compressImageFile } from '../../utils/imageCompression';
import {
  X,
  Upload,
  Sprout,
  Sparkles,
  Check,
  Camera,
  Zap,
  Flame,
  HandCoins,
  ShieldCheck,
} from 'lucide-react';

const categories: ProductCategory[] = [
  'Vegetables',
  'Fruits',
  'Leafy Greens',
  'Grains',
  'Dairy',
  'Organic',
  'Homemade Food',
  'Seeds',
  'Farm Equipment',
  'Livestock',
  'Other',
];

const photoPresets = [
  {
    name: 'Red Tomatoes',
    url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80',
    category: 'Vegetables' as ProductCategory,
    price: 40,
    unit: 'kg',
  },
  {
    name: 'Fresh Spinach',
    url: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&auto=format&fit=crop&q=80',
    category: 'Leafy Greens' as ProductCategory,
    price: 25,
    unit: 'bunch',
  },
  {
    name: 'Farm Potatoes',
    url: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&auto=format&fit=crop&q=80',
    category: 'Vegetables' as ProductCategory,
    price: 35,
    unit: 'kg',
  },
  {
    name: 'Green Peas',
    url: 'https://images.unsplash.com/photo-1587735243615-c03f25aaff15?w=600&auto=format&fit=crop&q=80',
    category: 'Vegetables' as ProductCategory,
    price: 80,
    unit: 'kg',
  },
  {
    name: 'Desi Carrots',
    url: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=600&auto=format&fit=crop&q=80',
    category: 'Vegetables' as ProductCategory,
    price: 50,
    unit: 'kg',
  },
  {
    name: 'A2 Cow Milk',
    url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80',
    category: 'Dairy' as ProductCategory,
    price: 75,
    unit: 'litre',
  },
  {
    name: 'Sharbati Wheat',
    url: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&auto=format&fit=crop&q=80',
    category: 'Grains' as ProductCategory,
    price: 2450,
    unit: 'qtl',
  },
  {
    name: 'Basmati Paddy',
    url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80',
    category: 'Grains' as ProductCategory,
    price: 3820,
    unit: 'qtl',
  },
  {
    name: 'Organic Honey',
    url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&auto=format&fit=crop&q=80',
    category: 'Homemade Food' as ProductCategory,
    price: 350,
    unit: 'packet',
  },
];

export const AddProductModal: React.FC = () => {
  const { isAddProductOpen, setIsAddProductOpen, addProduct, showToast, currentLocation } = useApp();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('Vegetables');
  const [price, setPrice] = useState<number | ''>(40);
  const [unit, setUnit] = useState('kg');
  const [availableQuantity, setAvailableQuantity] = useState<number | ''>(25);
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(photoPresets[0].url);
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [isOrganic, setIsOrganic] = useState(true);
  const [isNegotiable, setIsNegotiable] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [freshnessTag, setFreshnessTag] = useState('Harvested Today Morning');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isAddProductOpen) return null;

  const handleApplyPreset = (preset: typeof photoPresets[0]) => {
    setName(preset.name);
    setCategory(preset.category);
    setPrice(preset.price);
    setUnit(preset.unit);
    setImage(preset.url);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      showToast('⚡ Compressing crop photo for village network...', 'info');
      const res = await compressImageFile(file, { lowBandwidthMode: true });
      setImage(res.dataUrl);
      showToast(`Crop photo compressed! Saved ${res.savingsPercent}% data (${res.compressedFormatted})`, 'success');
    } catch {
      showToast('Failed to process image file', 'error');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price || !availableQuantity) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    const finalImage = customImageUrl.trim() || image;

    addProduct({
      name: name.trim(),
      category,
      price: Number(price),
      unit,
      availableQuantity: Number(availableQuantity),
      image: finalImage,
      description: description.trim() || `Freshly harvested ${name.trim()} directly from local farm. 100% natural.`,
      isAvailable: true,
      harvestDate: 'Today morning',
      isOrganic,
      isNegotiable,
      isFeatured,
      isUrgent,
      freshnessTag: freshnessTag.trim() || (isOrganic ? '100% Organic' : 'Fresh Harvest'),
      location: currentLocation,
    });

    // Reset form
    setName('');
    setDescription('');
    setCustomImageUrl('');
    setIsAddProductOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-fade-in">
      <div
        className="w-full max-w-lg bg-white dark:bg-[#1B201D] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 max-h-[90vh] flex flex-col overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/80">
          <div className="flex items-center gap-2">
            <Sprout className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h3 className="font-black text-lg text-zinc-900 dark:text-white">
                List New Crop / Food (फसल सूची बनाएं)
              </h3>
              <span className="text-[11px] text-zinc-400">Direct-to-consumer farm marketplace</span>
            </div>
          </div>

          <button
            onClick={() => setIsAddProductOpen(false)}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hidden device camera input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          className="hidden"
        />

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Photo Upload Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider text-[11px]">
                1. Crop Photo / तस्वीर
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 text-emerald-600 font-bold hover:underline"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Upload from Device</span>
              </button>
            </div>

            {/* Selected Image Preview with Quick Presets */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {photoPresets.map((preset, idx) => {
                const isSelected = image === preset.url && !customImageUrl;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setCustomImageUrl('');
                      handleApplyPreset(preset);
                    }}
                    className={`relative rounded-xl overflow-hidden aspect-4/3 border-2 transition-all ${
                      isSelected
                        ? 'border-emerald-600 ring-2 ring-emerald-500/30'
                        : 'border-zinc-200 dark:border-zinc-700 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.name}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-xs text-[9px] text-white font-semibold py-0.5 truncate px-1 text-center">
                      {preset.name}
                    </span>
                    {isSelected && (
                      <div className="absolute top-1 right-1 p-0.5 bg-emerald-600 text-white rounded-full">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom Image URL field */}
            <div className="pt-1">
              <input
                type="url"
                value={customImageUrl}
                onChange={(e) => setCustomImageUrl(e.target.value)}
                placeholder="Or paste custom image link (optional)..."
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
              />
            </div>
          </div>

          {/* Product Name */}
          <div className="space-y-1">
            <label className="font-bold text-zinc-700 dark:text-zinc-300">
              Crop / Produce Name * (फसल का नाम)
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Desi Sharbati Wheat, Fresh Hybrid Tomatoes"
              className="w-full px-4 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Category & Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-zinc-700 dark:text-zinc-300">
                Category (श्रेणी)
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-zinc-700 dark:text-zinc-300">
                Selling Unit (इकाई)
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
              >
                <option value="kg">kg (किलोग्राम)</option>
                <option value="qtl">qtl (क्विंटल - 100 kg)</option>
                <option value="ton">ton (टन - 1000 kg)</option>
                <option value="crate">crate (क्रेट - 25 kg)</option>
                <option value="bunch">bunch (गुच्छा)</option>
                <option value="piece">piece (नग)</option>
                <option value="litre">litre (लीटर)</option>
                <option value="packet">packet (पैकेट)</option>
                <option value="dozen">dozen (दर्जन)</option>
                <option value="box">box (पेटी)</option>
              </select>
            </div>
          </div>

          {/* Price & Available Stock */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-zinc-700 dark:text-zinc-300">
                Price (₹ per {unit}) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-zinc-400">
                  ₹
                </span>
                <input
                  type="number"
                  required
                  min="1"
                  value={price}
                  onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : '')}
                  className="w-full pl-7 pr-3 py-2 text-xs font-bold bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-zinc-700 dark:text-zinc-300">
                Available Quantity ({unit}) *
              </label>
              <input
                type="number"
                required
                min="1"
                value={availableQuantity}
                onChange={(e) => setAvailableQuantity(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 text-xs font-bold bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Freshness Tag */}
          <div className="space-y-1">
            <label className="font-bold text-zinc-700 dark:text-zinc-300">
              Freshness Tag (ताजगी स्थिति)
            </label>
            <input
              type="text"
              value={freshnessTag}
              onChange={(e) => setFreshnessTag(e.target.value)}
              placeholder="e.g. Harvested Today Morning, Cold Stored, Freshly Plucked"
              className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="font-bold text-zinc-700 dark:text-zinc-300">
              Harvest Notes / Description (विवरण)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide farm details, pesticide-free guarantee, bulk discounts for buyers..."
              className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          {/* Feature Badges & Promotional Toggles */}
          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80 space-y-2.5">
            <span className="font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider text-[10px] block">
              Promotion & Quality Options
            </span>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-emerald-500 transition">
                <input
                  type="checkbox"
                  checked={isOrganic}
                  onChange={(e) => setIsOrganic(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  100% Organic
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-amber-500 transition">
                <input
                  type="checkbox"
                  checked={isNegotiable}
                  onChange={(e) => setIsNegotiable(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500"
                />
                <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1">
                  <HandCoins className="w-3 h-3 text-amber-600" />
                  Negotiable (मोलभाव)
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-blue-500 transition">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-blue-600" />
                  ⚡ Boost to Top
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-red-500 transition">
                <input
                  type="checkbox"
                  checked={isUrgent}
                  onChange={(e) => setIsUrgent(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-red-600 focus:ring-red-500"
                />
                <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-red-600" />
                  🔥 Urgent Sale
                </span>
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs rounded-2xl shadow-soft transition-all flex items-center justify-center gap-2"
          >
            <Sprout className="w-4 h-4" />
            <span>List Crop on HALDER Marketplace (फसल लाइव करें)</span>
          </button>
        </form>
      </div>
    </div>
  );
};
