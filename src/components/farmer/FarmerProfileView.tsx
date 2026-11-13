import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../i18n';
import { ApiClient } from '../../api/client';
import { LanguageSelector } from '../common/LanguageSelector';
import { FarmerBankSettingsModal } from './FarmerBankSettingsModal';
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
  ChevronRight,
} from 'lucide-react';

export const FarmerProfileView: React.FC = () => {
  const { currentUser, setRole, resetDemoData, showToast, setIsFastSellOpen, setEditingListing, setFarmerTab, products } = useApp();
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const farmerId = currentUser?.farmerProfileId || 'farmer-1';

  const currentUserId = currentUser?.farmerProfileId || currentUser?.id || 'farmer-1';
  const myAdsCount = products.filter(
    (p) => (p.farmerId === currentUserId || (currentUser?.name && p.farmerName === currentUser.name)) && p.isAvailable !== false
  ).length;

  const [profile, setProfile] = useState<any>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);

  const [kycData, setKycData] = useState<any>(null);
  const [bankSettings, setBankSettings] = useState<{
    bankAccountName?: string;
    bankAccountNumber?: string;
    bankIfsc?: string;
    bankName?: string;
    upiId?: string;
    isConfigured?: boolean;
  }>({});

  const loadProfile = async () => {
    setIsLoadingProfile(true);
    try {
      const data = await ApiClient.getFarmerPrivateProfile();
      if (data) {
        setProfile(data);
        if (data.bankDetails) setBankSettings(data.bankDetails);
        if (data.kyc) setKycData(data.kyc);
      }
    } catch {}
    setIsLoadingProfile(false);
  };

  const loadKyc = async () => {
    try {
      const res = await ApiClient.getFarmerKYC(farmerId);
      if (res?.data) {
        setKycData(res.data);
      }
    } catch {}
  };

  const loadBankInfo = async () => {
    try {
      const res = await ApiClient.getFarmerEarnings(farmerId);
      if (res?.data?.bankDetails) {
        setBankSettings(res.data.bankDetails);
      } else if (res?.bankDetails) {
        setBankSettings(res.bankDetails);
      }
    } catch {}
  };

  useEffect(() => {
    loadProfile();
    loadBankInfo();
    loadKyc();
  }, [farmerId]);

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to log out of your HALDER farmer account?')) {
      await ApiClient.logout();
      showToast('Logged out successfully', 'info');
      setTimeout(() => {
        window.location.reload();
      }, 600);
    }
  };

  const displayName = profile?.name || currentUser?.name || 'Rajesh Kumar';
  const displayFarm = profile?.farmName || 'Green Valley Farm';
  const displayId = profile?.halderId || currentUser?.halder_id || 'HAL-FRM-00000001';
  const displayPhone = profile?.phone || currentUser?.phone || '+91 98450 12345';
  const displayLocation = profile?.location || 'Sarjapur Agro Belt, Bengaluru';
  const displayAvatar =
    profile?.avatar ||
    currentUser?.profile_image ||
    'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=200&auto=format&fit=crop&q=80';

  return (
    <div className="space-y-6 pb-24 animate-fade-in max-w-3xl mx-auto">
      {/* Farmer Card */}
      <div className="p-5 bg-white dark:bg-[#1B201D] rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-soft flex items-center gap-4 relative overflow-hidden">
        <div className="relative group cursor-pointer" onClick={() => setIsEditModalOpen(true)}>
          <img
            src={displayAvatar}
            alt={displayName}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-600/30 shadow-xs"
          />
          <div className="absolute -bottom-1 -right-1 p-1 bg-emerald-600 text-white rounded-lg shadow-xs hover:bg-emerald-700 transition">
            <Edit2 className="w-3 h-3" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-lg font-black text-zinc-900 dark:text-white truncate">
              {displayName}
            </h3>
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
        className="p-4 bg-gradient-to-r from-[#176B45] to-[#2E8B57] rounded-2xl text-white shadow-soft cursor-pointer hover:brightness-105 active:scale-98 transition-all flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl shrink-0">
            📢
          </div>
          <div>
            <h4 className="font-bold text-sm">Post Crop Advertisement (फसल का विज्ञापन दें)</h4>
            <p className="text-xs text-emerald-100">
              List fresh produce, set custom rates, and receive direct buyer calls
            </p>
          </div>
        </div>
        <Plus className="w-6 h-6 text-white stroke-[2.5]" />
      </div>

      {/* Switch to Customer Marketplace Button */}
      <div
        onClick={() => setRole('customer')}
        className="p-4 bg-linear-to-r from-emerald-800 to-emerald-950 rounded-2xl text-white shadow-soft cursor-pointer hover:opacity-95 transition-all flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="text-2xl">🛒</div>
          <div>
            <h4 className="font-bold text-sm">Switch to Customer App</h4>
            <p className="text-xs text-emerald-100">
              Browse the consumer marketplace & see how your products look
            </p>
          </div>
        </div>
        <Repeat className="w-5 h-5 text-emerald-200" />
      </div>

      {/* My Advertisements (OLX / Classifieds Style) */}
      <div className="bg-white dark:bg-[#1B201D] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden shadow-soft">
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
                  {t('my_ads.title')} ({t('nav.my_ads')})
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

      {/* Bank & UPI Settlement Setup */}
      <div className="p-4 bg-white dark:bg-[#1B201D] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
              Payout Bank & UPI Account (भुगतान खाता)
            </h4>
          </div>
          <button
            onClick={() => setIsBankModalOpen(true)}
            className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg transition"
          >
            {bankSettings.isConfigured ? 'Edit Details (बदलें)' : '+ Setup Account'}
          </button>
        </div>

        {bankSettings.isConfigured ? (
          <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {bankSettings.upiId ? (
                <Smartphone className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <div>
                <span className="font-bold text-zinc-900 dark:text-white block">
                  {bankSettings.upiId
                    ? `UPI: ${bankSettings.upiId}`
                    : `${bankSettings.bankName || 'Direct Bank'} (${bankSettings.bankAccountName})`}
                </span>
                <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">
                  {bankSettings.bankAccountNumber
                    ? `A/C: ••••••${bankSettings.bankAccountNumber.slice(-4)} • IFSC: ${bankSettings.bankIfsc}`
                    : 'Instant direct payouts activated'}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-zinc-800 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700 shrink-0">
              ✓ Active
            </span>
          </div>
        ) : (
          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 text-xs flex items-center justify-between">
            <span className="text-zinc-500 text-[11px]">
              No settlement account configured. Configure your UPI ID or Bank account to withdraw sale proceeds.
            </span>
            <button
              onClick={() => setIsBankModalOpen(true)}
              className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-bold text-[11px] shrink-0 ml-2"
            >
              Add Now
            </button>
          </div>
        )}
      </div>

      <FarmerBankSettingsModal
        isOpen={isBankModalOpen}
        onClose={() => setIsBankModalOpen(false)}
        farmerId={farmerId}
        initialSettings={bankSettings}
        onSuccess={() => loadBankInfo()}
        showToast={showToast}
      />

      {/* Farmer Government KYC & Mandi Certification */}
      <div className="p-4 bg-white dark:bg-[#1B201D] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
              Kisan KYC & Trust Certification (किसान पहचान सत्यापन)
            </h4>
          </div>
          <button
            onClick={() => setIsKycModalOpen(true)}
            className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg transition"
          >
            {kycData?.verificationStatus === 'verified'
              ? 'View Proof (प्रमाण देखें)'
              : kycData?.submittedAt
              ? 'Status (स्थिति)'
              : '+ Submit KYC'}
          </button>
        </div>

        {kycData?.verificationStatus === 'verified' ? (
          <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold text-zinc-900 dark:text-white block">
                  Official Certified Kisan (सत्यापित किसान)
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
                  Under Admin Review (समीक्षाधीन)
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
                  Verification Rejected (अस्वीकृत)
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
        onSuccess={() => loadKyc()}
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
                Change password, Google authentication, and account settings
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
                Log Out (लॉग आउट)
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

      {/* Reset Demo Data */}
      <div className="text-center pt-2">
        <button
          onClick={resetDemoData}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 py-1.5 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>{t('profile.reset_demo')}</span>
        </button>
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
        isGoogleConnected={false}
        showToast={showToast}
      />
    </div>
  );
};
