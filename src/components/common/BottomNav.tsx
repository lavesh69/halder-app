import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Home,
  Search,
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
} from 'lucide-react';

export const BottomNav: React.FC = () => {
  const {
    role,
    customerTab,
    setCustomerTab,
    farmerTab,
    setFarmerTab,
    adminTab,
    setAdminTab,
    setIsFastSellOpen,
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
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#151917]/95 backdrop-blur-md border-t border-zinc-200/80 dark:border-zinc-800/80 max-w-2xl mx-auto transition-colors shadow-lg pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex items-center justify-between overflow-x-auto no-scrollbar px-1.5 py-1 gap-0.5">
          <button
            onClick={() => setAdminTab('overview')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all shrink-0 ${
              adminTab === 'overview'
                ? 'text-purple-600 dark:text-purple-400 font-bold'
                : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Overview</span>
          </button>

          <button
            onClick={() => setAdminTab('users')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all shrink-0 ${
              adminTab === 'users'
                ? 'text-purple-600 dark:text-purple-400 font-bold'
                : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Users</span>
          </button>

          <button
            onClick={() => setAdminTab('verification')}
            className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all shrink-0 ${
              adminTab === 'verification'
                ? 'text-purple-600 dark:text-purple-400 font-bold'
                : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <div className="relative">
              <ShieldCheck className="w-5 h-5" />
              {pendingFarmerVerifications > 0 && (
                <span className="absolute -top-1 -right-2 bg-amber-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                  {pendingFarmerVerifications}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5">Farmers</span>
          </button>

          <button
            onClick={() => setAdminTab('products')}
            className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all shrink-0 ${
              adminTab === 'products'
                ? 'text-purple-600 dark:text-purple-400 font-bold'
                : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700'
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
            <span className="text-[10px] mt-0.5">Listings</span>
          </button>

          <button
            onClick={() => setAdminTab('orders')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all shrink-0 ${
              adminTab === 'orders'
                ? 'text-purple-600 dark:text-purple-400 font-bold'
                : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <Package className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Orders</span>
          </button>

          <button
            onClick={() => setAdminTab('categories')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all shrink-0 ${
              adminTab === 'categories'
                ? 'text-purple-600 dark:text-purple-400 font-bold'
                : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <Layers className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Categories</span>
          </button>

          <button
            onClick={() => setAdminTab('audit')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all shrink-0 ${
              adminTab === 'audit'
                ? 'text-purple-600 dark:text-purple-400 font-bold'
                : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <Activity className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Logs</span>
          </button>

          <button
            onClick={() => setAdminTab('settings')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all shrink-0 ${
              adminTab === 'settings'
                ? 'text-purple-600 dark:text-purple-400 font-bold'
                : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Settings</span>
          </button>
        </div>
      </nav>
    );
  }

  if (role === 'customer') {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#151917]/95 backdrop-blur-md border-t border-zinc-200/80 dark:border-zinc-800/80 max-w-2xl mx-auto transition-colors shadow-lg pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex items-center justify-around px-1.5 sm:px-2 py-1.5">
          {/* 1. Home (होम) */}
          <button
            onClick={() => {
              setCustomerTab('home');
              setIsSearchScreenOpen(false);
            }}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              customerTab === 'home'
                ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Home</span>
          </button>

          {/* 2. Orders (ऑर्डर) */}
          <button
            onClick={() => {
              setCustomerTab('orders');
              setIsSearchScreenOpen(false);
            }}
            className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              customerTab === 'orders'
                ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <div className="relative">
              <Clock className="w-5 h-5" />
              {activeCustomerOrdersCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-emerald-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                  {activeCustomerOrdersCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5">Orders</span>
          </button>

          {/* 3. Center Elevated + SELL Button (Iconic OLX) */}
          <button
            onClick={() => setIsFastSellOpen(true)}
            className="flex flex-col items-center justify-center -mt-5 group"
            title="Post Advertisement"
          >
            <div className="w-13 h-13 rounded-full bg-emerald-600 group-hover:bg-emerald-700 text-white flex items-center justify-center shadow-lg border-4 border-white dark:border-[#151917] transition-all active:scale-95 group-hover:scale-105">
              <Plus className="w-6 h-6 stroke-[3]" />
            </div>
            <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 mt-0.5">
              + SELL
            </span>
          </button>

          {/* 4. Chats (चैट) - OLX Style */}
          <button
            onClick={() => {
              setCustomerTab('chats');
              setIsSearchScreenOpen(false);
            }}
            className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              customerTab === 'chats'
                ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <div className="relative">
              <MessageCircle className="w-5 h-5" />
              {unreadChatCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-emerald-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                  {unreadChatCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5">Chats</span>
          </button>

          {/* 5. My Ads (मेरे विज्ञापन) - OLX Style */}
          <button
            onClick={() => {
              setCustomerTab('my-ads');
              setIsSearchScreenOpen(false);
            }}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              customerTab === 'my-ads'
                ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <Megaphone className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">My Ads</span>
          </button>

          {/* 6. Account (खाता / प्रोफाइल) */}
          <button
            onClick={() => {
              setCustomerTab('profile');
              setIsSearchScreenOpen(false);
            }}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              customerTab === 'profile'
                ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Account</span>
          </button>
        </div>
      </nav>
    );
  }

  // Farmer Bottom Nav
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#151917]/95 backdrop-blur-md border-t border-zinc-200/80 dark:border-zinc-800/80 max-w-2xl mx-auto transition-colors shadow-lg pb-[env(safe-area-inset-bottom,0px)]">
      <div className="flex items-center justify-between sm:justify-around overflow-x-auto no-scrollbar px-1 sm:px-2 py-1.5 gap-0.5">
        {/* 1. Dashboard (Mandi) */}
        <button
          onClick={() => setFarmerTab('dashboard')}
          className={`flex flex-col items-center justify-center py-1 px-1 sm:px-2 rounded-xl transition-all ${
            farmerTab === 'dashboard'
              ? 'text-emerald-700 dark:text-emerald-400 font-bold'
              : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Mandi</span>
        </button>

        {/* 2. Listings (Crops) */}
        <button
          onClick={() => setFarmerTab('listings')}
          className={`relative flex flex-col items-center justify-center py-1 px-1 sm:px-2 rounded-xl transition-all ${
            farmerTab === 'listings'
              ? 'text-emerald-700 dark:text-emerald-400 font-bold'
              : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700'
          }`}
        >
          <Sprout className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Crops</span>
        </button>

        {/* 3. Orders */}
        <button
          onClick={() => setFarmerTab('orders')}
          className={`relative flex flex-col items-center justify-center py-1 px-1 sm:px-2 rounded-xl transition-all ${
            farmerTab === 'orders'
              ? 'text-emerald-700 dark:text-emerald-400 font-bold'
              : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700'
          }`}
        >
          <div className="relative">
            <Clock className="w-5 h-5" />
            {pendingFarmerOrdersCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-amber-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                {pendingFarmerOrdersCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5">Orders</span>
        </button>

        {/* 4. Elevated + Sell Button */}
        <button
          onClick={() => setIsFastSellOpen(true)}
          className="flex flex-col items-center justify-center -mt-5 group px-0.5"
          title="Post new crop listing"
        >
          <div className="w-13 h-13 rounded-full bg-emerald-600 group-hover:bg-emerald-700 text-white flex items-center justify-center shadow-lg border-4 border-white dark:border-[#151917] transition-all active:scale-95 group-hover:scale-105">
            <Plus className="w-6 h-6 stroke-[3]" />
          </div>
          <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 mt-0.5">
            + Sell
          </span>
        </button>

        {/* 5. Earnings */}
        <button
          onClick={() => setFarmerTab('earnings')}
          className={`flex flex-col items-center justify-center py-1 px-1 sm:px-2 rounded-xl transition-all ${
            farmerTab === 'earnings'
              ? 'text-emerald-700 dark:text-emerald-400 font-bold'
              : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700'
          }`}
        >
          <TrendingUp className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Earnings</span>
        </button>

        {/* 6. Messages (Chat) */}
        <button
          onClick={() => setFarmerTab('chat')}
          className={`relative flex flex-col items-center justify-center py-1 px-1 sm:px-2 rounded-xl transition-all ${
            farmerTab === 'chat'
              ? 'text-emerald-700 dark:text-emerald-400 font-bold'
              : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700'
          }`}
        >
          <div className="relative">
            <MessageCircle className="w-5 h-5" />
            {unreadChatCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-emerald-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                {unreadChatCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5">Chat</span>
        </button>

        {/* 7. Profile */}
        <button
          onClick={() => setFarmerTab('profile')}
          className={`flex flex-col items-center justify-center py-1 px-1 sm:px-2 rounded-xl transition-all ${
            farmerTab === 'profile'
              ? 'text-emerald-700 dark:text-emerald-400 font-bold'
              : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Profile</span>
        </button>
      </div>
    </nav>
  );
};
