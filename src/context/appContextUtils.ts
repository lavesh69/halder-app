import React, { createContext, useContext } from 'react';
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
import { calculateHaversineDistanceKm } from '../utils/geo';

export type CustomerTab = 'home' | 'chats' | 'my-ads' | 'search' | 'sell' | 'cart' | 'orders' | 'profile' | 'favorites';
export type FarmerTab = 'dashboard' | 'listings' | 'my-ads' | 'sell' | 'orders' | 'profile' | 'earnings' | 'chat';
export type AdminTab = 'overview' | 'database' | 'users' | 'verification' | 'products' | 'reports' | 'orders' | 'categories' | 'audit' | 'settings' | 'logistics' | 'finance' | 'device-bans';

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

export interface AppContextType {
  role: Role;
  setRole: (role: Role) => void;
  customerTab: CustomerTab;
  setCustomerTab: (tab: CustomerTab) => void;
  farmerTab: FarmerTab;
  setFarmerTab: (tab: FarmerTab) => void;
  adminTab: AdminTab;
  setAdminTab: (tab: AdminTab) => void;

  showSplash: boolean;
  setShowSplash: (show: boolean) => void;
  hasSeenOnboarding: boolean;
  setHasSeenOnboarding: (seen: boolean) => void;
  isLoggedIn: boolean;
  setIsLoggedIn: (logged: boolean) => void;
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (open: boolean) => void;
  setAuthenticatedSession: (user: User, token?: string) => void;
  loginUser: (role: Role, phone?: string) => void;
  loginWithGoogle: (idToken: string, role?: Role) => Promise<boolean>;
  currentUser: User | null;
  updateCurrentUser: (updates: Partial<User>) => void;
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

  categories: Category[];
  addCategory: (cat: Omit<Category, 'id'>) => void;
  toggleCategoryActive: (catId: string) => void;
  deleteCategory: (catId: string) => void;

  approveFarmerVerification: (farmerId: string) => void;
  rejectFarmerVerification: (farmerId: string) => void;

  reviews: Review[];
  addReview: (review: Omit<Review, 'id' | 'createdAt'>) => void;

  notifications: AppNotification[];
  isNotificationModalOpen: boolean;
  setIsNotificationModalOpen: (open: boolean) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  deleteNotification: (id: string) => void;
  sendNotification: (title: string, message: string, recipientRole: Role) => void;

  products: Product[];
  isLoadingProducts: boolean;
  refreshProducts: () => Promise<void>;
  farmers: Farmer[];
  orders: Order[];
  cart: CartItem[];
  favorites: string[];
  toggleFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;

  selectedProduct: Product | null;
  setSelectedProduct: (p: Product | null) => void;
  selectedFarmer: Farmer | null;
  setSelectedFarmer: (f: Farmer | null) => void;
  isPostRequirementOpen: boolean;
  setIsPostRequirementOpen: (open: boolean) => void;
  trackingOrder: Order | null;
  setTrackingOrder: (o: Order | null) => void;

  currentLocation: string;
  setCurrentLocation: (loc: string) => void;
  userCoordinates: { lat: number; lng: number } | null;
  setUserCoordinates: (coords: { lat: number; lng: number } | null) => void;
  activeCity: string;
  setActiveCity: (city: string) => void;
  isLocationModalOpen: boolean;
  setIsLocationModalOpen: (open: boolean) => void;
  searchRadiusKm: number;
  setSearchRadiusKm: (r: number) => void;

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

  isFastSellOpen: boolean;
  setIsFastSellOpen: (open: boolean) => void;
  editingListing: Product | null;
  setEditingListing: (p: Product | null) => void;
  publishListing: (listingData: any) => void;
  addProduct: (listingData: any) => void;
  updateProductStatusAction: (productId: string, action: 'pause' | 'resume' | 'mark_sold' | 'renew') => Promise<void>;

  isSavedSearchesOpen: boolean;
  setIsSavedSearchesOpen: (open: boolean) => void;
  stockControlProduct: Product | null;
  setStockControlProduct: (p: Product | null) => void;

