import React from 'react';
import { BrandLogo } from '../brand/BrandLogo';

export interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showTagline?: boolean;
  variant?: 'primary' | 'horizontal' | 'vertical' | 'emblem' | 'dark' | 'light' | 'monochrome';
  className?: string;
  onClick?: () => void;
}

/**
 * HALDER Official Logo Component
 * Single source of truth across all modules, headers, in-app screens, and invoices.
 */
export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showTagline = false,
  variant = 'horizontal',
  className = '',
  onClick,
}) => {
  return (
    <BrandLogo
      size={size}
      showTagline={showTagline}
      variant={variant}
      className={className}
      onClick={onClick}
    />
  );
};
