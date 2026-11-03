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
    sm: 'text-lg tracking-tight',
    md: 'text-2xl tracking-tight',
    lg: 'text-3xl tracking-tight',
    xl: 'text-4xl tracking-tighter',
  };

  const leafSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
    xl: 'w-9 h-9',
  };

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      <div className="flex items-center gap-1.5 font-bold">
        {/* Leaf/Sprout minimalist icon */}
        <div className="relative flex items-center justify-center">
          <svg
            className={`${leafSizes[size]} text-emerald-600 dark:text-emerald-400 transition-colors duration-200`}
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM11.1 17.65C8.95 16.95 7.6 14.85 7.9 12.6C8.2 10.35 10.15 8.7 12.4 8.85C14.65 9 16.3 10.95 16.15 13.2C16 15.45 13.25 18.35 11.1 17.65Z" opacity="0.2"/>
            <path d="M6.2 14.5C6.2 10.36 9.56 7 13.7 7C14.7 7 15.65 7.2 16.5 7.55C16.85 8.4 17.05 9.35 17.05 10.35C17.05 14.49 13.69 17.85 9.55 17.85C8.3 17.85 7.15 17.55 6.2 17C6.2 16.15 6.2 15.35 6.2 14.5Z" />
            <path d="M10 16C10 12.5 12.5 9.5 16 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <span
          className={`font-black tracking-widest text-zinc-900 dark:text-white ${sizeClasses[size]}`}
          style={{ letterSpacing: '0.12em' }}
        >
          HALDER
        </span>
      </div>
      {showTagline && (
        <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mt-0.5 tracking-normal">
          Fresh from the farm. Direct to you.
        </span>
      )}
    </div>
  );
};