  isChatModalOpen: boolean;
  setIsChatModalOpen: (open: boolean) => void;
  chatFarmer: Farmer | null;
  setChatFarmer: (f: Farmer | null) => void;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  activeConversationProductId: string | null;
  setActiveConversationProductId: (id: string | null) => void;
  pendingChatInitialMessage: string | null;
  setPendingChatInitialMessage: (msg: string | null) => void;
  chatConversationError: string | null;
  isOpeningChat: boolean;
  openFarmerChat: (farmer: Farmer, initialMessage?: string, productId?: string) => void;
  retryOpenChat: () => void;
  openConversationById: (conversationId: string) => Promise<void>;
  unreadChatCount: number;
  setUnreadChatCount: (count: number) => void;
  chatConversations: any[];
  refreshChatConversations: () => Promise<void>;

  buyNowProduct: { product: Product; quantity: number } | null;
  setBuyNowProduct: (item: { product: Product; quantity: number } | null) => void;
  groupedCart: GroupedFarmerCart[];

  isDeviceFrame: boolean;
  setIsDeviceFrame: (isFrame: boolean) => void;

  toast: ToastInfo | null;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;

  addToCart: (product: Product, quantity?: number) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  cartTotal: number;
  cartItemsCount: number;

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

  toggleProductAvailability: (productId: string) => void;
  toggleProductSold: (productId: string) => void;
  updateProductPrice: (productId: string, newPrice: number) => void;
  updateProduct: (productId: string, updates: Partial<Product>) => void;
  bulkUpdateProducts: (productIds: string[], updates: Partial<Product>) => void;
  bulkDeleteProducts: (productIds: string[]) => void;
  boostProduct: (productId: string, plan: 'featured' | 'urgent' | 'combo') => void;
  deleteProduct: (productId: string) => void;
  resetDemoData: () => void;
  clearAllDummyAccounts: () => Promise<void>;

  platformSettings: PlatformSettings;
  updatePlatformSettings: (newSettings: Partial<PlatformSettings>) => void;

  disputes: DisputeRecord[];
  raiseDispute: (disputeData: Omit<DisputeRecord, 'id' | 'status' | 'createdAt'>) => void;
  resolveDispute: (disputeId: string, action: 'refund' | 'dismiss', notes?: string) => void;

  reviewTarget: { farmerId: string; farmerName: string; orderId?: string } | null;
  setReviewTarget: (target: { farmerId: string; farmerName: string; orderId?: string } | null) => void;
}

export const initialFilterState: FilterState = {
  category: 'All',
  minPrice: 0,
  maxPrice: 100000,
  maxDistanceKm: 50,
  availableTodayOnly: false,
  organicOnly: false,
  sortBy: 'nearest',
};

export const initialPlatformSettings: PlatformSettings = {
  platformCommissionRate: 0,
  freeDeliveryThreshold: 200,
  standardDeliveryFee: 25,
  helplinePhone: '',
  supportEmail: '',
  emergencyAlert: '',
};

export const initialDisputes: DisputeRecord[] = [];

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export const isDummyOrTestAccount = (u: any): boolean => {
  if (!u) return false;
  const name = String(u.name || '').toLowerCase();
  const email = String(u.email || '').toLowerCase();
  const phone = String(u.phone || '').toLowerCase();
  const id = String(u.id || '').toLowerCase();
  const farmName = String(u.farmName || u.farm_name || '').toLowerCase();

  if (['user-admin-1', 'user-cust-1', 'user-farm-1', 'user-farm-2', 'user-farm-3', 'user-del-1'].includes(id)) {
    return false;
  }
  if (['farmer-1', 'farmer-2', 'farmer-3'].includes(id)) {
    return false;
  }
  if (email.includes('laveshdob') || phone.includes('7579406954') || name === 'lavesh') {
    return false;
  }

  return (
    name.includes('test') ||
    email.includes('test') ||
    id.includes('test') ||
    email.includes('1795') ||
    email.includes('buyer_test') ||
    name.includes('ramesh negi') ||
    name.includes('rohit verma') ||
    name.includes('storage test') ||
    name.includes('live kisan') ||
    farmName.includes('storage test') ||
    farmName.includes('live kisan') ||
    name.includes('suresh chandra') ||
    name.includes('kishore singh') ||
    name.includes('vikas rawat') ||
    name.includes('balwant singh negi') ||
    name === 'ramesh singh'
  );
};

