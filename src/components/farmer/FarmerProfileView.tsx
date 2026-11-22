import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../i18n';
import { ApiClient } from '../../api/client';
import { handleAvatarError, DEFAULT_AVATAR_IMAGE } from '../../utils/imageFallback';
import { LanguageSelector } from '../common/LanguageSelector';
import { FarmerKycModal } from './FarmerKycModal';
import { EditFarmerProfileModal } from './EditFarmerProfileModal';
import { CustomerSecurityModal } from '../customer/CustomerSecurityModal';
import {
  ShieldCheck,
  Sun,
  Moon,
  Monitor,
  Repeat,
  RotateCcw,
  Copy,
  Building2,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Clock,
  Edit2,
  Lock,
  LogOut,
  Sparkles,
  Plus,
  Megaphone,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';

export const FarmerProfileView: React.FC = () => {
  const { currentUser, setRole, resetDemoData, showToast, setIsFastSellOpen, setEditingListing, setFarmerTab, products, logout } = useApp();
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const farmerId = currentUser?.farmerProfileId || 'farmer-1';

  const currentUserId = currentUser?.farmerProfileId || currentUser?.id || 'farmer-1';
  const myAdsCount = products.filter(
    (p) => (p.farmerId === currentUserId || (currentUser?.name && p.farmerName === currentUser.name)) && p.isAvailable !== false
  ).length;

  const [profile, setProfile] = useState<any>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [kycData, setKycData] = useState<any>(null);

  const loadProfile = async () => {
    setIsLoadingProfile(true);
    try {
      const data = await ApiClient.getFarmerPrivateProfile();
      if (data) {
        setProfile(data);
        if (data.kyc) setKycData(data.kyc);
        try {
          localStorage.setItem('halder-farmer-profile-cache', JSON.stringify(data));
        } catch {}
      }
    } catch {
      try {
        const cached = localStorage.getItem('halder-farmer-profile-cache');
        if (cached) setProfile(JSON.parse(cached));
      } catch {}
    }
    setIsLoadingProfile(false);
  };

  const loadKyc = async () => {
    try {
      const res = await ApiClient.getFarmerKYC(farmerId);
      if (res?.data) {
        setKycData(res.data);
        return;
      }
    } catch {}
    try {
      const cached = localStorage.getItem(`halder-farmer-kyc-${farmerId}`);
      if (cached) setKycData(JSON.parse(cached));
    } catch {}
  };

  useEffect(() => {
    loadProfile();
    loadKyc();
  }, [farmerId]);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    logout();
  };

  const displayName = profile?.name || currentUser?.name || 'Kisan';
  const displayUsername = (profile as any)?.username || currentUser?.username || '';
  const displayFarm = profile?.farmName || (currentUser?.name ? `${currentUser.name}'s Farm` : 'Farm');
  const displayId = profile?.halderId || currentUser?.halder_id || 'HAL-FRM-00000001';
  const displayPhone = profile?.phone || currentUser?.phone || '';
  const displayLocation = profile?.location || '';
  const displayAvatar =
    profile?.avatar ||
    currentUser?.profile_image ||
    DEFAULT_AVATAR_IMAGE;

  return (
    <div className="space-y-6 pb-24 animate-fade-in max-w-3xl mx-auto">
      {/* Farmer Card */}
      <div className="p-3.5 sm:p-5 bg-white dark:bg-[#1B201D] rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-soft flex items-center gap-3 sm:gap-4 relative overflow-hidden">
        <div className="relative group cursor-pointer shrink-0" onClick={() => setIsEditModalOpen(true)}>
          <img
            src={displayAvatar}
            alt={displayName}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-emerald-600/30 shadow-xs"
            onError={handleAvatarError}
          />
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
            {kycData?.verificationStatus === 'verified' ? (
              <span title="Government KYC Verified Kisan">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              </span>
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-600/60 shrink-0" />
            )}
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
              title="Copy HALDER Farmer ID"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mt-1 truncate">
            {displayFarm}
          </p>
          <p className="text-[11px] text-zinc-400 truncate mt-0.5">
            {displayLocation} • {displayPhone}
          </p>
        </div>

        {/* Quick Edit Profile */}
        <button
          onClick={() => setIsEditModalOpen(true)}
          className="p-2 text-zinc-400 hover:text-emerald-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition shrink-0"
          title="Edit Farm Profile"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      </div>

      {/* Post Agricultural Ad Banner */}
      <div
        onClick={() => {
          setEditingListing(null);
          setIsFastSellOpen(true);
        }}
        className="p-4 bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-900 rounded-3xl text-white shadow-soft hover:shadow-soft-md cursor-pointer hover:brightness-105 active:scale-95 transition-all flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center text-xl shrink-0 shadow-xs">
            📢
          </div>
          <div>
            <h4 className="font-heading font-black text-sm">{t('nav.post_ad')}</h4>
            <p className="text-xs text-emerald-100">
              List fresh produce, set custom rates, and receive direct buyer calls
            </p>
          </div>
        </div>
        <Plus className="w-6 h-6 text-white stroke-[2.5]" />
      </div>

      {/* Farmer Center Action Links: My Ads, Earnings, Orders */}
      <div className="bg-white dark:bg-[#1B201D] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden shadow-soft divide-y divide-zinc-100 dark:divide-zinc-800/80">
        <button
          onClick={() => setFarmerTab('my-ads')}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-zinc-900 dark:text-white block">
                  {t('nav.my_ads')}
                </span>
                {myAdsCount > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                    {myAdsCount} Active
                  </span>
                )}
              </div>
              <span className="text-[11px] text-zinc-500">
                Manage, edit price, boost, and track views of your listed crop ads
              </span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-zinc-400" />
        </button>
      </div>

      {/* Farm Details Card */}
      <div className="p-4 bg-white dark:bg-[#1B201D] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Farm Certification & Practices
          </h4>
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            Edit Info
          </button>
        </div>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
            <span>Soil Accreditation:</span>
            <span className="font-bold text-zinc-900 dark:text-white">
              {profile?.organicCertificationBody || 'NPOP Certified Organic'}
            </span>
          </div>
          <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
            <span>Total Farm Area:</span>
            <span className="font-bold text-zinc-900 dark:text-white">
              {profile?.farmSizeAcres || 8.5} Acres
            </span>
          </div>
          <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
            <span>Water Source:</span>
            <span className="font-bold text-zinc-900 dark:text-white">
              {profile?.waterSource || 'Natural Rainwater & Deep Aquifer'}
            </span>
          </div>
          <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
            <span>Farming Experience:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {profile?.experienceYears || 10}+ Years
            </span>
          </div>
        </div>
      </div>

      {/* Farmer Government KYC & Mandi Certification */}
      <div className="p-4 bg-white dark:bg-[#1B201D] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
              Kisan KYC & Trust Certification
            </h4>
          </div>
          <button
            onClick={() => setIsKycModalOpen(true)}
            className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg transition"
          >
            {kycData?.verificationStatus === 'verified'
              ? 'View Proof'
              : kycData?.submittedAt
              ? 'Status'
              : '+ Submit KYC'}
          </button>
        </div>

        {kycData?.verificationStatus === 'verified' ? (
          <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold text-zinc-900 dark:text-white block">
                  Official Certified Kisan
                </span>
                <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">
                  {kycData.documentType?.toUpperCase()} Verified • {kycData.documentNumber}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-zinc-800 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700 shrink-0">
              ✓ Verified Badge
            </span>
          </div>
        ) : kycData?.verificationStatus === 'pending' && kycData?.submittedAt ? (
          <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-200/60 dark:border-amber-800/40 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold text-zinc-900 dark:text-white block">
                  Under Admin Review
                </span>
                <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">
                  Submitted {new Date(kycData.submittedAt).toLocaleDateString()} • {kycData.documentType?.toUpperCase()}
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsKycModalOpen(true)}
              className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-white dark:bg-zinc-800 px-2.5 py-1 rounded-lg border border-amber-300"
            >
              Check
            </button>
          </div>
        ) : kycData?.verificationStatus === 'rejected' ? (
          <div className="p-3 bg-red-50/60 dark:bg-red-950/30 rounded-xl border border-red-200/60 dark:border-red-800/40 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <div>
                <span className="font-bold text-red-900 dark:text-red-300 block">
                  Verification Rejected
                </span>
                <span className="text-red-700 dark:text-red-400 text-[11px] line-clamp-1">
                  {kycData.rejectionReason || 'Please re-submit clear documents.'}
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsKycModalOpen(true)}
              className="px-2.5 py-1 bg-red-600 text-white rounded-lg font-bold text-[11px] shrink-0 ml-2"
            >
              Re-submit
            </button>
          </div>
        ) : (
          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 text-xs flex items-center justify-between">
            <span className="text-zinc-500 text-[11px]">
              Upload Aadhaar, Kisan Credit Card, or Land Record (7/12) to receive the Green Verified trust mark.
            </span>
            <button
              onClick={() => setIsKycModalOpen(true)}
              className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-bold text-[11px] shrink-0 ml-2"
            >
              Verify Now
            </button>
          </div>
        )}
      </div>

      <FarmerKycModal
        isOpen={isKycModalOpen}
        onClose={() => setIsKycModalOpen(false)}
        farmerId={farmerId}
        onSuccess={() => {
          setKycData((prev: any) => ({
            ...prev,
            verificationStatus: 'pending',
            submittedAt: new Date().toISOString(),
          }));
          loadKyc();
        }}
        showToast={showToast}
      />

      {/* Security & Credentials */}
      <div className="bg-white dark:bg-[#1B201D] rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800/80 shadow-soft">
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
                Security & Account Credentials
              </span>
              <span className="text-[11px] text-zinc-500">
                Change password and account settings
              </span>
            </div>
          </div>
          <span className="text-xs text-zinc-400 font-bold">Manage</span>
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
                {t('auth.logout') || 'Log Out'}
              </span>
              <span className="text-[11px] text-red-400/80">
                End farmer session on this device
              </span>
            </div>
          </div>
          <span className="text-xs text-red-400 font-bold">Exit</span>
        </button>
      </div>

      {/* Multilingual 5-Language Preference Selection */}
      <div className="p-4 bg-white dark:bg-[#1B201D] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80">
        <LanguageSelector variant="full" showTitle={true} />
      </div>

      {/* Theme Preference */}
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

      {/* Edit Farmer Profile Modal */}
      <EditFarmerProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        currentProfile={profile}
        onProfileUpdated={(updated) => {
          setProfile(updated);
        }}
        showToast={showToast}
      />

      {/* Security Modal */}
      <CustomerSecurityModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
        showToast={showToast}
      />

      {/* In-App Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in" onClick={() => setShowLogoutConfirm(false)}>
          <div className="w-full max-w-sm bg-white dark:bg-[#1B201D] rounded-3xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4 animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-zinc-900 dark:text-white">
                Log Out of Farmer Account?
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Are you sure you want to end your farmer session on this device?
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
                onClick={confirmLogout}
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
