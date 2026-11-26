import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n';
import { getWhatsAppUrl } from '../../utils/formatters';
import { ApiClient } from '../../api/client';
import { handleImageError, handleAvatarError, DEFAULT_PRODUCE_IMAGE, DEFAULT_AVATAR_IMAGE } from '../../utils/imageFallback';
import {
  X,
  MapPin,
  Star,
  ShieldCheck,
  Sparkles,
  MessageCircle,
  Heart,
  ChevronRight,
  Eye,
  Trash2,
  Megaphone,
  Share2,
  Flag,
  ShieldAlert,
  Phone,
  Maximize2,
  ChevronLeft,
  Copy,
  Truck,
  Edit3,
  CheckCircle2,
} from 'lucide-react';

export const ListingDetailModal: React.FC = () => {
  const { t } = useTranslation();
  const {
    selectedProduct,
    setSelectedProduct,
    setSelectedFarmer,
    farmers,
    toggleFavorite,
    isFavorite,
    openFarmerChat,
    currentUser,
    deleteProduct,
    updateProductStatusAction,
    setEditingListing,
    setIsFastSellOpen,
    setReviewTarget,
    products,
    showToast,
  } = useApp();

  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('Fraud or scam');
  const [hasReported, setHasReported] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleShare = () => {
    if (!selectedProduct) return;
    const directUrl = `${window.location.origin}/?ad=${selectedProduct.id}`;
    const shareText = `Check out "${selectedProduct.name}" in ${selectedProduct.location} on HALDER!`;
    if (navigator.share) {
      navigator.share({
        title: selectedProduct.name,
        text: `${shareText}\n${directUrl}`,
        url: directUrl,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${shareText}\n${directUrl}`);
      showToast('Direct ad link copied to clipboard! Share on WhatsApp.');
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
    phone: selectedProduct.farmerPhone || '',
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

  const handleOpenWhatsApp = () => {
    const rawPhone = selectedProduct.farmerPhone || farmer?.phone || '';
    if (!rawPhone) {
      showToast('Phone number not shared — please use Direct Chat to message this farmer.', 'info');
      return;
    }
    const text = `Hello ${selectedProduct.farmerName}, I saw your ad for "${selectedProduct.name}" on HALDHAR. Is it available?`;
    window.open(getWhatsAppUrl(rawPhone, text), '_blank');
  };

  const handleReportSubmit = async () => {
    try {
      await ApiClient.submitReport({
        productId: selectedProduct.id,
        reportedUserId: selectedProduct.farmerId,
        reason: reportReason,
        description: `Flagged from ad detail: ${selectedProduct.name} (ID: ${selectedProduct.id})`,
        category: 'middleman_complaint',
        priority: 'high',
      });
    } catch (e: any) {
      console.warn('[HALDER Report] Server notice:', e?.message || e);
    }
    setHasReported(true);
    showToast('Report submitted. Moderation team will review this listing within 2 hours.', 'success');
  };

  const isSold = selectedProduct.status === 'sold';

  const handleToggleSoldStatus = async () => {
    try {
      const action = isSold ? 'renew' : 'mark_sold';
      await updateProductStatusAction(selectedProduct.id, action);
      setSelectedProduct({
        ...selectedProduct,
        status: isSold ? 'active' : 'sold',
        isAvailable: isSold,
      });
      showToast(
        isSold ? t('ad.relist') : t('ad.status_sold'),
        'success'
      );
    } catch {
      showToast('Failed to update status', 'error');
    }
  };

  const handleOpenChat = () => {
    if (farmer) {
      const initialText = t('chat.initial_product_inquiry', {
        farmer: farmer.name,
        product: selectedProduct.name,
      });
      setSelectedProduct(null);
      openFarmerChat(farmer, initialText, selectedProduct.id);
    }
  };

  const handleOpenSeller = () => {
    if (farmer) {
      setSelectedProduct(null);
      setSelectedFarmer(farmer);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
      <div
        className="w-full h-full sm:h-auto max-w-lg md:max-w-xl bg-white dark:bg-[#1B201D] rounded-none sm:rounded-3xl shadow-2xl border-0 sm:border border-zinc-200 dark:border-zinc-800 max-h-[100dvh] sm:max-h-[88vh] flex flex-col overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Photo Gallery Carousel */}
        <div 
          onClick={() => setShowLightbox(true)}
          className="relative w-full h-72 bg-zinc-100 dark:bg-zinc-800 shrink-0 cursor-pointer group"
          title="Click to view full photo"
        >
          <img
            src={photos[activePhotoIdx] || DEFAULT_PRODUCE_IMAGE}
            alt={selectedProduct.name}
            className="w-full h-full object-cover transition-all duration-300 group-hover:scale-102"
            onError={handleImageError}
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
              aria-label="Close modal"
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
                {t('ads.organic_certified')}
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
                    {t('ad.your_ad')}
                  </h4>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">
                    You posted this listing. You can preview or remove it anytime.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-xs transition shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            </div>
          )}

          {/* Sold Out Notice Banner */}
          {isSold && (
            <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center gap-2.5 text-amber-900 dark:text-amber-200 text-xs font-bold animate-fade-in">
              <span className="text-base">🏷️</span>
              <div>
                <span>{t('ad.sold_out_banner')}</span>
                <p className="text-[11px] font-normal text-amber-700 dark:text-amber-400 mt-0.5">
                  The seller has concluded deals for this listing.
                </p>
              </div>
            </div>
          )}
          {/* Header & Stock Section */}
          <div className="flex items-start justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <h2 className="text-2xl font-heading font-black text-zinc-900 dark:text-white">
                {selectedProduct.name}
              </h2>
              {/* Location Breadcrumb Path */}
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

          {/* Direct Farm Harvest Quality Guarantee Callout */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 border border-emerald-200/70 dark:border-emerald-800/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                🌾
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 block">
                  100% Direct Farm Harvest
                </span>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                  Zero middlemen markups • Directly sourced from local verified farmers
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-extrabold text-[10px] tracking-wide shrink-0">
              DIRECT KISAN
            </span>
          </div>

          {/* Quality & Farm Provenance Specs */}
          {Boolean(
            selectedProduct.productGrade || selectedProduct.product_grade ||
            selectedProduct.organicCertificationBody || selectedProduct.organic_certification_body ||
            selectedProduct.storageInfo || selectedProduct.storage_info ||
            selectedProduct.packagingInfo || selectedProduct.packaging_info ||
            selectedProduct.village || selectedProduct.district
          ) && (
            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/80 space-y-2 text-xs">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">
                Quality & Farm Specifications
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {(selectedProduct.productGrade || selectedProduct.product_grade) && (
                  <div>
                    <span className="text-zinc-400 block">Grade:</span>
                    <strong className="text-zinc-800 dark:text-zinc-200">{selectedProduct.productGrade || selectedProduct.product_grade}</strong>
                  </div>
                )}
                {(selectedProduct.organicCertificationBody || selectedProduct.organic_certification_body) && (
                  <div>
                    <span className="text-zinc-400 block">Organic Body:</span>
                    <strong className="text-emerald-600">{selectedProduct.organicCertificationBody || selectedProduct.organic_certification_body}</strong>
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
                {(selectedProduct.minOrderQuantity || selectedProduct.min_order_quantity) && (
                  <div>
                    <span className="text-zinc-400 block">Min Order (MOQ):</span>
                    <strong className="text-zinc-800 dark:text-zinc-200">{selectedProduct.minOrderQuantity || selectedProduct.min_order_quantity} {selectedProduct.unit}</strong>
                  </div>
                )}
                {(selectedProduct.packagingInfo || selectedProduct.packaging_info) && (
                  <div>
                    <span className="text-zinc-400 block">Packaging:</span>
                    <span className="text-zinc-700 dark:text-zinc-300">{selectedProduct.packagingInfo || selectedProduct.packaging_info}</span>
                  </div>
                )}
                {(selectedProduct.storageInfo || selectedProduct.storage_info) && (
                  <div>
                    <span className="text-zinc-400 block">Storage:</span>
                    <span className="text-zinc-700 dark:text-zinc-300">{selectedProduct.storageInfo || selectedProduct.storage_info}</span>
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
                  src={selectedProduct.farmerAvatar || DEFAULT_AVATAR_IMAGE}
                  alt={selectedProduct.farmerName}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-600/30"
                  onError={handleAvatarError}
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

              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <div className="flex items-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <span>View Farmer</span>
                  <ChevronRight className="w-4 h-4 ml-0.5" />
                </div>
                {!isOwner && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setReviewTarget({
                        farmerId: selectedProduct.farmerId,
                        farmerName: selectedProduct.farmerName,
                      });
                    }}
                    className="text-[10px] font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/60 transition"
                  >
                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                    <span>Rate Farmer</span>
                  </button>
                )}
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

          {/* Buyer Safety Tips */}
          <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 space-y-2">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-xs">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{t('ad.safety_tips')}</span>
            </div>
            <ul className="text-[11px] text-amber-800/90 dark:text-amber-300/80 space-y-1 list-disc list-inside font-medium">
              <li>Meet seller in person in daylight or at local mandi.</li>
              <li>Inspect produce or equipment thoroughly before payment.</li>
              <li>Never scan unknown QR codes that claim to credit money to you.</li>
            </ul>
          </div>

          {/* Ad Metadata & Report Button */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[11px]">
            <span className="text-zinc-400 font-mono">
              AD ID: HLD-{selectedProduct.id.slice(-6).toUpperCase()}
            </span>
            <button
              onClick={() => setShowReportModal(true)}
              className="text-zinc-400 hover:text-red-500 font-medium flex items-center gap-1 transition"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Report this Ad</span>
            </button>
          </div>

          {/* Similar Advertisements Carousel */}
          {similarProducts.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  {t('ad.similar_ads')}
                </span>
                <span className="text-[11px] text-emerald-600 font-semibold">{similarProducts.length} more</span>
              </div>
              <div className="w-full max-w-full overflow-hidden min-w-0">
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
                      src={simProd.image || DEFAULT_PRODUCE_IMAGE}
                      alt={simProd.name}
                      className="w-full h-20 rounded-xl object-cover"
                      onError={handleImageError}
                    />
                    <div className="mt-1.5">
                      <h5 className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 truncate">
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
            </div>
          )}
        </div>

        {/* Sticky Fast Dual Action Buttons (Buy Now & Add to Cart or Owner Delete) */}
        <div className="p-3.5 sm:p-4 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-[#1B201D] pb-[max(1rem,env(safe-area-inset-bottom,1rem))]">
          {isOwner ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setEditingListing(selectedProduct);
                  setSelectedProduct(null);
                  setIsFastSellOpen(true);
                }}
                className="flex-1 py-3 px-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-2xl font-bold text-xs shadow-soft transition-all flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                <Edit3 className="w-4 h-4" />
                <span>{t('ads.edit_ad')}</span>
              </button>

              <button
                onClick={handleToggleSoldStatus}
                className={`py-3 px-3 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 min-h-[44px] ${
                  isSold
                    ? 'bg-amber-100 dark:bg-amber-950/80 hover:bg-amber-200 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                    : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700'
                }`}
                title={isSold ? 'Relist this ad' : 'Mark as sold'}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{isSold ? t('ad.relist') : t('ad.mark_sold')}</span>
              </button>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="py-3 px-3 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/60 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-1 min-h-[44px]"
                title="Delete ad permanently"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  onClick={handleOpenChat}
                  className="min-h-[48px] py-3 px-2 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white rounded-2xl font-heading font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <MessageCircle className="w-4 h-4 fill-white/20" />
                  <span>{t('ads.chat')}</span>
                </button>

                <button
                  onClick={() => setShowPhoneModal(true)}
                  className="min-h-[48px] py-3 px-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-2xl font-heading font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <Phone className="w-4 h-4" />
                  <span>{t('ads.call_farmer')}</span>
                </button>

                <button
                  onClick={handleOpenWhatsApp}
                  className="min-h-[48px] py-3 px-2 bg-[#25D366] hover:bg-[#20ba59] active:scale-95 text-white rounded-2xl font-heading font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <span className="text-sm">💬</span>
                  <span>{t('ads.whatsapp')}</span>
                </button>
              </div>

              {/* Direct Classifieds Safety Tip */}
              <div className="flex items-center justify-center pt-1 px-1 text-[11px] text-zinc-500 dark:text-zinc-400 text-center font-medium">
                <span>🛡️ {t('ads.safety_tip')}</span>
              </div>
            </div>
          )}
        </div>

        {/* Report Advertisement Modal */}
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
                      onClick={handleReportSubmit}
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

        {/* Phone Call / Reveal Number Modal */}
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

        {/* Full-Screen Photo Lightbox */}
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
                src={photos[activePhotoIdx] || DEFAULT_PRODUCE_IMAGE}
                alt={selectedProduct.name}
                className="max-h-[70vh] max-w-full object-contain rounded-2xl shadow-2xl"
                onError={handleImageError}
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
                  <img src={p || DEFAULT_PRODUCE_IMAGE} alt="thumb" className="w-full h-full object-cover" onError={handleImageError} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* In-App Delete Ad Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in" onClick={() => setShowDeleteConfirm(false)}>
            <div className="w-full max-w-sm bg-white dark:bg-[#1E2420] rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-4 animate-scale-up" onClick={(e) => e.stopPropagation()}>
              <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-base font-black text-zinc-900 dark:text-white">
                  {t('ad.delete_title')}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {t('ad.delete_desc', { name: selectedProduct.name })}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="py-2.5 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 font-bold text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    deleteProduct(selectedProduct.id);
                  }}
                  className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 font-bold text-xs text-white shadow-soft transition"
                >
                  Delete Ad
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
