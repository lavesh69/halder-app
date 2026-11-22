import React from 'react';
import { Product } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDistance } from '../../utils/formatters';
import { handleImageError, DEFAULT_PRODUCE_IMAGE } from '../../utils/imageFallback';
import {
  Heart,
  MapPin,
  Sparkles,
  ShoppingBag,
  Zap,
  ShieldCheck,
  Check,
  Camera,
  Phone,
  MessageCircle,
} from 'lucide-react';

interface ListingCardProps {
  product: Product;
  variant?: 'vertical-feed' | 'compact-grid' | 'horizontal';
}

export const ListingCard: React.FC<ListingCardProps> = ({
  product,
  variant = 'vertical-feed',
}) => {
  const {
    setSelectedProduct,
    setSelectedFarmer,
    farmers,
    toggleFavorite,
    isFavorite,
    addToCart,
    setBuyNowProduct,
    openFarmerChat,
    showToast,
    setIsSearchScreenOpen,
  } = useApp();

  const favorite = isFavorite(product.id);
  const farmer = farmers.find((f) => f.id === product.farmerId);

  const handleCardClick = () => {
    setIsSearchScreenOpen(false);
    setSelectedProduct(product);
  };

  const handleFarmerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (farmer) setSelectedFarmer(farmer);
  };

  const handleHeartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(product.id);
  };

  const handleQuickCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    const phone = product.farmerPhone || farmer?.phone || '+91 98450 12345';
    showToast(`Dialing ${product.farmerName} (${phone})`, 'info');
    window.location.href = `tel:${phone.replace(/\s+/g, '')}`;
  };

  const handleQuickChat = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (farmer) {
      openFarmerChat(farmer, `Namaste ${product.farmerName} ji! I saw your "${product.name}" on HALDER.`);
    } else {
      setSelectedProduct(product);
    }
  };

  // 1. Horizontal variant (Carousels & Horizontal lists)
  if (variant === 'horizontal') {
    return (
      <div
        onClick={handleCardClick}
        className="shrink-0 w-56 xs:w-64 sm:w-72 p-3 bg-white dark:bg-[#181F1A] rounded-2xl border border-[#E5EBE6] dark:border-[#29352D] shadow-soft hover:shadow-soft-md transition-all cursor-pointer group flex flex-col justify-between"
      >
        <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden mb-2.5 bg-[#F0F4F1] dark:bg-[#222B25]">
          <img
            src={product.image || DEFAULT_PRODUCE_IMAGE}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={handleImageError}
          />
          <button
            onClick={handleHeartClick}
            className="absolute top-2 right-2 min-h-[36px] min-w-[36px] p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs transition-colors flex items-center justify-center"
            aria-label="Save listing"
          >
            <Heart className={`w-4 h-4 ${favorite ? 'fill-[#D9534F] text-[#D9534F]' : 'text-white'}`} />
          </button>
          <div className="absolute bottom-2 left-2">
            <span className="text-[10px] font-bold text-white bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-full flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5 text-[#5FB383]" />
              {product.distanceKm} km
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-base font-black text-[#176B45] dark:text-[#5FB383]">
              {formatCurrency(product.price)}
              <span className="text-xs font-normal text-[#66736B] dark:text-[#A6B3AA]"> / {product.unit}</span>
            </span>
          </div>
          <h4 className="font-bold text-sm text-[#202923] dark:text-[#F2F5F3] truncate mt-0.5 group-hover:text-[#176B45] dark:group-hover:text-[#5FB383] transition-colors">
            {product.name}
          </h4>
          <button
            onClick={handleFarmerClick}
            className="text-[11px] text-[#66736B] dark:text-[#A6B3AA] hover:text-[#176B45] truncate block text-left mt-0.5 font-medium"
          >
            {product.farmerName} • {product.farmName}
          </button>
        </div>

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#E5EBE6] dark:border-[#29352D]">
          <span className="text-[11px] font-semibold text-[#176B45] dark:text-[#5FB383]">
            🟢 {product.availableQuantity} {product.unit} left
          </span>
          <button
            onClick={handleQuickChat}
            className="text-xs font-bold text-white bg-[#176B45] hover:bg-[#124C36] px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 active:scale-95 shadow-xs"
            title="Chat with farmer"
          >
            <MessageCircle className="w-3 h-3" />
            Chat
          </button>
        </div>
      </div>
    );
  }

  // 2. Compact Grid variant (Classifieds 2-column feed)
  if (variant === 'compact-grid') {
    return (
      <div
        onClick={handleCardClick}
        className="bg-white dark:bg-[#181F1A] rounded-2xl border border-[#E5EBE6] dark:border-[#29352D] shadow-soft hover:shadow-soft-md transition-all cursor-pointer group flex flex-col overflow-hidden relative"
      >
        <div className="relative w-full aspect-[4/3] bg-[#F0F4F1] dark:bg-[#222B25] overflow-hidden">
          <img
            src={product.image || DEFAULT_PRODUCE_IMAGE}
            alt={product.name}
            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${!product.isAvailable ? 'grayscale opacity-75' : ''}`}
            loading="lazy"
            onError={handleImageError}
          />

          {/* Sold Overlay */}
          {!product.isAvailable && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
              <span className="px-2.5 py-1 bg-[#D9534F] text-white font-black text-[10px] uppercase tracking-wider rounded-md shadow-md">
                SOLD / बिक चुका
              </span>
            </div>
          )}

          {/* Badges on image */}
          <div className="absolute top-1.5 left-1.5 flex flex-col gap-1 z-10">
            {product.isFeatured && (
              <span className="text-[9px] font-black text-amber-950 bg-amber-400 px-1.5 py-0.5 rounded-md shadow-xs uppercase tracking-wider">
                ⚡ FEATURED
              </span>
            )}
            {product.isUrgent && (
              <span className="text-[9px] font-black text-white bg-[#D9534F] px-1.5 py-0.5 rounded-md shadow-xs uppercase tracking-wider">
                🔥 URGENT
              </span>
            )}
            {product.isOrganic && !product.isFeatured && !product.isUrgent && (
              <span className="text-[9px] font-bold text-[#124C36] bg-white/95 backdrop-blur-xs px-1.5 py-0.5 rounded-md shadow-xs flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5 text-[#176B45]" />
                Organic
              </span>
            )}
          </div>

          <button
            onClick={handleHeartClick}
            className="absolute top-1.5 right-1.5 min-h-[36px] min-w-[36px] p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs transition-colors z-10 flex items-center justify-center"
            aria-label="Save listing"
          >
            <Heart className={`w-3.5 h-3.5 ${favorite ? 'fill-[#D9534F] text-[#D9534F]' : 'text-white'}`} />
          </button>

          {/* Distance Badge */}
          <div className="absolute bottom-1.5 left-1.5 z-10">
            <span className="text-[10px] font-bold text-white bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-full flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5 text-[#5FB383]" />
              {product.distanceKm} km
            </span>
          </div>

          {/* Multi-Photo Count Indicator */}
          {product.images && product.images.length > 1 && (
            <div className="absolute bottom-1.5 right-1.5 z-10">
              <span className="text-[9px] font-bold text-white bg-black/60 backdrop-blur-xs px-1.5 py-0.5 rounded-md flex items-center gap-1">
                📷 {product.images.length}
              </span>
            </div>
          )}
        </div>

        <div className="p-2.5 sm:p-3 flex flex-col justify-between flex-1">
          <div>
            <div className="flex items-baseline justify-between gap-1">
              <div className="flex items-baseline gap-1 min-w-0">
                <span className="text-sm sm:text-base font-black text-[#176B45] dark:text-[#5FB383] truncate">
                  {formatCurrency(product.price)}
                </span>
                <span className="text-[10px] sm:text-[11px] text-[#66736B] dark:text-[#A6B3AA] shrink-0">/ {product.unit}</span>
              </div>
              {product.isNegotiable && (
                <span className="text-[9px] font-bold text-[#D99A32] bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded shrink-0">
                  🤝 Neg
                </span>
              )}
            </div>

            <h4 className="font-bold text-xs text-[#202923] dark:text-[#F2F5F3] line-clamp-2 mt-1 group-hover:text-[#176B45] dark:group-hover:text-[#5FB383] transition-colors">
              {product.name}
            </h4>

            <div className="flex items-center justify-between mt-1 text-[10px] sm:text-[11px] text-[#66736B] dark:text-[#A6B3AA] gap-1">
              <span className="truncate flex-1 min-w-0 font-medium">{product.farmerName}</span>
              {product.isOrganic && (
                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1 py-0.2 rounded shrink-0">
                  🌿 Pure
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-1.5 mt-1.5 border-t border-[#E5EBE6] dark:border-[#29352D] text-[9px] uppercase tracking-wide text-[#89948C] font-semibold gap-1">
            <span className="truncate flex-1 min-w-0">{product.location ? product.location.split(',')[0] : 'LOCAL'}</span>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleQuickCall}
                className="min-w-[32px] min-h-[32px] sm:min-w-[34px] sm:min-h-[34px] flex items-center justify-center p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 active:scale-95 transition-all shadow-2xs"
                title="Call seller"
                aria-label="Call seller"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </button>
              <button
                onClick={handleQuickChat}
                className="min-w-[32px] min-h-[32px] sm:min-w-[34px] sm:min-h-[34px] flex items-center justify-center p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-95 transition-all shadow-2xs"
                title="Chat with seller"
                aria-label="Chat with seller"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. Vertical Feed Listing Card (Full Details & Quick Buy/Cart)
  return (
    <div
      onClick={handleCardClick}
      className="p-3.5 bg-white dark:bg-[#181F1A] rounded-2xl border border-[#E5EBE6] dark:border-[#29352D] shadow-soft hover:shadow-soft-md transition-all cursor-pointer group flex flex-col sm:flex-row gap-3.5 relative overflow-hidden"
    >
      {/* Listing Photo */}
      <div className="relative w-full sm:w-48 aspect-[4/3] sm:aspect-[4/3] rounded-xl overflow-hidden bg-[#F0F4F1] dark:bg-[#222B25] shrink-0">
        <img
          src={product.image || DEFAULT_PRODUCE_IMAGE}
          alt={product.name}
          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${!product.isAvailable ? 'grayscale opacity-75' : ''}`}
          loading="lazy"
          onError={handleImageError}
        />

        {/* Sold Overlay */}
        {!product.isAvailable && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
            <span className="px-3 py-1 bg-[#D9534F] text-white font-black text-xs uppercase tracking-wider rounded-lg shadow-md">
              SOLD / बिक चुका
            </span>
          </div>
        )}

        {/* Favorite Heart Button */}
        <button
          onClick={handleHeartClick}
          className="absolute top-2.5 right-2.5 min-h-[40px] min-w-[40px] p-2.5 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-colors z-10 flex items-center justify-center"
          aria-label="Save listing"
        >
          <Heart className={`w-4 h-4 ${favorite ? 'fill-[#D9534F] text-[#D9534F]' : 'text-white'}`} />
        </button>

        {/* Badges on Image */}
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1 z-10 max-w-[85%]">
          {product.isFeatured && (
            <span className="text-[10px] font-black text-amber-950 bg-amber-400 px-2 py-0.5 rounded-md shadow-xs uppercase tracking-wider">
              ⚡ FEATURED
            </span>
          )}
          {product.isUrgent && (
            <span className="text-[10px] font-black text-white bg-[#D9534F] px-2 py-0.5 rounded-md shadow-xs uppercase tracking-wider">
              🔥 URGENT
            </span>
          )}
          <span className="text-[10px] font-bold text-emerald-900 dark:text-emerald-200 bg-emerald-50/95 dark:bg-emerald-950/85 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-md shadow-xs flex items-center gap-0.5">
            <Check className="w-2.5 h-2.5 text-emerald-600" />
            {product.productGrade || product.product_grade || 'Grade A+'}
          </span>
          {product.isOrganic && (
            <span className="text-[10px] font-bold text-[#124C36] bg-white/95 backdrop-blur-md px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-[#176B45]" />
              Organic
            </span>
          )}
        </div>

        {/* Multi-photo indicator */}
        {product.images && product.images.length > 1 && (
          <div className="absolute bottom-2.5 right-2.5 z-10">
            <span className="text-[10px] font-bold text-white bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md flex items-center gap-1">
              📷 {product.images.length}
            </span>
          </div>
        )}

        {/* Distance Pill */}
        <div className="absolute bottom-2.5 left-2.5 z-10">
          <span className="text-[10px] font-bold text-white bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <MapPin className="w-3 h-3 text-[#5FB383]" />
            {formatDistance(product.distanceKm)}
          </span>
        </div>
      </div>

      {/* Listing Information */}
      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div>
          {/* Stitch Price Strip with Direct Mandi Rate */}
          <div className="bg-[#FAF9F6] dark:bg-[#151C17] p-2 sm:p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between mt-2">
            <div>
              <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase block">Offered Rate / भाव</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-heading font-black text-[#176B45] dark:text-[#5FB383]">
                  {formatCurrency(product.price)}
                </span>
                <span className="text-xs font-semibold text-zinc-500">/ {product.unit}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200/80 dark:border-emerald-800/60">
                Direct Mandi Rate
              </span>
              <span className="block text-[10px] text-zinc-400 mt-0.5">0% Middleman Cut</span>
            </div>
          </div>

          {/* Product Title */}
          <h3 className="font-bold text-base text-[#202923] dark:text-[#F2F5F3] mt-2 group-hover:text-[#176B45] dark:group-hover:text-[#5FB383] transition-colors truncate">
            {product.name}
          </h3>

          {/* Farmer & Location Info */}
          <div className="flex items-center justify-between mt-1 text-xs text-[#66736B] dark:text-[#A6B3AA]">
            <div className="flex items-center gap-1.5 truncate">
              <button
                onClick={handleFarmerClick}
                className="font-bold text-[#202923] dark:text-[#F2F5F3] hover:text-[#176B45] truncate flex items-center gap-1"
              >
                <span>{product.farmerName}</span>
                <ShieldCheck className="w-3.5 h-3.5 text-[#176B45] dark:text-[#5FB383] shrink-0" />
              </button>
              <span>•</span>
              <span className="truncate">{product.farmName}</span>
            </div>
            <span className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-0.5 shrink-0">
              <ShieldCheck className="w-3 h-3 text-amber-600" /> Halder Safe
            </span>
          </div>

          {/* Stock Availability Progress Bar */}
          <div className="space-y-1 mt-2">
            <div className="flex justify-between text-[11px] font-semibold">
              <span className="text-zinc-500">Available Stock</span>
              <span className="text-zinc-800 dark:text-zinc-200 font-bold">{product.availableQuantity} {product.unit} remaining</span>
            </div>
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-600 dark:bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(25, (product.availableQuantity / 120) * 100))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Bottom Fast Action Buttons: Boli, Call, Chat, Cart & Buy Now */}
        <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-[#E5EBE6] dark:border-[#29352D] flex-wrap">
          <span className="text-[10px] uppercase font-bold text-[#89948C] tracking-wide truncate max-w-[140px]">
            📍 {product.location ? product.location.split(',')[0] : 'LOCAL'} • {product.harvestDate ? (product.harvestDate.toLowerCase().includes('today') ? 'TODAY' : product.harvestDate.slice(0, 10).toUpperCase()) : 'TODAY'}
          </span>

          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            <button
              onClick={handleQuickCall}
              className="min-h-[40px] px-3.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-xl border border-emerald-200 dark:border-emerald-800/60 transition-colors flex items-center justify-center gap-1.5 active:scale-95"
              title="Call farmer directly"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span>Call</span>
            </button>

            <button
              onClick={handleQuickChat}
              className="min-h-[40px] px-3.5 py-1.5 bg-[#176B45] hover:bg-[#124C36] text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 active:scale-95 shadow-xs"
              title="Chat with farmer"
            >
              <MessageCircle className="w-3.5 h-3.5 text-white" />
              <span>Chat</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
