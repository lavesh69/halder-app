import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../i18n';
import { ApiClient } from '../../api/client';
import { LanguageSelector } from '../common/LanguageSelector';
import {
  ShoppingBag,
  MapPin,
  Lock,
  Bell,
  HelpCircle,
  Sun,
  Moon,
  Monitor,
  RotateCcw,
  ShieldCheck,
  ChevronRight,
  Copy,
  Edit2,
  LogOut,
  Sparkles,
  Megaphone,
  Heart,
  Phone,
  Mail,
  X,
} from 'lucide-react';

import { PrivacyPolicyModal } from '../common/PrivacyPolicyModal';
import { EditCustomerProfileModal } from './EditCustomerProfileModal';
import { AddressManagementModal } from './AddressManagementModal';
import { CustomerSecurityModal } from './CustomerSecurityModal';
import { NotificationPreferencesModal } from './NotificationPreferencesModal';
import { GoogleSignInButton } from '../common/GoogleSignInButton';

export const CustomerProfileView: React.FC = () => {
  const {
    currentUser,
    setRole,
    setCustomerTab,
    resetDemoData,
    showToast,
    logout,
    loginWithGoogle,
    setIsMyAdsOpen,
    products,
    platformSettings,
  } = useApp();

  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  const currentUserId = currentUser?.farmerProfileId || currentUser?.id || 'farmer-1';
  const myAdsCount = products.filter(
    (p) => p.farmerId === currentUserId || (currentUser?.name && p.farmerName === currentUser.name)
  ).length;


  // Profile data state
  const [profileData, setProfileData] = useState<any>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isHelpSupportOpen, setIsHelpSupportOpen] = useState(false);

  const loadProfile = async () => {
    setIsLoadingProfile(true);
    try {
      const data = await ApiClient.getCustomerProfile();
      if (data) setProfileData(data);
    } catch {}
    setIsLoadingProfile(false);
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out of your HALDER account?')) {
      logout();
    }
  };

  const displayName = profileData?.name || currentUser?.name || 'Aman Sharma';
  const displayId = profileData?.halderId || currentUser?.halder_id || 'HAL-CUS-00000001';
  const displayPhone = profileData?.phone || currentUser?.phone || '+91 98765 43210';
  const displayEmail = profileData?.email || currentUser?.email || 'aman@halder.com';
  const displayAvatar = profileData?.avatar || currentUser?.profile_image || '';
  const defaultAddressStr = profileData?.defaultAddress
    ? `${profileData.defaultAddress.house_building}, ${profileData.defaultAddress.street_locality}, ${profileData.defaultAddress.city}`
    : 'Flat 402, Rajpur Road, Dehradun';

  const initials = displayName
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6 pb-24 animate-fade-in max-w-3xl mx-auto">
      {/* Profile Header Card */}
      <div className="p-5 bg-white dark:bg-[#1B201D] rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-soft flex items-center gap-4 relative overflow-hidden">
        {/* Avatar with Edit Badge */}
        <div className="relative group cursor-pointer" onClick={() => setIsEditModalOpen(true)}>
          {displayAvatar ? (
            <img
              src={displayAvatar}
              alt={displayName}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-600/40 shadow-xs"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-black text-xl flex items-center justify-center border-2 border-emerald-600/30">
              {initials}
            </div>
          )}
          <div className="absolute -bottom-1 -right-1 p-1 bg-emerald-600 text-white rounded-lg shadow-xs hover:bg-emerald-700 transition">
            <Edit2 className="w-3 h-3" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-lg font-black text-zinc-900 dark:text-white truncate">
              {displayName}
            </h3>
            <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full shrink-0">
              {t('profile.customer_role')}
            </span>
          </div>

          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[11px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-200/80 dark:border-emerald-800/60 select-all tracking-wide">
              {displayId}
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(displayId);
                showToast(`Copied ${displayId} to clipboard!`, 'info');
              }}
              className="p-1 text-zinc-400 hover:text-emerald-600 rounded transition"
              title={t('profile.copy_id')}
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 truncate">
            {displayPhone} • {displayEmail}
          </p>

          <p className="text-[11px] text-zinc-400 truncate mt-1 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
            <span className="truncate">{defaultAddressStr}</span>
          </p>
        </div>

        {/* Quick Edit Profile Button */}
        <button
          onClick={() => setIsEditModalOpen(true)}
          className="p-2 text-zinc-400 hover:text-emerald-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition shrink-0"
          title="Edit Profile"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      </div>

      {/* Real Live Stats Bar */}
      {profileData?.orderStats && (
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
          <div className="p-2.5 sm:p-3 bg-white dark:bg-[#1B201D] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 text-center min-w-0">
            <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 block truncate">
              {profileData.orderStats.total || 0}
            </span>
            <span className="text-[9px] sm:text-[10px] uppercase font-bold text-zinc-400 tracking-wider truncate block">
              Total Orders
            </span>
          </div>
          <div className="p-2.5 sm:p-3 bg-white dark:bg-[#1B201D] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 text-center min-w-0">
            <span className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400 block truncate">
              {profileData.totalAddresses || 1}
            </span>
            <span className="text-[9px] sm:text-[10px] uppercase font-bold text-zinc-400 tracking-wider truncate block">
              Addresses
            </span>
          </div>
          <div className="p-2.5 sm:p-3 bg-white dark:bg-[#1B201D] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 text-center min-w-0">
            <span className="text-base sm:text-lg font-black text-purple-600 dark:text-purple-400 block truncate">
              {profileData.favoritesCount || 0}
            </span>
            <span className="text-[9px] sm:text-[10px] uppercase font-bold text-zinc-400 tracking-wider truncate block">
              Favorites
            </span>
          </div>
        </div>
      )}

      {/* Google Account Authentication Card */}
      <div className="p-4 bg-white dark:bg-[#1B201D] rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-soft space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <div>
              <h4 className="text-xs font-bold text-zinc-900 dark:text-white">Google Sign-In</h4>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">1-Tap login and account synchronization</p>
            </div>
          </div>
        </div>
        <GoogleSignInButton
          role="customer"
          onSuccess={(credential) => {
            loginWithGoogle(credential, 'customer');
          }}
        />
      </div>

      {/* Switch to Farmer Banner */}
      <div
        onClick={() => setRole('farmer')}
        className="p-4 bg-linear-to-r from-emerald-700 to-emerald-900 rounded-2xl text-white shadow-soft cursor-pointer hover:opacity-95 transition-all flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="text-2xl">??</div>
          <div>
            <h4 className="font-bold text-sm">{t('profile.switch_to_farmer')}</h4>
            <p className="text-xs text-emerald-100">
              {t('profile.switch_to_farmer_desc')}
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-emerald-200" />
      </div>

      {/* Menu List */}
      <div className="bg-white dark:bg-[#1B201D] rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800/80 shadow-soft">
        {/* My Advertisements (OLX style) */}
        <button
          onClick={() => setCustomerTab('my-ads')}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-zinc-900 dark:text-white block">
                  My Advertisements (मेरे विज्ञापन)
                </span>
                {myAdsCount > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                    {myAdsCount} Active
                  </span>
                )}
              </div>
              <span className="text-[11px] text-zinc-500">
                Manage, preview, and remove your posted marketplace ads
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        </button>

        {/* My Orders */}
        <button
          onClick={() => setCustomerTab('orders')}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-zinc-900 dark:text-white block">
                {t('profile.my_orders')}
              </span>
              <span className="text-[11px] text-zinc-500">{t('profile.my_orders_desc')}</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        </button>

        {/* Saved / Favorites (OLX Wishlist) */}
        <button
          onClick={() => setCustomerTab('favorites')}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">
              <Heart className="w-4 h-4 fill-red-500/20" />
            </div>
            <div>
              <span className="text-sm font-bold text-zinc-900 dark:text-white block">
                Saved Advertisements (सहेजे गए विज्ञापन)
              </span>
              <span className="text-[11px] text-zinc-500">
                View farm produce and ads you marked with heart
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        </button>

        {/* Saved Addresses */}
        <button
          onClick={() => setIsAddressModalOpen(true)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-zinc-900 dark:text-white block">
                {t('profile.saved_addresses')}
              </span>
              <span className="text-[11px] text-zinc-500 truncate block max-w-[200px]">
                {defaultAddressStr}
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        </button>

        {/* Security & Credentials */}
        <button
          onClick={() => setIsSecurityModalOpen(true)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-zinc-900 dark:text-white block">
                Security & Credentials (सुरक्षा और क्रेडेंशियल)
              </span>
              <span className="text-[11px] text-zinc-500">
                Change password, Google SSO, and account deletion
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        </button>

        {/* Notification Preferences */}
        <button
          onClick={() => setIsNotificationModalOpen(true)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-zinc-900 dark:text-white block">
                Notification Preferences
              </span>
              <span className="text-[11px] text-zinc-500">
                Manage alerts for order updates, delivery & farmer chat
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        </button>

        {/* Help & Support */}
        <button
          onClick={() => setIsHelpSupportOpen(true)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-zinc-900 dark:text-white block">
                {t('profile.help_support')}
              </span>
              <span className="text-[11px] text-zinc-500">{t('profile.help_support_desc')}</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        </button>

        {/* Privacy Policy */}
        <button
          onClick={() => setIsPrivacyOpen(true)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-zinc-900 dark:text-white block">
                {t('profile.privacy_policy')}
              </span>
              <span className="text-[11px] text-zinc-500">{t('profile.privacy_policy_desc')}</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-red-600 dark:text-red-400"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600">
              <LogOut className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold block">
                Log Out (लॉग आउट)
              </span>
              <span className="text-[11px] text-red-400/80">
                End session on this device
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-red-400" />
        </button>
      </div>

      {/* Multilingual 5-Language Preference Selection */}
      <div className="p-4 bg-white dark:bg-[#1B201D] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80">
        <LanguageSelector variant="full" showTitle={true} />
      </div>

      {/* Theme Selector */}
      <div className="p-4 bg-white dark:bg-[#1B201D] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 space-y-2.5">
        <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          {t('profile.theme_preference')}
        </span>
        <div className="grid grid-cols-3 gap-2">
          {(['light', 'dark', 'system'] as const).map((mode) => {
            const isSelected = theme === mode;
            return (
              <button
                key={mode}
                onClick={() => setTheme(mode)}
                className={`min-h-[44px] py-2 px-2.5 rounded-xl border text-xs font-bold capitalize transition-all flex items-center justify-center gap-1.5 ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300'
                    : 'border-zinc-200 dark:border-zinc-700/70 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50'
                }`}
              >
                {mode === 'light' && <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                {mode === 'dark' && <Moon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                {mode === 'system' && <Monitor className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
                <span className="truncate">{mode}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Reset Demo State Button */}
      <div className="text-center pt-2">
        <button
          onClick={resetDemoData}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 py-1.5 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>{t('profile.reset_demo')}</span>
        </button>
      </div>

      {/* Interactive Profile Modals */}
      <EditCustomerProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        currentProfile={profileData}
        onProfileUpdated={(updated) => {
          setProfileData(updated);
        }}
        showToast={showToast}
      />

      <AddressManagementModal
        isOpen={isAddressModalOpen}
        onClose={() => {
          setIsAddressModalOpen(false);
          loadProfile();
        }}
        showToast={showToast}
      />

      <CustomerSecurityModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
        isGoogleConnected={profileData?.isGoogleConnected}
        showToast={showToast}
      />

      <NotificationPreferencesModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        showToast={showToast}
      />

      <PrivacyPolicyModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
        onDeleteAccount={() => setIsSecurityModalOpen(true)}
      />

      {/* Interactive Help & Support Modal */}
      {isHelpSupportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#181D1A] rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-5 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 rounded-xl">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-zinc-900 dark:text-white">
                    HALDER Help & Support
                  </h3>
                  <span className="text-[11px] text-zinc-500">किसान व ग्राहक सहायता केंद्र</span>
                </div>
              </div>
              <button
                onClick={() => setIsHelpSupportOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Contact Action Cards */}
            <div className="space-y-2.5">
              <a
                href={`tel:${(platformSettings?.helplinePhone || '+919876543210').replace(/\s+/g, '')}`}
                className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-600 text-white rounded-xl">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                      Toll-Free Kisan & Buyer Helpline
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {platformSettings?.helplinePhone || '+91 98765 43210'}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-white dark:bg-zinc-800 px-2.5 py-1 rounded-lg text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Call Now
                </span>
              </a>

              <a
                href={`mailto:${platformSettings?.supportEmail || 'support@halder.farm'}`}
                className="p-3.5 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-800/60 flex items-center justify-between hover:bg-blue-100 dark:hover:bg-blue-900/40 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-600 text-white rounded-xl">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                      Dispute & Escalation Email
                    </span>
                    <span className="text-xs font-mono text-blue-700 dark:text-blue-400">
                      {platformSettings?.supportEmail || 'support@halder.farm'}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-white dark:bg-zinc-800 px-2.5 py-1 rounded-lg text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Email
                </span>
              </a>

              <a
                href={`https://wa.me/919876543210?text=${encodeURIComponent('Namaste HALDER Support Team! I need assistance with an order on HALDER.')}`}
                target="_blank"
                rel="noreferrer"
                className="p-3.5 bg-green-50 dark:bg-green-950/40 rounded-2xl border border-green-200 dark:border-green-800/60 flex items-center justify-between hover:bg-green-100 dark:hover:bg-green-900/40 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-green-600 text-white rounded-xl">
                    <span className="text-base">💬</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                      WhatsApp Instant Support
                    </span>
                    <span className="text-[11px] text-green-700 dark:text-green-400">
                      Chat with a support executive in Hindi/English
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-white dark:bg-zinc-800 px-2.5 py-1 rounded-lg text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800">
                  Chat
                </span>
              </a>
            </div>

            {/* Quick FAQs */}
            <div className="space-y-2 pt-1 border-t border-zinc-100 dark:border-zinc-800">
              <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">
                Frequently Asked Questions (अक्सर पूछे जाने वाले सवाल)
              </span>

              <div className="space-y-2 text-xs">
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700/60">
                  <span className="font-bold text-zinc-900 dark:text-white block mb-0.5">
                    How does Zero-Commission direct farmer delivery work?
                  </span>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    HALDER charges 0% commission from farmers. 100% of the produce price goes directly into the farmer's bank account via instant UPI.
                  </p>
                </div>

                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700/60">
                  <span className="font-bold text-zinc-900 dark:text-white block mb-0.5">
                    What if my delivered produce is underweight or damaged?
                  </span>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    Open your "My Orders" tab, click "Report Issue / Raise Dispute", select the issue type, and submit. Our admin team will investigate and issue an instant UPI refund.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsHelpSupportOpen(false)}
              className="w-full py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-800 dark:text-zinc-200 font-bold rounded-xl text-xs transition"
            >
              Close Support
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
