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
  } = useApp();

  const pendingFarmerOrdersCount = orders.filter((o) => o.status === 'placed').length;
  const activeCustomerOrdersCount = orders.filter((o) => !['delivered', 'rejected', 'cancelled'].includes(o.status)).length;
  const pendingFarmerVerifications = farmers.filter((f) => f.verification_status === 'pending').length;

  if (role === 'admin') {
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
            onClick={() => setAdminTab('orders')}
            className={`min-h-[48px] min-w-[48px] flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all shrink-0 ${
              adminTab === 'orders'
                ? 'text-purple-600 dark:text-purple-400 font-bold'
                : 'text-[#66736B] dark:text-[#A6B3AA] hover:text-[#202923]'
            }`}
          >
            <Package className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">{t('nav.orders')}</span>
          </button>

          <button
            onClick={() => setAdminTab('logistics')}
            className={`min-h-[48px] min-w-[48px] flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all shrink-0 ${
              adminTab === 'logistics'
                ? 'text-purple-600 dark:text-purple-400 font-bold'
                : 'text-[#66736B] dark:text-[#A6B3AA] hover:text-[#202923]'
            }`}
          >
            <Truck className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">{t('nav.logistics')}</span>
          </button>

          <button
            onClick={() => setAdminTab('finance')}
            className={`min-h-[48px] min-w-[48px] flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all shrink-0 ${
              adminTab === 'finance'
                ? 'text-purple-600 dark:text-purple-400 font-bold'
                : 'text-[#66736B] dark:text-[#A6B3AA] hover:text-[#202923]'
            }`}
          >
            <CreditCard className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">{t('nav.finance')}</span>
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
        </div>
      </nav>
    );
  }

  if (role === 'customer') {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0F1411]/95 backdrop-blur-md border-t border-[#E5EBE6] dark:border-[#29352D] max-w-2xl mx-auto transition-colors shadow-soft-lg pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex items-center justify-around px-1.5 sm:px-2 py-1">
          {/* 1. Home */}
          <button
            onClick={() => {
              setCustomerTab('home');
              setIsSearchScreenOpen(false);
            }}
            className={`min-h-[48px] min-w-[48px] flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              customerTab === 'home'
                ? 'text-[#176B45] dark:text-[#5FB383] font-bold'
                : 'text-[#66736B] dark:text-[#A6B3AA] hover:text-[#202923]'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">{t('nav.home')}</span>
          </button>

          {/* 2. Orders */}
          <button
            onClick={() => {
              setCustomerTab('orders');
              setIsSearchScreenOpen(false);
            }}
            className={`min-h-[48px] min-w-[48px] relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              customerTab === 'orders'
                ? 'text-[#176B45] dark:text-[#5FB383] font-bold'
                : 'text-[#66736B] dark:text-[#A6B3AA] hover:text-[#202923]'
            }`}
          >
            <div className="relative">
              <Clock className="w-5 h-5" />
              {activeCustomerOrdersCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-[#176B45] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                  {activeCustomerOrdersCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5">{t('nav.orders')}</span>
          </button>

          {/* 3. Center Elevated + SELL Button */}
          <button
            onClick={() => {
              setEditingListing(null);
              setIsFastSellOpen(true);
            }}
            className="flex flex-col items-center justify-center -mt-5 group"
            title="Post Advertisement / विज्ञापन पोस्ट करें"
          >
            <div className="w-13 h-13 rounded-full bg-[#176B45] group-hover:bg-[#124C36] text-white flex items-center justify-center shadow-soft-lg border-4 border-white dark:border-[#0F1411] transition-all active:scale-95 group-hover:scale-105">
              <Plus className="w-6 h-6 stroke-[3]" />
            </div>
            <span className="text-[10px] font-black text-[#176B45] dark:text-[#5FB383] mt-0.5">
              {t('nav.sell')}
            </span>
          </button>

          {/* 4. Chats */}
          <button
            onClick={() => {
              setCustomerTab('chats');
              setIsSearchScreenOpen(false);
            }}
            className={`min-h-[48px] min-w-[48px] relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              customerTab === 'chats'
                ? 'text-[#176B45] dark:text-[#5FB383] font-bold'
                : 'text-[#66736B] dark:text-[#A6B3AA] hover:text-[#202923]'
            }`}
          >
            <div className="relative">
              <MessageCircle className="w-5 h-5" />
              {unreadChatCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-[#176B45] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                  {unreadChatCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5">{t('nav.chats')}</span>
          </button>

          {/* 5. My Ads */}
          <button
            onClick={() => {
              setCustomerTab('my-ads');
              setIsSearchScreenOpen(false);
            }}
            className={`min-h-[48px] min-w-[48px] flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              customerTab === 'my-ads'
                ? 'text-[#176B45] dark:text-[#5FB383] font-bold'
                : 'text-[#66736B] dark:text-[#A6B3AA] hover:text-[#202923]'
            }`}
          >
            <Megaphone className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">{t('nav.my_ads')}</span>
          </button>

          {/* 6. Account */}
          <button
            onClick={() => {
              setCustomerTab('profile');
              setIsSearchScreenOpen(false);
            }}
            className={`min-h-[48px] min-w-[48px] flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              customerTab === 'profile'
                ? 'text-[#176B45] dark:text-[#5FB383] font-bold'
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

  // Farmer Bottom Nav
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0F1411]/95 backdrop-blur-md border-t border-[#E5EBE6] dark:border-[#29352D] max-w-2xl mx-auto transition-colors shadow-soft-lg pb-[env(safe-area-inset-bottom,0px)]">
      <div className="flex items-center justify-between sm:justify-around overflow-x-auto no-scrollbar px-1 sm:px-2 py-1 gap-0.5">
        {/* 1. Dashboard (Mandi) */}
        <button
          onClick={() => setFarmerTab('dashboard')}
          className={`min-h-[48px] min-w-[48px] flex flex-col items-center justify-center py-1 px-1 sm:px-2 rounded-xl transition-all ${
            farmerTab === 'dashboard'
              ? 'text-[#176B45] dark:text-[#5FB383] font-bold'
              : 'text-[#66736B] dark:text-[#A6B3AA] hover:text-[#202923]'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">{t('nav.mandi')}</span>
        </button>

        {/* 2. Listings (Crops) */}
        <button
          onClick={() => setFarmerTab('listings')}
          className={`min-h-[48px] min-w-[48px] relative flex flex-col items-center justify-center py-1 px-1 sm:px-2 rounded-xl transition-all ${
            farmerTab === 'listings'
              ? 'text-[#176B45] dark:text-[#5FB383] font-bold'
              : 'text-[#66736B] dark:text-[#A6B3AA] hover:text-[#202923]'
          }`}
        >
          <Sprout className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">{t('nav.crops')}</span>
        </button>

        {/* 3. Orders */}
        <button
          onClick={() => setFarmerTab('orders')}
          className={`min-h-[48px] min-w-[48px] relative flex flex-col items-center justify-center py-1 px-1 sm:px-2 rounded-xl transition-all ${
            farmerTab === 'orders'
              ? 'text-[#176B45] dark:text-[#5FB383] font-bold'
              : 'text-[#66736B] dark:text-[#A6B3AA] hover:text-[#202923]'
          }`}
        >
          <div className="relative">
            <Clock className="w-5 h-5" />
            {pendingFarmerOrdersCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-[#D99A32] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                {pendingFarmerOrdersCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5">{t('nav.orders')}</span>
        </button>

        {/* 4. Elevated + Post Ad Button */}
        <button
          onClick={() => {
            setEditingListing(null);
            setIsFastSellOpen(true);
          }}
          className="flex flex-col items-center justify-center -mt-5 group px-0.5"
          title="Post Crop Advertisement / फसल का नया विज्ञापन डालें"
        >
          <div className="w-13 h-13 rounded-full bg-[#176B45] group-hover:bg-[#124C36] text-white flex items-center justify-center shadow-soft-lg border-4 border-white dark:border-[#0F1411] transition-all active:scale-95 group-hover:scale-105">
            <Plus className="w-6 h-6 stroke-[3]" />
          </div>
          <span className="text-[10px] font-black text-[#176B45] dark:text-[#5FB383] mt-0.5 whitespace-nowrap">
            {t('nav.post_ad')}
          </span>
        </button>

        {/* 5. Earnings */}
        <button
          onClick={() => setFarmerTab('earnings')}
          className={`min-h-[48px] min-w-[48px] flex flex-col items-center justify-center py-1 px-1 sm:px-2 rounded-xl transition-all ${
            farmerTab === 'earnings'
              ? 'text-[#176B45] dark:text-[#5FB383] font-bold'
              : 'text-[#66736B] dark:text-[#A6B3AA] hover:text-[#202923]'
          }`}
        >
          <TrendingUp className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">{t('nav.earnings')}</span>
        </button>

        {/* 6. Messages (Chat) */}
        <button
          onClick={() => setFarmerTab('chat')}
          className={`min-h-[48px] min-w-[48px] relative flex flex-col items-center justify-center py-1 px-1 sm:px-2 rounded-xl transition-all ${
            farmerTab === 'chat'
              ? 'text-[#176B45] dark:text-[#5FB383] font-bold'
              : 'text-[#66736B] dark:text-[#A6B3AA] hover:text-[#202923]'
          }`}
        >
          <div className="relative">
            <MessageCircle className="w-5 h-5" />
            {unreadChatCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-[#176B45] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                {unreadChatCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5">{t('nav.chats')}</span>
        </button>

        {/* 7. Profile */}
        <button
          onClick={() => setFarmerTab('profile')}
          className={`min-h-[48px] min-w-[48px] flex flex-col items-center justify-center py-1 px-1 sm:px-2 rounded-xl transition-all ${
            farmerTab === 'profile'
              ? 'text-[#176B45] dark:text-[#5FB383] font-bold'
              : 'text-[#66736B] dark:text-[#A6B3AA] hover:text-[#202923]'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">{t('nav.profile')}</span>
        </button>
      </div>
    </nav>
  );
};
