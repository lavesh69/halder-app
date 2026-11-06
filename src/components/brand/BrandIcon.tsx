import React from 'react';

export interface BrandIconProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | number;
  className?: string;
  variant?: 'color' | 'monochrome-black' | 'monochrome-white';
}

/**
 * HALDER Master Brand Icon (Shopping bag silhouette with sunrise, mountain landscape,
 * agricultural fields, farmhouse, and prominent green leaf signature).
 */
export const BrandIcon: React.FC<BrandIconProps> = ({
  size = 'md',
  className = '',
  variant = 'color',
}) => {
  const pixelMap: Record<string, number> = {
    xs: 20,
    sm: 28,
    md: 36,
    lg: 48,
    xl: 64,
    '2xl': 96,
  };

  const dimension = typeof size === 'number' ? size : pixelMap[size] || 36;
  const uniqueId = React.useId().replace(/:/g, '');

  if (variant === 'monochrome-white') {
    return (
      <svg
        width={dimension}
        height={dimension}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 select-none ${className}`}
        aria-label="HALDER Emblem"
      >
        <path d="M 44 32 C 44 16, 76 16, 76 32" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" fill="none" />
        <path d="M 28 36 C 28 33, 30 31, 33 31 L 87 31 C 90 31, 92 33, 92 36 L 96 92 C 96 99, 91 104, 84 104 L 36 104 C 29 104, 24 99, 24 92 Z" fill="none" stroke="#FFFFFF" strokeWidth="4.5" strokeLinejoin="round" />
        <circle cx="60" cy="56" r="13" fill="#FFFFFF" />
        <polygon points="22,74 38,52 54,74" fill="#FFFFFF" />
        <polygon points="46,74 66,48 86,74" fill="#FFFFFF" />
        <path d="M 22 72 Q 46 62 98 70 L 98 106 L 22 106 Z" fill="#FFFFFF" />
        <path d="M 46 104 C 54 94, 72 82, 92 68 C 91 82, 82 98, 62 104 Z" fill="#0B3D2E" stroke="#FFFFFF" strokeWidth="1.5" />
      </svg>
    );
  }

  if (variant === 'monochrome-black') {
    return (
      <svg
        width={dimension}
        height={dimension}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 select-none ${className}`}
        aria-label="HALDER Emblem"
      >
        <path d="M 44 32 C 44 16, 76 16, 76 32" stroke="#000000" strokeWidth="6" strokeLinecap="round" fill="none" />
        <path d="M 28 36 C 28 33, 30 31, 33 31 L 87 31 C 90 31, 92 33, 92 36 L 96 92 C 96 99, 91 104, 84 104 L 36 104 C 29 104, 24 99, 24 92 Z" fill="none" stroke="#000000" strokeWidth="4.5" strokeLinejoin="round" />
        <circle cx="60" cy="56" r="13" fill="#000000" />
        <polygon points="22,74 38,52 54,74" fill="#000000" />
        <polygon points="46,74 66,48 86,74" fill="#000000" />
        <path d="M 22 72 Q 46 62 98 70 L 98 106 L 22 106 Z" fill="#000000" />
        <path d="M 46 104 C 54 94, 72 82, 92 68 C 91 82, 82 98, 62 104 Z" fill="#FFFFFF" stroke="#000000" strokeWidth="1.5" />
      </svg>
    );
  }

  return (
    <svg
      width={dimension}
      height={dimension}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
      aria-label="HALDER Emblem"
    >
      <defs>
        <linearGradient id={`sky-${uniqueId}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFF8E7" />
          <stop offset="60%" stopColor="#FEE7B8" />
          <stop offset="100%" stopColor="#F9D48C" />
        </linearGradient>

        <radialGradient id={`sun-${uniqueId}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFC107" />
          <stop offset="70%" stopColor="#F4A017" />
          <stop offset="100%" stopColor="#E28905" />
        </radialGradient>

        <linearGradient id={`mount-${uniqueId}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2D6A4F" />
          <stop offset="100%" stopColor="#1B4332" />
        </linearGradient>

        <linearGradient id={`fieldBack-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#388E3C" />
          <stop offset="100%" stopColor="#1B5E20" />
        </linearGradient>

        <linearGradient id={`fieldFront-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4CAF50" />
          <stop offset="100%" stopColor="#2E7D32" />
        </linearGradient>

        <linearGradient id={`leaf-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A8E063" />
          <stop offset="50%" stopColor="#56AB2F" />
          <stop offset="100%" stopColor="#0B3D2E" />
        </linearGradient>

        <clipPath id={`clip-${uniqueId}`}>
          <path d="M 28 36 C 28 33, 30 31, 33 31 L 87 31 C 90 31, 92 33, 92 36 L 96 92 C 96 99, 91 104, 84 104 L 36 104 C 29 104, 24 99, 24 92 Z" />
        </clipPath>
      </defs>

      {/* Bag Handle */}
      <path d="M 44 32 C 44 16, 76 16, 76 32" stroke="#0B3D2E" strokeWidth="6" strokeLinecap="round" fill="none" />
      <path d="M 45 32 C 45 18, 75 18, 75 32" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round" fill="none" />

      {/* Bag Body Base */}
      <path
        d="M 28 36 C 28 33, 30 31, 33 31 L 87 31 C 90 31, 92 33, 92 36 L 96 92 C 96 99, 91 104, 84 104 L 36 104 C 29 104, 24 99, 24 92 Z"
        fill="#F6F4E8"
        stroke="#0B3D2E"
        strokeWidth="4.5"
        strokeLinejoin="round"
      />

      {/* Clipped Agricultural Artwork */}
      <g clipPath={`url(#clip-${uniqueId})`}>
        <rect x="20" y="25" width="80" height="85" fill={`url(#sky-${uniqueId})`} />
        
        {/* Sun rays */}
        <g opacity="0.35" stroke="#F4A017" strokeWidth="1.5">
          <line x1="60" y1="56" x2="30" y2="35" />
          <line x1="60" y1="56" x2="42" y2="30" />
          <line x1="60" y1="56" x2="60" y2="28" />
          <line x1="60" y1="56" x2="78" y2="30" />
          <line x1="60" y1="56" x2="90" y2="35" />
        </g>

        {/* Sunrise */}
        <circle cx="60" cy="56" r="13" fill={`url(#sun-${uniqueId})`} />

        {/* Mountain Peaks */}
        <polygon points="22,74 38,52 54,74" fill={`url(#mount-${uniqueId})`} opacity="0.85" />
        <polygon points="46,74 66,48 86,74" fill={`url(#mount-${uniqueId})`} opacity="0.95" />
        <polygon points="72,74 88,56 98,74" fill={`url(#mount-${uniqueId})`} opacity="0.8" />

        {/* Distant Fields */}
        <path d="M 22 72 Q 46 62 98 70 L 98 106 L 22 106 Z" fill={`url(#fieldBack-${uniqueId})`} />

        {/* Farmhouse & Trees */}
        <g transform="translate(36, 63)">
          <circle cx="2" cy="7" r="4.5" fill="#1B4332" />
          <circle cx="1" cy="6" r="3.5" fill="#2D6A4F" />
          <rect x="7" y="5" width="11" height="8" fill="#FFFFFF" stroke="#0B3D2E" strokeWidth="0.8" />
          <polygon points="5.5,5 12.5,0 19.5,5" fill="#D9534F" stroke="#0B3D2E" strokeWidth="0.8" />
          <rect x="11" y="8" width="3" height="5" fill="#0B3D2E" />
          <rect x="8" y="7" width="2" height="2" fill="#F4A017" />
          <circle cx="23" cy="7" r="4" fill="#2E7D32" />
          <circle cx="22" cy="6.5" r="3" fill="#52B788" />
        </g>

        {/* Rolling Green Terraces */}
        <path d="M 22 83 Q 54 73 98 84 L 98 106 L 22 106 Z" fill={`url(#fieldFront-${uniqueId})`} />
        <path d="M 22 88 Q 58 79 98 90" stroke="#A8E063" strokeWidth="1.2" opacity="0.6" fill="none" />
        <path d="M 22 94 Q 62 86 98 96" stroke="#A8E063" strokeWidth="1" opacity="0.5" fill="none" />

        {/* Signature Lush Green Leaf */}
        <path
          d="M 46 104 C 54 94, 72 82, 92 68 C 91 82, 82 98, 62 104 Z"
          fill={`url(#leaf-${uniqueId})`}
          stroke="#0B3D2E"
          strokeWidth="1.2"
        />
        <path d="M 54 102 Q 72 86 86 74" stroke="#A8E063" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      </g>

      {/* Bag Silhouette Outline */}
      <path
        d="M 28 36 C 28 33, 30 31, 33 31 L 87 31 C 90 31, 92 33, 92 36 L 96 92 C 96 99, 91 104, 84 104 L 36 104 C 29 104, 24 99, 24 92 Z"
        stroke="#0B3D2E"
        strokeWidth="4.5"
        fill="none"
      />
      <circle cx="44" cy="33" r="2.2" fill="#F4A017" stroke="#0B3D2E" strokeWidth="1" />
      <circle cx="76" cy="33" r="2.2" fill="#F4A017" stroke="#0B3D2E" strokeWidth="1" />
    </svg>
  );
};
