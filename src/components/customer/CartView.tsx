import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';
import { QuantitySelector } from '../common/QuantitySelector';
import {
  Trash2,
  ArrowRight,
  ShoppingBag,
  Truck,
  Heart,
  Store,
  ShieldCheck,
} from 'lucide-react';

interface CartViewProps {
  onProceedToCheckout: () => void;
}

export const CartView: React.FC<CartViewProps> = ({ onProceedToCheckout }) => {
  const {
    cart,
    groupedCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    cartTotal,
    setCustomerTab,
    platformSettings,
  } = useApp();

  const [tip, setTip] = useState<number>(10);
  const deliveryThreshold = platformSettings?.freeDeliveryThreshold ?? 200;
  const standardFee = platformSettings?.standardDeliveryFee ?? 25;
  const deliveryFee = cartTotal >= deliveryThreshold ? 0 : standardFee;
  const finalTotal = cartTotal + deliveryFee + tip;

  if (cart.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
        <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <div className="space-y-1 max-w-xs">
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
            Your basket is empty
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Explore fresh farm listings and support local growers directly.
          </p>
        </div>
        <button
          onClick={() => setCustomerTab('home')}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl shadow-soft transition-all active:scale-95"
        >
          Browse Marketplace
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 animate-fade-in max-w-3xl mx-auto">
      {/* Free Delivery Bar */}
      <div className="p-4 rounded-3xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40">
        <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-1.5">
          <div className="flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-emerald-600" />
            <span>
              {cartTotal >= deliveryThreshold
                ? '🎉 You unlocked FREE Direct-Farm Delivery!'
                : `Add ${formatCurrency(deliveryThreshold - cartTotal)} more for FREE Delivery`}
            </span>
          </div>
          <span>₹{deliveryThreshold} Free Delivery Threshold</span>
        </div>
        <div className="w-full h-2 bg-emerald-200/60 dark:bg-emerald-900/60 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-600 dark:bg-emerald-400 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, (cartTotal / deliveryThreshold) * 100)}%` }}
          />
        </div>
      </div>

      {/* Multi-Farmer Grouped Sections */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Items Grouped by Farmer ({groupedCart.length} {groupedCart.length === 1 ? 'Farm' : 'Farms'})
          </h3>
          <button
            onClick={clearCart}
            className="text-xs text-zinc-400 hover:text-red-500 transition-colors"
          >
            Clear All
          </button>
        </div>

        {groupedCart.map((group) => (
          <div
            key={group.farmerId}
            className="p-4 bg-white dark:bg-[#1B201D] rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-soft space-y-3"
          >
            {/* Farmer Subheader */}
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-emerald-600" />
                <div>
                  <span className="font-black text-xs text-zinc-900 dark:text-white block">
                    Order from {group.farmerName}
                  </span>
                  <span className="text-[10px] text-zinc-400">{group.farmName}</span>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                Subtotal: {formatCurrency(group.subtotal)}
              </span>
            </div>

            {/* Items inside this farmer group */}
            <div className="space-y-2.5">
              {group.items.map(({ product, quantity }) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={product.image || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=200'}
                      alt={product.name}
                      className="w-12 h-12 rounded-xl object-cover bg-zinc-100 dark:bg-zinc-800 shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="font-bold text-zinc-900 dark:text-white truncate">
                        {product.name}
                      </h4>
                      <p className="text-zinc-500 font-medium">
                        {formatCurrency(product.price)} / {product.unit}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <QuantitySelector
                      quantity={quantity}
                      unit={product.unit}
                      size="sm"
                      onIncrease={() => updateCartQuantity(product.id, quantity + 1)}
                      onDecrease={() => updateCartQuantity(product.id, quantity - 1)}
                    />
                    <button
                      onClick={() => removeFromCart(product.id)}
                      className="p-1.5 text-zinc-400 hover:text-red-500 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Direct Farmer Tip */}
      <div className="p-4 bg-white dark:bg-[#1B201D] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Heart className="w-4 h-4 text-emerald-600 fill-emerald-600/20" />
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
              Support Your Farmer Tip
            </span>
          </div>
          <span className="text-[11px] text-zinc-400">100% direct payout</span>
        </div>

        <div className="flex gap-2">
          {[0, 10, 20, 30, 50].map((amount) => (
            <button
              key={amount}
              onClick={() => setTip(amount)}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                tip === amount
                  ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300'
                  : 'border-zinc-200 dark:border-zinc-700/70 text-zinc-600 dark:text-zinc-400'
              }`}
            >
              {amount === 0 ? 'None' : `₹${amount}`}
            </button>
          ))}
        </div>
      </div>

      {/* Bill Summary */}
      <div className="p-4 bg-white dark:bg-[#1B201D] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 space-y-2.5 text-xs">
        <h4 className="font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-[11px]">
          Bill Summary
        </h4>
        <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
          <span>Items Subtotal</span>
          <span className="font-semibold text-zinc-900 dark:text-white">
            {formatCurrency(cartTotal)}
          </span>
        </div>
        <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
          <span>Direct Transit Fee</span>
          <span>{deliveryFee === 0 ? <span className="text-emerald-600 font-bold">FREE</span> : formatCurrency(deliveryFee)}</span>
        </div>
        {tip > 0 && (
          <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
            <span>Farmer Appreciation Tip</span>
            <span className="font-semibold text-zinc-900 dark:text-white">{formatCurrency(tip)}</span>
          </div>
        )}
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-between text-sm font-black text-zinc-900 dark:text-white">
          <span>To Pay</span>
          <span className="text-base text-emerald-700 dark:text-emerald-400">
            {formatCurrency(finalTotal)}
          </span>
        </div>
      </div>

      {/* Proceed Checkout Action */}
      <div className="p-4 bg-white dark:bg-[#181F1A] rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-soft-lg flex items-center justify-between gap-4">
        <div>
          <span className="text-[11px] text-zinc-400 block font-medium">Total</span>
          <span className="text-xl font-black text-emerald-700 dark:text-emerald-400">
            {formatCurrency(finalTotal)}
          </span>
        </div>
        <button
          onClick={onProceedToCheckout}
          className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-sm rounded-2xl shadow-soft transition-all flex items-center justify-center gap-2"
        >
          <span>Proceed to Checkout</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
