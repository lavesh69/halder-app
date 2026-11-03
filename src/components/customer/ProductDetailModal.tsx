import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
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
  Check,
  ChevronRight,
  ChevronLeft,
  Heart,
  Share2,
  Phone,
  MessageCircle,
  Tag,
  Zap,
} from 'lucide-react';

export const ProductDetailModal: React.FC = () => {
  const {
    selectedProduct,
    setSelectedProduct,
    addToCart,
    setSelectedFarmer,
    farmers,
    openFarmerChat,
    toggleFavorite,
    isFavorite,
    showToast,
  } = useApp();

  const [quantity, setQuantity] = useState(1);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  if (!selectedProduct) return null;

  const farmer = farmers.find((f) => f.id === selectedProduct.farmerId) || {
    id: selectedProduct.farmerId,
    name: selectedProduct.farmerName || 'Local Farmer',
    farmName: selectedProduct.farmName || 'Direct Farm Harvest',
    phone: selectedProduct.farmerPhone || '+91 98765 43210',
    avatar: selectedProduct.farmerAvatar || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=200',
    rating: selectedProduct.rating || 4.8,
    reviewsCount: 34,
    location: selectedProduct.location || 'Local Mandi',
    distanceKm: selectedProduct.distanceKm || 3,
  };

  const favorite = isFavorite(selectedProduct.id);
  const allImages = selectedProduct.images && selectedProduct.images.length > 0
    ? selectedProduct.images
    : [selectedProduct.image];

  const currentDisplayImage = allImages[photoIndex] || selectedProduct.image;

  const handleAddToCart = () => {
    addToCart(selectedProduct, quantity);
    setAddedSuccess(true);
    setTimeout(() => {
      setAddedSuccess(false);
      setSelectedProduct(null);
    }, 600);
  };

  const handleOpenFarmer = () => {
    if (farmer) {
      setSelectedProduct(null);
      setSelectedFarmer(farmer as any);
    }
  };

  const handleStartChat = () => {
    openFarmerChat(
      farmer as any,
      `Namaste ${farmer.name}, I am looking at your listing "${selectedProduct.name}" (${formatCurrency(selectedProduct.price)}/${selectedProduct.unit}). Is this fresh stock currently available?`,
      selectedProduct.id
    );
    setSelectedProduct(null);
  };

  const handleShare = async () => {
    const shareText = `Check out fresh ${selectedProduct.name} at ${formatCurrency(selectedProduct.price)}/${selectedProduct.unit} directly from farmer ${farmer.name} on HALDER!`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: selectedProduct.name,
          text: shareText,
          url: window.location.href,
        });
      } catch {}
    } else {
      navigator.clipboard.writeText(`${shareText} - ${window.location.href}`);
      showToast('Product link copied to clipboard!', 'info');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-fade-in">
      <div
        className="w-full max-w-lg bg-white dark:bg-[#1B201D] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 max-h-[92vh] flex flex-col overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Image Hero with Multi-photo Navigation */}
        <div className="relative w-full h-64 sm:h-72 bg-zinc-900 shrink-0 overflow-hidden">
          <img
            src={currentDisplayImage}
            alt={selectedProduct.name}
            className="w-full h-full object-cover transition-opacity duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40 pointer-events-none" />

          {/* Top Floating Controls */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            {/* Share button */}
            <button
              onClick={handleShare}
              className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-colors"
              aria-label="Share listing"
              title="Share advertisement"
            >
              <Share2 className="w-4 h-4" />
            </button>

            {/* Favorite button */}
            <button
              onClick={() => toggleFavorite(selectedProduct.id)}
              className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-colors"
              aria-label="Save listing"
              title="Save to favorites"
            >
              <Heart className={`w-4 h-4 ${favorite ? 'fill-red-500 text-red-500' : 'text-white'}`} />
            </button>

            {/* Close button */}
            <button
              onClick={() => setSelectedProduct(null)}
              className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Badges on hero */}
          <div className="absolute top-4 left-4 flex flex-wrap gap-1.5 z-10">
            <span className="text-[11px] font-bold text-white bg-emerald-600/90 backdrop-blur-md px-2.5 py-1 rounded-full shadow-xs">
              {selectedProduct.category}
            </span>
            {selectedProduct.isFeatured && (
              <span className="text-[10px] font-black text-amber-950 bg-amber-400 backdrop-blur-md px-2.5 py-1 rounded-full shadow-xs flex items-center gap-0.5 uppercase tracking-wider">
                <Zap className="w-3 h-3 fill-amber-950" />
                Featured
              </span>
            )}
            {selectedProduct.isOrganic && (
              <span className="text-[10px] font-bold text-emerald-950 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                100% Organic
              </span>
            )}
          </div>

          {/* Carousel Arrows if multiple photos */}
          {allImages.length > 1 && (
            <>
              <button
                onClick={() => setPhotoIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1))}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md z-10 transition-colors"
                aria-label="Previous photo"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setPhotoIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0))}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md z-10 transition-colors"
                aria-label="Next photo"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Photo Indicator Dots */}
              <div className="absolute bottom-16 left-0 right-0 flex justify-center gap-1.5 z-10">
                {allImages.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setPhotoIndex(idx)}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === photoIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </>
          )}

          {/* Title and Freshness */}
          <div className="absolute bottom-4 left-4 right-4 text-white z-10">
            <span className="text-xs font-semibold text-emerald-300 flex items-center gap-1">
              <span>🌾 {selectedProduct.freshnessTag || 'Farm Fresh Harvest'}</span>
              {selectedProduct.isNegotiable && (
                <span className="text-[10px] bg-amber-400 text-amber-950 px-1.5 py-0.2 rounded font-bold">
                  Price Negotiable
                </span>
              )}
            </span>
            <h2 className="text-xl sm:text-2xl font-black mt-0.5 drop-shadow-md">{selectedProduct.name}</h2>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Price, Stock and Benchmark */}
          <div className="pb-4 border-b border-zinc-100 dark:border-zinc-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-emerald-700 dark:text-emerald-400">
                    {formatCurrency(selectedProduct.price)}
                  </span>
                  <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                    / {selectedProduct.unit}
                  </span>
                </div>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold mt-0.5">
                  Direct farm-gate payout • 0% Middleman cut
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                  Available: {selectedProduct.availableQuantity} {selectedProduct.unit}
                </span>
                <div className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400 justify-end mt-1">
                  <Calendar className="w-3 h-3" />
                  <span>Harvested: {selectedProduct.harvestDate || 'Today'}</span>
                </div>
              </div>
            </div>

            {/* OLX Value Highlight */}
            <div className="p-2.5 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-xl border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-between text-xs">
              <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                City Retail Mandi Rate: <del className="text-zinc-400">{formatCurrency(Math.round(selectedProduct.price * 1.35))}</del>
              </span>
              <span className="font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-md text-[11px]">
                Save 25% Today
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Harvest Details & Description
            </h3>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
              {selectedProduct.description || 'Freshly picked high-quality produce, carefully harvested and sorted directly from local farmlands.'}
            </p>
          </div>

          {/* Farmer Card */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Seller & Farm Profile
            </h3>
            <div
              onClick={handleOpenFarmer}
              className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 dark:bg-[#242A26] border border-zinc-200/80 dark:border-zinc-700/80 hover:border-emerald-500/50 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <img
                  src={farmer.avatar || selectedProduct.farmerAvatar}
                  alt={farmer.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-emerald-600/30"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-sm text-zinc-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                      {farmer.name}
                    </h4>
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {farmer.farmName || selectedProduct.farmName}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-zinc-600 dark:text-zinc-300">
                    <span className="flex items-center gap-0.5 font-bold text-amber-600 dark:text-amber-400">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {farmer.rating || selectedProduct.rating}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <MapPin className="w-3 h-3 text-emerald-600" />
                      {formatDistance(selectedProduct.distanceKm)} ({selectedProduct.location || 'Local Farm'})
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center text-xs font-bold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform">
                <span>View Farm</span>
                <ChevronRight className="w-4 h-4 ml-0.5" />
              </div>
            </div>
          </div>

          {/* Quantity Stepper & Calculation */}
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
        </div>

        {/* OLX Action Footer: Call, Chat & Buy Now */}
        <div className="p-3.5 sm:p-4 border-t border-zinc-100 dark:border-zinc-800/80 bg-white dark:bg-[#1B201D] space-y-2">
          {/* Direct Seller Contact Buttons */}
          <div className="flex items-center gap-2">
            {/* 1. Direct 1-tap Phone Call */}
            <a
              href={`tel:${farmer.phone || '+919876543210'}`}
              className="px-4 py-3 rounded-2xl font-bold text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition flex items-center justify-center gap-1.5 shrink-0 shadow-2xs"
              title="Call farmer directly"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span>Call Farmer</span>
            </a>

            {/* 2. Chat & Make Offer */}
            <button
              onClick={handleStartChat}
              className="flex-1 py-3 px-3 rounded-2xl font-bold text-xs bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Chat / Make Offer</span>
            </button>
          </div>

          {/* 3. Add to Cart / Buy Now */}
          <button
            onClick={handleAddToCart}
            disabled={addedSuccess}
            className={`w-full py-3.5 rounded-2xl font-bold text-sm shadow-soft flex items-center justify-center gap-2 transition-all active:scale-98 ${
              addedSuccess
                ? 'bg-emerald-700 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {addedSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Added to Cart!</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4" />
                <span>
                  Buy {quantity} {selectedProduct.unit} • {formatCurrency(selectedProduct.price * quantity)}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
