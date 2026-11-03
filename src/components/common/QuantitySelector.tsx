import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface QuantitySelectorProps {
  quantity: number;
  unit: string;
  onIncrease: () => void;
  onDecrease: () => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const QuantitySelector: React.FC<QuantitySelectorProps> = ({
  quantity,
  unit,
  onIncrease,
  onDecrease,
  min = 1,
  max = 99,
  size = 'md',
}) => {
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  const btnSize = isSm ? 'w-7 h-7' : isLg ? 'w-10 h-10' : 'w-8 h-8';
  const iconSize = isSm ? 'w-3 h-3' : isLg ? 'w-4 h-4' : 'w-3.5 h-3.5';

  return (
    <div className="inline-flex items-center bg-zinc-100 dark:bg-zinc-800/90 rounded-full p-1 border border-zinc-200 dark:border-zinc-700/60 shadow-sm">
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (quantity > min) onDecrease();
        }}
        disabled={quantity <= min}
        className={`${btnSize} rounded-full flex items-center justify-center text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 shadow-xs`}
        aria-label="Decrease quantity"
      >
        <Minus className={iconSize} />
      </button>

      <span
        className={`font-semibold text-zinc-900 dark:text-white px-2.5 text-center min-w-[3rem] ${
          isSm ? 'text-xs' : isLg ? 'text-base' : 'text-sm'
        }`}
      >
        {quantity} {unit}
      </span>

      <button
        onClick={(e) => {
          e.stopPropagation();
          if (quantity < max) onIncrease();
        }}
        disabled={quantity >= max}
        className={`${btnSize} rounded-full flex items-center justify-center text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all shadow-xs disabled:opacity-30`}
        aria-label="Increase quantity"
      >
        <Plus className={iconSize} />
      </button>
    </div>
  );
};
