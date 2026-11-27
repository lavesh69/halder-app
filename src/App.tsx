import React, { useState, useEffect } from 'react';
import { useApp } from './context/appContextUtils';
import { Header } from './components/common/Header';
import { BottomNav } from './components/common/BottomNav';
import { Toast } from './components/common/Toast';
import { LocationModal } from './components/common/LocationModal';
import { PwaInstallBanner } from './components/common/PwaInstallBanner';

// Customer screens & modals (Code-split heavy modals & secondary tabs for fast initial load)
import { SplashScreen } from './components/customer/SplashScreen';
import { Onboarding } from './components/customer/Onboarding';
import { MarketplaceHome } from './components/customer/MarketplaceHome';
const SearchScreen = React.lazy(() => import('./components/customer/SearchScreen').then(m => ({ default: m.SearchScreen })));
const FilterBottomSheet = React.lazy(() => import('./components/customer/FilterBottomSheet').then(m => ({ default: m.FilterBottomSheet })));
const FavoritesView = React.lazy(() => import('./components/customer/FavoritesView').then(m => ({ default: m.FavoritesView })));
const CustomerProfileView = React.lazy(() => import('./components/customer/CustomerProfileView').then(m => ({ default: m.CustomerProfileView })));
const ListingDetailModal = React.lazy(() => import('./components/customer/ListingDetailModal').then(m => ({ default: m.ListingDetailModal })));
const FarmerSellerProfileModal = React.lazy(() => import('./components/customer/FarmerSellerProfileModal').then(m => ({ default: m.FarmerSellerProfileModal })));
const MarketplaceChatModal = React.lazy(() => import('./components/customer/MarketplaceChatModal').then(m => ({ default: m.MarketplaceChatModal })));
const FastSellModal = React.lazy(() => import('./components/customer/FastSellModal').then(m => ({ default: m.FastSellModal })));
const PostRequirementModal = React.lazy(() => import('./components/customer/PostRequirementModal').then(m => ({ default: m.PostRequirementModal })));
const CustomerChatsView = React.lazy(() => import('./components/customer/CustomerChatsView').then(m => ({ default: m.CustomerChatsView })));
const CustomerMyAdsView = React.lazy(() => import('./components/customer/CustomerMyAdsView').then(m => ({ default: m.CustomerMyAdsView })));
const ReviewModal = React.lazy(() => import('./components/common/ReviewModal').then(m => ({ default: m.ReviewModal })));

// Agricultural Classifieds Modals
const SavedSearchesModal = React.lazy(() => import('./components/customer/SavedSearchesModal').then(m => ({ default: m.SavedSearchesModal })));
const StockControlModal = React.lazy(() => import('./components/farmer/StockControlModal').then(m => ({ default: m.StockControlModal })));

// Farmer screens & modals (Code-split for performance)
const FarmerDashboard = React.lazy(() => import('./components/farmer/FarmerDashboard').then(m => ({ default: m.FarmerDashboard })));
const FarmerChatView = React.lazy(() => import('./components/farmer/FarmerChatView').then(m => ({ default: m.FarmerChatView })));
const FarmerProfileView = React.lazy(() => import('./components/farmer/FarmerProfileView').then(m => ({ default: m.FarmerProfileView })));

