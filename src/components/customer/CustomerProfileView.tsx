import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../i18n';
import { ApiClient } from '../../api/client';
import { handleAvatarError } from '../../utils/imageFallback';
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
  Sprout,
  HandCoins,
} from 'lucide-react';

import { PrivacyPolicyModal } from '../common/PrivacyPolicyModal';
import { EditCustomerProfileModal } from './EditCustomerProfileModal';
import { AddressManagementModal } from './AddressManagementModal';
import { CustomerSecurityModal } from './CustomerSecurityModal';
import { NotificationPreferencesModal } from './NotificationPreferencesModal';

export const CustomerProfileView: React.FC = () => {
  const {
    currentUser,
    setRole,
    setCustomerTab,
    resetDemoData,
    showToast,
    logout,
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
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const loadProfile = async () => {
    setIsLoadingProfile(true);
    try {
      const data = await ApiClient.getCustomerProfile();
      if (data) {
        setProfileData(data);
        try {
          localStorage.setItem('halder-customer-profile-cache', JSON.stringify(data));
        } catch {}
      }
    } catch {
      try {
        const cached = localStorage.getItem('halder-customer-profile-cache');
        if (cached) setProfileData(JSON.parse(cached));
      } catch {}
    }
    setIsLoadingProfile(false);
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const displayName = profileData?.name || currentUser?.name || 'HALDER User';
  const displayUsername = (profileData as any)?.username || currentUser?.username || '';
  const displayId = profileData?.halderId || currentUser?.halder_id || 'HAL-CUS-00000001';
  const displayPhone = profileData?.phone || currentUser?.phone || '';
  const displayEmail = profileData?.email || currentUser?.email || '';
  const displayAvatar = profileData?.avatar || currentUser?.profile_image || '';
  const defaultAddressStr = profileData?.defaultAddress
    ? `${profileData.defaultAddress.house_building}, ${profileData.defaultAddress.street_locality}, ${profileData.defaultAddress.city}`
    : '';

  const initials = displayName
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6 pb-24 animate-fade-in max-w-3xl mx-auto">
      {/* Profile Header Card */}
      <div className="p-3.5 sm:p-5 bg-white dark:bg-[#1B201D] rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-soft flex items-center gap-3 sm:gap-4 relative overflow-hidden">
        {/* Avatar with Edit Badge */}
        <div className="relative group cursor-pointer shrink-0" onClick={() => setIsEditModalOpen(true)}>
          {displayAvatar ? (
            <img
              src={displayAvatar}
              alt={displayName}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-emerald-600/40 shadow-xs"
              onError={handleAvatarError}
            />
          ) : (
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-black text-lg sm:text-xl flex items-center justify-center border-2 border-emerald-600/30">
              {initials}
            </div>
          )}
          <div className="absolute -bottom-1 -right-1 p-1 bg-emerald-600 text-white rounded-lg shadow-xs hover:bg-emerald-700 transition">
            <Edit2 className="w-3 h-3" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="text-lg font-black text-zinc-900 dark:text-white truncate">
              {displayName}
            </h3>
            {displayUsername && (
              <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                @{displayUsername}
              </span>
            )}
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
      <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
        <div className="p-2.5 sm:p-3 bg-white dark:bg-[#1B201D] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 text-center min-w-0">
          <span className="text-base sm:text-lg font-heading font-black text-emerald-700 dark:text-emerald-400 block truncate">
            {myAdsCount}
          </span>
          <span className="text-[9px] sm:text-[10px] uppercase font-bold text-zinc-400 tracking-wider truncate block">
            Active Ads
          </span>
        </div>
        <div className="p-2.5 sm:p-3 bg-white dark:bg-[#1B201D] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 text-center min-w-0">
          <span className="text-base sm:text-lg font-heading font-black text-blue-600 dark:text-blue-400 block truncate">
            {profileData?.totalAddresses || 1}
          </span>
          <span className="text-[9px] sm:text-[10px] uppercase font-bold text-zinc-400 tracking-wider truncate block">
            Addresses
          </span>
        </div>
        <div className="p-2.5 sm:p-3 bg-white dark:bg-[#1B201D] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 text-center min-w-0">
          <span className="text-base sm:text-lg font-heading font-black text-purple-600 dark:text-purple-400 block truncate">
            {profileData?.favoritesCount || 0}
          </span>
          <span className="text-[9px] sm:text-[10px] uppercase font-bold text-zinc-400 tracking-wider truncate block">
            Favorites
          </span>
        </div>
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
                Change password and account deletion
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
                Manage alerts for ad inquiries & farmer chat
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
          <div className="w-full max-w-md bg-white dark:bg-[#181F1A] rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-5 max-h-[90vh] overflow-y-auto no-scrollbar">
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
                    HALDER charges 0% commission. You connect directly with verified farmers via direct call or chat and pay them directly upon inspection.
                  </p>
                </div>

                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700/60">
                  <span className="font-bold text-zinc-900 dark:text-white block mb-0.5">
                    How do deals work on HALDER?
                  </span>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    HALDER works like direct classifieds. Browse crops, call or chat with the farmer directly, inspect the harvest, and settle the deal with complete transparency.
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

      {/* In-App Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in" onClick={() => setShowLogoutConfirm(false)}>
          <div className="w-full max-w-sm bg-white dark:bg-[#1B201D] rounded-3xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4 animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-zinc-900 dark:text-white">
                Log Out of HALDER?
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Are you sure you want to end your session on this device?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="py-2.5 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 font-bold text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowLogoutConfirm(false);
                  logout();
                }}
                className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 font-bold text-xs text-white shadow-soft transition"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
