import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Product,
  Farmer,
  Order,
  CartItem,
  Role,
  OrderStatus,
  PaymentMethod,
  FilterState,
  GroupedFarmerCart,
  User,
  Category,
  Review,
  AppNotification,
} from '../types';
import { initialCategories } from '../data/mockData';
import confetti from 'canvas-confetti';
import { ApiClient } from '../api/client';
import { PushNotificationClient } from '../services/pushNotificationClient';
import {
  AdminTab,
  AppContext,
  CustomerTab,
  DisputeRecord,
  FarmerTab,
  PlatformSettings,
  ToastInfo,
  initialDisputes,
  initialFilterState,
  initialPlatformSettings,
  isDummyOrTestAccount,
  mapBackendProduct,
  nextGeneratedId,
  safeStorageSet,
} from './appContextUtils';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<Role>(() => {
    if (
      typeof window !== 'undefined' &&
      (window.location.pathname.startsWith('/admin') || window.location.search.includes('role=admin'))
    ) {
      return 'admin';
    }
    return (localStorage.getItem('halder-role') as Role) || 'customer';
  });

  const [customerTab, setCustomerTab] = useState<CustomerTab>('home');
  const [farmerTab, setFarmerTab] = useState<FarmerTab>('dashboard');
  const [adminTab, setAdminTab] = useState<AdminTab>('overview');

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('halder-users-v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const clean = parsed.filter((u: any) => !isDummyOrTestAccount(u));
          localStorage.setItem('halder-users-v2', JSON.stringify(clean));
          return clean;
        }
      } catch {}
    }
    return [];
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('halder-current-user-v2');
    return saved ? JSON.parse(saved) : null;
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('halder-categories-v2');
    return saved ? JSON.parse(saved) : initialCategories;
  });

  const [reviews, setReviews] = useState<Review[]>(() => {
    const saved = localStorage.getItem('halder-reviews-v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed.filter((r: any) => !r.id?.startsWith('rev-')) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem('halder-notifications-v2');
    return saved ? JSON.parse(saved) : [];
  });

  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

  const [farmers, setFarmers] = useState<Farmer[]>(() => {
    const saved = localStorage.getItem('halder-farmers-v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const clean = parsed.filter((f: any) => !isDummyOrTestAccount(f));
          safeStorageSet('halder-farmers-v2', JSON.stringify(clean));
          return clean;
        }
      } catch {
        return [];
      }
    }
    return [];
  });

  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [hasSeenOnboarding, setHasSeenOnboardingState] = useState<boolean>(() => {
    return localStorage.getItem('halder-onboarded') === 'true';
  });
  const [isLoggedIn, setIsLoggedInState] = useState<boolean>(() => {
    return localStorage.getItem('halder-loggedin') === 'true';
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  // Data
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('halder-products-v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed.filter((p: any) => !p.id?.startsWith('prod-')) : [];
      } catch {
        return [];
      }
    }
    return [];
  });
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(true);

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('halder-orders-v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed.filter((o: any) => !o.id?.startsWith('ord-')) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      localStorage.removeItem('halder-cart-v2');
    } catch {
      // Ignore in restricted environments
    }
    return [];
  });

  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('halder-favorites');
    return saved ? JSON.parse(saved) : [];
  });

  // Platform Governance Settings
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(() => {
    try {
      const saved = localStorage.getItem('halder-platform-settings-v1');
      return saved ? JSON.parse(saved) : initialPlatformSettings;
    } catch {
      return initialPlatformSettings;
    }
  });

  const updatePlatformSettings = (newSettings: Partial<PlatformSettings>) => {
    setPlatformSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('halder-platform-settings-v1', JSON.stringify(updated));
      return updated;
    });
  };

  // Disputes Queue
  const [disputes, setDisputes] = useState<DisputeRecord[]>(() => {
    try {
      const saved = localStorage.getItem('halder-disputes-v1');
      return saved ? JSON.parse(saved) : initialDisputes;
    } catch {
      return initialDisputes;
    }
  });

  const raiseDispute = (disputeData: Omit<DisputeRecord, 'id' | 'status' | 'createdAt'>) => {
    const newDispute: DisputeRecord = {
      ...disputeData,
      id: `DISP-${Date.now()}`,
      status: 'UNDER_INVESTIGATION',
      createdAt: new Date().toISOString(),
    };
    setDisputes((prev) => {
      const updated = [newDispute, ...prev];
      localStorage.setItem('halder-disputes-v1', JSON.stringify(updated));
      return updated;
    });
  };

  const resolveDispute = (disputeId: string, action: 'refund' | 'dismiss', notes?: string) => {
    setDisputes((prev) => {
      const updated = prev.map((d) =>
        d.id === disputeId
          ? {
              ...d,
              status: action === 'refund' ? ('REFUNDED' as const) : ('RESOLVED_DISMISSED' as const),
              resolutionNotes: notes,
            }
          : d
      );
      localStorage.setItem('halder-disputes-v1', JSON.stringify(updated));
      return updated;
    });
  };

  // Location-first with LocalStorage persistence and legacy bilingual string sanitization
  const [currentLocation, setCurrentLocation] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('halder-user-location');
      if (saved) {
        const cleaned = saved.replace(/\s*\([^)]*[\u0900-\u097F]+[^)]*\)/g, '').trim();
        if (cleaned !== saved) {
          try { localStorage.setItem('halder-user-location', cleaned); } catch {}
        }
        return cleaned || 'Rajpur Road, Dehradun';
      }
      return 'Rajpur Road, Dehradun';
    } catch {
      return 'Rajpur Road, Dehradun';
    }
  });
  const [activeCity, setActiveCity] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('halder-user-city');
      if (saved) {
        const cleaned = saved.replace(/\s*\([^)]*[\u0900-\u097F]+[^)]*\)/g, '').trim();
        if (cleaned !== saved) {
          try { localStorage.setItem('halder-user-city', cleaned); } catch {}
        }
        return cleaned || 'Dehradun';
      }
      return 'Dehradun';
    } catch {
      return 'Dehradun';
    }
  });
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);
  const [searchRadiusKm, setSearchRadiusKm] = useState<number>(() => {
    const saved = localStorage.getItem('halder-radius-km');
    return saved ? Number(saved) : 300;
  });

  const [userCoordinates, setUserCoordinates] = useState<{ lat: number; lng: number } | null>(() => {
    try {
      const saved = localStorage.getItem('halder-user-coords');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (userCoordinates) {
        localStorage.setItem('halder-user-coords', JSON.stringify(userCoordinates));
      } else {
        localStorage.removeItem('halder-user-coords');
      }
    } catch {}
  }, [userCoordinates]);

  useEffect(() => {
    try {
      if (currentLocation) {
        localStorage.setItem('halder-user-location', currentLocation);
      }
    } catch {}
  }, [currentLocation]);

  useEffect(() => {
    try {
      if (activeCity) {
        localStorage.setItem('halder-user-city', activeCity);
      }
    } catch {}
  }, [activeCity]);

  const handleSetSearchRadiusKm = (r: number) => {
    setSearchRadiusKm(r);
    localStorage.setItem('halder-radius-km', String(r));
  };

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isSearchScreenOpen, setIsSearchScreenOpen] = useState<boolean>(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);
  const [filterState, setFilterState] = useState<FilterState>(initialFilterState);

  // Modals
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
  const [isPostRequirementOpen, setIsPostRequirementOpen] = useState<boolean>(false);
  const [isFastSellOpen, setIsFastSellOpen] = useState<boolean>(false);
  const [editingListing, setEditingListing] = useState<Product | null>(null);

  // Agricultural Classifieds Modals
  const [isSavedSearchesOpen, setIsSavedSearchesOpen] = useState<boolean>(false);
  const [stockControlProduct, setStockControlProduct] = useState<Product | null>(null);

  // Buy Now
  const [buyNowProduct, setBuyNowProduct] = useState<{ product: Product; quantity: number } | null>(null);

  // Review & Rating Modal Target
  const [reviewTarget, setReviewTarget] = useState<{ farmerId: string; farmerName: string; orderId?: string } | null>(null);

  // Chat
  const [isChatModalOpen, setIsChatModalOpen] = useState<boolean>(false);
  const [chatFarmer, setChatFarmer] = useState<Farmer | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeConversationProductId, setActiveConversationProductId] = useState<string | null>(null);
  const [pendingChatInitialMessage, setPendingChatInitialMessage] = useState<string | null>(null);
  const [chatConversationError, setChatConversationError] = useState<string | null>(null);
  const [isOpeningChat, setIsOpeningChat] = useState<boolean>(false);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);
  const [chatConversations, setChatConversations] = useState<any[]>([]);

  // Frame & Toast
  const [isDeviceFrame, setIsDeviceFrame] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastInfo | null>(null);

  useEffect(() => {
    localStorage.setItem('halder-users-v2', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('halder-current-user-v2', JSON.stringify(currentUser));
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('halder-categories-v2', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    safeStorageSet('halder-farmers-v2', JSON.stringify(farmers));
  }, [farmers]);

  useEffect(() => {
    safeStorageSet('halder-reviews-v2', JSON.stringify(reviews));
  }, [reviews]);

  useEffect(() => {
    safeStorageSet('halder-notifications-v2', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    safeStorageSet('halder-products-v2', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    safeStorageSet('halder-orders-v2', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    safeStorageSet('halder-cart-v2', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    safeStorageSet('halder-favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    safeStorageSet('halder-role', role);
  }, [role]);

  // URL Deep-Linking for Direct Ad Sharing (?ad=<productId>)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (selectedProduct) {
        const url = new URL(window.location.href);
        url.searchParams.set('ad', selectedProduct.id);
        window.history.replaceState(null, '', url.toString());
      } else {
        const url = new URL(window.location.href);
        if (url.searchParams.has('ad')) {
          url.searchParams.delete('ad');
          window.history.replaceState(null, '', url.pathname + (url.search ? url.search : ''));
        }
      }
    } catch {}
  }, [selectedProduct]);

  const attemptedDeepLinkRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let active = true;
    try {
      const params = new URLSearchParams(window.location.search);
      const adId = params.get('ad');
      if (adId && attemptedDeepLinkRef.current !== adId) {
        attemptedDeepLinkRef.current = adId;

        // 1. Check if already present in local products state
        const matched = products.find((p) => p.id === adId);
        if (matched) {
          Promise.resolve().then(() => {
            if (active) setSelectedProduct(matched);
          });
          return () => {
            active = false;
          };
        }

        // 2. Fallback: Fetch directly from backend server for WhatsApp shared deep links
        ApiClient.getProductById(adId)
          .then((backendProd: any) => {
            if (!active) return;
            const raw = backendProd?.product || backendProd?.data || backendProd;
            if (raw && (raw.id || raw.name)) {
              const mapped = mapBackendProduct(raw, userCoordinates);
              setProducts((prev) => (prev.some((p) => p.id === mapped.id) ? prev : [mapped, ...prev]));
              setSelectedProduct(mapped);
            }
          })
          .catch((err) => {
            console.warn('[HALDER DeepLink] Failed to load shared ad from server:', err);
          });
      }
    } catch {}
    return () => {
      active = false;
    };
  }, [products, userCoordinates]);

  // Live Server Backend Synchronization
  const refreshProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    try {
      const prodRes = await ApiClient.getProducts({
        limit: 50,
        latitude: 30.3165,
        longitude: 78.0322,
        radiusKm: searchRadiusKm,
      });
      if (prodRes?.products?.length > 0) {
        const mappedProducts: Product[] = prodRes.products.map((p: any) => mapBackendProduct(p, userCoordinates));
        setProducts(mappedProducts);
      }
    } catch (e) {
      console.warn('[HALDER Sync] Using cached local products:', e);
    } finally {
      setIsLoadingProducts(false);
    }

    try {
      const farmRes = await ApiClient.getFarmers();
      if (farmRes?.length > 0) {
        setFarmers(farmRes.map((f: any) => ({
          id: f.id,
          name: f.name,
          farmName: f.farm_name,
          location: f.location,
          city: f.city,
          distanceKm: 2.3,
          rating: f.rating,
          totalOrders: f.total_orders,
          totalListingsCount: f.total_listings_count,
          responseRate: f.response_rate,
          joinedYear: f.joined_year,
          avatar: f.avatar,
          coverImage: f.cover_image,
          verificationStatus: f.verification_status,
          description: f.description,
        })));
      }
    } catch {}
  }, [searchRadiusKm, userCoordinates]);

  useEffect(() => {
    let isMounted = true;
    Promise.resolve().then(() => {
      if (isMounted) void refreshProducts();
    });

    async function syncUserData() {
      const token = localStorage.getItem('halder-auth-token');
      if (!token) return;
      try {
        const meRes = await ApiClient.getMe();
        if (isMounted && meRes?.user) {
          setCurrentUser(meRes.user);
          setIsLoggedInState(true);
          if (meRes.user.role) {
            setRoleState(meRes.user.role);
          }
          if (meRes.user.farmerProfileId) {
            ApiClient.getProducts({
              farmerId: meRes.user.farmerProfileId,
              includeAllStatuses: 'true',
              limit: 50,
            }).then((ownRes) => {
              if (isMounted && ownRes?.products?.length > 0) {
                const ownMapped = ownRes.products.map((p: any) => mapBackendProduct(p));
                setProducts((prev) => {
                  const otherProds = prev.filter((p) => p.farmerId !== meRes.user.farmerProfileId);
                  return [...ownMapped, ...otherProds];
                });
              }
            }).catch(() => {});
          }
        }
      } catch {
        ApiClient.clearToken();
      }

      if (!ApiClient.hasToken()) return;

      try {
        const favsRes = await ApiClient.getFavorites();
        if (isMounted && Array.isArray(favsRes)) {
          setFavorites(favsRes.map((f: any) => f.id || f.product_id));
        }
      } catch (err) {
        console.warn('[Favorites] Failed to load user favorites:', err);
      }

      try {
        const ordRes = await ApiClient.getOrders();
        if (isMounted && ordRes?.length > 0) {
          const mappedOrders: Order[] = ordRes.map((o: any) => ({
            id: o.id,
            orderNumber: o.order_number,
            customerId: o.customer_id,
            customerName: o.customer_name || 'Customer',
            customerPhone: o.customer_phone,
            deliveryAddress: o.delivery_address,
            deliverySlot: 'Morning Slot (7-10 AM)',
            items: (o.items || []).map((it: any) => ({
              product: {
                id: it.product_id,
                name: it.product_name_snapshot,
                price: it.unit_price_snapshot,
                unit: it.unit_snapshot,
                farmerId: o.farmer_id,
                farmerName: o.farmer_name,
                farmName: o.farm_name,
                farmerAvatar: 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=200',
                image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600',
                category: 'Vegetables',
                availableQuantity: 10,
                description: 'Fresh harvest',
                location: o.city || 'Dehradun',
                city: o.city || 'Dehradun',
                distanceKm: 2.1,
                rating: 5.0,
                isAvailable: true,
              },
              quantity: it.quantity,
              subtotal: it.subtotal,
            })),
            subtotal: o.subtotal,
            deliveryFee: o.delivery_fee,
            farmerTip: o.farmer_tip || 0,
            total: o.total_amount,
            status: o.order_status,
            paymentMethod: o.payment_method,
            paymentStatus: o.payment_status,
            createdAt: o.created_at,
            estimatedDeliveryTime: o.estimated_delivery_time || '35-45 mins',
            timeline: (o.timeline || []).map((t: any) => ({
              status: t.status,
              title: t.title,
              description: t.description,
              time: t.time,
              completed: Boolean(t.completed),
              current: Boolean(t.current),
            })),
          }));
          setOrders(mappedOrders);
        }
      } catch {}

      try {
        const notifRes = await ApiClient.getNotifications();
        if (isMounted && notifRes?.length > 0) {
          setNotifications(notifRes.map((n: any) => ({
            id: n.id,
            userId: n.user_id,
            recipientRole: n.recipient_role,
            title: n.title,
            message: n.message,
            type: n.type,
            isRead: Boolean(n.is_read),
            createdAt: n.created_at,
            conversationId: n.conversation_id || n.conversationId || undefined,
            messageId: n.message_id || n.messageId || undefined,
          })));
        }
      } catch {}

      try {
        const convRes = await ApiClient.request('/chat/conversations');
        const list = Array.isArray(convRes) ? convRes : (convRes?.conversations || convRes?.data || []);
        if (isMounted && Array.isArray(list)) {
          setChatConversations(list);
          const totalUnread = list.reduce((sum: number, c: any) => sum + (c.unreadCount || c.unread_count || 0), 0);
          setUnreadChatCount(totalUnread);
        }
      } catch {}
    }

    Promise.resolve().then(() => {
      if (isMounted) void syncUserData();
    });
    return () => { isMounted = false; };
  }, [refreshProducts]);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Date.now().toString();
    setToast({ id, message, type });
    setTimeout(() => {
      setToast((current: ToastInfo | null) => (current?.id === id ? null : current));
    }, 2800);
  };

  const setRole = (newRole: Role) => {
    // Profile Lock: A logged-in user is strictly locked to their account role
    if (currentUser?.role) {
      if (currentUser.role !== newRole) {
        showToast(`Role is locked to your ${currentUser.role} account. Please log out to switch accounts.`, 'info');
        return;
      }
    }
    // Unauthenticated users cannot enter farmer or admin workspace
    if (!isLoggedIn && (newRole === 'farmer' || newRole === 'admin')) {
      showToast(`Please sign in with your ${newRole} account to continue.`, 'info');
      setIsLoginModalOpen(true);
      return;
    }
    setRoleState(newRole);
    localStorage.setItem('halder-role', newRole);
  };

  const setAuthenticatedSession = (user: User, token?: string) => {
    if (token) {
      ApiClient.setToken(token);
      localStorage.setItem('halder-auth-token', token);
    }
    setCurrentUser(user);
    localStorage.setItem('halder-current-user-v2', JSON.stringify(user));
    setRoleState(user.role);
    localStorage.setItem('halder-role', user.role);
    setIsLoggedInState(true);
    localStorage.setItem('halder-loggedin', 'true');
    setHasSeenOnboardingState(true);
    localStorage.setItem('halder-onboarded', 'true');
    setIsLoginModalOpen(false);

    if (user.role === 'admin') {
      setAdminTab('overview');
    } else if (user.role === 'farmer') {
      setFarmerTab('dashboard');
    } else {
      setCustomerTab('home');
    }
  };

  const updateCurrentUser = (updates: Partial<User>) => {
    setCurrentUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      try {
        localStorage.setItem('halder-current-user-v2', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setUsers((prev) =>
      prev.map((u) => (u.id === currentUser?.id ? { ...u, ...updates } : u))
    );
  };

  const setHasSeenOnboarding = (seen: boolean) => {
    setHasSeenOnboardingState(seen);
    localStorage.setItem('halder-onboarded', seen ? 'true' : 'false');
  };

  const setIsLoggedIn = (logged: boolean) => {
    setIsLoggedInState(logged);
    localStorage.setItem('halder-loggedin', logged ? 'true' : 'false');
  };

  const login = (emailOrPhone: string, _targetRole?: Role): boolean => {
    const existing = users.find(
      (u) =>
        u.email.toLowerCase() === emailOrPhone.toLowerCase() ||
        (u.username && u.username.toLowerCase() === emailOrPhone.replace(/^@/, '').toLowerCase())
    );
    if (!existing) {
      return false;
    }
    if (existing.status === 'suspended') {
      showToast('Your account is currently suspended. Please contact admin.', 'error');
      return false;
    }
    // Never elevate role or issue session without an existing verified auth token
    if (!ApiClient.hasToken()) {
      setIsLoginModalOpen(true);
      return false;
    }
    setCurrentUser(existing);
    localStorage.setItem('halder-current-user-v2', JSON.stringify(existing));
    setRoleState(existing.role);
    localStorage.setItem('halder-role', existing.role);
    setIsLoggedIn(true);
    localStorage.setItem('halder-loggedin', 'true');
    setHasSeenOnboarding(true);
    return true;
  };

  const signup = (name: string, email: string, phone: string, newRole: Role) => {
    const newUser: User = {
      id: `user-${Date.now()}`,
      name,
      email,
      phone,
      role: newRole,
      profile_image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
      status: 'active',
      created_at: 'Just now',
      updated_at: 'Just now',
    };
    setUsers((prev) => [newUser, ...prev]);
    setCurrentUser(newUser);
    setRoleState(newRole);
    setIsLoggedIn(true);
    setHasSeenOnboarding(true);
    localStorage.setItem('halder-loggedin', 'true');
    localStorage.setItem('halder-onboarded', 'true');
    localStorage.setItem('halder-role', newRole);
    localStorage.setItem('halder-current-user-v2', JSON.stringify(newUser));

    ApiClient.register({ name, email, phone, role: newRole })
      .then((res) => {
        const u = res?.user || res?.data?.user;
        const t = res?.token || res?.data?.token;
        if (u && t) {
          setAuthenticatedSession(u, t);
        }
      })
      .catch((e) => console.warn('[HALDER Auth] Registration queued:', e.message));

    if (newRole === 'farmer') {
      setFarmerTab('dashboard');
    } else {
      setCustomerTab('home');
    }
    showToast(`Account created as ${newRole}!`);
  };

  const logout = () => {
    ApiClient.clearToken();
    ApiClient.request('/auth/logout', { method: 'POST' }).catch(() => {});
    localStorage.removeItem('halder-onboarded');
    localStorage.removeItem('halder-loggedin');
    localStorage.removeItem('halder-auth-token');
    localStorage.removeItem('halder-current-user-v2');
    setCurrentUser(null);
    setRoleState('customer');
    setIsLoggedIn(false);
    setHasSeenOnboarding(false);
    setCustomerTab('home');
    setFarmerTab('dashboard');
    setAdminTab('overview');
    setIsLoginModalOpen(true);
    showToast('Logged out of HALDER.', 'info');
  };

  const toggleUserStatus = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, status: u.status === 'active' ? 'suspended' : 'active' }
          : u
      )
    );
    showToast('User status updated');
  };

  const changeUserRole = (userId: string, newRole: Role) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
    showToast(`User role changed to ${newRole.toUpperCase()}`, 'success');
  };

  const toggleProductFeatured = (productId: string) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, isFeatured: !p.isFeatured } : p
      )
    );
    showToast('Listing promotional status updated', 'success');
  };

  const toggleProductUrgent = (productId: string) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, isUrgent: !p.isUrgent } : p
      )
    );
    showToast('Listing urgent badge toggled', 'success');
  };

  const deleteUser = (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    showToast('User account deleted from system', 'info');
  };

  const addUser = (userData: Omit<User, 'id' | 'created_at' | 'updated_at'>) => {
    const rolePrefix = userData.role === 'farmer' ? 'FRM' : userData.role === 'admin' ? 'ADM' : 'CUS';
    const halder_id = `HAL-${rolePrefix}-${Date.now().toString().slice(-8)}`;
    const newUser: User = {
      ...userData,
      id: 'usr-' + Date.now().toString().slice(-6),
      halder_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setUsers((prev) => [newUser, ...prev]);
    showToast(`User ${newUser.name} (${halder_id}) created successfully!`, 'success');
  };

  const approveFarmerVerification = (farmerId: string) => {
    setFarmers((prev) =>
      prev.map((f) =>
        f.id === farmerId
          ? { ...f, verification_status: 'verified', verified: true }
          : f
      )
    );
    sendNotification(
      'Farmer Verified! 🛡️',
      'Your farm verification credentials have been approved by Admin.',
      'farmer'
    );
    showToast('Farmer verification approved & verified badge granted!');
  };

  const rejectFarmerVerification = (farmerId: string) => {
    setFarmers((prev) =>
      prev.map((f) =>
        f.id === farmerId
          ? { ...f, verification_status: 'rejected', verified: false }
          : f
      )
    );
    showToast('Farmer verification revoked.', 'info');
  };

  const addCategory = (cat: Omit<Category, 'id'>) => {
    const newCat: Category = {
      ...cat,
      id: `cat-${Date.now()}`,
    };
    setCategories((prev) => [...prev, newCat]);
  };

  const toggleCategoryActive = (catId: string) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === catId ? { ...c, active: !c.active } : c))
    );
  };

  const deleteCategory = (catId: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== catId));
    showToast('Category removed from Mandi taxonomy', 'info');
  };

  const addReview = (review: Omit<Review, 'id' | 'createdAt'>) => {
    ApiClient.createReview({
      orderId: review.orderId || 'order-102',
      rating: review.rating,
      review: review.review || 'Fresh quality harvest directly from farm!',
    }).catch((e) => console.warn('[HALDER Sync] Review queued:', e.message));

    const newRev: Review = {
      ...review,
      id: `rev-${Date.now()}`,
      createdAt: 'Just now',
    };
    setReviews((prev) => [newRev, ...prev]);

    setFarmers((prev) =>
      prev.map((f) => {
        if (f.id !== review.farmerId) return f;
        const farmerRevs = [...reviews.filter((r) => r.farmerId === review.farmerId), newRev];
        const avg = farmerRevs.reduce((s, r) => s + r.rating, 0) / farmerRevs.length;
        return {
          ...f,
          rating: Number(avg.toFixed(1)),
          reviews_count: farmerRevs.length,
          reviewsCount: farmerRevs.length,
        };
      })
    );
    showToast('⭐ Thank you for rating the farmer!');
  };

  const markNotificationAsRead = (id: string) => {
    ApiClient.markNotificationRead(id).catch(() => {});
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const markAllNotificationsAsRead = () => {
    ApiClient.markAllNotificationsRead().catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    showToast('All notifications marked as read.');
  };

  const deleteNotification = (id: string) => {
    ApiClient.deleteNotification(id).catch(() => {});
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    showToast('Notification deleted.');
  };

  const sendNotification = (title: string, message: string, recipientRole: Role) => {
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 3)}`,
      userId: 'user-any',
      recipientRole,
      title,
      message,
      type: 'order',
      isRead: false,
      createdAt: 'Just now',
    };
    setNotifications((prev) => [newNotif, ...prev]);
    PushNotificationClient.showLocalNotification(title, { body: message });
  };

  const loginUser = (selectedRole: Role) => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setRoleState(selectedRole === 'farmer' ? 'farmer' : 'customer');
    setHasSeenOnboarding(true);
    localStorage.setItem('halder-onboarded', 'true');
    localStorage.setItem('halder-loggedin', 'false');
    localStorage.removeItem('halder-current-user-v2');
    if (selectedRole === 'farmer') {
      setFarmerTab('dashboard');
    } else {
      setCustomerTab('home');
    }
    showToast('Browsing HALDER Marketplace as Guest.');
  };

  const loginWithGoogle = async (idToken: string, selectedRole: Role = 'customer'): Promise<boolean> => {
    try {
      const res = await ApiClient.loginWithGoogle(idToken, selectedRole);
      if (res?.user) {
        setAuthenticatedSession(
          { ...res.user, role: res.user.role || selectedRole },
          res.token
        );
        showToast(`Welcome, ${res.user.name}! Authenticated via Google.`, 'success');
        return true;
      }
      showToast('Google authentication returned no user account.', 'error');
      return false;
    } catch (err: any) {
      console.error('[Google Auth] Failed:', err);
      showToast(err?.message || 'Google authentication failed. Please try again.', 'error');
      return false;
    }
  };

  // Favorites
  const toggleFavorite = async (productId: string) => {
    const exists = favorites.includes(productId);
    setFavorites((prev) => {
      const updated = exists ? prev.filter((id) => id !== productId) : [...prev, productId];
      showToast(exists ? 'Removed from saved listings' : '❤️ Saved to favorites!');
      return updated;
    });

    if (isLoggedIn && ApiClient.hasToken()) {
      try {
        if (exists) {
          await ApiClient.removeFavorite(productId);
        } else {
          await ApiClient.addFavorite(productId);
        }
      } catch (err) {
        console.warn('[Favorites] Backend sync error:', err);
      }
    }
  };

  const isFavorite = (productId: string) => favorites.includes(productId);

  // Direct Classifieds: Opens listing details for direct Call/Chat/Boli
  const addToCart = (product: Product, _quantity = 1) => {
    setSelectedProduct(product);
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
    showToast('Removed from cart', 'info');
  };

  const clearCart = () => setCart([]);

  const cartTotal = cart.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  );

  const cartItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Grouped Multi-Farmer Cart
  const groupedCart: GroupedFarmerCart[] = cart.reduce((groups, item) => {
    const farmerId = item.product.farmerId;
    let group = groups.find((g) => g.farmerId === farmerId);
    if (!group) {
      group = {
        farmerId,
        farmerName: item.product.farmerName,
        farmName: item.product.farmName,
        items: [],
        subtotal: 0,
      };
      groups.push(group);
    }
    group.items.push(item);
    group.subtotal += item.product.price * item.quantity;
    return groups;
  }, [] as GroupedFarmerCart[]);

  // Fast Posting / Sell (Supports create + edit + draft)
  const publishListing = async (listingData: any) => {
    const ownerId = currentUser?.farmerProfileId || currentUser?.id || 'farmer-1';
    const ownerName = currentUser?.name || 'Local Seller';
    const ownerAvatar = currentUser?.profile_image || 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=200&auto=format&fit=crop&q=80';
    const ownerFarm = (currentUser as any)?.farm_name || (currentUser?.name ? `${currentUser.name}'s Produce` : 'Green Valley Farm');

    const payload = {
      categoryId: listingData.categoryId || listingData.category || 'Vegetables',
      category: listingData.category || 'Vegetables',
      name: listingData.name,
      description: listingData.description || listingData.freshnessTag || 'Fresh harvest direct from farm',
      price: Number(listingData.price),
      unit: listingData.unit || 'kg',
      availableQuantity: Number(listingData.availableQuantity ?? 20),
      totalQuantity: Number(listingData.totalQuantity ?? listingData.availableQuantity ?? 20),
      minOrderQuantity: Number(listingData.minOrderQuantity || 1),
      isNegotiable: listingData.isNegotiable !== false,
      productGrade: listingData.productGrade || 'Grade A',
      qualityDescription: listingData.qualityDescription || '',
      organicCertificationBody: listingData.organicCertificationBody || '',
      storageInfo: listingData.storageInfo || '',
      packagingInfo: listingData.packagingInfo || '',
      village: listingData.village || '',
      district: listingData.district || '',
      state: listingData.state || 'Uttarakhand',
      city: listingData.city || listingData.district || activeCity || 'Dehradun',
      postalCode: listingData.postalCode || '',
      pickupAvailable: listingData.pickupAvailable !== false,
      farmerDeliveryAvailable: listingData.farmerDeliveryAvailable !== false,
      isOrganic: Boolean(listingData.isOrganic),
      availableToday: true,
      harvestDate: listingData.harvestDate || 'Harvested today',
      freshnessTag: listingData.freshnessTag || (listingData.isOrganic ? 'Organic Harvest' : 'Farm Fresh'),
      location: listingData.location || currentLocation || 'Dehradun, Uttarakhand',
      image: listingData.image,
      images: Array.isArray(listingData.images) ? listingData.images.slice(0, 8) : [listingData.image],
      priceSlabs: Array.isArray(listingData.priceSlabs) ? listingData.priceSlabs : [],
      status: listingData.status === 'draft' ? 'draft' : 'active',
      showPhoneNumber: listingData.showPhoneNumber !== false,
      latitude: listingData.latitude || userCoordinates?.lat || undefined,
      longitude: listingData.longitude || userCoordinates?.lng || undefined,
    };

    if (listingData.editingId) {
      updateProduct(listingData.editingId, {
        ...listingData,
        isAvailable: listingData.status !== 'draft',
      });
      setEditingListing(null);
      setIsFastSellOpen(false);
      return;
    }

    const tempId = nextGeneratedId('prod');
    const newListing: Product = {
      ...listingData,
      id: tempId,
      farmerId: ownerId,
      farmerName: ownerName,
      farmerPhone: listingData.showPhoneNumber === false ? undefined : currentUser?.phone,
      farmName: ownerFarm,
      farmerAvatar: ownerAvatar,
      location: payload.location,
      city: payload.city,
      isAvailable: payload.status === 'active',
      status: payload.status,
      distanceKm: 0.8,
      rating: 5.0,
      viewsCount: 1,
      likesCount: 0,
      createdAtTime: 'Just now',
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    setProducts((prev) => [newListing, ...prev]);
    setIsFastSellOpen(false);
    setEditingListing(null);

    try {
      const token = localStorage.getItem('halder-auth-token');
      if (!token) {
        setProducts((prev) => prev.filter((p) => p.id !== tempId));
        showToast('Please sign in to publish a crop advertisement.', 'info');
        setIsLoginModalOpen(true);
        return;
      }

      const created = await ApiClient.createProduct(payload);
      if (created?.id) {
        const mapped = mapBackendProduct(created, userCoordinates);
        setProducts((prev) => prev.map((p) => (p.id === tempId ? mapped : p)));
      }
      showToast(
        payload.status === 'draft'
          ? `📝 Listing "${newListing.name}" saved as Draft in database.`
          : `🎉 Listing "${newListing.name}" saved to database and live on HALDER!`,
        'success'
      );
    } catch (e: any) {
      console.error('[HALDER Sync] Product publish failed:', e);
      showToast(`Database error: ${e.message || 'Failed to save listing'}`, 'error');
    }

    if (payload.status === 'active') {
      try {
        confetti({
          particleCount: 60,
          spread: 50,
          origin: { y: 0.6 },
          colors: ['#2FAF64', '#166534', '#74C69D'],
        });
      } catch {}
    }
  };

  // Chat
  const refreshChatConversations = useCallback(async () => {
    try {
      const res = await ApiClient.getConversations();
      const list = Array.isArray(res) ? res : (res?.conversations || res?.data || []);
      if (Array.isArray(list)) {
        setChatConversations(list);
        const totalUnread = list.reduce((sum: number, c: any) => sum + (c.unreadCount || c.unread_count || 0), 0);
        setUnreadChatCount(totalUnread);
      }
    } catch (e) {
      console.warn('[HALDER Chat] Failed to refresh conversations:', e);
    }
  }, []);

  // Event-driven + visibility-aware conversation refresh (no tight unnecessary polling)
  useEffect(() => {
    if (!isLoggedIn) return;
    let active = true;
    Promise.resolve().then(() => {
      if (active) void refreshChatConversations();
    });

    const handleChatEvent = () => {
      refreshChatConversations();
    };
    window.addEventListener('halder:chat-updated', handleChatEvent);

    const interval = setInterval(() => {
      if (
        (typeof document === 'undefined' || document.visibilityState === 'visible') &&
        (typeof navigator === 'undefined' || navigator.onLine)
      ) {
        refreshChatConversations();
      }
    }, 25000);

    return () => {
      active = false;
      window.removeEventListener('halder:chat-updated', handleChatEvent);
      clearInterval(interval);
    };
  }, [isLoggedIn, refreshChatConversations]);

  const initiateConversationForFarmer = (farmer: Farmer, productId?: string) => {
    if (!ApiClient.hasToken()) {
      setChatConversationError('Please sign in to start a live chat with this participant.');
      setIsOpeningChat(false);
      return;
    }
    setIsOpeningChat(true);
    setChatConversationError(null);
    ApiClient.createConversation(farmer.id, productId)
      .then((res: any) => {
        const conv = res?.data || res;
        if (conv?.id) {
          setActiveConversationId(conv.id);
          if (conv.otherParty) {
            setChatFarmer((prev) =>
              prev
                ? {
                    ...prev,
                    name: conv.otherParty.name || prev.name,
                    avatar: conv.otherParty.avatar ?? prev.avatar,
                    phone: conv.otherParty.phone ?? prev.phone,
                    location: conv.otherParty.location ?? prev.location,
                    farm_name: conv.otherParty.farmName ?? prev.farm_name,
                    farmName: conv.otherParty.farmName ?? prev.farmName,
                    verification_status:
                      conv.otherParty.verificationStatus === 'verified'
                        ? 'verified'
                        : conv.otherParty.verificationStatus === 'rejected'
                          ? 'rejected'
                          : prev.verification_status,
                    verified:
                      typeof conv.otherParty.verificationStatus === 'string'
                        ? conv.otherParty.verificationStatus === 'verified'
                        : prev.verified,
                    rating: typeof conv.otherParty.rating === 'number' ? conv.otherParty.rating : prev.rating,
                  }
                : prev
            );
          }
          refreshChatConversations();
        } else {
          setChatConversationError('Unable to open conversation. Please retry.');
        }
      })
      .catch((e: any) => {
        setChatConversationError(e?.message || 'Unable to start conversation. Please retry.');
      })
      .finally(() => {
        setIsOpeningChat(false);
      });
  };

  const openFarmerChat = (farmer: Farmer, initialMsg?: string, productId?: string) => {
    if (!farmer?.id) {
      showToast('Participant profile unavailable.', 'error');
      return;
    }
    setChatFarmer(farmer);
    setActiveConversationId(null);
    setActiveConversationProductId(productId || null);
    setPendingChatInitialMessage(initialMsg || null);
    setChatConversationError(null);
    setIsChatModalOpen(true);

    initiateConversationForFarmer(farmer, productId);
  };

  const retryOpenChat = () => {
    if (chatFarmer) {
      initiateConversationForFarmer(chatFarmer, activeConversationProductId || undefined);
    }
  };

  const openConversationById = async (conversationId: string) => {
    if (!conversationId) return;
    let conv = chatConversations.find((c: any) => c.id === conversationId);
    if (!conv) {
      try {
        const res = await ApiClient.getConversations();
        const list = Array.isArray(res) ? res : (res?.conversations || res?.data || []);
        if (Array.isArray(list)) {
          setChatConversations(list);
          conv = list.find((c: any) => c.id === conversationId);
        }
      } catch {
        // Ignore network error and validate below
      }
    }

    if (!conv || !conv.otherParty) {
      showToast('Conversation could not be found or access was denied.', 'error');
      return;
    }

    const other = conv.otherParty;
    const participant: Farmer = {
      id: other.farmerProfileId || other.userId || conv.farmerId || conv.customerId,
      user_id: other.userId || '',
      name: other.name,
      farm_name: other.farmName || '',
      farmName: other.farmName || '',
      bio: '',
      description: '',
      avatar: other.avatar || '',
      cover_image: '',
      phone: other.phone || '',
      location: other.location || '',
      city: other.location || '',
      latitude: 0,
      longitude: 0,
      verification_status: other.verificationStatus === 'verified' ? 'verified' : other.verificationStatus === 'rejected' ? 'rejected' : 'pending',
      verified: other.verificationStatus === 'verified',
      rating: typeof other.rating === 'number' ? other.rating : 0,
      reviews_count: 0,
      total_orders: 0,
      total_listings_count: 0,
      response_rate: 0,
      joined_year: 0,
      badges: [],
      created_at: conv.createdAt || new Date().toISOString(),
    };

    setChatFarmer(participant);
    setActiveConversationProductId(conv.productId || conv.product?.id || null);
    setPendingChatInitialMessage(null);
    setChatConversationError(null);
    setActiveConversationId(conv.id);
    setIsChatModalOpen(true);
  };

  // Orders
  const placeOrder = ({
    address,
    slot,
    paymentMethod,
    farmerTip,
    isBuyNow = false,
    instructions = '',
  }: {
    address: string;
    slot: string;
    paymentMethod: PaymentMethod;
    farmerTip: number;
    isBuyNow?: boolean;
    instructions?: string;
  }): Order => {
    const itemsToOrder = isBuyNow && buyNowProduct
      ? [{ product: buyNowProduct.product, quantity: buyNowProduct.quantity, subtotal: buyNowProduct.product.price * buyNowProduct.quantity }]
      : cart.map((item) => ({
          product: item.product,
          quantity: item.quantity,
          subtotal: item.product.price * item.quantity,
        }));

    const subtotal = itemsToOrder.reduce((s, it) => s + it.subtotal, 0);
    const deliveryFee = subtotal >= platformSettings.freeDeliveryThreshold ? 0 : platformSettings.standardDeliveryFee;
    const total = subtotal + deliveryFee + farmerTip;
    const newOrderNum = `#HD${Math.floor(1000 + Math.random() * 9000)}`;

    const primaryProduct = itemsToOrder[0]?.product;
    const farmerInfo = {
      id: primaryProduct?.farmerId || 'farmer-1',
      name: primaryProduct?.farmerName || 'Rajesh Kumar',
      phone: '+91 98450 12345',
      farm: primaryProduct?.farmName || 'Green Valley Farm',
    };

    const newOrder: Order = {
      id: `order-${Date.now()}`,
      orderNumber: newOrderNum,
      customerId: currentUser?.id || 'cust-1',
      customerName: currentUser?.name || 'Aman Sharma',
      customerPhone: currentUser?.phone || '',
      deliveryAddress: address,
      deliverySlot: slot,
      items: itemsToOrder,
      subtotal,
      deliveryFee,
      farmerTip,
      total,
      status: 'placed',
      paymentMethod,
      paymentStatus: paymentMethod === 'cod' ? 'pending' : 'paid',
      createdAt: 'Just now',
      estimatedDeliveryTime: '30 mins',
      farmerId: farmerInfo.id,
      farmerName: farmerInfo.name,
      farmerPhone: farmerInfo.phone,
      farmName: farmerInfo.farm,
      instructions,
      timeline: [
        {
          status: 'placed',
          title: 'Order Placed',
          description: `Order ${newOrderNum} placed with ${farmerInfo.name}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          completed: true,
          current: true,
        },
        {
          status: 'accepted',
          title: 'Farmer Reviewing Harvest',
          description: `${farmerInfo.name} checking morning crates`,
          completed: false,
          current: false,
        },
        {
          status: 'preparing',
          title: 'Weighing & Packing',
          description: 'Eco-crate weighing and hygiene pack',
          completed: false,
          current: false,
        },
        {
          status: 'out_for_delivery',
          title: 'Out for Delivery',
          description: 'Local green transit rider on the way',
          completed: false,
          current: false,
        },
        {
          status: 'delivered',
          title: 'Delivered',
          description: 'Fresh delivery at your doorstep',
          completed: false,
          current: false,
        },
      ],
    };

    setOrders((prev) => [newOrder, ...prev]);
    // Sync order with transactional SQL backend
    ApiClient.createOrder({
      items: itemsToOrder.map((it) => ({ productId: it.product.id, quantity: it.quantity })),
      deliveryAddress: address,
      customerPhone: currentUser?.phone || '',
      paymentMethod,
    }).then((res: any) => {
      if (res) {
        const serverList = Array.isArray(res) ? res : (Array.isArray(res.data) ? res.data : (res.data ? [res.data] : []));
        if (serverList.length > 0 && serverList[0]?.id) {
          setOrders((prev) =>
            prev.map((o) => (o.id === newOrder.id ? { ...o, id: serverList[0].id, orderNumber: serverList[0].order_number || o.orderNumber } : o))
          );
        }
      }
      // Re-fetch products to update live inventory
      ApiClient.getProducts().then((res) => {
        if (res?.products) {
          setProducts((prev) =>
            prev.map((p) => {
              const updated = res.products.find((sp: any) => sp.id === p.id);
              return updated ? { ...p, availableQuantity: updated.available_quantity } : p;
            })
          );
        }
      }).catch(() => {});
    }).catch((err) => {
      console.warn('[HALDER Sync] Order queued locally:', err.message);
    });
    if (!isBuyNow) {
      clearCart();
    } else {
      setBuyNowProduct(null);
    }

    try {
      confetti({
        particleCount: 75,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#2FAF64', '#166534', '#74C69D', '#F4F4F1'],
      });
    } catch {}

    setTrackingOrder(newOrder);
    showToast(`Order ${newOrderNum} placed with ${farmerInfo.name}!`);
    return newOrder;
  };

  const updateOrderStatus = (
    orderId: string,
    newStatus: OrderStatus,
    logistics?: { driverName?: string; driverPhone?: string; vehicleNumber?: string; estTime?: string }
  ) => {
    ApiClient.updateOrderStatus(orderId, newStatus)
      .catch((e) => console.warn('[HALDER Sync] Order status update queued:', e.message));

    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;

        const sequence: OrderStatus[] = ['placed', 'accepted', 'preparing', 'out_for_delivery', 'delivered'];
        const targetIndex = sequence.indexOf(newStatus);

        const updatedTimeline = order.timeline.map((step) => {
          const stepIndex = sequence.indexOf(step.status);
          if (newStatus === 'rejected') {
            return { ...step, completed: step.status === 'placed', current: false };
          }
          if (stepIndex < targetIndex) {
            return { ...step, completed: true, current: false };
          } else if (stepIndex === targetIndex) {
            let desc = step.description;
            if (newStatus === 'out_for_delivery' && logistics?.driverName) {
              desc = `Dispatched via ${logistics.vehicleNumber ? `${logistics.vehicleNumber} (${logistics.driverName})` : logistics.driverName}`;
            }
            return {
              ...step,
              description: desc,
              completed: true,
              current: true,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
          } else {
            return { ...step, completed: false, current: false };
          }
        });

        const updated: Order = {
          ...order,
          status: newStatus,
          timeline: updatedTimeline,
          ...(logistics?.driverName ? { driverName: logistics.driverName } : {}),
          ...(logistics?.driverPhone ? { driverPhone: logistics.driverPhone } : {}),
          ...(logistics?.vehicleNumber ? { vehicleNumber: logistics.vehicleNumber } : {}),
          ...(logistics?.estTime ? { estimatedDeliveryTime: logistics.estTime } : {}),
          ...(logistics?.vehicleNumber || logistics?.driverName
            ? {
                trackingCourier: `Kisan Vahan (${logistics.driverName || 'Driver'}${
                  logistics.vehicleNumber ? ` - ${logistics.vehicleNumber}` : ''
                })`,
              }
            : {}),
        };
        if (trackingOrder?.id === orderId) setTrackingOrder(updated);
        return updated;
      })
    );
    showToast(`Order status updated to "${newStatus.replace(/_/g, ' ')}"`);
  };

  const bulkUpdateProducts = (productIds: string[], updates: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => (productIds.includes(p.id) ? { ...p, ...updates } : p))
    );
    showToast(`Updated ${productIds.length} listings in Mandi!`, 'success');
  };

  const bulkDeleteProducts = (productIds: string[]) => {
    setProducts((prev) => prev.filter((p) => !productIds.includes(p.id)));
    showToast(`Removed ${productIds.length} listings from Mandi`, 'info');
  };

  const advanceOrderDemoStep = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const sequence: OrderStatus[] = ['placed', 'accepted', 'preparing', 'out_for_delivery', 'delivered'];
    const idx = sequence.indexOf(order.status);
    if (idx < sequence.length - 1) {
      updateOrderStatus(orderId, sequence[idx + 1]);
    }
  };

  const toggleProductAvailability = (productId: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, isAvailable: !p.isAvailable } : p))
    );
    const prod = products.find((p) => p.id === productId);
    showToast(`${prod?.name || 'Listing'} marked as ${!prod?.isAvailable ? 'Available' : 'Paused'}`);
  };

  const updateProduct = (productId: string, updates: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, ...updates } : p))
    );
    ApiClient.updateProduct(productId, updates).catch((e) =>
      console.warn('[HALDER Sync] Product update server sync error:', e)
    );
    showToast('Listing updated successfully!', 'success');
  };

  const updateProductPrice = (productId: string, newPrice: number) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, price: newPrice } : p))
    );
    if (ApiClient.hasToken()) {
      ApiClient.updateProduct(productId, { price: newPrice }).catch((e) =>
        console.warn('[HALDER Sync] Price update server sync error:', e)
      );
    }
    showToast(`Price updated to ₹${newPrice}`, 'success');
  };

  const updateProductStatusAction = async (
    productId: string,
    action: 'pause' | 'resume' | 'mark_sold' | 'renew'
  ) => {
    const statusMap: Record<typeof action, string> = {
      pause: 'paused',
      resume: 'active',
      mark_sold: 'sold',
      renew: 'active',
    };
    const nextStatus = statusMap[action];
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? {
              ...p,
              status: nextStatus as any,
              isAvailable: nextStatus === 'active',
              availableQuantity: action === 'mark_sold' ? 0 : p.availableQuantity,
              harvestDate: action === 'renew' ? 'Freshly reconfirmed today' : p.harvestDate,
              createdAt: action === 'renew' ? new Date().toISOString() : p.createdAt,
              created_at: action === 'renew' ? new Date().toISOString() : (p as any).created_at,
            }
          : p
      )
    );
    try {
      if (ApiClient.hasToken()) {
        const updated = await ApiClient.updateProductStatus(productId, action);
        if (updated?.id) {
          const mapped = mapBackendProduct(updated, userCoordinates);
          setProducts((prev) => prev.map((p) => (p.id === productId ? mapped : p)));
        }
      }
      const actionLabels: Record<typeof action, string> = {
        pause: 'Listing paused',
        resume: 'Listing is now live again!',
        mark_sold: 'Listing marked as Sold',
        renew: 'Listing renewed with fresh stock confirmation!',
      };
      showToast(actionLabels[action], 'success');
    } catch (e: any) {
      showToast(e.message || 'Status updated locally', 'info');
    }
  };

  const toggleProductSold = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    const action = prod?.isAvailable ? 'mark_sold' : 'resume';
    updateProductStatusAction(productId, action);
    if (action === 'mark_sold' && prod) {
      setTimeout(() => {
        setReviewTarget({
          farmerId: prod.farmerId,
          farmerName: prod.farmerName || 'Farmer',
        });
      }, 500);
    }
  };

  const boostProduct = (productId: string, plan: 'featured' | 'urgent' | 'combo') => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        return {
          ...p,
          isFeatured: plan === 'featured' || plan === 'combo' ? true : p.isFeatured,
          isUrgent: plan === 'urgent' || plan === 'combo' ? true : p.isUrgent,
          viewsCount: (p.viewsCount || 0) + 145,
        };
      })
    );
    const prod = products.find((p) => p.id === productId);
    showToast(`⚡ Ad Boosted! "${prod?.name || 'Listing'}" is now promoted at the top.`, 'success');
  };

  const deleteProduct = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
    setFavorites((prev) => prev.filter((id) => id !== productId));
    if (selectedProduct?.id === productId) {
      setSelectedProduct(null);
    }
    ApiClient.deleteProduct(productId).catch((err) =>
      console.warn('[HALDER Sync] deleteProduct server sync error:', err.message)
    );
    showToast('Advertisement removed from marketplace', 'info');
  };

  const resetFilters = () => {
    setFilterState(initialFilterState);
    setSelectedCategory('All');
    setSearchQuery('');
    showToast('Filters reset to default', 'info');
  };

  const resetDemoData = () => {
    setProducts([]);
    setOrders([]);
    setCart([]);
    setFavorites([]);
    localStorage.removeItem('halder-products-v2');
    localStorage.removeItem('halder-orders-v2');
    localStorage.removeItem('halder-cart-v2');
    localStorage.removeItem('halder-favorites');
    refreshProducts();
    showToast('Local marketplace cache cleared & refreshed!', 'info');
  };

  const clearAllDummyAccounts = async () => {
    setUsers((prev) => prev.filter((u) => !isDummyOrTestAccount(u)));
    setFarmers((prev) => prev.filter((f) => !isDummyOrTestAccount(f)));

    try {
      const uRaw = localStorage.getItem('halder-users-v2');
      if (uRaw) {
        const uParsed = JSON.parse(uRaw);
        if (Array.isArray(uParsed)) {
          localStorage.setItem('halder-users-v2', JSON.stringify(uParsed.filter((u: any) => !isDummyOrTestAccount(u))));
        }
      }
      const fRaw = localStorage.getItem('halder-farmers-v2');
      if (fRaw) {
        const fParsed = JSON.parse(fRaw);
        if (Array.isArray(fParsed)) {
          safeStorageSet('halder-farmers-v2', JSON.stringify(fParsed.filter((f: any) => !isDummyOrTestAccount(f))));
        }
      }
    } catch {}

    try {
      await ApiClient.purgeTestAccounts();
    } catch (e: any) {
      console.warn('[HALDER Sync] purgeTestAccounts server sync warning:', e.message);
    }

    try {
      const [freshUsers, freshFarmers] = await Promise.all([
        ApiClient.getAdminUsers().catch(() => null),
        ApiClient.getFarmers().catch(() => null),
      ]);
      if (Array.isArray(freshUsers?.data)) {
        setUsers(freshUsers.data.filter((u: any) => !isDummyOrTestAccount(u)));
      } else if (Array.isArray(freshUsers)) {
        setUsers(freshUsers.filter((u: any) => !isDummyOrTestAccount(u)));
      }
      if (Array.isArray(freshFarmers) && freshFarmers.length > 0) {
        setFarmers(freshFarmers.filter((f: any) => !isDummyOrTestAccount(f)).map((f: any) => ({
          id: f.id,
          name: f.name,
          farmName: f.farm_name,
          location: f.location,
          city: f.city,
          distanceKm: 2.3,
          rating: f.rating,
          totalOrders: f.total_orders,
          totalListingsCount: f.total_listings_count,
          responseRate: f.response_rate,
          joinedYear: f.joined_year,
          avatar: f.avatar,
          coverImage: f.cover_image,
          verificationStatus: f.verification_status,
          description: f.description,
        })) as any);
      }
    } catch {}

    showToast('All dummy and test accounts permanently cleared!', 'success');
  };

  return (
    <AppContext.Provider
      value={{
        role,
        setRole,
        customerTab,
        setCustomerTab,
        farmerTab,
        setFarmerTab,
        adminTab,
        setAdminTab,
        showSplash,
        setShowSplash,
        hasSeenOnboarding,
        setHasSeenOnboarding,
        isLoggedIn,
        setIsLoggedIn,
        isLoginModalOpen,
        setIsLoginModalOpen,
        setAuthenticatedSession,
        loginUser,
        loginWithGoogle,
        currentUser,
        updateCurrentUser,
        users,
        login,
        signup,
        logout,
        toggleUserStatus,
        changeUserRole,
        toggleProductFeatured,
        toggleProductUrgent,
        deleteUser,
        addUser,
        deleteCategory,
        categories,
        addCategory,
        toggleCategoryActive,
        approveFarmerVerification,
        rejectFarmerVerification,
        reviews,
        addReview,
        notifications,
        isNotificationModalOpen,
        setIsNotificationModalOpen,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        deleteNotification,
        sendNotification,
        products,
        isLoadingProducts,
        refreshProducts,
        farmers,
        orders,
        cart,
        favorites,
        toggleFavorite,
        isFavorite,
        selectedProduct,
        setSelectedProduct,
        selectedFarmer,
        setSelectedFarmer,
        isPostRequirementOpen,
        setIsPostRequirementOpen,
        trackingOrder,
        setTrackingOrder,
        currentLocation,
        setCurrentLocation,
        userCoordinates,
        setUserCoordinates,
        activeCity,
        setActiveCity,
        isLocationModalOpen,
        setIsLocationModalOpen,
        searchRadiusKm,
        setSearchRadiusKm: handleSetSearchRadiusKm,
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        isSearchScreenOpen,
        setIsSearchScreenOpen,
        isFilterModalOpen,
        setIsFilterModalOpen,
        filterState,
        setFilterState,
        resetFilters,
        isFastSellOpen,
        setIsFastSellOpen,
        editingListing,
        setEditingListing,
        publishListing,
        addProduct: publishListing,
        updateProductStatusAction,
        isSavedSearchesOpen,
        setIsSavedSearchesOpen,
        stockControlProduct,
        setStockControlProduct,
        isChatModalOpen,
        setIsChatModalOpen,
        chatFarmer,
        setChatFarmer,
        activeConversationId,
        setActiveConversationId,
        activeConversationProductId,
        setActiveConversationProductId,
        pendingChatInitialMessage,
        setPendingChatInitialMessage,
        chatConversationError,
        isOpeningChat,
        openFarmerChat,
        retryOpenChat,
        openConversationById,
        unreadChatCount,
        setUnreadChatCount,
        chatConversations,
        refreshChatConversations,
        buyNowProduct,
        setBuyNowProduct,
        groupedCart,
        isDeviceFrame,
        setIsDeviceFrame,
        toast,
        showToast,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        cartTotal,
        cartItemsCount,
        placeOrder,
        updateOrderStatus,
        advanceOrderDemoStep,
        toggleProductAvailability,
        toggleProductSold,
        updateProduct,
        updateProductPrice,
        bulkUpdateProducts,
        bulkDeleteProducts,
        boostProduct,
        deleteProduct,
        resetDemoData,
        clearAllDummyAccounts,
        platformSettings,
        updatePlatformSettings,
        disputes,
        raiseDispute,
        resolveDispute,
        reviewTarget,
        setReviewTarget,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
