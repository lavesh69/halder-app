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
        className="shrink-0 w-64 p-3 bg-white dark:bg-[#1B201D] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-soft hover:shadow-soft-md transition-all cursor-pointer group flex flex-col justify-between"
      >
        <div className="relative w-full h-32 rounded-xl overflow-hidden mb-2.5 bg-zinc-100 dark:bg-zinc-800">
          <img
            src={product.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300'}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-white/95 dark:bg-[#151917]/95 backdrop-blur-xs px-2 py-0.5 rounded-md shadow-xs">
              {product.freshnessTag}
            </span>
          </div>
          <div className="absolute bottom-2 right-2">
            <span className="text-[10px] font-medium text-white bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-full">
              {formatDistance(product.distanceKm)}
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-1">
            <h4 className="font-bold text-sm text-zinc-900 dark:text-white truncate">
              {product.name}
            </h4>
          </div>

          <button
            onClick={handleFarmerClick}
            className="text-[11px] text-emerald-700 dark:text-emerald-400 hover:underline font-medium truncate block text-left mt-0.5"
          >
            {product.farmName}
          </button>

          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
            <div>
              <span className="text-base font-black text-emerald-700 dark:text-emerald-400">
                {formatCurrency(product.price)}
              </span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 ml-0.5">
                /{product.unit}
              </span>
            </div>

            {quantity === 0 ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  addToCart(product, 1);
                }}
                className="flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 transition-all active:scale-95 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            ) : (
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl px-1.5 py-0.5"
              >
                <button
                  onClick={() => updateCartQuantity(product.id, quantity - 1)}
                  className="w-5 h-5 rounded-lg bg-white dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-200 shadow-xs"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 min-w-[1.2rem] text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => updateCartQuantity(product.id, quantity + 1)}
                  className="w-5 h-5 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs"
                >
                  <Plus className="w-3 h-3" />
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
      className="p-3 bg-white dark:bg-[#1B201D] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-soft hover:shadow-soft-md transition-all cursor-pointer group flex flex-col justify-between"
    >
      <div>
        <div className="relative w-full aspect-4/3 rounded-xl overflow-hidden mb-2.5 bg-zinc-100 dark:bg-zinc-800">
          <img
            src={product.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300'}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          {product.isOrganic && (
            <div className="absolute top-2 left-2">
              <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-white/95 dark:bg-[#151917]/95 backdrop-blur-xs px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-emerald-500" />
                Organic
              </span>
            </div>
          )}
          <div className="absolute bottom-2 right-2">
            <span className="text-[10px] font-medium text-white bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-full flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5" />
              {product.distanceKm} km
            </span>
          </div>
        </div>

        <h4 className="font-bold text-sm text-zinc-900 dark:text-white truncate">
          {product.name}
        </h4>

        <button
          onClick={handleFarmerClick}
          className="text-[11px] text-zinc-500 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium truncate block text-left mt-0.5"
        >
          From <span className="font-semibold text-zinc-700 dark:text-zinc-300">{product.farmName}</span>
        </button>
      </div>

      <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
        <div>
          <span className="text-base font-black text-emerald-700 dark:text-emerald-400">
            {formatCurrency(product.price)}
          </span>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 ml-0.5">
            /{product.unit}
          </span>
        </div>

        {quantity === 0 ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              addToCart(product, 1);
            }}
            className="flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 transition-all active:scale-95 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        ) : (
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl px-1.5 py-0.5"
          >
            <button
              onClick={() => updateCartQuantity(product.id, quantity - 1)}
              className="w-5 h-5 rounded-lg bg-white dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-200 shadow-xs"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 min-w-[1.2rem] text-center">
              {quantity}
            </span>
            <button
              onClick={() => updateCartQuantity(product.id, quantity + 1)}
              className="w-5 h-5 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
