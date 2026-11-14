import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n';
import { formatCurrency, formatDistance } from '../../utils/formatters';
import { QuantitySelector } from '../common/QuantitySelector';
import {
  X,
  MapPin,
  Star,
  ShieldCheck,
  Calendar,
  Sparkles,
  ShoppingBag,
  Zap,
  MessageCircle,
  Heart,
  ChevronRight,
  Eye,
  Check,
  Trash2,
  Megaphone,
  HandCoins,
  Share2,
  Flag,
  ShieldAlert,
  Phone,
  Maximize2,
  ChevronLeft,
  Copy,
  Truck,
  Award,
  Boxes,
  FileCheck,
} from 'lucide-react';
import { MakeOfferModal } from './MakeOfferModal';

export const ListingDetailModal: React.FC = () => {
  const { t } = useTranslation();
  const {
    selectedProduct,
    setSelectedProduct,
    addToCart,
    setSelectedFarmer,
    farmers,
    toggleFavorite,
    isFavorite,
    openFarmerChat,
    setBuyNowProduct,
    setCustomerTab,
    currentUser,
    deleteProduct,
    products,
    showToast,
  } = useApp();

  const [quantity, setQuantity] = useState(1);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [customOffer, setCustomOffer] = useState<number | ''>('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('Fraud or scam');
  const [hasReported, setHasReported] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);

  const handleShare = () => {
    if (!selectedProduct) return;
    const shareText = `Check out "${selectedProduct.name}" (${formatCurrency(selectedProduct.price)}/${selectedProduct.unit}) in ${selectedProduct.location} on HALDER!`;
    if (navigator.share) {
      navigator.share({
        title: selectedProduct.name,
        text: shareText,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${shareText} ${window.location.href}`);
      showToast('Link copied to clipboard! Share on WhatsApp.');
    }
  };

  if (!selectedProduct) return null;

  const similarProducts = products
    .filter((p) => p.id !== selectedProduct.id && (p.category === selectedProduct.category || p.distanceKm <= 15))
    .slice(0, 5);

  const currentUserId = currentUser?.farmerProfileId || currentUser?.id || 'farmer-1';
  const isOwner = selectedProduct.farmerId === currentUserId || (currentUser?.name && selectedProduct.farmerName === currentUser.name);


  const farmer = (farmers.find((f) => f.id === selectedProduct.farmerId) || {
    id: selectedProduct.farmerId || 'farmer-1',
    name: selectedProduct.farmerName || 'Local Farmer',
    farmName: selectedProduct.farmName || 'Direct Farm Harvest',
    phone: selectedProduct.farmerPhone || '+91 98450 12345',
    avatar: selectedProduct.farmerAvatar || 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=200',
    rating: selectedProduct.rating || 4.8,
    reviewsCount: 34,
    location: selectedProduct.location || 'Local Mandi',
    distanceKm: selectedProduct.distanceKm || 3,
    crops: [selectedProduct.name],
    isVerified: true,
    verification_status: 'verified' as const,
    totalSales: 120,
    activeListingsCount: 4,
    responseRate: 98,
  }) as unknown as any;
  const favorite = isFavorite(selectedProduct.id);
  const photos = selectedProduct.images && selectedProduct.images.length > 0
    ? selectedProduct.images
    : [selectedProduct.image];

  const handleBuyNow = () => {
    setBuyNowProduct({ product: selectedProduct, quantity });
    setSelectedProduct(null);
    setCustomerTab('cart');
  };

  const handleAddToCart = () => {
    addToCart(selectedProduct, quantity);
  };

  const handleSendOffer = (priceOffer: number) => {
    if (!farmer) return;
    const msg = `🤝 OFFER: Hello ${farmer.name}, I would like to offer ₹${priceOffer}/${selectedProduct.unit} for "${selectedProduct.name}". Would you accept this price?`;
    setSelectedProduct(null);
    openFarmerChat(farmer, msg);
  };

  const handleOpenChat = () => {
    if (farmer) {
      setSelectedProduct(null);
      openFarmerChat(farmer, `Hi ${farmer.name}, is ${selectedProduct.name} available for delivery today?`);
    }
  };

  const handleOpenSeller = () => {
    if (farmer) {
      setSelectedProduct(null);
      setSelectedFarmer(farmer);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-fade-in">
      <div
        className="w-full max-w-lg bg-white dark:bg-[#1B201D] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 max-h-[92vh] flex flex-col overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Photo Gallery Carousel */}
        <div 
          onClick={() => setShowLightbox(true)}
          className="relative w-full h-72 bg-zinc-100 dark:bg-zinc-800 shrink-0 cursor-pointer group"
          title="Click to view full photo"
        >
          <img
            src={photos[activePhotoIdx] || "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400"}
            alt={selectedProduct.name}
            className="w-full h-full object-cover transition-all duration-300 group-hover:scale-102"
          />
          <div className="absolute top-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 z-10 pointer-events-none">
            <Maximize2 className="w-3 h-3" />
            <span>Tap to View Full Screen</span>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />

          {/* Top Actions: Share, Favorite & Close */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleShare();
              }}
              className="p-2.5 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-colors"
              title="Share advertisement"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(selectedProduct.id);
              }}
              className="p-2.5 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-colors"
              aria-label="Save listing"
            >
              <Heart className={`w-5 h-5 ${favorite ? 'fill-red-500 text-red-500' : 'text-white'}`} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedProduct(null);
              }}
              className="p-2.5 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Badges on Gallery */}
          <div className="absolute top-4 left-4 flex gap-1.5 z-10">
            <span className="text-xs font-bold text-white bg-emerald-600/90 backdrop-blur-md px-3 py-1 rounded-full shadow-xs">
              {selectedProduct.category}
            </span>
            {selectedProduct.isOrganic && (
              <span className="text-xs font-bold text-emerald-950 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full shadow-xs flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                100% Organic
              </span>
            )}
          </div>

          {/* Multi-Photo Thumbnail Dots */}
          {photos.length > 1 && (
            <div
              className="absolute bottom-4 right-4 flex gap-1.5 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              {photos.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePhotoIdx(idx);
                  }}
                  className={`h-2 rounded-full transition-all ${
                    idx === activePhotoIdx ? 'w-6 bg-white' : 'w-2 bg-white/50'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Distance and Views Counter */}
          <div className="absolute bottom-4 left-4 text-white z-10">
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                {selectedProduct.distanceKm} km from you
              </span>
              <span className="bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                {selectedProduct.viewsCount || 142} views
              </span>
            </div>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Owner Advertisement Management Banner */}
          {isOwner && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500 text-white rounded-xl shrink-0">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    Your Advertisement (आपका विज्ञापन)
                  </h4>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">
                    You posted this listing. You can preview or remove it anytime.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (window.confirm(`Are you sure you want to remove "${selectedProduct.name}" from the marketplace?`)) {
                    deleteProduct(selectedProduct.id);
                  }
                }}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-xs transition shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            </div>
          )}
          {/* Price & Stock Section */}
          <div className="flex items-start justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(selectedProduct.price)}
                </span>
                <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                  / {selectedProduct.unit}
                </span>
                {selectedProduct.isNegotiable !== false && (
                  <span className="ml-2 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                    🤝 Negotiable
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white mt-1">
                {selectedProduct.name}
              </h2>
              {/* OLX Location Breadcrumb Path */}
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                <span>📍 India</span>
                <span>›</span>
                <span>{selectedProduct.state || 'Uttarakhand'}</span>
                <span>›</span>
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">{selectedProduct.location || 'Dehradun'}</span>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {selectedProduct.availableQuantity} {selectedProduct.unit} available
              </span>
              <span className="text-[11px] text-zinc-400 block mt-1">
                {selectedProduct.harvestDate}
              </span>
            </div>
          </div>

          {/* Mandi vs Retail Price Transparency Callout */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 border border-emerald-200/70 dark:border-emerald-800/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                ₹
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 block">
                  Direct Mandi Rate (दैनिक मंडी भाव)
                </span>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                  Save ~25-30% vs Supermarkets • Zero middlemen markups • 100% to farmer
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-extrabold text-[10px] tracking-wide shrink-0">
              DIRECT KISAN
            </span>
          </div>

          {/* Volume Price Slabs (Module 5) */}
          {selectedProduct.price_slabs && selectedProduct.price_slabs.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-200">
                <Boxes className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Bulk Volume Pricing (थोक मूल्य छूट)</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {selectedProduct.price_slabs.map((slab, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-white dark:bg-zinc-800 rounded-xl border border-amber-200/60 dark:border-amber-800/40 text-center"
                  >
                    <span className="text-[10px] text-zinc-500 block">
                      {slab.minQuantity}{slab.maxQuantity ? ` - ${slab.maxQuantity}` : '+'} {selectedProduct.unit}
                    </span>
                    <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                      ₹{slab.pricePerUnit}/{selectedProduct.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quality & Farm Provenance Specs */}
          {(selectedProduct.product_grade || selectedProduct.organic_certification_body || selectedProduct.storage_info || selectedProduct.packaging_info || selectedProduct.village || selectedProduct.district) && (
            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/80 space-y-2 text-xs">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">
                Quality & Farm Specifications
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {selectedProduct.product_grade && (
                  <div>
                    <span className="text-zinc-400 block">Grade:</span>
                    <strong className="text-zinc-800 dark:text-zinc-200">{selectedProduct.product_grade}</strong>
                  </div>
                )}
                {selectedProduct.organic_certification_body && (
                  <div>
                    <span className="text-zinc-400 block">Organic Body:</span>
                    <strong className="text-emerald-600">{selectedProduct.organic_certification_body}</strong>
                  </div>
                )}
                {(selectedProduct.village || selectedProduct.district) && (
                  <div>
                    <span className="text-zinc-400 block">Farm Village / Mandi:</span>
                    <strong className="text-zinc-800 dark:text-zinc-200">
                      {[selectedProduct.village, selectedProduct.district, selectedProduct.state].filter(Boolean).join(', ')}
                    </strong>
                  </div>
                )}
                {selectedProduct.min_order_quantity && (
                  <div>
                    <span className="text-zinc-400 block">Min Order (MOQ):</span>
                    <strong className="text-zinc-800 dark:text-zinc-200">{selectedProduct.min_order_quantity} {selectedProduct.unit}</strong>
                  </div>
                )}
                {selectedProduct.packaging_info && (
                  <div>
                    <span className="text-zinc-400 block">Packaging:</span>
                    <span className="text-zinc-700 dark:text-zinc-300">{selectedProduct.packaging_info}</span>
                  </div>
                )}
                {selectedProduct.storage_info && (
                  <div>
                    <span className="text-zinc-400 block">Storage:</span>
                    <span className="text-zinc-700 dark:text-zinc-300">{selectedProduct.storage_info}</span>
                  </div>
                )}
              </div>

              {/* Delivery / Pickup Availability */}
              <div className="flex items-center gap-2 pt-1 border-t border-zinc-200/50 dark:border-zinc-700/50">
                {selectedProduct.pickup_available !== false && (
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Farm Gate Pickup
                  </span>
                )}
                {selectedProduct.farmer_delivery_available && (
                  <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100/70 dark:bg-blue-950/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Truck className="w-3 h-3" /> Farmer Delivery Available
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Seller / Farmer Profile Card (Marketplace Style) */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Seller Information
            </span>

            <div
              onClick={handleOpenSeller}
              className="p-4 rounded-3xl bg-zinc-50 dark:bg-[#242A26] border border-zinc-200/80 dark:border-zinc-700/80 hover:border-emerald-500 transition-all cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <img
                  src={selectedProduct.farmerAvatar || "https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=200"}
                  alt={selectedProduct.farmerName}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-600/30"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-sm text-zinc-900 dark:text-white">
                      {selectedProduct.farmerName}
                    </h4>
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                    {selectedProduct.farmName}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-zinc-600 dark:text-zinc-300 font-medium">
                    <span className="text-amber-600 dark:text-amber-400 font-bold">
                      ⭐ {selectedProduct.rating}
                    </span>
                    <span>📍 {selectedProduct.location}</span>
                    <span className="text-emerald-600 font-bold">98% Response</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <span>View Farmer</span>
                <ChevronRight className="w-4 h-4 ml-0.5" />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Harvest & Crop Description
            </span>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
              {selectedProduct.description}
            </p>
          </div>

          {/* OLX-Style Buyer Safety Tips (सुरक्षा सुझाव) */}
          <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 space-y-2">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-xs">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Safety Tips for Buyers (सुरक्षा सुझाव)</span>
            </div>
            <ul className="text-[11px] text-amber-800/90 dark:text-amber-300/80 space-y-1 list-disc list-inside font-medium">
              <li>Meet seller in person in daylight or at local mandi.</li>
              <li>Inspect produce or equipment thoroughly before payment.</li>
              <li>Never scan unknown QR codes that claim to credit money to you.</li>
            </ul>
          </div>

          {/* Quantity Stepper & Price Calculation */}
          <div className="bg-zinc-50 dark:bg-zinc-800/40 p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 block">
                Select Quantity
              </span>
              <span className="text-sm font-bold text-zinc-900 dark:text-white">
                Total: {formatCurrency(selectedProduct.price * quantity)}
              </span>
            </div>
            <QuantitySelector
              quantity={quantity}
              unit={selectedProduct.unit}
              min={1}
              max={selectedProduct.availableQuantity}
              onIncrease={() => setQuantity((q) => q + 1)}
              onDecrease={() => setQuantity((q) => Math.max(1, q - 1))}
              size="md"
            />
          </div>

          {/* OLX-Style Contact & Make an Offer Bar (4-Column) */}
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => {
                setCustomOffer(Math.round(selectedProduct.price * 0.9));
                setShowOfferModal(true);
              }}
              className="py-2.5 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-900 dark:text-amber-200 font-bold text-[11px] rounded-2xl border border-amber-200 dark:border-amber-800/60 transition-colors flex flex-col items-center justify-center gap-1 shadow-2xs"
            >
              <HandCoins className="w-4 h-4 text-amber-600" />
              <span>{t('ads.make_offer')}</span>
            </button>

            <button
              onClick={handleOpenChat}
              className="py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-zinc-800 dark:text-zinc-200 hover:text-emerald-700 dark:hover:text-emerald-300 font-bold text-[11px] rounded-2xl border border-zinc-200 dark:border-zinc-700 transition-colors flex flex-col items-center justify-center gap-1 shadow-2xs"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>{t('ads.chat')}</span>
            </button>

            <button
              onClick={() => setShowPhoneModal(true)}
              className="py-2.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-900 dark:text-blue-200 font-bold text-[11px] rounded-2xl border border-blue-200 dark:border-blue-800/60 transition-colors flex flex-col items-center justify-center gap-1 shadow-2xs"
            >
              <Phone className="w-4 h-4 text-blue-600" />
              <span>{t('ads.call_farmer')}</span>
            </button>

            <button
              onClick={() => {
                const rawPhone = selectedProduct.farmerPhone || farmer?.phone || '';
                const phoneDigits = rawPhone.replace(/[^0-9]/g, '');
                if (!phoneDigits) {
                  showToast('Phone number not shared — please use Direct Chat to message this farmer.', 'info');
                  return;
                }
                const text = encodeURIComponent(`Hello ${selectedProduct.farmerName}, I saw your ad for "${selectedProduct.name}" (${formatCurrency(selectedProduct.price)}/${selectedProduct.unit}) on HALDER.`);
                window.open(`https://wa.me/${phoneDigits}?text=${text}`, '_blank');
              }}
              className="py-2.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 font-bold text-[11px] rounded-2xl border border-emerald-200 dark:border-emerald-800/50 transition-colors flex flex-col items-center justify-center gap-1 shadow-2xs"
            >
              <span className="text-sm">💬</span>
              <span>{t('ads.whatsapp')}</span>
            </button>
          </div>

          {/* OLX Ad Metadata & Report Button */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[11px]">
            <span className="text-zinc-400 font-mono">
              AD ID: HAL-{selectedProduct.id.slice(-6).toUpperCase()}
            </span>
            <button
              onClick={() => setShowReportModal(true)}
              className="text-zinc-400 hover:text-red-500 font-medium flex items-center gap-1 transition"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Report this Ad</span>
            </button>
          </div>

          {/* OLX-Style Similar Advertisements Carousel */}
          {similarProducts.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Similar Advertisements (संबंधित विज्ञापन)
                </span>
                <span className="text-[11px] text-emerald-600 font-semibold">{similarProducts.length} more</span>
              </div>
              <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-1">
                {similarProducts.map((simProd) => (
                  <div
                    key={simProd.id}
                    onClick={() => {
                      setSelectedProduct(simProd);
                    }}
                    className="shrink-0 w-36 bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/60 cursor-pointer hover:border-emerald-500 transition-all flex flex-col justify-between"
                  >
                    <img
                      src={simProd.image || "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=200"}
                      alt={simProd.name}
                      className="w-full h-20 rounded-xl object-cover"
                    />
                    <div className="mt-1.5">
                      <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 block">
                        {formatCurrency(simProd.price)}
                      </span>
                      <h5 className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 truncate mt-0.5">
                        {simProd.name}
                      </h5>
                      <span className="text-[10px] text-zinc-400 block mt-0.5">
                        📍 {simProd.distanceKm} km
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sticky Fast Dual Action Buttons (Buy Now & Add to Cart or Owner Delete) */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-[#1B201D]">
          {isOwner ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (window.confirm(`Are you sure you want to remove "${selectedProduct.name}" from the marketplace?`)) {
                    deleteProduct(selectedProduct.id);
                  }
                }}
                className="flex-1 py-3.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-2xl font-bold text-xs shadow-soft transition-all flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Remove / Delete This Advertisement</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleAddToCart}
                className="py-3.5 rounded-2xl font-bold text-xs border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1.5"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Add to Cart</span>
              </button>

              <button
                onClick={handleBuyNow}
                className="py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-2xl font-bold text-xs shadow-soft transition-all flex items-center justify-center gap-1.5"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>Buy Now • {formatCurrency(selectedProduct.price * quantity)}</span>
              </button>
            </div>
          )}
        </div>

        {/* OLX-Style Report Advertisement Modal */}
        {showReportModal && (
          <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowReportModal(false)}>
            <div className="w-full max-w-sm bg-white dark:bg-[#1E2420] rounded-3xl p-5 border border-zinc-200 dark:border-zinc-700 shadow-2xl space-y-4 animate-scale-up" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-red-100 dark:bg-red-950 text-red-600 rounded-xl">
                    <Flag className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Report Advertisement</h3>
                    <p className="text-[11px] text-zinc-500">Help keep the marketplace clean and safe</p>
                  </div>
                </div>
                <button onClick={() => setShowReportModal(false)} className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {hasReported ? (
                <div className="py-6 text-center space-y-2">
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-xl">
                    ✓
                  </div>
                  <h4 className="font-bold text-sm text-zinc-900 dark:text-white">Thank you for reporting!</h4>
                  <p className="text-xs text-zinc-500">Our safety and moderation team will review this listing within 2 hours.</p>
                  <button onClick={() => { setShowReportModal(false); setHasReported(false); }} className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold">
                    Done
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <span className="text-xs font-semibold text-zinc-500 block">Select Reason:</span>
                  <div className="space-y-2">
                    {[
                      'Fraud or advance payment scam',
                      'Incorrect price or misleading photos',
                      'Produce/item is already sold or unavailable',
                      'Inappropriate, offensive, or spam content',
                    ].map((reason) => (
                      <label key={reason} className="flex items-center gap-2 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium">
                        <input
                          type="radio"
                          name="report"
                          checked={reportReason === reason}
                          onChange={() => setReportReason(reason)}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-zinc-800 dark:text-zinc-200">{reason}</span>
                      </label>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button onClick={() => setShowReportModal(false)} className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 font-bold text-xs text-zinc-600 dark:text-zinc-300">
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        setHasReported(true);
                        showToast('Report submitted for review', 'info');
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-soft transition"
                    >
                      Submit Report
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Negotiation Engine: Make an Offer Modal */}
        {showOfferModal && (
          <MakeOfferModal
            product={selectedProduct}
            isOpen={showOfferModal}
            onClose={() => setShowOfferModal(false)}
          />
        )}
        {/* OLX Phone Call / Reveal Number Modal */}
        {showPhoneModal && (
          <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowPhoneModal(false)}>
            <div className="w-full max-w-sm bg-white dark:bg-[#1E2420] rounded-3xl p-5 border border-zinc-200 dark:border-zinc-700 shadow-2xl space-y-4 animate-scale-up" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 rounded-xl">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Seller Contact Number</h3>
                    <p className="text-[11px] text-zinc-500">Verified Seller on HALDER</p>
                  </div>
                </div>
                <button onClick={() => setShowPhoneModal(false)} className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80 text-center space-y-1">
                <span className="text-xs text-zinc-500 block">{selectedProduct.farmerName}</span>
                {selectedProduct.showPhoneNumber !== false && (selectedProduct.farmerPhone || farmer?.phone) ? (
                  <>
                    <span className="text-xl font-black text-zinc-900 dark:text-white tracking-wider block font-mono">
                      {selectedProduct.farmerPhone || farmer?.phone}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold">✓ Phone Verified by HALDER</span>
                  </>
                ) : (
                  <div className="py-1 space-y-1">
                    <span className="text-xs font-bold text-amber-600 block">
                      🔒 Farmer chose to hide phone number on this ad
                    </span>
                    <span className="text-[11px] text-zinc-500 block">
                      Contact via Direct Chat or Make an Offer to protect seller privacy.
                    </span>
                  </div>
                )}
              </div>

              {/* Safety notice */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800/50 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>Never pay token money or courier charges in advance over phone. Inspect the item in person first.</span>
              </div>

              {/* Action buttons */}
              {selectedProduct.showPhoneNumber !== false && (selectedProduct.farmerPhone || farmer?.phone) ? (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => {
                      const num = selectedProduct.farmerPhone || farmer?.phone || '';
                      navigator.clipboard.writeText(num);
                      showToast('Phone number copied to clipboard!');
                    }}
                    className="py-2.5 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 font-bold text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 flex items-center justify-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </button>

                  <a
                    href={`tel:${(selectedProduct.farmerPhone || farmer?.phone || '').replace(/\s+/g, '')}`}
                    className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-soft transition"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Directly</span>
                  </a>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setShowPhoneModal(false);
                    handleOpenChat();
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-soft transition"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Open Direct Chat Instead</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* OLX Full-Screen Photo Lightbox */}
        {showLightbox && (
          <div className="fixed inset-0 z-70 bg-black/95 flex flex-col items-center justify-between p-4 animate-fade-in" onClick={() => setShowLightbox(false)}>
            {/* Top Bar */}
            <div className="w-full max-w-lg flex items-center justify-between text-white py-2 z-10" onClick={(e) => e.stopPropagation()}>
              <span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full backdrop-blur-md">
                Photo {activePhotoIdx + 1} of {photos.length}
              </span>
              <button onClick={() => setShowLightbox(false)} className="p-2 rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur-md">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Center Image with navigation */}
            <div className="relative flex-1 w-full max-w-lg flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <img
                src={photos[activePhotoIdx] || "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800"}
                alt={selectedProduct.name}
                className="max-h-[70vh] max-w-full object-contain rounded-2xl shadow-2xl"
              />

              {photos.length > 1 && (
                <>
                  <button
                    onClick={() => setActivePhotoIdx((idx) => (idx > 0 ? idx - 1 : photos.length - 1))}
                    className="absolute left-2 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md transition"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setActivePhotoIdx((idx) => (idx < photos.length - 1 ? idx + 1 : 0))}
                    className="absolute right-2 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md transition"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* Bottom thumbnail strip */}
            <div className="w-full max-w-lg py-2 flex items-center justify-center gap-2 overflow-x-auto" onClick={(e) => e.stopPropagation()}>
              {photos.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => setActivePhotoIdx(idx)}
                  className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition ${idx === activePhotoIdx ? 'border-emerald-500 scale-105' : 'border-transparent opacity-60'}`}
                >
                  <img src={p} alt="thumb" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
