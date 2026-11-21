import React from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n';
import {
  Home,
  Clock,
  User,
  LayoutDashboard,
  Sprout,
  Plus,
  ShieldCheck,
  Package,
  Layers,
  BarChart3,
  Users,
  MessageCircle,
  Megaphone,
  ShoppingBag,
  TrendingUp,
  Activity,
  Settings,
  Truck,
  CreditCard,
  Database,
  LogOut,
} from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { t } = useTranslation();
  const {
    role,
    customerTab,
    setCustomerTab,
    farmerTab,
    setFarmerTab,
    adminTab,
    setAdminTab,
    setIsFastSellOpen,
    setEditingListing,
    setIsSearchScreenOpen,
    orders,
    products,
    farmers,
    unreadChatCount,
    currentUser,
    isLoggedIn,
    logout,
  } = useApp();

  const currentUserId = currentUser?.farmerProfileId || currentUser?.id || 'farmer-1';
  const farmerAdsCount = products.filter(
    (p) => (p.farmerId === currentUserId || (currentUser?.name && p.farmerName === currentUser.name)) && p.isAvailable !== false
  ).length;

  const pendingFarmerVerifications = farmers.filter((f) => f.verification_status === 'pending').length;

  if (role === 'admin') {
    if (!isLoggedIn || currentUser?.role !== 'admin') return null;
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0F1411]/95 backdrop-blur-md border-t border-[#E5EBE6] dark:border-[#29352D] max-w-2xl mx-auto transition-colors shadow-soft-lg pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex items-center justify-between overflow-x-auto no-scrollbar px-1.5 py-1 gap-0.5">
          <button
            onClick={() => setAdminTab('overview')}
            className={`min-h-[48px] min-w-[48px] flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all shrink-0 ${
              adminTab === 'overview'
                ? 'text-purple-600 dark:text-purple-400 font-bold'
                : 'text-[#66736B] dark:text-[#A6B3AA] hover:text-[#202923]'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">{t('nav.overview')}</span>
          </button>

          <button
            onClick={() => setAdminTab('database')}
            className={`min-h-[48px] min-w-[48px] flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all shrink-0 ${
              adminTab === 'database'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-[#66736B] dark:text-[#A6B3AA] hover:text-[#202923]'
            }`}
          >
            <Database className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Live DB</span>
          </button>

          <button
            onClick={() => setAdminTab('users')}
            className={`min-h-[48px] min-w-[48px] flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all shrink-0 ${
              adminTab === 'users'
                ? 'text-purple-600 dark:text-purple-400 font-bold'
                : 'text-[#66736B] dark:text-[#A6B3AA] hover:text-[#202923]'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">{t('nav.users')}</span>
          </button>

          <button
            onClick={() => setAdminTab('verification')}
            className={`min-h-[48px] min-w-[48px] relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all shrink-0 ${
              adminTab === 'verification'
                ? 'text-purple-600 dark:text-purple-400 font-bold'
                : 'text-[#66736B] dark:text-[#A6B3AA] hover:text-[#202923]'
            }`}
          >
            <div className="relative">
              <ShieldCheck className="w-5 h-5" />
              {pendingFarmerVerifications > 0 && (
                <span className="absolute -top-1 -right-2 bg-[#D99A32] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                  {pendingFarmerVerifications}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5">{t('nav.farmer')}</span>
          </button>

          <button
            onClick={() => setAdminTab('products')}
            className={`min-h-[48px] min-w-[48px] relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all shrink-0 ${
              adminTab === 'products'
                ? 'text-purple-600 dark:text-purple-400 font-bold'
                : 'text-[#66736B] dark:text-[#A6B3AA] hover:text-[#202923]'
            }`}
          >
            <div className="relative">
              <ShoppingBag className="w-5 h-5" />
              {products.length > 0 && (
                <span className="absolute -top-1 -right-2 bg-purple-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {products.length}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5">{t('nav.listings')}</span>
          </button>

          <button
            onClick={() => setAdminTab('categories')}
            className={`min-h-[48px] min-w-[48px] flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all shrink-0 ${
              adminTab === 'categories'
                ? 'text-purple-600 dark:text-purple-400 font-bold'
                : 'text-[#66736B] dark:text-[#A6B3AA] hover:text-[#202923]'
            }`}
          >
            <Layers className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">{t('nav.categories')}</span>
          </button>

          <button
            onClick={() => setAdminTab('audit')}
            className={`min-h-[48px] min-w-[48px] flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all shrink-0 ${
              adminTab === 'audit'
                ? 'text-purple-600 dark:text-purple-400 font-bold'
                : 'text-[#66736B] dark:text-[#A6B3AA] hover:text-[#202923]'
            }`}
          >
            <Activity className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">{t('nav.logs')}</span>
          </button>

          <button
            onClick={() => setAdminTab('settings')}
            className={`min-h-[48px] min-w-[48px] flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all shrink-0 ${
              adminTab === 'settings'
                ? 'text-purple-600 dark:text-purple-400 font-bold'
                : 'text-[#66736B] dark:text-[#A6B3AA] hover:text-[#202923]'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">{t('nav.settings')}</span>
          </button>

          <button
            onClick={() => {
              if (window.confirm('Do you want to log out of Admin session? / क्या आप एडमिन सत्र से बाहर निकलना चाहते हैं?')) {
                logout();
              }
            }}
            className="min-h-[48px] min-w-[48px] flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all shrink-0 text-red-500 hover:text-red-700"
            title="Log Out"
          >
            <LogOut className="w-5 h-5 text-red-500" />
            <span className="text-[10px] mt-0.5 text-red-500 font-bold">{t('auth.logout') || 'Logout'}</span>
          </button>
        </div>
      </nav>
    );
  }

  if (role === 'customer' || (role === 'farmer' && (!isLoggedIn || currentUser?.role !== 'farmer'))) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0F1411]/95 backdrop-blur-md border-t border-[#E5EBE6] dark:border-[#29352D] max-w-2xl mx-auto transition-colors shadow-soft-lg pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex items-center justify-around px-2 py-1">
          {/* 1. Home (Explore) */}
          <button
            onClick={() => {
              setCustomerTab('home');
              setIsSearchScreenOpen(false);
            }}
            className={`min-h-[48px] flex-1 flex flex-col items-center justify-center py-1 rounded-2xl transition-all ${
              customerTab === 'home'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-black shadow-xs'
                : 'text-[#66736B] dark:text-[#A6B3AA] hover:text-[#202923]'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">{t('nav.home')}</span>
          </button>

          {/* 2. Chats */}
          <button
            onClick={() => {
              setCustomerTab('chats');
              setIsSearchScreenOpen(false);
            }}
            className={`min-h-[48px] flex-1 relative flex flex-col items-center justify-center py-1 rounded-2xl transition-all ${
              customerTab === 'chats'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-black shadow-xs'
                : 'text-[#66736B] dark:text-[#A6B3AA] hover:text-[#202923]'
            }`}
          >
            <div className="relative">
              <MessageCircle className="w-5 h-5" />
              {unreadChatCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-emerald-700 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                  {unreadChatCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5">{t('nav.chats')}</span>
          </button>

          {/* 3. Center Elevated + SELL Button (Signature Stitch Agritech Ring) */}
          <button
            onClick={() => {
              setEditingListing(null);
              setIsFastSellOpen(true);
            }}
            className="flex flex-col items-center justify-center -mt-5 group px-2"
            title="Post Advertisement / विज्ञापन पोस्ट करें"
          >
            <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-emerald-900 via-emerald-700 to-emerald-600 group-hover:from-emerald-800 group-hover:to-emerald-500 text-white flex items-center justify-center shadow-lg ring-4 ring-white dark:ring-[#0F1411] transition-all active:scale-95 group-hover:scale-105">
              <Plus className="w-6 h-6 stroke-[3]" />
            </div>
            <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-400 mt-0.5 tracking-wide">
              {t('nav.sell')}
            </span>
          </button>

          {/* 4. My Ads */}
          <button
            onClick={() => {
              setCustomerTab('my-ads');
              setIsSearchScreenOpen(false);
            }}
            className={`min-h-[48px] flex-1 relative flex flex-col items-center justify-center py-1 rounded-2xl transition-all ${
              customerTab === 'my-ads'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-black shadow-xs'
                : 'text-[#66736B] dark:text-[#A6B3AA] hover:text-[#202923]'
            }`}
          >
            <div className="relative">
              <Megaphone className="w-5 h-5" />
              {farmerAdsCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-emerald-700 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {farmerAdsCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5">{t('nav.my_ads')}</span>
          </button>

          {/* 5. Account */}
          <button
            onClick={() => {
              setCustomerTab('profile');
              setIsSearchScreenOpen(false);
            }}
            className={`min-h-[48px] flex-1 relative flex flex-col items-center justify-center py-1 rounded-2xl transition-all ${
              customerTab === 'profile' || customerTab === 'favorites'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-black shadow-xs'
                : 'text-[#66736B] dark:text-[#A6B3AA] hover:text-[#202923]'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">{t('nav.account')}</span>
          </button>
        </div>
      </nav>
    );
  }

  // Farmer Bottom Nav (5 Signature OLX Tabs - Zero Overcrowding)
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0F1411]/95 backdrop-blur-md border-t border-[#E5EBE6] dark:border-[#29352D] max-w-2xl mx-auto transition-colors shadow-soft-lg pb-[env(safe-area-inset-bottom,0px)]">
      <div className="flex items-center justify-between px-2 sm:px-4 py-1">
        {/* 1. Dashboard (Mandi) */}
        <button
          onClick={() => setFarmerTab('dashboard')}
          className={`min-h-[48px] flex-1 flex flex-col items-center justify-center py-1 rounded-2xl transition-all ${
            farmerTab === 'dashboard'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-black shadow-xs'
              : 'text-[#66736B] dark:text-[#A6B3AA] hover:text-[#202923]'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">{t('nav.mandi')}</span>
        </button>

        {/* 2. Messages (Chats) */}
        <button
          onClick={() => setFarmerTab('chat')}
          className={`min-h-[48px] flex-1 relative flex flex-col items-center justify-center py-1 rounded-2xl transition-all ${
            farmerTab === 'chat'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-black shadow-xs'
              : 'text-[#66736B] dark:text-[#A6B3AA] hover:text-[#202923]'
          }`}
        >
          <div className="relative">
            <MessageCircle className="w-5 h-5" />
            {unreadChatCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-emerald-700 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                {unreadChatCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5">{t('nav.chats')}</span>
        </button>

        {/* 3. Center Elevated + Post Ad Button (OLX Ring) */}
        <button
          onClick={() => {
            setEditingListing(null);
            setIsFastSellOpen(true);
          }}
          className="flex flex-col items-center justify-center -mt-5 group px-2"
          title="Post Crop Advertisement / फसल का नया विज्ञापन डालें"
        >
          <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-emerald-900 via-emerald-700 to-emerald-600 group-hover:from-emerald-800 group-hover:to-emerald-500 text-white flex items-center justify-center shadow-lg ring-4 ring-white dark:ring-[#0F1411] transition-all active:scale-95 group-hover:scale-105">
            <Plus className="w-6 h-6 stroke-[3]" />
          </div>
          <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-400 mt-0.5 tracking-wide">
            {t('nav.post_ad')}
          </span>
        </button>

        {/* 4. My Ads (मेरे विज्ञापन) */}
        <button
          onClick={() => setFarmerTab('my-ads')}
          className={`min-h-[48px] flex-1 relative flex flex-col items-center justify-center py-1 rounded-2xl transition-all ${
            farmerTab === 'my-ads' || farmerTab === 'listings'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-black shadow-xs'
              : 'text-[#66736B] dark:text-[#A6B3AA] hover:text-[#202923]'
          }`}
          title={t('nav.my_ads')}
        >
          <div className="relative">
            <Megaphone className="w-5 h-5" />
            {farmerAdsCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-emerald-700 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {farmerAdsCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5">{t('nav.my_ads')}</span>
        </button>

        {/* 5. Account (Profile) */}
        <button
          onClick={() => setFarmerTab('profile')}
          className={`min-h-[48px] flex-1 relative flex flex-col items-center justify-center py-1 rounded-2xl transition-all ${
            farmerTab === 'profile'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-black shadow-xs'
              : 'text-[#66736B] dark:text-[#A6B3AA] hover:text-[#202923]'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">{t('nav.account')}</span>
        </button>
      </div>
    </nav>
  );
};
