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

  // Horizontal variant (for carousels)
  if (variant === 'horizontal') {
    return (
      <div
        onClick={handleCardClick}
        className="shrink-0 w-64 p-3 bg-white dark:bg-[#1B201D] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-soft hover:shadow-soft-md transition-all cursor-pointer group flex flex-col justify-between"
      >
        <div className="relative w-full h-36 rounded-xl overflow-hidden mb-2 bg-zinc-100 dark:bg-zinc-800">
          <img
            src={product.image || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400'}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          <button
            onClick={handleHeartClick}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs transition-colors"
            aria-label="Save listing"
          >
            <Heart className={`w-3.5 h-3.5 ${favorite ? 'fill-red-500 text-red-500' : 'text-white'}`} />
          </button>
          <div className="absolute bottom-2 left-2">
            <span className="text-[10px] font-bold text-white bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-full flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5" />
              {product.distanceKm} km
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-base font-black text-emerald-700 dark:text-emerald-400">
              {formatCurrency(product.price)}
              <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400"> / {product.unit}</span>
            </span>
          </div>
          <h4 className="font-bold text-sm text-zinc-900 dark:text-white truncate mt-0.5">
            {product.name}
          </h4>
          <button
            onClick={handleFarmerClick}
            className="text-[11px] text-zinc-500 dark:text-zinc-400 hover:text-emerald-600 truncate block text-left mt-0.5"
          >
            {product.farmerName} • {product.farmName}
          </button>
        </div>

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
            🟢 {product.availableQuantity} {product.unit} left
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              addToCart(product, 1);
            }}
            className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg hover:bg-emerald-600 hover:text-white transition-colors"
          >
            + Add
          </button>
        </div>
      </div>
    );
  }

  // Compact Grid variant (Iconic OLX 2-column classifieds grid)
  if (variant === 'compact-grid') {
    return (
      <div
        onClick={handleCardClick}
        className="bg-white dark:bg-[#1B201D] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs hover:shadow-soft transition-all cursor-pointer group flex flex-col overflow-hidden relative"
      >
        <div className="relative w-full h-36 bg-zinc-100 dark:bg-zinc-800">
          <img
            src={product.image || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400'}
            alt={product.name}
            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${!product.isAvailable ? 'grayscale opacity-75' : ''}`}
            loading="lazy"
          />

          {/* Sold Overlay */}
          {!product.isAvailable && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
              <span className="px-2.5 py-1 bg-red-600 text-white font-black text-[10px] uppercase tracking-wider rounded-md shadow-md">
                SOLD / बिक चुका
              </span>
            </div>
          )}

          {/* OLX Featured / Urgent Banners */}
          <div className="absolute top-1.5 left-1.5 flex flex-col gap-1 z-10">
            {product.isFeatured && (
              <span className="text-[9px] font-black text-amber-950 bg-amber-400 px-1.5 py-0.5 rounded-md shadow-xs uppercase tracking-wider">
                ⚡ FEATURED
              </span>
            )}
            {product.isUrgent && (
              <span className="text-[9px] font-black text-white bg-red-600 px-1.5 py-0.5 rounded-md shadow-xs uppercase tracking-wider">
                🔥 URGENT
              </span>
            )}
            {product.isOrganic && !product.isFeatured && !product.isUrgent && (
              <span className="text-[9px] font-bold text-emerald-950 bg-white/95 px-1.5 py-0.5 rounded-md shadow-xs flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                Organic
              </span>
            )}
          </div>

          <button
            onClick={handleHeartClick}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs transition-colors z-10"
            aria-label="Save listing"
          >
            <Heart className={`w-3.5 h-3.5 ${favorite ? 'fill-red-500 text-red-500' : 'text-white'}`} />
          </button>

          {/* Distance Badge */}
          <div className="absolute bottom-1.5 left-1.5 z-10">
            <span className="text-[10px] font-bold text-white bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-full flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5 text-emerald-400" />
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
                <span className="text-base font-black text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(product.price)}
                </span>
                <span className="text-[11px] text-zinc-500">/ {product.unit}</span>
              </div>
              {product.isNegotiable && (
                <span className="text-[9px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-1 py-0.5 rounded">
                  🤝 Neg
                </span>
              )}
            </div>

            <h4 className="font-bold text-xs text-zinc-900 dark:text-white line-clamp-2 mt-1 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
              {product.name}
            </h4>

            <p className="text-[10px] text-zinc-500 truncate mt-1">
              📍 {product.location || 'Local Farm'}
            </p>
          </div>

          <div className="flex items-center justify-between pt-2 mt-2 border-t border-zinc-100 dark:border-zinc-800 text-[10px]">
            <span className="text-zinc-400">{product.harvestDate || 'Fresh'}</span>
            <span className="font-bold text-emerald-600">Stock: {product.availableQuantity}</span>
          </div>
        </div>
      </div>
    );
  }

  // Vertical Feed Listing Card (Marketplace Style)
  return (
    <div
      onClick={handleCardClick}
      className="p-3.5 bg-white dark:bg-[#1B201D] rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-soft hover:shadow-soft-md transition-all cursor-pointer group flex flex-col sm:flex-row gap-3.5 relative overflow-hidden"
    >
      {/* Listing Photo */}
      <div className="relative w-full sm:w-44 h-44 sm:h-36 rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0">
        <img
          src={product.image || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400'}
          alt={product.name}
          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${!product.isAvailable ? 'grayscale opacity-75' : ''}`}
          loading="lazy"
        />

        {/* Sold Overlay */}
        {!product.isAvailable && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
            <span className="px-3 py-1 bg-red-600 text-white font-black text-xs uppercase tracking-wider rounded-lg shadow-md">
              SOLD / बिक चुका
            </span>
          </div>
        )}

        {/* Favorite Heart Button */}
        <button
          onClick={handleHeartClick}
          className="absolute top-2.5 right-2.5 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-colors z-10"
          aria-label="Save listing"
        >
          <Heart className={`w-4 h-4 ${favorite ? 'fill-red-500 text-red-500' : 'text-white'}`} />
        </button>

        {/* Badges on Image */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
          {product.isFeatured && (
            <span className="text-[10px] font-black text-amber-950 bg-amber-400 px-2 py-0.5 rounded-md shadow-xs uppercase tracking-wider">
              ⚡ FEATURED
            </span>
          )}
          {product.isUrgent && (
            <span className="text-[10px] font-black text-white bg-red-600 px-2 py-0.5 rounded-md shadow-xs uppercase tracking-wider">
              🔥 URGENT
            </span>
          )}
          {product.isOrganic && !product.isFeatured && !product.isUrgent && (
            <span className="text-[10px] font-bold text-emerald-950 bg-white/95 backdrop-blur-md px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
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
            <MapPin className="w-3 h-3 text-emerald-400" />
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
              <span className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400">
                {formatCurrency(product.price)}
              </span>
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                / {product.unit}
              </span>
            </div>

            <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/50 px-2 py-0.5 rounded-md">
              {product.freshnessTag}
            </span>
          </div>

          {/* Product Title */}
          <h3 className="font-bold text-base text-zinc-900 dark:text-white mt-1 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors truncate">
            {product.name}
          </h3>

          {/* Farmer & Location Info */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 mt-1">
            <button
              onClick={handleFarmerClick}
              className="font-bold text-zinc-800 dark:text-zinc-200 hover:text-emerald-600 truncate flex items-center gap-1"
            >
              <span>{product.farmerName}</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            </button>
            <span>•</span>
            <span className="truncate">{product.farmName}</span>
          </div>

          {/* Available Quantity */}
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Available: {product.availableQuantity} {product.unit}
            </span>
          </div>
        </div>

        {/* Bottom Fast Action Buttons */}
        <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80">
          <span className="text-[11px] text-zinc-400 truncate">
            📍 {product.location}
          </span>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                addToCart(product, 1);
              }}
              className="min-h-[38px] px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Cart</span>
            </button>

            <button
              onClick={handleBuyNow}
              className="min-h-[38px] px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1"
            >
              <Zap className="w-3.5 h-3.5 fill-white" />
              <span>Buy Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