export const safeStorageSet = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (err: any) {
    if (err?.name === 'QuotaExceededError' || err?.code === 22) {
      console.warn(`[HALDER Storage] LocalStorage quota exceeded for ${key}. Pruning non-critical cache.`);
      try {
        localStorage.removeItem('halder_recent_searches');
        localStorage.removeItem('halder_weather_cache');
        localStorage.setItem(key, value);
      } catch {
        console.error('[HALDER Storage] LocalStorage is full. Skipping storage write.');
      }
    }
  }
};

export const mapBackendProduct = (
  p: any,
  userCoordinates?: { lat: number; lng: number } | null
): Product => ({
  id: p.id,
  name: p.name,
  category: p.category_name || 'Vegetables',
  price: Number(p.price),
  unit: p.unit,
  availableQuantity: Number(p.available_quantity ?? 0),
  totalQuantity: p.total_quantity !== undefined ? Number(p.total_quantity) : Number(p.available_quantity ?? 0),
  reservedQuantity: Number(p.reserved_quantity ?? 0),
  soldQuantity: Number(p.sold_quantity ?? 0),
  minOrderQuantity: Number(p.min_order_quantity ?? 1),
  min_order_quantity: Number(p.min_order_quantity ?? 1),
  stockStatus: p.stock_status || 'available',
  stock_status: p.stock_status || 'available',
  isNegotiable: p.is_negotiable !== 0,
  productGrade: p.product_grade || 'Grade A',
  qualityDescription: p.quality_description || '',
  organicCertificationBody: p.organic_certification_body || '',
  storageInfo: p.storage_info || '',
  packagingInfo: p.packaging_info || '',
  harvestDate: p.harvest_date || '',
  description: p.description || '',
  farmerId: p.farmer_id,
  farmerName: p.farmer_name,
  farmerPhone: p.farmer_phone || undefined,
  farmName: p.farm_name,
  farmerAvatar: p.farmer_avatar || 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=200',
  location: p.location,
  city: p.city || 'Dehradun',
  district: p.district || p.city || 'Dehradun',
  state: p.state || 'Uttarakhand',
  village: p.village || '',
  postalCode: p.postal_code || '',
  pickupAvailable: p.pickup_available !== 0,
  farmerDeliveryAvailable: p.farmer_delivery_available !== 0,
  distanceKm: (() => {
    const lat = p.latitude !== undefined && p.latitude !== null ? Number(p.latitude) : undefined;
    const lng = p.longitude !== undefined && p.longitude !== null ? Number(p.longitude) : undefined;
    if (userCoordinates && lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
      return Math.round(calculateHaversineDistanceKm(userCoordinates, { lat, lng }) * 10) / 10;
    }
    return typeof p.distance_km === 'number' ? p.distance_km : 2.1;
  })(),
  latitude: p.latitude !== undefined && p.latitude !== null ? Number(p.latitude) : undefined,
  longitude: p.longitude !== undefined && p.longitude !== null ? Number(p.longitude) : undefined,
  isOrganic: Boolean(p.is_organic),
  availableToday: Boolean(p.available_today),
  isAvailable: p.status === 'active' || p.status === undefined,
  status: p.status || 'active',
  freshnessTag: p.freshness_tag || 'Fresh Harvest',
  image: p.image,
  images: Array.isArray(p.images) ? p.images : p.image ? [p.image] : [],
  priceSlabs: Array.isArray(p.price_slabs) ? p.price_slabs : Array.isArray(p.priceSlabs) ? p.priceSlabs : undefined,
  price_slabs: Array.isArray(p.price_slabs) ? p.price_slabs : Array.isArray(p.priceSlabs) ? p.priceSlabs : undefined,
  rating: p.rating || 5.0,
  viewsCount: p.views_count || 12,
  likesCount: p.likes_count || 4,
  createdAt: p.created_at || p.createdAt || new Date().toISOString(),
  createdAtTime: p.created_at ? new Date(p.created_at).toLocaleDateString() : 'Today',
});

export const nextGeneratedId = (prefix: string): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
};
