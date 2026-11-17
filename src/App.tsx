import React, { useState, useEffect } from 'react';
import { useApp } from './context/AppContext';
import { Header } from './components/common/Header';
import { BottomNav } from './components/common/BottomNav';
import { Toast } from './components/common/Toast';
import { LocationModal } from './components/common/LocationModal';

// Customer screens & modals
import { SplashScreen } from './components/customer/SplashScreen';
import { Onboarding } from './components/customer/Onboarding';
import { MarketplaceHome } from './components/customer/MarketplaceHome';
import { SearchScreen } from './components/customer/SearchScreen';
import { FilterBottomSheet } from './components/customer/FilterBottomSheet';
import { FavoritesView } from './components/customer/FavoritesView';
import { CustomerOrdersView } from './components/customer/CustomerOrdersView';
import { CustomerProfileView } from './components/customer/CustomerProfileView';
import { ListingDetailModal } from './components/customer/ListingDetailModal';
import { FarmerSellerProfileModal } from './components/customer/FarmerSellerProfileModal';
import { OrderTrackingModal } from './components/customer/OrderTrackingModal';
import { MarketplaceChatModal } from './components/customer/MarketplaceChatModal';
import { FastSellModal } from './components/customer/FastSellModal';
import { CustomerChatsView } from './components/customer/CustomerChatsView';
import { CustomerMyAdsView } from './components/customer/CustomerMyAdsView';
import { ReviewModal } from './components/common/ReviewModal';

// Agricultural Classifieds & Reverse Marketplace Modals
import { RequirementsMarketplaceView } from './components/customer/RequirementsMarketplaceView';
import { SavedSearchesModal } from './components/customer/SavedSearchesModal';
import { StockControlModal } from './components/farmer/StockControlModal';

// Farmer screens & modals (Code-split for performance)
const FarmerDashboard = React.lazy(() => import('./components/farmer/FarmerDashboard').then(m => ({ default: m.FarmerDashboard })));
const FarmerOrdersView = React.lazy(() => import('./components/farmer/FarmerOrdersView').then(m => ({ default: m.FarmerOrdersView })));
const FarmerChatView = React.lazy(() => import('./components/farmer/FarmerChatView').then(m => ({ default: m.FarmerChatView })));
const FarmerProfileView = React.lazy(() => import('./components/farmer/FarmerProfileView').then(m => ({ default: m.FarmerProfileView })));

// Admin dashboard & Notifications
const AdminDashboard = React.lazy(() => import('./components/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
import { NotificationModal } from './components/common/NotificationModal';
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
    isLoginModalOpen,
    setIsLoginModalOpen,
    isDeviceFrame,
    isSearchScreenOpen,
    buyNowProduct,
    setBuyNowProduct,
    isFarmMapOpen,
    setIsFarmMapOpen,
    isRequirementsOpen,
    setIsRequirementsOpen,
    isNegotiationsOpen,
    setIsNegotiationsOpen,
    isSavedSearchesOpen,
    setIsSavedSearchesOpen,
    stockControlProduct,
    setStockControlProduct,
    reviewTarget,
    setReviewTarget,
  } = useApp();

  // Proactively clear any legacy lockout or PIN artifacts from client storage
  useEffect(() => {
    try {
      localStorage.removeItem('halder_admin_lockout_until');
      localStorage.removeItem('halder_admin_pin_fails');
    } catch {
      // Ignore in restricted environments
    }
  }, []);

  // Splash Screen
  if (showSplash) {
    return <SplashScreen />;
  }

  // Onboarding / Sign In
  if (!hasSeenOnboarding) {
    return <Onboarding />;
  }

  // Customer Screen Router
  const renderCustomerScreen = () => {
    if (customerTab === 'favorites') {
      return <FavoritesView />;
    }

    switch (customerTab) {
      case 'home':
        return <MarketplaceHome />;
      case 'chats':
        return <CustomerChatsView />;
      case 'my-ads':
        return <CustomerMyAdsView />;
      case 'search':
        return <SearchScreen />;
      case 'cart':
        return <MarketplaceHome />;
      case 'orders':
        return <CustomerOrdersView />;
      case 'profile':
        return <CustomerProfileView />;
      default:
        return <MarketplaceHome />;
    }
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
        content = <FarmerOrdersView />;
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

  // Screen Dispatcher based on Role
  const renderScreen = () => {
    if (role === 'admin') {
      return (
        <React.Suspense fallback={<div className="flex items-center justify-center min-h-[300px] text-sm text-zinc-500 font-medium">Loading Admin Command Center...</div>}>
          <AdminDashboard />
        </React.Suspense>
      );
    }
    if (role === 'farmer') {
      return renderFarmerScreen();
    }
    return renderCustomerScreen();
  };

  const appContent = (
    <div className="min-h-screen bg-[#F7F9F6] dark:bg-[#0F1411] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors duration-200">
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
      <main className="flex-1 max-w-7xl px-3 sm:px-6 w-full mx-auto pt-4 pb-24 transition-all duration-200">
        {renderScreen()}
      </main>

      {/* Modals & Overlays */}
      <ListingDetailModal />
      <FarmerSellerProfileModal />
      <OrderTrackingModal />
      <MarketplaceChatModal />
      <FastSellModal />
      <FilterBottomSheet />
      <LocationModal />
      <NotificationModal
        onOpenRequirements={() => setIsRequirementsOpen(true)}
      />
      <RequirementsMarketplaceView
        isOpen={isRequirementsOpen}
        onClose={() => setIsRequirementsOpen(false)}
      />
      <SavedSearchesModal
        isOpen={isSavedSearchesOpen}
        onClose={() => setIsSavedSearchesOpen(false)}
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
      {isLoginModalOpen && (
        <Onboarding
          initialShowLogin={true}
          onClose={() => setIsLoginModalOpen(false)}
        />
      )}

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
