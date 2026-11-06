import React from 'react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../i18n';
import { LanguageSelector } from './LanguageSelector';
import { Logo } from './Logo';
import {
  MapPin,
  Sun,
  Moon,
  Smartphone,
  Monitor,
  ChevronDown,
  Heart,
  Search,
  Bell,
  Shield,
  Sprout,
  ShoppingBag,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    role,
    setRole,
    currentLocation,
    setIsLocationModalOpen,
    isDeviceFrame,
    setIsDeviceFrame,
    favorites,
    cart,
    setCustomerTab,
    setIsSearchScreenOpen,
    notifications,
    setIsNotificationModalOpen,
    isLoggedIn,
    setIsLoginModalOpen,
    platformSettings,
  } = useApp();

  const { isDark, toggleTheme } = useTheme();
  const { t } = useTranslation();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#061B14]/95 backdrop-blur-md border-b border-[#D8DFD5] dark:border-[#164635] transition-colors">
      <div className="max-w-7xl px-2 sm:px-6 mx-auto py-2 transition-all duration-200">
        <div className="flex items-center justify-between gap-1.5 sm:gap-2">
          {/* Logo & Location Selector */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <Logo size="sm" />

            {/* Location Selector Pill (Clickable) */}
            <button
              onClick={() => setIsLocationModalOpen(true)}
              className="flex items-center gap-1 text-xs text-[#17251D] dark:text-[#F6F4E8] hover:text-[#0B3D2E] dark:hover:text-[#A8E063] bg-[#F6F4E8] dark:bg-[#0B291F] px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-full border border-[#D8DFD5] dark:border-[#164635] transition-colors max-w-[100px] xs:max-w-[125px] sm:max-w-[155px] truncate shadow-soft focus-visible:ring-2"
              title={t('location.change_location')}
              aria-label="Change current location"
            >
              <MapPin className="w-3.5 h-3.5 text-[#0B3D2E] dark:text-[#A8E063] shrink-0" />
              <span className="font-bold truncate text-[11px]">
                {currentLocation.split(',')[0]}
              </span>
              <ChevronDown className="w-3 h-3 text-[#7A8D83] shrink-0 ml-0.5" />
            </button>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            {/* Multilingual Language Selector */}
            <LanguageSelector variant="compact" />

            {/* Search Trigger */}
            <button
              onClick={() => setIsSearchScreenOpen(true)}
              className="p-2 text-[#66736B] dark:text-[#A6B3AA] hover:text-[#202923] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
              title={t('nav.search')}
              aria-label="Search produce"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Notification Bell with Badge */}
            <button
              onClick={() => setIsNotificationModalOpen(true)}
              className="relative p-2 text-[#66736B] dark:text-[#A6B3AA] hover:text-[#202923] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
              title={t('nav.notifications')}
              aria-label="View notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-[#176B45] text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Favorites Heart Badge (Customer role) */}
            {role === 'customer' && (
              <button
                onClick={() => setCustomerTab('favorites')}
                className="relative p-2 text-[#66736B] dark:text-[#A6B3AA] hover:text-[#202923] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
                title={t('nav.favorites')}
                aria-label="View favorites"
              >
                <Heart className="w-4 h-4" />
                {favorites.length > 0 && (
                  <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-[#D9534F] text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs">
                    {favorites.length}
                  </span>
                )}
              </button>
            )}

            {/* Cart Shopping Bag Badge (Customer role) */}
            {role === 'customer' && (
              <button
                onClick={() => setCustomerTab('cart')}
                className="relative p-2 text-[#66736B] dark:text-[#A6B3AA] hover:text-[#202923] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
                title="View Basket / Cart"
                aria-label="View shopping cart"
              >
                <ShoppingBag className="w-4 h-4" />
                {cart.length > 0 && (
                  <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-[#176B45] text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs">
                    {cart.length}
                  </span>
                )}
              </button>
            )}

            {/* 3-Way Role Selector */}
            <div className="flex items-center bg-[#F6F4E8] dark:bg-[#0B291F] p-0.5 rounded-full border border-[#D8DFD5] dark:border-[#164635] text-[10px] font-bold">
              <button
                onClick={() => setRole('customer')}
                title={t('nav.buyer')}
                className={`px-1.5 py-1 sm:px-2 sm:py-1 rounded-full flex items-center gap-1 transition-all ${
                  role === 'customer'
                    ? 'bg-white dark:bg-[#061B14] text-[#0B3D2E] dark:text-[#A8E063] shadow-soft font-bold'
                    : 'text-[#4A5B52] dark:text-[#A3B8AD] hover:text-[#17251D]'
                }`}
              >
                <ShoppingBag className="w-3 h-3" />
                <span className="hidden sm:inline">{t('nav.buyer')}</span>
              </button>

              <button
                onClick={() => setRole('farmer')}
                title={t('nav.farmer')}
                className={`px-1.5 py-1 sm:px-2 sm:py-1 rounded-full flex items-center gap-1 transition-all ${
                  role === 'farmer'
                    ? 'bg-white dark:bg-[#061B14] text-[#0B3D2E] dark:text-[#A8E063] shadow-soft font-bold'
                    : 'text-[#4A5B52] dark:text-[#A3B8AD] hover:text-[#17251D]'
                }`}
              >
                <Sprout className="w-3 h-3" />
                <span className="hidden sm:inline">{t('nav.farmer')}</span>
              </button>

              <button
                onClick={() => setRole('admin')}
                title={t('nav.admin')}
                className={`px-1.5 py-1 sm:px-2 sm:py-1 rounded-full flex items-center gap-1 transition-all ${
                  role === 'admin'
                    ? 'bg-[#0B3D2E] text-[#F6F4E8] shadow-soft font-bold'
                    : 'text-[#4A5B52] dark:text-[#A3B8AD] hover:text-[#17251D]'
                }`}
              >
                <Shield className="w-3 h-3" />
                <span className="hidden sm:inline">{t('nav.admin')}</span>
              </button>
            </div>

            {/* Direct Login Button (Visible when not logged in) */}
            {!isLoggedIn && (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 bg-[#0B3D2E] hover:bg-[#07291F] active:scale-95 text-white rounded-full text-[11px] sm:text-xs font-bold shadow-soft transition-all ml-0.5"
                title="Sign In with Google or Mobile OTP"
              >
                <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24">
                  <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Login</span>
              </button>
            )}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="p-2 rounded-full text-[#66736B] dark:text-[#A6B3AA] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-[#D99A32]" />
              ) : (
                <Moon className="w-4 h-4 text-[#202923]" />
              )}
            </button>

            {/* Desktop Device Frame Toggle */}
            <button
              onClick={() => setIsDeviceFrame(!isDeviceFrame)}
              title={isDeviceFrame ? 'Full Width View' : 'Phone Frame View'}
              aria-label={isDeviceFrame ? 'Full Width View' : 'Phone Frame View'}
              className="hidden md:flex p-2 rounded-full text-[#66736B] dark:text-[#A6B3AA] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              {isDeviceFrame ? (
                <Monitor className="w-4 h-4" />
              ) : (
                <Smartphone className="w-4 h-4 text-[#176B45] dark:text-[#5FB383]" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Global Broadcast Advisory Banner */}
      {platformSettings?.emergencyAlert && (
        <div className="bg-[#D99A32]/15 dark:bg-[#D99A32]/25 border-t border-b border-[#D99A32]/30 px-3 py-1.5 text-xs text-[#202923] dark:text-[#F2F5F3] flex items-center justify-center gap-2 text-center animate-fade-in font-bold">
          <span className="shrink-0 text-sm">📢</span>
          <span className="truncate">{platformSettings.emergencyAlert}</span>
        </div>
      )}
    </header>
  );
};
