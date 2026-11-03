import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Product,
  Farmer,
  Order,
  CartItem,
  Role,
  OrderStatus,
  PaymentMethod,
  FilterState,
  ChatMessage,
  GroupedFarmerCart,
  User,
  Category,
  Review,
  AppNotification,
} from '../types';
import {
  initialProducts,
  initialFarmers,
  initialOrders,
  initialUsers,
  initialCategories,
  initialReviews,
  initialNotifications,
} from '../data/mockData';
import confetti from 'canvas-confetti';
import { ApiClient } from '../api/client';

export type CustomerTab = 'home' | 'chats' | 'my-ads' | 'search' | 'sell' | 'cart' | 'orders' | 'profile' | 'favorites';
export type FarmerTab = 'dashboard' | 'listings' | 'sell' | 'orders' | 'profile' | 'earnings' | 'chat';
export type AdminTab = 'overview' | 'users' | 'verification' | 'products' | 'orders' | 'categories' | 'audit' | 'settings';

export interface ToastInfo {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
}

export interface PlatformSettings {
  platformCommissionRate: number;
  freeDeliveryThreshold: number;
  standardDeliveryFee: number;
  helplinePhone: string;
  supportEmail: string;
  emergencyAlert: string;
}

export interface DisputeRecord {
  id: string;
  orderId: string;
  orderNumber: string;
  farmerId?: string;
  farmerName: string;
  customerName: string;
  customerPhone: string;
  category: string;
  details: string;
  amount: number;
  status: 'UNDER_INVESTIGATION' | 'REFUNDED' | 'RESOLVED_DISMISSED';
  createdAt: string;
  resolutionNotes?: string;
}

interface AppContextType {
  role: Role;
  setRole: (role: Role) => void;
  customerTab: CustomerTab;
  setCustomerTab: (tab: CustomerTab) => void;
  farmerTab: FarmerTab;
  setFarmerTab: (tab: FarmerTab) => void;
  adminTab: AdminTab;
  setAdminTab: (tab: AdminTab) => void;

  // Onboarding & Auth
  showSplash: boolean;
  setShowSplash: (show: boolean) => void;
  hasSeenOnboarding: boolean;
  setHasSeenOnboarding: (seen: boolean) => void;
  isLoggedIn: boolean;
  setIsLoggedIn: (logged: boolean) => void;
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (open: boolean) => void;
  loginUser: (role: Role, phone?: string) => void;
  loginWithGoogle: (idToken: string, role?: Role) => Promise<boolean>;
  currentUser: User | null;
  users: User[];
  login: (emailOrPhone: string, role?: Role) => boolean;
  signup: (name: string, email: string, phone: string, role: Role) => void;
  logout: () => void;
  toggleUserStatus: (userId: string) => void;
  changeUserRole: (userId: string, newRole: Role) => void;
  toggleProductFeatured: (productId: string) => void;
  toggleProductUrgent: (productId: string) => void;
  deleteUser: (userId: string) => void;
  addUser: (userData: Omit<User, 'id' | 'created_at' | 'updated_at'>) => void;

  // Categories
  categories: Category[];
  addCategory: (cat: Omit<Category, 'id'>) => void;
  toggleCategoryActive: (catId: string) => void;
  deleteCategory: (catId: string) => void;

  // Farmer verification
  approveFarmerVerification: (farmerId: string) => void;
  rejectFarmerVerification: (farmerId: string) => void;

  // Reviews
  reviews: Review[];
  addReview: (review: Omit<Review, 'id' | 'createdAt'>) => void;

  // In-app Notifications
  notifications: AppNotification[];
  isNotificationModalOpen: boolean;
  setIsNotificationModalOpen: (open: boolean) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  sendNotification: (title: string, message: string, recipientRole: Role) => void;

  // Marketplace Data
  products: Product[];
  farmers: Farmer[];
  orders: Order[];
  cart: CartItem[];
  favorites: string[];
  toggleFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;

  // Modals & Selected items
  selectedProduct: Product | null;
  setSelectedProduct: (p: Product | null) => void;
  selectedFarmer: Farmer | null;
  setSelectedFarmer: (f: Farmer | null) => void;
  trackingOrder: Order | null;
  setTrackingOrder: (o: Order | null) => void;

  // Location-first State
  currentLocation: string;
  setCurrentLocation: (loc: string) => void;
  activeCity: string;
  setActiveCity: (city: string) => void;
  isLocationModalOpen: boolean;
  setIsLocationModalOpen: (open: boolean) => void;
  searchRadiusKm: number;
  setSearchRadiusKm: (r: number) => void;

