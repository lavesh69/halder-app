import { useEffect, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import { useApp } from '../context/AppContext';

export function useAndroidHardware() {
  const {
    isSearchScreenOpen,
    setIsSearchScreenOpen,
    isFilterModalOpen,
    setIsFilterModalOpen,
    selectedProduct,
    setSelectedProduct,
    selectedFarmer,
    setSelectedFarmer,
    trackingOrder,
    setTrackingOrder,
    isChatModalOpen,
    setIsChatModalOpen,
    isFastSellOpen,
    setIsFastSellOpen,
    isNotificationModalOpen,
    setIsNotificationModalOpen,
    buyNowProduct,
    setBuyNowProduct,
    isLocationModalOpen,
    setIsLocationModalOpen,
    isSavedSearchesOpen,
    setIsSavedSearchesOpen,
    stockControlProduct,
    setStockControlProduct,
    customerTab,
    setCustomerTab,
    farmerTab,
    setFarmerTab,
    role,
    products,
    farmers,
    orders,
    showToast,
  } = useApp();

  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [backPressedOnce, setBackPressedOnce] = useState(false);

  // 1. Network Connectivity Monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      showToast('Internet connection restored! 🌱', 'success');
    };
    const handleOffline = () => {
      setIsOffline(true);
      showToast("You're offline. Using offline farm cache.", 'info');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showToast]);

  // 2. Hardware Back Button & Web Browser History Navigation
  useEffect(() => {
    let listenerHandle: any = null;

    const closeTopModalOrStepBack = (): boolean => {
      // Priority 1: Close active modals
      if (isLocationModalOpen) {
        setIsLocationModalOpen(false);
        return true;
      }
      if (isSavedSearchesOpen) {
        setIsSavedSearchesOpen(false);
        return true;
      }
      if (stockControlProduct) {
        setStockControlProduct(null);
        return true;
      }
      if (isFastSellOpen) {
        setIsFastSellOpen(false);
        return true;
      }
      if (isChatModalOpen) {
        setIsChatModalOpen(false);
        return true;
      }
      if (trackingOrder) {
        setTrackingOrder(null);
        return true;
      }
      if (selectedFarmer) {
        setSelectedFarmer(null);
        return true;
      }
      if (selectedProduct) {
        setSelectedProduct(null);
        return true;
      }
      if (isFilterModalOpen) {
        setIsFilterModalOpen(false);
        return true;
      }
      if (isNotificationModalOpen) {
        setIsNotificationModalOpen(false);
        return true;
      }
      if (isSearchScreenOpen) {
        setIsSearchScreenOpen(false);
        return true;
      }
      if (buyNowProduct) {
        setBuyNowProduct(null);
        return true;
      }

      // Priority 2: Return to main marketplace tab if on sub-tab
      if (role === 'customer' && customerTab !== 'home') {
        setCustomerTab('home');
        return true;
      }
      if (role === 'farmer' && farmerTab !== 'dashboard') {
        setFarmerTab('dashboard');
        return true;
      }
      return false;
    };

    const setupBackButton = async () => {
      try {
        listenerHandle = await CapApp.addListener('backButton', () => {
          const handled = closeTopModalOrStepBack();
          if (!handled) {
            // Priority 3: Double-tap back to exit on root screen
            if (!backPressedOnce) {
              setBackPressedOnce(true);
              showToast('Press back again to exit HALDER', 'info');
              setTimeout(() => {
                setBackPressedOnce(false);
              }, 2500);
            } else {
              CapApp.exitApp();
            }
          }
        });
      } catch {
        // Fallback for non-Capacitor browser environments
      }
    };

    // Web Browser History PopState (Desktop & Mobile Browser Back Arrow)
    const handleWebPopState = (e: PopStateEvent) => {
      closeTopModalOrStepBack();
    };

    window.addEventListener('popstate', handleWebPopState);
    setupBackButton();

    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
      }
      window.removeEventListener('popstate', handleWebPopState);
    };
  }, [
    isFastSellOpen,
    isChatModalOpen,
    trackingOrder,
    selectedFarmer,
    selectedProduct,
    isFilterModalOpen,
    isNotificationModalOpen,
    isSearchScreenOpen,
    buyNowProduct,
    isLocationModalOpen,
    isSavedSearchesOpen,
    stockControlProduct,
    customerTab,
    farmerTab,
    role,
    backPressedOnce,
  ]);

  // Push history state whenever any modal opens so Browser Back closes the modal
  useEffect(() => {
    const hasOpenModal =
      isFastSellOpen ||
      isChatModalOpen ||
      !!selectedProduct ||
      !!selectedFarmer ||
      !!trackingOrder ||
      isFilterModalOpen ||
      isNotificationModalOpen ||
      isSearchScreenOpen ||
      isLocationModalOpen ||
      isSavedSearchesOpen ||
      !!stockControlProduct ||
      !!buyNowProduct;

    if (hasOpenModal && typeof window !== 'undefined') {
      window.history.pushState({ modalOpen: true }, '');
    }
  }, [
    isFastSellOpen,
    isChatModalOpen,
    selectedProduct,
    selectedFarmer,
    trackingOrder,
    isFilterModalOpen,
    isNotificationModalOpen,
    isSearchScreenOpen,
    isLocationModalOpen,
    isSavedSearchesOpen,
    stockControlProduct,
    buyNowProduct,
  ]);

  // 3. Deep Linking Intent Listener
  useEffect(() => {
    let deepLinkHandle: any = null;

    const setupDeepLinks = async () => {
      try {
        deepLinkHandle = await CapApp.addListener('appUrlOpen', (event) => {
          const url = event.url;
          // Example: halder://product/prod-1 or https://halder.in/product/prod-1
          if (url.includes('/product/') || url.includes('product/')) {
            const parts = url.split('product/');
            const productId = parts[1]?.split(/[?#]/)[0];
            const targetProd = products.find((p) => p.id === productId);
            if (targetProd) {
              setSelectedProduct(targetProd);
              showToast(`Opened ${targetProd.name}`);
            }
          } else if (url.includes('/farmer/') || url.includes('farmer/')) {
            const parts = url.split('farmer/');
            const farmerId = parts[1]?.split(/[?#]/)[0];
            const targetFarmer = farmers.find((f) => f.id === farmerId);
            if (targetFarmer) {
              setSelectedFarmer(targetFarmer);
              showToast(`Opened ${targetFarmer.farmName}`);
            }
          } else if (url.includes('/order/') || url.includes('order/')) {
            const parts = url.split('order/');
            const orderId = parts[1]?.split(/[?#]/)[0];
            const targetOrder = orders.find((o) => o.id === orderId);
            if (targetOrder) {
              setTrackingOrder(targetOrder);
            }
          }
        });
      } catch {}
    };

    setupDeepLinks();

    return () => {
      if (deepLinkHandle) {
        deepLinkHandle.remove();
      }
    };
  }, [products, farmers, orders, setSelectedProduct, setSelectedFarmer, setTrackingOrder, showToast]);

  return { isOffline };
}
