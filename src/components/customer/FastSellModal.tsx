import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n';
import { ProductCategory, PriceSlab } from '../../types';
import { compressImageFile, formatBytes } from '../../utils/imageCompression';
import {
  X,
  Camera,
  Check,
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  MapPin,
  Upload,
  Plus,
  Trash2,
  Tag,
  ShieldCheck,
  Truck,
  Package,
  Calendar,
  Layers,
  HelpCircle,
  Star,
  Loader2,
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const photoPresets = [
  { name: 'Red Tomatoes', url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80', cat: 'Vegetables', unit: 'kg', price: 40 },
  { name: 'Fresh Spinach', url: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&auto=format&fit=crop&q=80', cat: 'Vegetables', unit: 'kg', price: 30 },
  { name: 'Farm Potatoes', url: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&auto=format&fit=crop&q=80', cat: 'Vegetables', unit: 'kg', price: 35 },
  { name: 'Desi Cow Milk', url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80', cat: 'Dairy', unit: 'litre', price: 75 },
  { name: 'Mountain Honey', url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&auto=format&fit=crop&q=80', cat: 'Organic', unit: 'box', price: 350 },
  { name: 'Green Peas', url: 'https://images.unsplash.com/photo-1587735243615-c03f25aaff15?w=600&auto=format&fit=crop&q=80', cat: 'Vegetables', unit: 'kg', price: 80 },
  { name: 'Basmati Paddy', url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80', cat: 'Grains', unit: 'quintal', price: 3800 },
  { name: 'Tractor / Equipment', url: 'https://images.unsplash.com/photo-1594771804886-a933bb2d609b?w=600&auto=format&fit=crop&q=80', cat: 'Farm Equipment', unit: 'piece', price: 85000 },
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

const allowedUnits = [
  'kg',
  'gram',
  'quintal',
  'ton',
  'litre',
  'dozen',
  'piece',
  'box',
  'bag',
];

export const FastSellModal: React.FC = () => {
  const { t } = useTranslation();
  const {
    isFastSellOpen,
    setIsFastSellOpen,
    publishListing,
    currentLocation,
    activeCity,
    showToast,
    editingListing,
    setEditingListing,
    currentUser,
    role,
  } = useApp();

  const [step, setStep] = useState<number>(1);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([photoPresets[0].url]);
  const [lowBandwidthMode, setLowBandwidthMode] = useState<boolean>(true);
  const [compressionStats, setCompressionStats] = useState<{
    originalTotal: number;
    compressedTotal: number;
    savingsPercent: number;
  } | null>(null);
  
  // Step 1: Product Information
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('Vegetables');
  const [subcategory, setSubcategory] = useState('');
  const [description, setDescription] = useState('');

  // Step 2: Price and Quantity
  const [price, setPrice] = useState<number | ''>('');
  const [unit, setUnit] = useState<string>('kg');
  const [availableQuantity, setAvailableQuantity] = useState<number | ''>('');
  const [minOrderQuantity, setMinOrderQuantity] = useState<number | ''>(1);
  const [isNegotiable, setIsNegotiable] = useState(true);
  const [priceSlabs, setPriceSlabs] = useState<PriceSlab[]>([]);

  // Step 3: Harvest and Quality
  const [harvestDate, setHarvestDate] = useState('Harvested today');
  const [expectedAvailabilityDate, setExpectedAvailabilityDate] = useState('Ready for immediate dispatch');
  const [productGrade, setProductGrade] = useState('Grade A (Premium)');
  const [qualityDescription, setQualityDescription] = useState('Direct farm grading, uniform size, naturally sun-ripened.');
  const [isOrganic, setIsOrganic] = useState(false);
  const [organicCertBody, setOrganicCertBody] = useState('');
  const [packagingInfo, setPackagingInfo] = useState('Standard crates/bags');

  // Step 4: Location & Delivery
  const [state, setState] = useState('Uttarakhand');
  const [district, setDistrict] = useState('Dehradun');
  const [city, setCity] = useState(activeCity || 'Dehradun');
  const [village, setVillage] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [farmLocation, setFarmLocation] = useState(currentLocation || 'Local Farm');
  const [pickupAvailable, setPickupAvailable] = useState(true);
  const [farmerDeliveryAvailable, setFarmerDeliveryAvailable] = useState(true);
  const [showPhoneNumber, setShowPhoneNumber] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  // Sync state whenever modal opens or editingListing changes
  useEffect(() => {
    if (!isFastSellOpen) return;

    if (editingListing) {
      setName(editingListing.name || '');
      setCategory((editingListing.category as ProductCategory) || 'Vegetables');
      setSubcategory(editingListing.subcategory || '');
      setDescription(editingListing.description || '');
      setPrice(editingListing.price || '');
      setUnit(editingListing.unit || 'kg');
      setAvailableQuantity(editingListing.availableQuantity || '');
      setMinOrderQuantity(editingListing.minOrderQuantity || 1);
      setIsNegotiable(editingListing.isNegotiable ?? true);
      setPriceSlabs(editingListing.priceSlabs || []);
      setHarvestDate(editingListing.harvestDate || 'Harvested recently');
      setExpectedAvailabilityDate(editingListing.expectedAvailabilityDate || 'Ready for immediate dispatch');
      setProductGrade(editingListing.productGrade || 'Grade A (Premium)');
      setQualityDescription(editingListing.qualityDescription || '');
      setIsOrganic(!!editingListing.isOrganic);
      setOrganicCertBody(editingListing.organicCertificationBody || '');
      setPackagingInfo(editingListing.packagingInfo || '');
      setState(editingListing.state || 'Uttarakhand');
      setDistrict(editingListing.district || 'Dehradun');
      setCity(editingListing.city || activeCity || 'Dehradun');
      setVillage(editingListing.village || '');
      setPostalCode(editingListing.postalCode || '');
      setFarmLocation(editingListing.location || currentLocation || 'Farm Location');
      setPickupAvailable(editingListing.pickupAvailable ?? true);
      setFarmerDeliveryAvailable(editingListing.farmerDeliveryAvailable ?? true);
      const existingPhotos =
        editingListing.images && editingListing.images.length > 0
          ? editingListing.images
          : editingListing.image
          ? [editingListing.image]
          : [photoPresets[0].url];
      setUploadedPhotos(existingPhotos);
      setStep(1);
    } else {
      setName('');
      setCategory('Vegetables');
      setSubcategory('');
      setDescription('');
      setPrice('');
      setUnit('kg');
      setAvailableQuantity('');
      setMinOrderQuantity(1);
      setIsNegotiable(true);
      setPriceSlabs([]);
      setHarvestDate('Harvested today');
      setExpectedAvailabilityDate('Ready for immediate dispatch');
      setProductGrade('Grade A (Premium)');
      setQualityDescription('Farm fresh produce directly graded at harvest.');
      setIsOrganic(false);
      setOrganicCertBody('');
      setPackagingInfo('Standard crates/bags');
      setState((currentUser as any)?.state || 'Uttarakhand');
      setDistrict((currentUser as any)?.district || 'Dehradun');
      setCity((currentUser as any)?.city || activeCity || 'Dehradun');
      setVillage((currentUser as any)?.village || '');
      setPostalCode((currentUser as any)?.postal_code || '');
      setFarmLocation((currentUser as any)?.location || currentLocation || 'Local Farm');
      setPickupAvailable(true);
      setFarmerDeliveryAvailable(true);
      setUploadedPhotos([photoPresets[0].url]);
      setStep(1);
    }
  }, [isFastSellOpen, editingListing]);

  if (!isFastSellOpen) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const remainingSlots = 8 - uploadedPhotos.length;
      if (remainingSlots <= 0) {
        showToast('Maximum 8 photos allowed per listing.');
        return;
      }

      const files = Array.from(e.target.files).slice(0, remainingSlots);
      setIsCompressing(true);
      try {
        let origSum = 0;
        let compSum = 0;
        const compressedUrls = await Promise.all(
          files.map(async (f) => {
            try {
              const res = await compressImageFile(f, { lowBandwidthMode });
              origSum += res.originalSize;
              compSum += res.compressedSize;
              return res.dataUrl;
            } catch {
              return URL.createObjectURL(f);
            }
          })
        );
        const savingsPercent = origSum > 0 ? Math.round(((origSum - compSum) / origSum) * 100) : 0;
        setCompressionStats({
          originalTotal: origSum,
          compressedTotal: compSum,
          savingsPercent,
        });
        setUploadedPhotos((prev) => [...prev, ...compressedUrls].slice(0, 8));
        showToast(
          `⚡ Fast Compressed ${files.length} photo(s)! Saved ${savingsPercent}% data (${formatBytes(compSum)})`,
          'success'
        );
      } catch (err: any) {
        showToast('Failed to process photos', 'error');
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const movePhoto = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= uploadedPhotos.length) return;
    setUploadedPhotos((prev) => {
      const copy = [...prev];
      const item = copy.splice(fromIdx, 1)[0];
      copy.splice(toIdx, 0, item);
      return copy;
    });
  };

  const setAsCover = (index: number) => {
    if (index === 0) return;
    movePhoto(index, 0);
    showToast('Cover photo updated.');
  };

  const removePhoto = (index: number) => {
    if (uploadedPhotos.length <= 1) {
      showToast('At least one product photo is required.');
      return;
    }
    setUploadedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const addPriceSlab = () => {
    setPriceSlabs((prev) => [
      ...prev,
      { minQuantity: 100, pricePerUnit: typeof price === 'number' ? Math.max(1, price - 5) : 30 },
    ]);
  };

  const updatePriceSlab = (index: number, field: keyof PriceSlab, value: any) => {
    setPriceSlabs((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const removePriceSlab = (index: number) => {
    setPriceSlabs((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePresetSelect = (preset: typeof photoPresets[0]) => {
    setName(preset.name);
    setCategory(preset.cat as ProductCategory);
    setPrice(preset.price);
    setUnit(preset.unit);
    setUploadedPhotos([preset.url]);
    showToast(`Loaded details for ${preset.name}`);
  };

  const handlePublish = (status: 'active' | 'draft' = 'active') => {
    if (!name.trim()) {
      showToast('Please enter a product name');
      setStep(1);
      return;
    }
    if (!price || Number(price) <= 0) {
      showToast('Please enter a valid price');
      setStep(2);
      return;
    }
    if (!availableQuantity || Number(availableQuantity) <= 0) {
      showToast('Please enter available quantity');
      setStep(2);
      return;
    }

    const listingPayload = {
      ...(editingListing ? { editingId: editingListing.id } : {}),
      name: name.trim(),
      category,
      subcategory,
      description,
      price: Number(price),
      unit,
      availableQuantity: Number(availableQuantity),
      totalQuantity: Number(availableQuantity),
      minOrderQuantity: Number(minOrderQuantity) || 1,
      isNegotiable,
      productGrade,
      qualityDescription,
      isOrganic,
      organicCertificationBody: isOrganic ? organicCertBody : '',
      packagingInfo,
      harvestDate,
      freshnessTag: isOrganic ? 'Organic Harvest' : 'Farm Fresh',
      location: farmLocation,
      state,
      district,
      city,
      village,
      postalCode,
      pickupAvailable,
      farmerDeliveryAvailable,
      image: uploadedPhotos[0] || photoPresets[0].url,
      images: uploadedPhotos,
      priceSlabs: priceSlabs.filter((s) => s.minQuantity > 0 && s.pricePerUnit > 0),
      status,
    };

    publishListing(listingPayload);
    setIsFastSellOpen(false);
    setEditingListing(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-xl bg-white dark:bg-[#1B201D] rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[92vh] animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                {editingListing ? t('common.edit') : role === 'farmer' ? 'Kisan Mandi Ad (0% Commission)' : 'OLX Kisan Classifieds'}
              </span>
              <span className="text-xs text-zinc-400 font-semibold">
                Step {step} of 5
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-zinc-900 dark:text-white mt-1">
              {editingListing
                ? t('ads.edit_ad')
                : t('post_ad.title')}
            </h2>
          </div>
          <button
            onClick={() => {
              setIsFastSellOpen(false);
              setEditingListing(null);
            }}
            className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5">
          <div
            className="bg-emerald-600 h-1.5 transition-all duration-300 rounded-r-full"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>

        {/* Wizard Steps Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* STEP 1: Product Information & Multi-Images */}
          {step === 1 && (
            <div className="space-y-5 animate-fade-in">
              {/* 2G/3G Village Network Low-Bandwidth Mode Indicator */}
              <div className="p-3 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                    ⚡
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 truncate">
                        2G/3G Village Network Mode
                      </span>
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-600 text-white shrink-0">
                        Active
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400 block truncate">
                      {compressionStats
                        ? `Saved ${compressionStats.savingsPercent}% data (${formatBytes(compressionStats.originalTotal)} → ${formatBytes(compressionStats.compressedTotal)})`
                        : 'Phone camera photos auto-compressed down to ~90KB for 1-second upload'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLowBandwidthMode(!lowBandwidthMode)}
                  className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold border transition-colors shrink-0 cursor-pointer ${
                    lowBandwidthMode
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                  }`}
                  title="Toggle between Ultra-Fast village mode and Standard HD"
                >
                  {lowBandwidthMode ? '⚡ Fast (~90KB)' : '📸 HD (~200KB)'}
                </button>
              </div>

              {/* Photo Upload Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                      Product Photos ({uploadedPhotos.length}/8)
                    </label>
                    {isCompressing && (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Compressing...</span>
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-zinc-400">#1 is main cover</span>
                </div>

                <div className="grid grid-cols-4 gap-2.5">
                  {uploadedPhotos.map((photoUrl, idx) => (
                    <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-emerald-600/40 group shadow-xs">
                      <img src={photoUrl} alt="Upload" className="w-full h-full object-cover" />
                      
                      {/* Cover Badge */}
                      {idx === 0 ? (
                        <span className="absolute bottom-1 left-1 right-1 bg-emerald-700/90 text-white text-[9px] font-bold py-0.5 text-center rounded-md flex items-center justify-center gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />
                          <span>Cover</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setAsCover(idx)}
                          className="absolute bottom-1 left-1 right-1 bg-black/70 hover:bg-emerald-600 text-white text-[8px] font-bold py-0.5 text-center rounded-md transition opacity-0 group-hover:opacity-100"
                          title="Set as main cover"
                        >
                          Make Cover
                        </button>
                      )}

                      {/* Reorder & Delete Overlay */}
                      <div className="absolute top-1 inset-x-1 flex items-center justify-between">
                        <div className="flex items-center gap-0.5">
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => movePhoto(idx, idx - 1)}
                              className="p-1 bg-black/70 hover:bg-black text-white rounded-full transition opacity-0 group-hover:opacity-100"
                              title="Move left"
                            >
                              <ChevronLeft className="w-2.5 h-2.5" />
                            </button>
                          )}
                          {idx < uploadedPhotos.length - 1 && (
                            <button
                              type="button"
                              onClick={() => movePhoto(idx, idx + 1)}
                              className="p-1 bg-black/70 hover:bg-black text-white rounded-full transition opacity-0 group-hover:opacity-100"
                              title="Move right"
                            >
                              <ChevronRight className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => removePhoto(idx)}
                          className="p-1 bg-black/70 hover:bg-red-600 text-white rounded-full transition-colors opacity-90 group-hover:opacity-100"
                          title="Remove photo"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {uploadedPhotos.length < 8 && (
                    <>
                      {/* Add Gallery Photos */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-square rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 flex flex-col items-center justify-center gap-1 text-zinc-500 hover:text-emerald-600 transition-all cursor-pointer"
                        title="Upload from gallery"
                      >
                        <Upload className="w-5 h-5" />
                        <span className="text-[10px] font-bold">+ Gallery</span>
                      </button>

                      {/* Snap Produce with Phone Camera */}
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="aspect-square rounded-2xl border-2 border-dashed border-emerald-400 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 hover:border-emerald-600 flex flex-col items-center justify-center gap-1 text-emerald-700 dark:text-emerald-300 transition-all cursor-pointer"
                        title="Snap with phone camera"
                      >
                        <Camera className="w-5 h-5" />
                        <span className="text-[10px] font-bold">📷 Camera</span>
                      </button>
                    </>
                  )}
                </div>

                {/* Gallery File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                />

                {/* Camera Direct Input */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>

              {/* Quick Presets */}
              <div>
                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-2">
                  Or pick a popular crop template:
                </label>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {photoPresets.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handlePresetSelect(preset)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 border transition-all ${
                        name === preset.name
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-emerald-500'
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Product Name */}
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Product / Crop Title *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Desi Red Tomatoes (A Grade)"
                  className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-sm font-semibold text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-600"
                />
              </div>

              {/* Category & Subcategory */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ProductCategory)}
                    className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-sm font-semibold text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-600"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Variety / Subcategory
                  </label>
                  <input
                    type="text"
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    placeholder="e.g. Pahadi Local, Hybrid"
                    className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-sm font-semibold text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Product Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mention harvest method, freshness, flavor, or delivery notes..."
                  className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-600 resize-none"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Price, Quantity & Price Slabs */}
          {step === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Asking Price (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">₹</span>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="40"
                      className="w-full pl-8 pr-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-sm font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Unit of Measure *
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-sm font-semibold text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-600"
                  >
                    {allowedUnits.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Available Quantity *
                  </label>
                  <input
                    type="number"
                    value={availableQuantity}
                    onChange={(e) => setAvailableQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="100"
                    className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-sm font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Minimum Order Qty (MOQ)
                  </label>
                  <input
                    type="number"
                    value={minOrderQuantity}
                    onChange={(e) => setMinOrderQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="5"
                    className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-sm font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Price Negotiable Toggle */}
              <div className="flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80">
                <div>
                  <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                    Price Negotiable (मोल-भाव संभव)
                  </span>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Allows buyers to submit counter-offers directly through the app
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNegotiable(!isNegotiable)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    isNegotiable ? 'bg-emerald-600' : 'bg-zinc-300 dark:bg-zinc-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-xs ${
                      isNegotiable ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Bulk Quantity Slabs (Module 5) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                      Bulk Volume Pricing Slabs
                    </span>
                    <span className="text-[11px] text-zinc-500">Offer discounts for larger orders</span>
                  </div>
                  <button
                    type="button"
                    onClick={addPriceSlab}
                    className="px-2.5 py-1 text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 hover:bg-emerald-100 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Slab</span>
                  </button>
                </div>

                {priceSlabs.map((slab, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 text-xs">
                    <span className="text-zinc-500 font-bold shrink-0">{slab.minQuantity}+ {unit}:</span>
                    <div className="relative flex-1">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-xs">₹</span>
                      <input
                        type="number"
                        value={slab.pricePerUnit}
                        onChange={(e) => updatePriceSlab(idx, 'pricePerUnit', Number(e.target.value))}
                        className="w-full pl-6 pr-2 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-bold text-xs"
                      />
                    </div>
                    <span className="text-zinc-400">/{unit}</span>
                    <button
                      type="button"
                      onClick={() => removePriceSlab(idx)}
                      className="p-1 text-red-500 hover:text-red-700 rounded-md"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: Harvest, Grade & Quality */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Harvest Date / Freshness
                  </label>
                  <input
                    type="text"
                    value={harvestDate}
                    onChange={(e) => setHarvestDate(e.target.value)}
                    placeholder="e.g. Harvested today at dawn"
                    className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-sm font-semibold text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Quality Grade
                  </label>
                  <select
                    value={productGrade}
                    onChange={(e) => setProductGrade(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-sm font-semibold text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-600"
                  >
                    <option value="Grade A (Premium)">Grade A (Premium)</option>
                    <option value="Grade B (Standard)">Grade B (Standard)</option>
                    <option value="Export Grade">Export Grade</option>
                    <option value="Processing / Industrial">Processing / Industrial</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Quality & Sizing Description
                </label>
                <input
                  type="text"
                  value={qualityDescription}
                  onChange={(e) => setQualityDescription(e.target.value)}
                  placeholder="e.g. Uniform 50-60mm size, spotless, crisp texture"
                  className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-600"
                />
              </div>

              {/* Organic Certification Checkbox */}
              <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200/70 dark:border-emerald-800/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                      100% Organic Farming Certified
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isOrganic}
                    onChange={(e) => setIsOrganic(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                </div>
                {isOrganic && (
                  <input
                    type="text"
                    value={organicCertBody}
                    onChange={(e) => setOrganicCertBody(e.target.value)}
                    placeholder="Certifying Agency (e.g. NPOP / PGS-India)"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-emerald-300 dark:border-emerald-700 text-xs font-medium text-zinc-900 dark:text-white focus:outline-none"
                  />
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Packaging & Storage Condition
                </label>
                <input
                  type="text"
                  value={packagingInfo}
                  onChange={(e) => setPackagingInfo(e.target.value)}
                  placeholder="e.g. Packed in 20kg plastic crates, cool storage"
                  className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>
          )}

          {/* STEP 4: Location & Delivery Logistics */}
          {step === 4 && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    State *
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-sm font-semibold text-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    District *
                  </label>
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-sm font-semibold text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    City / Town *
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-sm font-semibold text-zinc-900 dark:text-white"
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Village / Area
                  </label>
                  <input
                    type="text"
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    className="w-full px-3 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-sm font-semibold text-zinc-900 dark:text-white"
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    PIN Code
                  </label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="w-full px-3 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-sm font-semibold text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Farm Location / Landmark
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
                  <input
                    type="text"
                    value={farmLocation}
                    onChange={(e) => setFarmLocation(e.target.value)}
                    placeholder="e.g. Near Doiwala Sugar Mill, Haridwar Bypass"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Delivery Arrangements */}
              <div className="pt-2 space-y-2.5">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
                  Fulfillment Arrangements (सुविधाएं)
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <label className="flex items-center gap-2.5 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pickupAvailable}
                      onChange={(e) => setPickupAvailable(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600"
                    />
                    <div>
                      <span className="text-xs font-bold text-zinc-900 dark:text-white block">Farm Pickup</span>
                      <span className="text-[10px] text-zinc-400">Buyer collects directly</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={farmerDeliveryAvailable}
                      onChange={(e) => setFarmerDeliveryAvailable(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600"
                    />
                    <div>
                      <span className="text-xs font-bold text-zinc-900 dark:text-white block">Farmer Delivery</span>
                      <span className="text-[10px] text-zinc-400">Direct delivery arranged</span>
                    </div>
                  </label>

                  {/* OLX Phone Privacy Toggle */}
                  <label className="flex items-center gap-2.5 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 cursor-pointer col-span-2">
                    <input
                      type="checkbox"
                      checked={showPhoneNumber}
                      onChange={(e) => setShowPhoneNumber(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600"
                    />
                    <div>
                      <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                        Show my phone number on this ad (विज्ञापन पर फोन नंबर दिखाएं)
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        If unchecked, buyers can only contact you via in-app Chat & Make an Offer to protect privacy
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Preview & Publishing */}
          {step === 5 && (
            <div className="space-y-5 animate-fade-in">
              <div className="bg-zinc-50 dark:bg-zinc-800/60 rounded-3xl border border-zinc-200 dark:border-zinc-700 overflow-hidden shadow-soft">
                {/* Image Cover */}
                <div className="relative aspect-video w-full bg-zinc-200 dark:bg-zinc-800">
                  <img
                    src={uploadedPhotos[0]}
                    alt={name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 flex gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-bold backdrop-blur-md">
                      {category}
                    </span>
                    {isOrganic && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center gap-1 shadow-xs">
                        <Sparkles className="w-3 h-3" />
                        Organic
                      </span>
                    )}
                  </div>
                  <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-bold">
                    {uploadedPhotos.length} Photos
                  </span>
                </div>

                {/* Details */}
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-base text-zinc-900 dark:text-white">
                        {name}
                      </h3>
                      <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        {village ? `${village}, ` : ''}{district || city}, {state}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-black text-emerald-700 dark:text-emerald-400 block">
                        {formatCurrency(Number(price) || 0)}/{unit}
                      </span>
                      {isNegotiable && (
                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-md inline-block">
                          Negotiable
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-zinc-600 dark:text-zinc-300 line-clamp-2">
                    {description}
                  </p>

                  <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-zinc-400 block">Available Stock:</span>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">{availableQuantity} {unit}</span>
                    </div>
                    <div>
                      <span className="text-zinc-400 block">Quality Grade:</span>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">{productGrade}</span>
                    </div>
                  </div>

                  {priceSlabs.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-800/40 text-[11px]">
                      <span className="font-bold text-emerald-900 dark:text-emerald-200 block mb-1">
                        Configured Bulk Slabs:
                      </span>
                      {priceSlabs.map((s, i) => (
                        <span key={i} className="inline-block mr-3 text-emerald-800 dark:text-emerald-300">
                          {s.minQuantity}+ {unit}: <b>₹{s.pricePerUnit}</b>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="px-4 py-2.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 transition flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t('common.back')}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setIsFastSellOpen(false);
                setEditingListing(null);
              }}
              className="px-4 py-2.5 text-xs font-bold text-zinc-500 hover:text-zinc-800 transition"
            >
              {t('common.cancel')}
            </button>
          )}

          <div className="flex items-center gap-2">
            {step === 5 && (
              <button
                type="button"
                onClick={() => handlePublish('draft')}
                className="px-4 py-2.5 rounded-2xl border border-zinc-300 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                Save Draft
              </button>
            )}

            {step < 5 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-soft transition flex items-center gap-1.5"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handlePublish('active')}
                className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-soft transition flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{editingListing ? t('post_ad.update_btn') : t('post_ad.publish_btn')}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