  // Search & Filter
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategory: string;
  setSelectedCategory: (c: string) => void;
  isSearchScreenOpen: boolean;
  setIsSearchScreenOpen: (open: boolean) => void;
  isFilterModalOpen: boolean;
  setIsFilterModalOpen: (open: boolean) => void;
  filterState: FilterState;
  setFilterState: React.Dispatch<React.SetStateAction<FilterState>>;
  resetFilters: () => void;

  // Fast 4-Step "+ Sell" Modal
  isFastSellOpen: boolean;
  setIsFastSellOpen: (open: boolean) => void;
  isMyAdsOpen: boolean;
  setIsMyAdsOpen: (open: boolean) => void;
  isAddProductOpen: boolean;
  setIsAddProductOpen: (open: boolean) => void;
  publishListing: (listingData: any) => void;
  addProduct: (listingData: any) => void;

  // Chat / Contact
  isChatModalOpen: boolean;
  setIsChatModalOpen: (open: boolean) => void;
  chatFarmer: Farmer | null;
  setChatFarmer: (f: Farmer | null) => void;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  activeConversationProductId: string | null;
  setActiveConversationProductId: (id: string | null) => void;
  openFarmerChat: (farmer: Farmer, initialMessage?: string, productId?: string) => void;
  chatMessages: Record<string, ChatMessage[]>;
  sendChatMessage: (farmerId: string, text: string) => void;
  unreadChatCount: number;
  setUnreadChatCount: (count: number) => void;
  chatConversations: any[];
  refreshChatConversations: () => Promise<void>;

  // Buy Now vs Multi-Farmer Cart
  buyNowProduct: { product: Product; quantity: number } | null;
  setBuyNowProduct: (item: { product: Product; quantity: number } | null) => void;
  groupedCart: GroupedFarmerCart[];

  // Responsive device frame toggle
  isDeviceFrame: boolean;
  setIsDeviceFrame: (isFrame: boolean) => void;

  // Toast
  toast: ToastInfo | null;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;

  // Cart actions
  addToCart: (product: Product, quantity?: number) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  cartTotal: number;
  cartItemsCount: number;

  // Order actions
  placeOrder: (details: {
    address: string;
    slot: string;
    paymentMethod: PaymentMethod;
    farmerTip: number;
    isBuyNow?: boolean;
    instructions?: string;
  }) => Order;
  updateOrderStatus: (
    orderId: string,
    status: OrderStatus,
    logistics?: { driverName?: string; driverPhone?: string; vehicleNumber?: string; estTime?: string }
  ) => void;
  advanceOrderDemoStep: (orderId: string) => void;

  // Farmer CRUD
  toggleProductAvailability: (productId: string) => void;
  toggleProductSold: (productId: string) => void;
  updateProductPrice: (productId: string, newPrice: number) => void;
  updateProduct: (productId: string, updates: Partial<Product>) => void;
  bulkUpdateProducts: (productIds: string[], updates: Partial<Product>) => void;
  bulkDeleteProducts: (productIds: string[]) => void;
  boostProduct: (productId: string, plan: 'featured' | 'urgent' | 'combo') => void;
  deleteProduct: (productId: string) => void;
  resetDemoData: () => void;

  // Platform Governance & Settings
  platformSettings: PlatformSettings;
  updatePlatformSettings: (newSettings: Partial<PlatformSettings>) => void;

  // Disputes & Grievance Redressal
  disputes: DisputeRecord[];
  raiseDispute: (disputeData: Omit<DisputeRecord, 'id' | 'status' | 'createdAt'>) => void;
  resolveDispute: (disputeId: string, action: 'refund' | 'dismiss', notes?: string) => void;
}

const initialFilterState: FilterState = {
  category: 'All',
  minPrice: 0,
  maxPrice: 100000,
  maxDistanceKm: 50,
  availableTodayOnly: false,
  organicOnly: false,
  sortBy: 'nearest',
};

const initialChatMessages: Record<string, ChatMessage[]> = {
  'farmer-1': [
    {
      id: 'msg-1',
      farmerId: 'farmer-1',
      sender: 'farmer',
      text: 'Namaste! Welcome to Green Valley Farm. Our morning tomatoes and fresh A2 milk are harvested and ready for dispatch.',
      time: '7:15 AM',
    },
  ],
  'farmer-3': [
    {
      id: 'msg-2',
      farmerId: 'farmer-3',
      sender: 'farmer',
      text: 'Hello! All our mountain spinach and carrots are 100% certified organic from Mussoorie foothills.',
      time: '6:30 AM',
    },
  ],
};

