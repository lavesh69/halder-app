import React from 'react';
import { BrandIcon } from './BrandIcon';

export interface BrandLogoProps {
  variant?: 'primary' | 'horizontal' | 'vertical' | 'emblem' | 'dark' | 'light' | 'monochrome';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showPillars?: boolean;
  showTagline?: boolean;
  className?: string;
  onClick?: () => void;
}

/**
 * HALDER Master Brand Logo
 * Features the official shopping bag emblem, sunrise, mountain landscape,
 * rolling agricultural fields, and prominent leaf signature.
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  showPillars = false,
  showTagline = true,
  className = '',
  onClick,
}) => {
  if (variant === 'emblem') {
    return (
      <div onClick={onClick} className={`inline-flex items-center select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}>
        <BrandIcon size={size} />
      </div>
    );
  }

  // Size configurations
  const config = {
    xs: { iconSize: 22, textScale: 'text-sm', subScale: 'text-[8.5px]', tracking: 'tracking-wider' },
    sm: { iconSize: 28, textScale: 'text-base', subScale: 'text-[9.5px]', tracking: 'tracking-wider' },
    md: { iconSize: 36, textScale: 'text-xl', subScale: 'text-[11px]', tracking: 'tracking-widest' },
    lg: { iconSize: 48, textScale: 'text-2xl', subScale: 'text-xs', tracking: 'tracking-widest' },
    xl: { iconSize: 64, textScale: 'text-3xl', subScale: 'text-sm', tracking: 'tracking-widest' },
    '2xl': { iconSize: 84, textScale: 'text-4xl', subScale: 'text-base', tracking: 'tracking-widest' },
  }[size];

  const isDark = variant === 'dark';
  const isMono = variant === 'monochrome';

  const textColor = isDark
    ? 'text-[#F6F4E8]'
    : isMono
    ? 'text-current'
    : 'text-[#0B3D2E] dark:text-[#F6F4E8]';

  const subColor = isDark
    ? 'text-[#A8E063]'
    : isMono
    ? 'text-current opacity-80'
    : 'text-[#2E7D32] dark:text-[#A8E063]';

  if (variant === 'vertical') {
    return (
      <div
        onClick={onClick}
        className={`flex flex-col items-center text-center select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
      >
        <BrandIcon size={config.iconSize * 1.5} variant={isMono ? 'monochrome-black' : 'color'} />
        <div className="mt-2 flex flex-col items-center">
          <span className={`font-black ${config.textScale} ${config.tracking} ${textColor} leading-none font-display`}>
            HALDER
          </span>
          {showTagline && (
            <span className={`font-bold ${config.subScale} tracking-[0.25em] ${subColor} uppercase mt-1`}>
              Farm to Market
            </span>
          )}
        </div>

        {showPillars && (
          <div className="mt-2.5 px-3 py-1 rounded-full bg-[#F6F4E8] dark:bg-[#061B14] border border-[#D8DFD5] dark:border-[#164635] text-[9px] font-semibold text-[#0B3D2E] dark:text-[#F6F4E8]">
            Farmers • Produce • Direct • You
          </div>
        )}
      </div>
    );
  }

  // Horizontal Lockup (Default & Primary)
  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <BrandIcon size={config.iconSize} variant={isMono ? 'monochrome-black' : 'color'} />
      <div className="flex flex-col leading-tight">
        <div className="flex items-center gap-1.5">
          <span className={`font-black ${config.textScale} ${config.tracking} ${textColor} font-display tracking-tight`}>
            HALDER
          </span>
          {/* Subtle gold harvest accent dot */}
          <span className="w-1.5 h-1.5 rounded-full bg-[#F4A017] inline-block mb-1 shrink-0" />
        </div>
        {showTagline && (
          <span className={`font-bold ${config.subScale} tracking-[0.22em] ${subColor} uppercase -mt-0.5`}>
            Farm to Market
          </span>
        )}
        {showPillars && (
          <div className="flex items-center gap-1 text-[8.5px] text-[#4A5B52] dark:text-[#A3B8AD] mt-0.5">
            <span>1. Farmers</span>
            <span className="text-[#F4A017]">•</span>
            <span>2. Fresh</span>
            <span className="text-[#F4A017]">•</span>
            <span>3. Direct</span>
            <span className="text-[#F4A017]">•</span>
            <span className="font-bold text-[#2E7D32] dark:text-[#A8E063]">4. You</span>
          </div>
        )}
      </div>
    </div>
  );
};
