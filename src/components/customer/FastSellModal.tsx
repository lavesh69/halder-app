import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { ProductCategory, UnitType } from '../../types';
import {
  X,
  Camera,
  Check,
  ArrowRight,
  ArrowLeft,
  Sprout,
  Sparkles,
  MapPin,
  Upload,
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const photoPresets = [
  { name: 'Red Tomatoes', url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80', cat: 'Vegetables', unit: 'kg', price: 40 },
  { name: 'Fresh Spinach', url: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&auto=format&fit=crop&q=80', cat: 'Organic', unit: 'bunch', price: 30 },
  { name: 'Farm Potatoes', url: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&auto=format&fit=crop&q=80', cat: 'Vegetables', unit: 'kg', price: 35 },
  { name: 'Desi Cow Milk', url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80', cat: 'Dairy', unit: 'litre', price: 75 },
  { name: 'Mountain Honey', url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&auto=format&fit=crop&q=80', cat: 'Homemade', unit: 'packet', price: 350 },
  { name: 'Green Peas', url: 'https://images.unsplash.com/photo-1587735243615-c03f25aaff15?w=600&auto=format&fit=crop&q=80', cat: 'Vegetables', unit: 'kg', price: 80 },
  { name: 'Tractor / Equipment', url: 'https://images.unsplash.com/photo-1594771804886-a933bb2d609b?w=600&auto=format&fit=crop&q=80', cat: 'Farm Equipment', unit: 'piece', price: 85000 },
  { name: 'Desi Cow / Cattle', url: 'https://images.unsplash.com/photo-1546445317-29f4545e9d53?w=600&auto=format&fit=crop&q=80', cat: 'Livestock', unit: 'piece', price: 42000 },
];

const categories: ProductCategory[] = [
  'Vegetables',
  'Fruits',
  'Grains',
  'Dairy',
  'Farm Equipment',
  'Livestock',
  'Organic',
  'Homemade',
  'Seeds',
  'Other',
];

const units: { label: string; val: UnitType }[] = [
  { label: 'kg', val: 'kg' },
  { label: 'gram', val: 'gram' },
  { label: 'bunch', val: 'bunch' },
  { label: 'piece', val: 'piece' },
  { label: 'litre', val: 'litre' },
  { label: 'packet', val: 'packet' },
];

export const FastSellModal: React.FC = () => {
  const {
    isFastSellOpen,
    setIsFastSellOpen,
    publishListing,
    currentLocation,
    activeCity,
    showToast,
  } = useApp();

  const [step, setStep] = useState<number>(1);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([photoPresets[0].url]);
  const [selectedPhoto, setSelectedPhoto] = useState<string>(photoPresets[0].url);
  const [name, setName] = useState('Fresh Farm Tomatoes');
  const [category, setCategory] = useState<ProductCategory>('Vegetables');
  const [price, setPrice] = useState<number | ''>(40);
  const [unit, setUnit] = useState<string>('kg');
  const [availableQuantity, setAvailableQuantity] = useState<number | ''>(25);
  const [location, setLocation] = useState(currentLocation);
  const [description, setDescription] = useState('Freshly harvested direct from our farm this morning. 100% natural.');
  const [isOrganic, setIsOrganic] = useState(true);
  const [isAvailableToday, setIsAvailableToday] = useState(true);
  const [isNegotiable, setIsNegotiable] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isFastSellOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setUploadedPhotos((prev) => [result, ...prev]);
          setSelectedPhoto(result);
          showToast('Photo uploaded from device!');
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleApplyPreset = (preset: typeof photoPresets[0]) => {
    setSelectedPhoto(preset.url);
    setName(preset.name);
    setCategory(preset.cat as ProductCategory);
    setUnit(preset.unit);
    setPrice(preset.price);
  };

  const handlePublish = () => {
    publishListing({
      name: name.trim() || 'Farm Fresh Produce',
      category,
      price: Number(price) || 40,
      unit,
      availableQuantity: Number(availableQuantity) || 20,
      image: selectedPhoto,
      images: uploadedPhotos.length > 0 ? uploadedPhotos : [selectedPhoto],
      location,
      city: activeCity,
      description: description.trim(),
      isAvailable: true,
      isAvailableToday,
      isNegotiable,
      harvestDate: isAvailableToday ? 'Harvested Today morning' : 'Recently Harvested',
      isOrganic,
      freshnessTag: isOrganic ? '100% Organic' : 'Fresh Today',
    });
    setIsSuccess(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-fade-in">
      <div
        className="w-full max-w-lg bg-white dark:bg-[#1B201D] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 max-h-[90vh] flex flex-col overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Step Progress Header */}
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h3 className="font-black text-base text-zinc-900 dark:text-white">
                Post New Farm Listing
              </h3>
              <span className="text-[11px] font-bold text-emerald-600">
                Step {step} of 4 • Fast 60s Posting
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsFastSellOpen(false)}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        {!isSuccess && (
          <div className="w-full h-1 bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-full bg-emerald-600 transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        )}

        {/* Hidden File Input for Real Device Camera & Image Upload */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          multiple
          className="hidden"
        />

        {/* OLX Congratulations Success Screen */}
        {isSuccess ? (
          <div className="p-6 text-center space-y-5 animate-fade-in flex flex-col justify-center flex-1">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 flex items-center justify-center mx-auto text-3xl shadow-soft">
              ✓
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-zinc-900 dark:text-white">
                🎉 Your Ad is Now Live!
              </h3>
              <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                Nearby buyers in {activeCity} can now see your listing, make offers, and message you directly!
              </p>
            </div>

            {/* Ad Preview Card */}
            <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80 flex items-center gap-3 text-left">
              <img
                src={selectedPhoto}
                alt={name}
                className="w-16 h-16 rounded-xl object-cover shrink-0"
              />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-md">
                  Active Listing
                </span>
                <h4 className="font-bold text-sm text-zinc-900 dark:text-white truncate mt-1">
                  {name}
                </h4>
                <span className="text-base font-black text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(Number(price))} / {unit}
                </span>
              </div>
            </div>

            {/* OLX WhatsApp Share Button */}
            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  const shareMsg = encodeURIComponent(`🌾 Hello! I have posted an advertisement for "${name}" (${formatCurrency(Number(price))}/${unit}) on HALDER in ${location}. Contact me on WhatsApp if interested!`);
                  window.open(`https://wa.me/?text=${shareMsg}`, '_blank');
                }}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs rounded-2xl shadow-soft transition-all flex items-center justify-center gap-2"
              >
                <span className="text-base">💬</span>
                <span>Share on WhatsApp to Sell 2x Faster</span>
              </button>

              <button
                onClick={() => {
                  setIsSuccess(false);
                  setStep(1);
                  setIsFastSellOpen(false);
                }}
                className="w-full py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-2xl hover:bg-zinc-200 transition"
              >
                Done / Back to Marketplace
              </button>
            </div>
          </div>
        ) : (
          <>
        {/* Form Body Per Step */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* STEP 1: Photos (Camera / File Upload + Presets) */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h4 className="font-bold text-sm text-zinc-900 dark:text-white">
                  Step 1: Add Crop Photos
                </h4>
                <p className="text-zinc-500 mt-0.5">
                  Upload directly from your device camera or pick a 1-click crop preset
                </p>
              </div>

              {/* Upload Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-4 rounded-2xl border-2 border-dashed border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50 text-emerald-800 dark:text-emerald-300 flex items-center justify-center gap-2.5 transition-colors"
              >
                <Camera className="w-5 h-5 text-emerald-600" />
                <span className="font-bold text-xs">Take Photo or Upload from Device</span>
              </button>

              <div className="space-y-2">
                <span className="font-bold text-zinc-500 uppercase tracking-wider block text-[10px]">
                  Or Select a Popular Crop Preset
                </span>

                <div className="grid grid-cols-3 gap-2.5">
                  {photoPresets.map((preset, idx) => {
                    const isSelected = selectedPhoto === preset.url;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleApplyPreset(preset)}
                        className={`relative aspect-4/3 rounded-2xl overflow-hidden border-2 transition-all ${
                          isSelected
                            ? 'border-emerald-600 ring-2 ring-emerald-500/30'
                            : 'border-zinc-200 dark:border-zinc-700 opacity-75 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.name}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-xs text-[10px] text-white font-bold py-0.5 truncate px-1 text-center">
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
              </div>
            </div>
          )}

          {/* STEP 2: Product + Price & Unit */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h4 className="font-bold text-sm text-zinc-900 dark:text-white">
                  Step 2: Product Name & Pricing
                </h4>
                <p className="text-zinc-500 mt-0.5">
                  Set the crop title, category, and direct price
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Fresh Red Vine Tomatoes"
                  className="w-full p-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">
                  Category
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                        category === cat
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={price}
                    onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : '')}
                    className="w-full p-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">
                    Price per
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full p-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none"
                  >
                    {units.map((u) => (
                      <option key={u.val} value={u.val}>
                        per {u.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Quantity + Location + Toggles */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h4 className="font-bold text-sm text-zinc-900 dark:text-white">
                  Step 3: Stock Quantity & Location
                </h4>
                <p className="text-zinc-500 mt-0.5">
                  Specify how much you have and farm location
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">
                    Available Quantity ({unit}) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={availableQuantity}
                    onChange={(e) => setAvailableQuantity(e.target.value ? Number(e.target.value) : '')}
                    className="w-full p-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">
                    Location Area
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full p-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">
                  Short Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none resize-none"
                />
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🤝</span>
                    <div>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200 block text-xs">
                        Price is Negotiable (कीमत पर मोलभाव संभव)
                      </span>
                      <span className="text-[10px] text-zinc-400">Buyers can submit counter-offers directly in chat</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isNegotiable}
                    onChange={(e) => setIsNegotiable(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 cursor-pointer">
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">
                    🌱 100% Organic & Chemical-Free
                  </span>
                  <input
                    type="checkbox"
                    checked={isOrganic}
                    onChange={(e) => setIsOrganic(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 cursor-pointer">
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">
                    ⚡ Available Today (Ready for dispatch)
                  </span>
                  <input
                    type="checkbox"
                    checked={isAvailableToday}
                    onChange={(e) => setIsAvailableToday(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                </label>
              </div>
            </div>
          )}

          {/* STEP 4: Review & Publish */}
          {step === 4 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h4 className="font-bold text-sm text-zinc-900 dark:text-white">
                  Step 4: Review & Publish Listing
                </h4>
                <p className="text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Confirm your listing details before publishing to the mandi
                </p>
              </div>

              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-3xl border border-zinc-200/80 dark:border-zinc-700/80 flex items-center gap-3.5">
                <img
                  src={selectedPhoto}
                  alt={name}
                  className="w-20 h-20 rounded-2xl object-cover bg-zinc-200"
                />
                <div>
                  <h5 className="font-black text-base text-zinc-900 dark:text-white">
                    {name}
                  </h5>
                  <span className="text-lg font-black text-emerald-700 dark:text-emerald-400 block mt-0.5">
                    {formatCurrency(Number(price))} / {unit}
                  </span>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    📦 {availableQuantity} {unit} available • 📍 {location}
                  </span>
                  {isNegotiable && (
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                      🤝 Price Negotiable (मोलभाव संभव)
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200 text-xs">
                ✅ Your listing will be visible to all nearby customers in {activeCity} instantly.
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-[#1B201D] flex gap-3">
          {step < 4 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-sm rounded-2xl shadow-soft transition-all flex items-center justify-center gap-2"
            >
              <span>Continue to Step {step + 1}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handlePublish}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-sm rounded-2xl shadow-soft transition-all flex items-center justify-center gap-2"
            >
              <Sprout className="w-4 h-4" />
              <span>Publish Listing to Marketplace</span>
            </button>
          )}
        </div>
        </>
        )}
      </div>
    </div>
  );
};
