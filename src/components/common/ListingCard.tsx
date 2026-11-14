import React from 'react';
import { Product } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDistance } from '../../utils/formatters';
import {
  Heart,
  MapPin,
  Sparkles,
  ShoppingBag,
  Zap,
  ShieldCheck,
  Check,
  Camera,
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
  } = useApp();

  const favorite = isFavorite(product.id);
  const farmer = farmers.find((f) => f.id === product.farmerId);

  const handleCardClick = () => {
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

  const handleBuyNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    setBuyNowProduct({ product, quantity: 1 });
    setSelectedProduct(product);
  };

  // 1. Horizontal variant (Carousels & Horizontal lists)
  if (variant === 'horizontal') {
    return (
      <div
        onClick={handleCardClick}
        className="shrink-0 w-64 p-3 bg-white dark:bg-[#181F1A] rounded-2xl border border-[#E5EBE6] dark:border-[#29352D] shadow-soft hover:shadow-soft-md transition-all cursor-pointer group flex flex-col justify-between"
      >
        <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden mb-2.5 bg-[#F0F4F1] dark:bg-[#222B25]">
          <img
            src={product.image || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400'}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
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
            onClick={(e) => {
              e.stopPropagation();
              addToCart(product, 1);
            }}
            className="text-xs font-bold text-[#176B45] dark:text-[#5FB383] bg-[#EAF5EE] dark:bg-[#182A20] px-3 py-1.5 rounded-lg hover:bg-[#176B45] hover:text-white transition-colors flex items-center gap-1 active:scale-95"
          >
            <ShoppingBag className="w-3 h-3" />
            + Add
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
            src={product.image || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400'}
            alt={product.name}
            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${!product.isAvailable ? 'grayscale opacity-75' : ''}`}
            loading="lazy"
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

        <div className="p-3 flex flex-col justify-between flex-1">
          <div>
            <div className="flex items-baseline justify-between gap-1">
              <div className="flex items-baseline gap-1">
                <span className="text-base font-black text-[#176B45] dark:text-[#5FB383]">
                  {formatCurrency(product.price)}
                </span>
                <span className="text-[11px] text-[#66736B] dark:text-[#A6B3AA]">/ {product.unit}</span>
              </div>
              {product.isNegotiable && (
                <span className="text-[9px] font-bold text-[#D99A32] bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded">
                  🤝 Neg
                </span>
              )}
            </div>

            <h4 className="font-bold text-xs text-[#202923] dark:text-[#F2F5F3] line-clamp-2 mt-1 group-hover:text-[#176B45] dark:group-hover:text-[#5FB383] transition-colors">
              {product.name}
            </h4>

            <div className="flex items-center justify-between mt-1 text-[11px] text-[#66736B] dark:text-[#A6B3AA]">
              <span className="truncate max-w-[120px] font-medium">{product.farmerName}</span>
              {product.isOrganic && (
                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1 py-0.2 rounded">
                  🌿 Pure
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-1.5 mt-1.5 border-t border-[#E5EBE6] dark:border-[#29352D] text-[9px] uppercase tracking-wide text-[#89948C] font-semibold">
            <span className="truncate max-w-[90px]">{product.location ? product.location.split(',')[0] : 'LOCAL'}</span>
            <span>{product.harvestDate ? (product.harvestDate.toLowerCase().includes('today') ? 'TODAY' : product.harvestDate.slice(0, 8)) : 'TODAY'}</span>
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
          src={product.image || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400'}
          alt={product.name}
          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${!product.isAvailable ? 'grayscale opacity-75' : ''}`}
          loading="lazy"
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
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
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
          {product.isOrganic && !product.isFeatured && !product.isUrgent && (
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
          {/* Top Row: Price & Freshness Tag */}
          <div className="flex items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-[#176B45] dark:text-[#5FB383]">
                {formatCurrency(product.price)}
              </span>
              <span className="text-xs font-semibold text-[#66736B] dark:text-[#A6B3AA]">
                / {product.unit}
              </span>
            </div>

            <span className="text-[10px] font-bold text-[#176B45] dark:text-[#5FB383] bg-[#EAF5EE] dark:bg-[#182A20] border border-[#176B45]/20 dark:border-[#2E8B57]/30 px-2 py-0.5 rounded-md">
              {product.freshnessTag}
            </span>
          </div>

          {/* Product Title */}
          <h3 className="font-bold text-base text-[#202923] dark:text-[#F2F5F3] mt-1 group-hover:text-[#176B45] dark:group-hover:text-[#5FB383] transition-colors truncate">
            {product.name}
          </h3>

          {/* Farmer & Location Info */}
          <div className="flex items-center gap-1.5 text-xs text-[#66736B] dark:text-[#A6B3AA] mt-1">
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

          {/* Available Quantity */}
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#176B45] dark:text-[#5FB383] bg-[#EAF5EE] dark:bg-[#182A20] px-2.5 py-1 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2E8B57]" />
              Available: {product.availableQuantity} {product.unit}
            </span>
          </div>
        </div>

        {/* Bottom Fast Action Buttons */}
        <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-[#E5EBE6] dark:border-[#29352D]">
          <span className="text-[11px] text-[#89948C] truncate">
            📍 {product.location}
          </span>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                addToCart(product, 1);
              }}
              className="min-h-[44px] px-3.5 py-2 bg-[#F0F4F1] dark:bg-[#222B25] hover:bg-[#E5EBE6] dark:hover:bg-[#29352D] text-[#202923] dark:text-[#F2F5F3] text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 active:scale-95"
            >
              <ShoppingBag className="w-4 h-4 text-[#176B45] dark:text-[#5FB383]" />
              <span>Cart</span>
            </button>

            <button
              onClick={handleBuyNow}
              className="min-h-[44px] px-4 py-2 bg-[#176B45] hover:bg-[#124C36] active:scale-95 text-white text-xs font-bold rounded-xl shadow-soft transition-all flex items-center gap-1.5"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>Buy Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
