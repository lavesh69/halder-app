import React from 'react';
import { Product } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDistance } from '../../utils/formatters';
import { Plus, Minus, MapPin, Sparkles } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  variant?: 'grid' | 'horizontal';
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  variant = 'grid',
}) => {
  const {
    cart,
    addToCart,
    updateCartQuantity,
    setSelectedProduct,
    setSelectedFarmer,
    farmers,
  } = useApp();

  const cartItem = cart.find((item) => item.product.id === product.id);
  const quantity = cartItem?.quantity || 0;

  const handleCardClick = () => {
    setSelectedProduct(product);
  };

  const handleFarmerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const farmer = farmers.find((f) => f.id === product.farmerId);
    if (farmer) {
      setSelectedFarmer(farmer);
    }
  };

  if (variant === 'horizontal') {
    return (
      <div
        onClick={handleCardClick}
        className="shrink-0 w-64 p-3 bg-white dark:bg-[#0B291F] rounded-2xl border border-[#D8DFD5] dark:border-[#164635] shadow-soft hover:shadow-soft-md transition-all cursor-pointer group flex flex-col justify-between"
      >
        <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden mb-2.5 bg-[#F0F4F1] dark:bg-[#222B25]">
          <img
            src={product.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300'}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            <span className="text-[10px] font-bold text-[#124C36] dark:text-[#5FB383] bg-white/95 dark:bg-[#0B291F]/95 backdrop-blur-xs px-2 py-0.5 rounded-md shadow-xs">
              {product.freshnessTag}
            </span>
          </div>
          <div className="absolute bottom-2 right-2">
            <span className="text-[10px] font-medium text-white bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-full flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5 text-[#5FB383]" />
              {formatDistance(product.distanceKm)}
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-1">
            <h4 className="font-bold text-sm text-[#202923] dark:text-[#F2F5F3] truncate group-hover:text-[#176B45] dark:group-hover:text-[#5FB383] transition-colors">
              {product.name}
            </h4>
          </div>

          <button
            onClick={handleFarmerClick}
            className="text-[11px] text-[#0B3D2E] dark:text-[#A8E063] hover:underline font-medium truncate block text-left mt-0.5"
          >
            {product.farmName}
          </button>

          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[#D8DFD5] dark:border-[#164635]">
            <div>
              <span className="text-base font-black text-[#0B3D2E] dark:text-[#A8E063]">
                {formatCurrency(product.price)}
              </span>
              <span className="text-[11px] text-[#66736B] dark:text-[#A6B3AA] ml-0.5">
                /{product.unit}
              </span>
            </div>

            {quantity === 0 ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  addToCart(product, 1);
                }}
                className="min-h-[44px] min-w-[64px] flex items-center justify-center gap-1 text-xs font-bold text-[#0B3D2E] dark:text-[#A8E063] bg-[#F6F4E8] dark:bg-[#0F3327] hover:bg-[#0B3D2E] hover:text-white px-3 py-1.5 rounded-xl border border-[#176B45]/20 dark:border-[#2E8B57]/30 transition-all active:scale-95 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            ) : (
              <div
                onClick={(e) => e.stopPropagation()}
                className="min-h-[44px] flex items-center gap-2 bg-[#F6F4E8] dark:bg-[#0F3327] border border-[#176B45]/30 dark:border-[#2E8B57]/40 rounded-xl px-2 py-1"
              >
                <button
                  onClick={() => updateCartQuantity(product.id, quantity - 1)}
                  className="w-7 h-7 rounded-lg bg-white dark:bg-[#222B25] flex items-center justify-center text-[#202923] dark:text-[#F2F5F3] shadow-xs active:scale-90"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-bold text-[#124C36] dark:text-[#5FB383] min-w-[1.2rem] text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => updateCartQuantity(product.id, quantity + 1)}
                  className="w-7 h-7 rounded-lg bg-[#0B3D2E] text-white flex items-center justify-center shadow-xs active:scale-90"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default Grid Variant
  return (
    <div
      onClick={handleCardClick}
      className="p-3 bg-white dark:bg-[#0B291F] rounded-2xl border border-[#D8DFD5] dark:border-[#164635] shadow-soft hover:shadow-soft-md transition-all cursor-pointer group flex flex-col justify-between"
    >
      <div>
        <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden mb-2.5 bg-[#F0F4F1] dark:bg-[#222B25]">
          <img
            src={product.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300'}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          {product.isOrganic && (
            <div className="absolute top-2 left-2">
              <span className="text-[10px] font-bold text-[#124C36] dark:text-[#5FB383] bg-white/95 dark:bg-[#0B291F]/95 backdrop-blur-xs px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-[#176B45]" />
                Organic
              </span>
            </div>
          )}
          <div className="absolute bottom-2 right-2">
            <span className="text-[10px] font-medium text-white bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-full flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5 text-[#5FB383]" />
              {product.distanceKm} km
            </span>
          </div>
        </div>

        <h4 className="font-bold text-sm text-[#202923] dark:text-[#F2F5F3] truncate group-hover:text-[#176B45] dark:group-hover:text-[#5FB383] transition-colors">
          {product.name}
        </h4>

        <button
          onClick={handleFarmerClick}
          className="text-[11px] text-[#66736B] dark:text-[#A6B3AA] hover:text-[#176B45] dark:hover:text-[#5FB383] font-medium truncate block text-left mt-0.5"
        >
          From <span className="font-semibold text-[#202923] dark:text-[#F2F5F3]">{product.farmName}</span>
        </button>
      </div>

      <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#D8DFD5] dark:border-[#164635]">
        <div>
          <span className="text-base font-black text-[#0B3D2E] dark:text-[#A8E063]">
            {formatCurrency(product.price)}
          </span>
          <span className="text-[11px] text-[#66736B] dark:text-[#A6B3AA] ml-0.5">
            /{product.unit}
          </span>
        </div>

        {quantity === 0 ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              addToCart(product, 1);
            }}
            className="min-h-[44px] min-w-[64px] flex items-center justify-center gap-1 text-xs font-bold text-[#0B3D2E] dark:text-[#A8E063] bg-[#F6F4E8] dark:bg-[#0F3327] hover:bg-[#0B3D2E] hover:text-white px-3 py-1.5 rounded-xl border border-[#176B45]/20 dark:border-[#2E8B57]/30 transition-all active:scale-95 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        ) : (
          <div
            onClick={(e) => e.stopPropagation()}
            className="min-h-[44px] flex items-center gap-2 bg-[#F6F4E8] dark:bg-[#0F3327] border border-[#176B45]/30 dark:border-[#2E8B57]/40 rounded-xl px-2 py-1"
          >
            <button
              onClick={() => updateCartQuantity(product.id, quantity - 1)}
              className="w-7 h-7 rounded-lg bg-white dark:bg-[#222B25] flex items-center justify-center text-[#202923] dark:text-[#F2F5F3] shadow-xs active:scale-90"
              aria-label="Decrease quantity"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-bold text-[#124C36] dark:text-[#5FB383] min-w-[1.2rem] text-center">
              {quantity}
            </span>
            <button
              onClick={() => updateCartQuantity(product.id, quantity + 1)}
              className="w-7 h-7 rounded-lg bg-[#0B3D2E] text-white flex items-center justify-center shadow-xs active:scale-90"
              aria-label="Increase quantity"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
