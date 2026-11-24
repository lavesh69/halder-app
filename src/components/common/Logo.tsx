import React, { useState } from 'react';
import { useTranslation } from '../../i18n';
import halderLogoImg from '../../assets/halder-logo.png';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  className?: string;
  showIconOnly?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showTagline = false,
  className = '',
  showIconOnly = false,
}) => {
  const { t } = useTranslation();
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    sm: 'text-base sm:text-lg font-black tracking-wider',
    md: 'text-xl font-black tracking-wider',
    lg: 'text-2xl font-black tracking-wider',
    xl: 'text-3xl sm:text-4xl font-black tracking-widest',
  };

  const badgeSizes = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24 sm:w-28 sm:h-28',
  };

  return (
    <div className={`flex flex-col items-start select-none shrink-0 ${className}`}>
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Haldhar Kisan & Wheat Crest Emblem */}
        <div
          className={`${badgeSizes[size]} relative flex items-center justify-center shrink-0 rounded-full overflow-hidden shadow-md ring-2 ring-amber-500/40 bg-emerald-950/20`}
        >
          {!imgError ? (
            <img
              src={halderLogoImg}
              alt="HALDHAR Kisan Logo"
              className="w-full h-full object-cover rounded-full transition-transform duration-300 hover:scale-105"
              onError={() => setImgError(true)}
            />
          ) : (
            <img
              src="/halder-logo.png"
              alt="HALDHAR Kisan Logo"
              className="w-full h-full object-cover rounded-full"
            />
          )}
        </div>

        {!showIconOnly && (
          <div className="flex flex-col leading-none">
            <div className="flex items-center gap-1.5">
              <span
                className={`text-zinc-900 dark:text-white ${sizeClasses[size]} font-black`}
                style={{ letterSpacing: '0.08em' }}
              >
                HALDHAR
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                हलधर
              </span>
            </div>
            <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest text-emerald-700 dark:text-emerald-400 mt-1">
              Direct Mandi • 100% Kisan
            </span>
          </div>
        )}
      </div>

      {showTagline && (
        <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mt-1.5 tracking-normal">
          {t('logo.tagline')}
        </span>
      )}
    </div>
  );
};