const initialPlatformSettings: PlatformSettings = {
  platformCommissionRate: 0,
  freeDeliveryThreshold: 200,
  standardDeliveryFee: 25,
  helplinePhone: '+91 98765 43210',
  supportEmail: 'support@halder.farm',
  emergencyAlert: '',
};

const initialDisputes: DisputeRecord[] = [
  {
    id: 'DISP-101',
    orderId: 'order-101',
    orderNumber: '#HD1042',
    farmerName: 'Rajesh Kumar',
    customerName: 'Aman Sharma',
    customerPhone: '+91 98765 43210',
    category: 'Spoiled / Rotten Produce',
    details: 'Morning delivery of organic tomatoes had cracked & bruised items at the bottom of the eco-crate.',
    amount: 140,
    status: 'UNDER_INVESTIGATION',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'DISP-102',
    orderId: 'order-102',
    orderNumber: '#HD1088',
    farmerName: 'Amit Singh',
    customerName: 'Priya Patel',
    customerPhone: '+91 98450 99887',
    category: 'Weight Discrepancy (Underweight)',
    details: 'Delivered Mustard Greens crate measured 4.2 kg on calibrated digital scale instead of 5.0 kg invoice billing.',
    amount: 90,
    status: 'UNDER_INVESTIGATION',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<Role>(() => {
    return (localStorage.getItem('halder-role') as Role) || 'customer';
  });

  const [customerTab, setCustomerTab] = useState<CustomerTab>('home');
  const [farmerTab, setFarmerTab] = useState<FarmerTab>('dashboard');
  const [adminTab, setAdminTab] = useState<AdminTab>('overview');

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('halder-users-v2');
    return saved ? JSON.parse(saved) : initialUsers;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('halder-current-user-v2');
    return saved ? JSON.parse(saved) : initialUsers[0];
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('halder-categories-v2');
    return saved ? JSON.parse(saved) : initialCategories;
  });

  const [reviews, setReviews] = useState<Review[]>(() => {
    const saved = localStorage.getItem('halder-reviews-v2');
    return saved ? JSON.parse(saved) : initialReviews;
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem('halder-notifications-v2');
    return saved ? JSON.parse(saved) : initialNotifications;
  });

  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

  const [farmers, setFarmers] = useState<Farmer[]>(() => {
    const saved = localStorage.getItem('halder-farmers-v2');
    return saved ? JSON.parse(saved) : initialFarmers;
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
    return saved ? JSON.parse(saved) : initialProducts;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('halder-orders-v2');
    return saved ? JSON.parse(saved) : initialOrders;
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('halder-cart-v2');
    return saved ? JSON.parse(saved) : [];
  });

  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('halder-favorites');
    return saved ? JSON.parse(saved) : ['prod-1', 'prod-3', 'prod-7'];
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

  // Location-first
  const [currentLocation, setCurrentLocation] = useState<string>('Rajpur Road, Dehradun');
  const [activeCity, setActiveCity] = useState<string>('Dehradun');
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);
  const [searchRadiusKm, setSearchRadiusKm] = useState<number>(() => {
    const saved = localStorage.getItem('halder-radius-km');
    return saved ? Number(saved) : 300;
  });

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
  const [isFastSellOpen, setIsFastSellOpen] = useState<boolean>(false);
  const [isMyAdsOpen, setIsMyAdsOpen] = useState<boolean>(false);

  // Buy Now
  const [buyNowProduct, setBuyNowProduct] = useState<{ product: Product; quantity: number } | null>(null);

  // Chat
  const [isChatModalOpen, setIsChatModalOpen] = useState<boolean>(false);
  const [chatFarmer, setChatFarmer] = useState<Farmer | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeConversationProductId, setActiveConversationProductId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessage[]>>(initialChatMessages);
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
    localStorage.setItem('halder-farmers-v2', JSON.stringify(farmers));
  }, [farmers]);

  useEffect(() => {
    localStorage.setItem('halder-reviews-v2', JSON.stringify(reviews));
  }, [reviews]);

  useEffect(() => {
    localStorage.setItem('halder-notifications-v2', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('halder-products-v2', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('halder-orders-v2', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('halder-cart-v2', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('halder-favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('halder-role', role);
  }, [role]);


  // Live Server Backend Synchronization
  useEffect(() => {
    let isMounted = true;
    async function syncBackendData() {
      try {
        const prodRes = await ApiClient.getProducts({
          limit: 50,
          latitude: 30.3165,
          longitude: 78.0322,
          radiusKm: searchRadiusKm,
        });
        if (isMounted && prodRes?.products?.length > 0) {
          const mappedProducts: Product[] = prodRes.products.map((p: any) => ({
            id: p.id,
            name: p.name,
            category: p.category_name || 'Vegetables',
            price: p.price,
            unit: p.unit,
            availableQuantity: p.available_quantity,
            farmerId: p.farmer_id,
            farmerName: p.farmer_name,
            farmName: p.farm_name,
            farmerAvatar: p.farmer_avatar || 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=200',
            location: p.location,
            city: p.city || 'Dehradun',
            distanceKm: typeof p.distance_km === 'number' ? p.distance_km : 2.1,
            isOrganic: Boolean(p.is_organic),
            availableToday: Boolean(p.available_today),
            freshnessTag: p.freshness_tag || 'Fresh Harvest',
            image: p.image,
            rating: p.rating || 5.0,
            viewsCount: p.views_count || 12,
            likesCount: p.likes_count || 4,
            createdAtTime: 'Today',
          }));
          setProducts(mappedProducts);
        }
      } catch (e) {
        console.warn('[HALDER Sync] Using cached local products:', e);
      }

      try {
        const farmRes = await ApiClient.getFarmers();
        if (isMounted && farmRes?.length > 0) {
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
    }

    async function syncUserData() {
      const token = localStorage.getItem('halder-auth-token');
      if (!token) return;
      try {
        const meRes = await ApiClient.getMe();
        if (isMounted && meRes?.user) {
          setCurrentUser(meRes.user);
          setIsLoggedInState(true);
        }
      } catch {
        ApiClient.clearToken();
      }

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

    syncBackendData();
    syncUserData();
    return () => { isMounted = false; };
  }, []);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Date.now().toString();
    setToast({ id, message, type });
    setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 2800);
  };

  const setRole = (newRole: Role) => {
    setRoleState(newRole);
    if (newRole === 'admin') {
      ApiClient.login('admin@halder.com', 'halder123', 'admin')
        .then((res) => {
          if (res?.token) ApiClient.setToken(res.token);
          if (res?.user) setCurrentUser(res.user);
        })
        .catch((e) => console.warn('[Admin Auth] auto-login:', e.message));
    }
    showToast(`Switched to ${newRole === 'farmer' ? '🌾 Farmer Mandi (Rajesh Kumar)' : newRole === 'admin' ? '🛡️ Superadmin Console' : '🛒 Local Marketplace'}`);
  };

  const setHasSeenOnboarding = (seen: boolean) => {
    setHasSeenOnboardingState(seen);
    localStorage.setItem('halder-onboarded', seen ? 'true' : 'false');
  };

  const setIsLoggedIn = (logged: boolean) => {
    setIsLoggedInState(logged);
    localStorage.setItem('halder-loggedin', logged ? 'true' : 'false');
  };

  const login = (emailOrPhone: string, targetRole?: Role): boolean => {
    ApiClient.login(emailOrPhone, undefined, targetRole)
      .then((res) => {
        if (res?.token) ApiClient.setToken(res.token);
        if (res?.user) {
          setCurrentUser(res.user);
          setRoleState(targetRole || res.user.role);
        }
      })
      .catch((e) => console.warn('[HALDER Auth] Server login fallback:', e.message));

    const existing = users.find(
      (u) => u.email.toLowerCase() === emailOrPhone.toLowerCase() || u.phone === emailOrPhone
    );
    if (existing) {
      if (existing.status === 'suspended') {
        showToast('Your account is currently suspended. Please contact admin.', 'error');
        return false;
      }
      setCurrentUser(existing);
      setRoleState(targetRole || existing.role);
      setIsLoggedIn(true);
      setHasSeenOnboarding(true);
      showToast(`Welcome back, ${existing.name}!`);
      return true;
    }
    const newUser: User = {
      id: `user-${Date.now()}`,
      name: emailOrPhone.includes('@') ? emailOrPhone.split('@')[0] : 'User ' + emailOrPhone.slice(-4),
      phone: emailOrPhone.includes('@') ? '+91 98000 00000' : emailOrPhone,
      email: emailOrPhone.includes('@') ? emailOrPhone : `user_${Date.now()}@halder.com`,
      role: targetRole || 'customer',
      profile_image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
      status: 'active',
      created_at: 'Just now',
      updated_at: 'Just now',
    };
    setUsers((prev) => [newUser, ...prev]);
    setCurrentUser(newUser);
    setRoleState(newUser.role);
    setIsLoggedIn(true);
    setHasSeenOnboarding(true);
    showToast(`Welcome to HALDER, ${newUser.name}!`);
    return true;
  };

  const signup = (name: string, email: string, phone: string, newRole: Role) => {
    ApiClient.register({ name, email, phone, role: newRole })
      .then((res) => {
        if (res?.token) ApiClient.setToken(res.token);
        if (res?.user) setCurrentUser(res.user);
      })
      .catch((e) => console.warn('[HALDER Auth] Registration queued:', e.message));

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
  };

  const loginUser = (selectedRole: Role, phone?: string) => {
    setIsLoggedIn(true);
    setHasSeenOnboarding(true);
    setRoleState(selectedRole);

    const credential = phone || (selectedRole === 'farmer' ? 'rajesh@greenvalley.in' : 'aman@halder.com');
    ApiClient.login(credential, undefined, selectedRole)
      .then((res) => {
        if (res?.token) ApiClient.setToken(res.token);
        if (res?.user) setCurrentUser(res.user);
      })
      .catch((e) => console.warn('[HALDER Auth] Offline/fallback login mode:', e.message));

    showToast(`Welcome to HALDER! Logged in as ${selectedRole === 'farmer' ? 'Rajesh Kumar (Farmer)' : selectedRole === 'admin' ? 'Admin' : 'Customer'}.`);
  };

  const loginWithGoogle = async (idToken: string, selectedRole: Role = 'customer'): Promise<boolean> => {
    try {
      const res = await ApiClient.loginWithGoogle(idToken, selectedRole);
      if (res?.user) {
        setCurrentUser(res.user);
        setIsLoggedIn(true);
        setHasSeenOnboarding(true);
        setRoleState(res.user.role || selectedRole);
        showToast(`Welcome, ${res.user.name}! Authenticated via Google.`, 'success');
        return true;
      }
      return false;
    } catch (err: any) {
      showToast(err.message || 'Google Sign-In failed.', 'error');
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

    if (isLoggedIn) {
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

  // Cart
  const addToCart = (product: Product, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity, selectedUnit: product.unit }];
    });
    showToast(`Added ${product.name} to basket`);
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

  // Fast Posting / Sell
  const publishListing = (listingData: any) => {
    const ownerId = currentUser?.farmerProfileId || currentUser?.id || 'farmer-1';
    const ownerName = currentUser?.name || 'Local Seller';
    const ownerAvatar = currentUser?.profile_image || 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=200&auto=format&fit=crop&q=80';
    const ownerFarm = (currentUser as any)?.farm_name || (currentUser?.name ? `${currentUser.name}'s Produce` : 'Green Valley Farm');

    const newListing: Product = {
      ...listingData,
      id: `prod-${Date.now()}`,
      farmerId: ownerId,
      farmerName: ownerName,
      farmName: ownerFarm,
      farmerAvatar: ownerAvatar,
      location: listingData.location || currentLocation,
      city: activeCity,
      distanceKm: 0.8,
      rating: 5.0,
      viewsCount: 1,
      likesCount: 0,
      createdAtTime: 'Just now',
    };

    setProducts((prev) => [newListing, ...prev]);
    // Sync listing with backend
    ApiClient.createProduct({
      categoryId: listingData.categoryId || 'cat-veg',
      name: newListing.name,
      description: newListing.freshnessTag || 'Fresh harvest',
      price: Number(newListing.price),
      unit: newListing.unit || 'kg',
      availableQuantity: Number(newListing.availableQuantity || 20),
      isOrganic: newListing.isOrganic ? 1 : 0,
      availableToday: 1,
      location: newListing.location || 'Dehradun, Uttarakhand',
      image: newListing.image,
    }).catch((e) => console.warn('[HALDER Sync] Product queued locally:', e));
    setIsFastSellOpen(false);
    showToast(`🎉 Listing "${newListing.name}" is now live on HALDER!`);

    try {
      confetti({
        particleCount: 60,
        spread: 50,
        origin: { y: 0.6 },
        colors: ['#2FAF64', '#166534', '#74C69D'],
      });
    } catch {}
  };

  // Chat
  const refreshChatConversations = async () => {
    try {
      const res = await ApiClient.request('/chat/conversations');
      const list = Array.isArray(res) ? res : (res?.conversations || res?.data || []);
      if (Array.isArray(list)) {
        setChatConversations(list);
        const totalUnread = list.reduce((sum: number, c: any) => sum + (c.unreadCount || c.unread_count || 0), 0);
        setUnreadChatCount(totalUnread);
      }
    } catch (e) {
      console.warn('[HALDER Chat] Failed to refresh conversations:', e);
    }
  };

  const openFarmerChat = (farmer: Farmer, initialMsg?: string, productId?: string) => {
    setChatFarmer(farmer);
    setActiveConversationProductId(productId || null);
    setIsChatModalOpen(true);

    // Asynchronously resolve or create backend SQLite conversation
    ApiClient.createConversation(farmer.id, productId)
      .then((res: any) => {
        const conv = res?.data || res;
        if (conv?.id) {
          setActiveConversationId(conv.id);
          if (initialMsg) {
            ApiClient.sendChatMessage(conv.id, initialMsg).catch(() => {});
          }
        }
      })
      .catch((e) => {
        console.warn('[HALDER Chat] Offline/local conversation fallback:', e.message);
        setActiveConversationId(`conv-${farmer.id}`);
      });

    if (initialMsg) {
      sendChatMessage(farmer.id, initialMsg);
    }
  };

  const sendChatMessage = (farmerId: string, text: string) => {
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      farmerId,
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => ({
      ...prev,
      [farmerId]: [...(prev[farmerId] || []), newMsg],
    }));

    setTimeout(() => {
      let replyText = 'Yes, this is freshly harvested today! You can place the order directly.';
      if (text.toLowerCase().includes('available')) {
        replyText = 'Yes, we have 25 kg available right now. Plucked early morning!';
      } else if (text.toLowerCase().includes('location') || text.toLowerCase().includes('farm')) {
        replyText = 'Our farm is at Rajpur Road, just 2.4 km from Clock Tower.';
      } else if (text.toLowerCase().includes('5 kg') || text.toLowerCase().includes('kg')) {
        replyText = 'Sure! Please select 5 kg and click "Buy Now" for doorstep delivery.';
      }

      const reply: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        farmerId,
        sender: 'farmer',
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setChatMessages((prev) => ({
        ...prev,
        [farmerId]: [...(prev[farmerId] || []), reply],
      }));
    }, 900);
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
      customerPhone: currentUser?.phone || '+91 98765 43210',
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
      customerPhone: currentUser?.phone || '+91 98765 43210',
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
    ApiClient.updateProduct(productId, { price: newPrice }).catch((e) =>
      console.warn('[HALDER Sync] Price update server sync error:', e)
    );
    showToast(`Price updated to ₹${newPrice}`, 'success');
  };

  const toggleProductSold = (productId: string) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, isAvailable: !p.isAvailable } : p
      )
    );
    const prod = products.find((p) => p.id === productId);
    const newStatus = prod?.isAvailable ? 'Marked as Sold / Inactive' : 'Marked as Active Live Ad';
    showToast(`${prod?.name || 'Listing'}: ${newStatus}`, 'info');
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
    setProducts(initialProducts);
    setOrders(initialOrders);
    setCart([]);
    setFavorites(['prod-1', 'prod-3', 'prod-7']);
    localStorage.removeItem('halder-products-v2');
    localStorage.removeItem('halder-orders-v2');
    localStorage.removeItem('halder-cart-v2');
    localStorage.removeItem('halder-favorites');
    showToast('Marketplace demo data restored!', 'info');
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
        loginUser,
        loginWithGoogle,
        currentUser,
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
        sendNotification,
        products,
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
        trackingOrder,
        setTrackingOrder,
        currentLocation,
        setCurrentLocation,
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
        isMyAdsOpen,
        setIsMyAdsOpen,
        isAddProductOpen: isFastSellOpen,
        setIsAddProductOpen: setIsFastSellOpen,
        publishListing,
        addProduct: publishListing,
        isChatModalOpen,
        setIsChatModalOpen,
        chatFarmer,
        setChatFarmer,
        activeConversationId,
        setActiveConversationId,
        activeConversationProductId,
        setActiveConversationProductId,
        openFarmerChat,
        chatMessages,
        sendChatMessage,
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
        platformSettings,
        updatePlatformSettings,
        disputes,
        raiseDispute,
        resolveDispute,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