// Admin dashboard & Notifications
const AdminDashboard = React.lazy(() => import('./components/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
import { NotificationModal } from './components/common/NotificationModal';
import { DeviceBanScreen } from './components/common/DeviceBanScreen';
import { useAndroidHardware } from './hooks/useAndroidHardware';

export const MainApp: React.FC = () => {
  const { isOffline } = useAndroidHardware();
  const {
    role,
    customerTab,
    farmerTab,
    showSplash,
    hasSeenOnboarding,
    isLoggedIn,
    currentUser,
    isLoginModalOpen,
    setIsLoginModalOpen,
    isDeviceFrame,
    isSearchScreenOpen,
    isSavedSearchesOpen,
    setIsSavedSearchesOpen,
    stockControlProduct,
    setStockControlProduct,
    reviewTarget,
    setReviewTarget,
    isPostRequirementOpen,
    setIsPostRequirementOpen,
  } = useApp();

  // Global Device Hardware Ban Enforcement
  const [bannedDetail, setBannedDetail] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('halder_banned_device_cache');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handleBanned = (e: any) => {
      const detail = e.detail || { reason: 'Permanent hardware suspension' };
      setBannedDetail(detail);
      try {
        localStorage.setItem('halder_banned_device_cache', JSON.stringify(detail));
      } catch {}
    };

    window.addEventListener('halder:device-banned', handleBanned);
    return () => window.removeEventListener('halder:device-banned', handleBanned);
  }, []);

  // Proactively clear any legacy lockout or PIN artifacts from client storage
  useEffect(() => {
    try {
      localStorage.removeItem('halder_admin_lockout_until');
      localStorage.removeItem('halder_admin_pin_fails');
    } catch {
      // Ignore in restricted environments
    }
  }, []);

  if (bannedDetail) {
    return <DeviceBanScreen banDetail={bannedDetail} />;
  }

  // Splash Screen
  if (showSplash) {
    return <SplashScreen />;
  }

  // Onboarding / Sign In (skip marketing carousel when navigating directly to /admin)
  if (!hasSeenOnboarding && role !== 'admin') {
    return <Onboarding />;
  }

  // Customer Screen Router
  const renderCustomerScreen = () => {
    let content: React.ReactNode;
    if (customerTab === 'favorites') {
      content = <FavoritesView />;
    } else {
      switch (customerTab) {
        case 'home':
          content = <MarketplaceHome />;
          break;
        case 'chats':
          content = <CustomerChatsView />;
          break;
        case 'my-ads':
          content = <CustomerMyAdsView />;
          break;
        case 'search':
          content = <SearchScreen />;
          break;
        case 'profile':
          content = <CustomerProfileView />;
          break;
        default:
          content = <MarketplaceHome />;
          break;
      }
    }
    return (
      <React.Suspense fallback={<div className="flex items-center justify-center min-h-[260px] text-xs text-zinc-500 font-medium">Loading...</div>}>
        {content}
      </React.Suspense>
    );
  };

  // Farmer Screen Router
  // Farmer Screen Router (with code-split suspense boundary)
  const renderFarmerScreen = () => {
    let content: React.ReactNode;
    switch (farmerTab) {
      case 'dashboard':
        content = <FarmerDashboard />;
        break;
      case 'listings':
      case 'my-ads':
        content = <CustomerMyAdsView />;
        break;
      case 'orders':
        content = <FarmerDashboard />;
        break;
      case 'chat':
        content = <FarmerChatView />;
        break;
      case 'profile':
        content = <FarmerProfileView />;
        break;
      default:
        content = <FarmerDashboard />;
        break;
    }
    return (
      <React.Suspense fallback={<div className="flex items-center justify-center min-h-[300px] text-sm text-zinc-500 font-medium">Loading Farmer Center...</div>}>
        {content}
      </React.Suspense>
    );
  };

  // Screen Dispatcher based on Role with strict profile lock guards
  const renderScreen = () => {
    if (role === 'admin') {
      // Guard: strictly require logged in admin
      if (!isLoggedIn || currentUser?.role !== 'admin') {
        return (
          <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center text-purple-700 shadow-soft">
              <span className="text-2xl">🛡️</span>
            </div>
            <h2 className="text-xl font-black text-zinc-900 dark:text-white">Admin Access Restricted</h2>
            <p className="text-xs text-zinc-500 max-w-sm">Please log in with verified administrator credentials to access the moderation command center.</p>
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition shadow-sm"
            >
              Sign In as Admin
            </button>
            <button
              onClick={() => {
                localStorage.setItem('halder-role', 'customer');
                window.location.href = '/';
              }}
              className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline"
            >
              Return to Marketplace
            </button>
          </div>
        );
      }
      return (
        <React.Suspense fallback={<div className="flex items-center justify-center min-h-[300px] text-sm text-zinc-500 font-medium">Loading Admin Command Center...</div>}>
          <AdminDashboard />
        </React.Suspense>
      );
    }
    if (role === 'farmer') {
      // Guard: strictly require logged in farmer
      if (!isLoggedIn || currentUser?.role !== 'farmer') {
        return (
          <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center text-amber-700 shadow-soft">
              <span className="text-2xl">🌾</span>
            </div>
            <h2 className="text-xl font-black text-zinc-900 dark:text-white">Farmer Mandi Dashboard</h2>
            <p className="text-xs text-zinc-500 max-w-sm">Sign in with your farmer account to manage crop listings, view wholesale orders, and chat with buyers.</p>
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-sm"
            >
              Sign In as Farmer
            </button>
          </div>
        );
      }
      return renderFarmerScreen();
    }
    return renderCustomerScreen();
  };

  const appContent = (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#F7F9F6] dark:bg-[#0F1411] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors duration-200">
      {/* Global Toast */}
      <Toast />

      {/* Offline Status Banner */}
      {isOffline && (
        <div className="bg-amber-500 text-zinc-950 font-bold text-xs py-1.5 px-3 text-center flex items-center justify-center gap-1.5 shadow-sm sticky top-0 z-50">
          <span>📡 You are offline. Browsing saved farm produce.</span>
        </div>
      )}

      {/* Marketplace Header */}
      <Header />

      {/* Main Screen Feed */}
      <main className="flex-1 max-w-7xl px-2.5 sm:px-6 md:px-8 w-full min-w-0 max-w-full overflow-x-hidden mx-auto pt-3 sm:pt-4 pb-24 transition-all duration-200">
        {renderScreen()}
      </main>

      {/* Modals & Overlays */}
      <React.Suspense fallback={null}>
        <ListingDetailModal />
        <FarmerSellerProfileModal />
        <MarketplaceChatModal />
        <FastSellModal />
        <FilterBottomSheet />
        <LocationModal />
        <NotificationModal />
        <SavedSearchesModal
          isOpen={isSavedSearchesOpen}
          onClose={() => setIsSavedSearchesOpen(false)}
        />
        <PostRequirementModal
          isOpen={isPostRequirementOpen}
          onClose={() => setIsPostRequirementOpen(false)}
        />

        {reviewTarget && (
          <ReviewModal
            farmerId={reviewTarget.farmerId}
            farmerName={reviewTarget.farmerName}
            orderId={reviewTarget.orderId}
            onClose={() => setReviewTarget(null)}
          />
        )}
        <StockControlModal
          product={stockControlProduct}
          isOpen={!!stockControlProduct}
          onClose={() => setStockControlProduct(null)}
        />
        {isSearchScreenOpen && <SearchScreen />}
      </React.Suspense>
      {isLoginModalOpen && (
        <Onboarding
          initialShowLogin={true}
          onClose={() => setIsLoginModalOpen(false)}
        />
      )}

      {/* PWA 1-Tap Mobile Install Banner */}
      <PwaInstallBanner />

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );

  if (isDeviceFrame) {
    return (
      <div className="min-h-screen bg-zinc-200 dark:bg-zinc-950 flex items-center justify-center p-4 sm:p-8 transition-colors">
        <div className="w-full max-w-[420px] h-[880px] bg-black rounded-[48px] p-3 shadow-2xl border-4 border-zinc-800 relative overflow-hidden flex flex-col">
          {/* Dynamic Notch / Speaker Pill */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-4 bg-black rounded-full z-50 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-zinc-900 border border-zinc-800 mr-2" />
            <div className="w-10 h-1.5 bg-zinc-800 rounded-full" />
          </div>

          {/* Device Screen Viewport */}
          <div className="w-full h-full rounded-[38px] overflow-hidden overflow-y-auto no-scrollbar relative flex flex-col">
            {appContent}
          </div>
        </div>
      </div>
    );
  }

  return appContent;
};

import { ThemeProvider } from './context/ThemeContext';
import { AppProvider } from './context/AppContext';
import { LanguageProvider } from './i18n';
import { ErrorBoundary } from './components/common/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <AppProvider>
            <MainApp />
          </AppProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
