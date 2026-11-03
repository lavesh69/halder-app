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
      showToast('Internet connection restored! ??', 'success');
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

  // 2. Hardware Back Button & Modal Hierarchy
  useEffect(() => {
    let listenerHandle: any = null;

    const setupBackButton = async () => {
      try {
        listenerHandle = await CapApp.addListener('backButton', () => {
          // Priority 1: Close active modals
          if (isFastSellOpen) {
            setIsFastSellOpen(false);
            return;
          }
          if (isChatModalOpen) {
            setIsChatModalOpen(false);
            return;
          }
          if (trackingOrder) {
            setTrackingOrder(null);
            return;
          }
          if (selectedFarmer) {
            setSelectedFarmer(null);
            return;
          }
          if (selectedProduct) {
            setSelectedProduct(null);
            return;
          }
          if (isFilterModalOpen) {
            setIsFilterModalOpen(false);
            return;
          }
          if (isNotificationModalOpen) {
            setIsNotificationModalOpen(false);
            return;
          }
          if (isSearchScreenOpen) {
            setIsSearchScreenOpen(false);
            return;
          }
          if (buyNowProduct) {
            setBuyNowProduct(null);
            return;
          }

          // Priority 2: Return to main marketplace tab if on sub-tab
          if (role === 'customer' && customerTab !== 'home') {
            setCustomerTab('home');
            return;
          }
          if (role === 'farmer' && farmerTab !== 'dashboard') {
            setFarmerTab('dashboard');
            return;
          }

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
        });
      } catch {
        // Fallback for non-Capacitor browser environments
      }
    };

    setupBackButton();

    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
      }
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
    customerTab,
    farmerTab,
    role,
    backPressedOnce,
    setIsFastSellOpen,
    setIsChatModalOpen,
    setTrackingOrder,
    setSelectedFarmer,
    setSelectedProduct,
    setIsFilterModalOpen,
    setIsNotificationModalOpen,
    setIsSearchScreenOpen,
    setBuyNowProduct,
    setCustomerTab,
    setFarmerTab,
    showToast,
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
