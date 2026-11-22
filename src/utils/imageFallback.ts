import React from 'react';

/**
 * Offline-ready SVG Data URIs for broken or slow-loading images.
 * These load instantly without network access, preventing ugly broken-image icons on 2G/3G.
 */

export const DEFAULT_PRODUCE_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600" fill="none">
  <rect width="800" height="600" fill="#142B20"/>
  <circle cx="400" cy="270" r="140" fill="#1D4333"/>
  <path d="M400 170 C460 170 510 220 510 280 C510 330 470 360 400 370 C330 360 290 330 290 280 C290 220 340 170 400 170 Z" fill="#34D399" opacity="0.9"/>
  <path d="M400 200 Q400 310 400 360" stroke="#064E3B" stroke-width="8" stroke-linecap="round"/>
  <path d="M400 250 Q430 230 460 240" stroke="#064E3B" stroke-width="6" stroke-linecap="round"/>
  <path d="M400 290 Q370 270 340 280" stroke="#064E3B" stroke-width="6" stroke-linecap="round"/>
  <rect x="250" y="420" width="300" height="44" rx="22" fill="#064E3B" stroke="#059669" stroke-width="2"/>
  <text x="400" y="448" fill="#ECFDF5" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="bold" text-anchor="middle" letter-spacing="1.5">HALDER FRESH</text>
  <text x="400" y="500" fill="#A7F3D0" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="500" text-anchor="middle">Farm Fresh Produce</text>
</svg>
`.trim());

export const DEFAULT_AVATAR_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200" fill="none">
  <rect width="200" height="200" fill="#EAF5EE"/>
  <circle cx="100" cy="78" r="42" fill="#176B45" opacity="0.85"/>
  <ellipse cx="100" cy="180" rx="68" ry="48" fill="#176B45" opacity="0.85"/>
  <path d="M80 44 C88 32 112 32 120 44 C112 40 88 40 80 44 Z" fill="#F59E0B"/>
</svg>
`.trim());

export const handleImageError = (
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  fallbackSrc: string = DEFAULT_PRODUCE_IMAGE
) => {
  const target = e.currentTarget;
  if (target.src !== fallbackSrc) {
    target.onerror = null;
    target.src = fallbackSrc;
  }
};

export const handleAvatarError = (
  e: React.SyntheticEvent<HTMLImageElement, Event>
) => {
  handleImageError(e, DEFAULT_AVATAR_IMAGE);
};
