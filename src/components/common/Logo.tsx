import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showTagline = false,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'text-base font-black tracking-wider',
    md: 'text-xl font-black tracking-wider',
    lg: 'text-2xl font-black tracking-wider',
    xl: 'text-3xl font-black tracking-widest',
  };

  const badgeSizes = {
    sm: 'w-6 h-6 rounded-lg',
    md: 'w-8 h-8 rounded-xl',
    lg: 'w-10 h-10 rounded-2xl',
    xl: 'w-14 h-14 rounded-2xl',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
  };

  return (
    <div className={`flex flex-col items-start select-none ${className}`}>
      <div className="flex items-center gap-2">
        {/* Agricultural Sprout Shield */}
        <div
          className={`${badgeSizes[size]} bg-gradient-to-br from-emerald-600 to-emerald-800 dark:from-emerald-500 dark:to-emerald-700 flex items-center justify-center shadow-sm shrink-0`}
        >
          <svg
            className={`${iconSizes[size]} text-white`}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 21V11" stroke="#A7F3D0" strokeWidth="2" strokeLinecap="round" />
            <path d="M12 16C7.5 16 5 12 5 7C9.5 7 12 11 12 16Z" fill="#34D399" />
            <path d="M12 13C16.5 13 19 9 19 4C14.5 4 12 8 12 13Z" fill="#FBBF24" />
            <circle cx="12" cy="7" r="1.5" fill="#FEF3C7" />
          </svg>
        </div>

        <div className="flex flex-col leading-none">
          <span
            className={`text-zinc-900 dark:text-white ${sizeClasses[size]} font-black`}
            style={{ letterSpacing: '0.08em' }}
          >
            HALDER
          </span>
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-700 dark:text-emerald-400 mt-0.5">
            Mandi Direct
          </span>
        </div>
      </div>

      {showTagline && (
        <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mt-1 tracking-normal">
          Direct from farmers • खेत से सीधे आपके घर
        </span>
      )}
    </div>
  );
};
