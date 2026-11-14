export type Role = 'customer' | 'farmer' | 'admin';

export type ThemeMode = 'light' | 'dark' | 'system';

export type ProductCategory = 
  | 'All'
  | 'Vegetables'
  | 'Fruits'
  | 'Leafy Greens'
  | 'Grains'
  | 'Dairy'
  | 'Organic'
  | 'Homemade'
  | 'Homemade Food'
  | 'Seeds'
  | 'Farm Equipment'
  | 'Livestock'
  | 'Other';

export type UnitType = 'kg' | 'gram' | 'bunch' | 'piece' | 'litre' | 'packet' | 'box' | 'L';

export type VerificationStatus = 'verified' | 'pending' | 'rejected';
export type ProductStatus = 'active' | 'unavailable' | 'draft';
export type ModerationStatus = 'approved' | 'pending' | 'flagged';
export type UserStatus = 'active' | 'suspended';

export interface User {
  id: string;
  halder_id?: string;
  name: string;
  phone: string;
  email: string;
  role: Role;
  farmerProfileId?: string;
  profile_image: string;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface FarmerProfile {
  id: string;
  user_id: string;
  halder_id?: string;
  name: string;
  phone: string;
  farm_name: string;
  location: string;
  city: string;
  latitude: number;
  longitude: number;
  description: string;
  verification_status: VerificationStatus;
  rating: number;
  reviews_count: number;
  total_orders: number;
  total_listings_count: number;
  response_rate: number;
  joined_year: number;
  badges: string[];
  avatar: string;
  cover_image: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
  image: string;
  active: boolean;
}

export interface Product {
  id: string;
  farmerId: string;
  farmerName: string;
  farmName: string;
  farmerAvatar: string;
  categoryId?: string;
  category: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  availableQuantity: number;
  image: string;
  images?: string[];
  isOrganic?: boolean;
  isAvailableToday?: boolean;
  isNegotiable?: boolean;
  harvestDate?: string;
  freshnessTag?: string;
  location: string;
  city: string;
  latitude?: number;
  longitude?: number;
  distanceKm: number;
  rating: number;
  viewsCount?: number;
  likesCount?: number;
  isFeatured?: boolean;
  isUrgent?: boolean;
  farmerPhone?: string;
  showPhoneNumber?: boolean;
  isAvailable: boolean;
  status?: ProductStatus;
  moderationStatus?: ModerationStatus;
  subcategory?: string;
  expectedAvailabilityDate?: string;
  stockStatus?: string;
  stock_status?: string;
  totalQuantity?: number;
  total_quantity?: number;
  reservedQuantity?: number;
  soldQuantity?: number;
  productGrade?: string;
  product_grade?: string;
  qualityDescription?: string;
  organicCertificationBody?: string;
  organic_certification_body?: string;
  storageInfo?: string;
  storage_info?: string;
  packagingInfo?: string;
  packaging_info?: string;
  village?: string;
  district?: string;
  state?: string;
  postalCode?: string;
  min_order_quantity?: number;
  minOrderQuantity?: number;
  pickupAvailable?: boolean;
  pickup_available?: boolean;
  farmerDeliveryAvailable?: boolean;
  farmer_delivery_available?: boolean;
  priceSlabs?: PriceSlab[];
  price_slabs?: PriceSlab[];
  availableToday?: boolean;
  createdAtTime?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductImage {
  id: string;
  productId: string;
  imageUrl: string;
  sortOrder: number;
}

export interface Favorite {
  id: string;
  userId: string;
  productId: string;
  createdAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedUnit: string;
}

export interface GroupedFarmerCart {
  farmerId: string;
  farmerName: string;
  farmName: string;
  items: CartItem[];
  subtotal: number;
}

export type OrderStatus = 
  | 'placed'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'rejected';

export type PaymentMethod = 'cod' | 'upi' | 'online' | 'card' | 'wallet' | 'phonepe' | 'gpay' | 'paytm';

export interface OrderItem {
  product: Product;
  quantity: number;
  subtotal: number;
}

export interface TimelineStep {
  status: OrderStatus;
  title: string;
  description: string;
  time?: string;
  completed: boolean;
  current: boolean;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliverySlot: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  farmerTip: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: 'pending' | 'paid';
  createdAt: string;
  estimatedDeliveryTime: string;
  farmerId: string;
  farmerName: string;
  farmerPhone: string;
  farmName: string;
  timeline: TimelineStep[];
  deliveryMode?: string;
  deliveryDistanceKm?: number;
  trackingCourier?: string;
  trackingNumber?: string;
  instructions?: string;
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
}

export interface ChatMessage {
  id: string;
  farmerId: string;
  sender: 'user' | 'farmer';
  text: string;
  time: string;
}

export interface Review {
  id: string;
  orderId: string;
  customerId: string;
  customerName: string;
  farmerId: string;
  rating: number;
  review: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  recipientRole: Role;
  title: string;
  message: string;
  type: 'order' | 'verification' | 'chat' | 'system' | 'offer' | 'negotiation' | 'deal' | 'requirement' | 'quotation' | 'alert' | 'stock';
  isRead: boolean;
  createdAt: string;
}

export interface FilterState {
  category: string;
  minPrice: number;
  maxPrice: number;
  maxDistanceKm: number;
  availableTodayOnly: boolean;
  organicOnly: boolean;
  urgentOnly?: boolean;
  featuredOnly?: boolean;
  negotiableOnly?: boolean;
  verifiedOnly?: boolean;
  sortBy: 'nearest' | 'price_low' | 'price_high' | 'recent';
}

export interface Farmer extends FarmerProfile {
  verified: boolean;
  coverImage?: string;
  bio: string;
  farmName?: string;
  distanceKm?: number;
  reviewsCount?: number;
  joinedYear?: number;
  totalListingsCount?: number;
  totalOrdersCompleted?: number;
  responseRate?: number;
}

export interface PriceSlab {
  id?: string;
  minQuantity: number;
  maxQuantity?: number;
  pricePerUnit: number;
}

export interface BuyerRequirement {
  id: string;
  requirementNumber?: string;
  requirementCode?: string;
  buyerId: string;
  buyerName: string;
  buyerPhone: string;
  productName: string;
  categoryId?: string;
  category?: string;
  categoryName?: string;
  quantity?: number;
  requiredQuantity?: number;
  unit: string;
  targetPrice?: number;
  isNegotiable: boolean;
  qualityGrade?: string;
  requiredDate?: string;
  location?: string;
  city?: string;
  district?: string;
  state?: string;
  village?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  deliveryPreference?: 'pickup' | 'farmer_delivery' | 'flexible';
  instructions?: string;
  status: 'draft' | 'active' | 'open' | 'receiving_offers' | 'negotiating' | 'offer_accepted' | 'fulfilled' | 'closed' | 'expired';
  quotationsCount?: number;
  quotations?: RequirementQuotation[];
  distanceKm?: number;
  createdAt: string;
  updatedAt: string;
}

export interface RequirementQuotation {
  id: string;
  quotationNumber?: string;
  quotationCode?: string;
  requirementId: string;
  farmerId: string;
  farmerName: string;
  farmName?: string;
  farmerPhone?: string;
  farmerAvatar?: string;
  farmerRating?: number;
  isVerified?: boolean;
  availableQuantity?: number;
  quantity?: number;
  proposedPrice?: number;
  offeredPrice?: number;
  unit?: string;
  harvestAvailabilityDate?: string;
  deliveryMode?: 'pickup' | 'farmer_delivery';
  deliveryTerms?: string;
  message?: string;
  notes?: string;
  status: 'submitted' | 'countered' | 'accepted' | 'rejected' | 'withdrawn';
  counterPrice?: number;
  createdAt: string;
  updatedAt: string;
}

export interface NegotiationMessageItem {
  id: string;
  negotiationId: string;
  senderId: string;
  senderName: string;
  senderRole: 'buyer' | 'farmer';
  action: 'offer' | 'counter' | 'accept' | 'reject' | 'withdraw';
  proposedPrice: number;
  quantity?: number;
  message?: string;
  createdAt: string;
}

export interface NegotiationThread {
  id: string;
  dealReferenceId: string;
  productId: string;
  productName: string;
  productImage?: string;
  originalAskingPrice?: number;
  originalPrice?: number;
  currentPrice: number;
  quantity: number;
  totalAmount?: number;
  unit: string;
  buyerId: string;
  buyerName: string;
  buyerPhone: string;
  farmerId: string;
  farmerName: string;
  farmName?: string;
  farmerPhone: string;
  farmerAvatar?: string;
  requiredDate?: string;
  deliveryPreference?: string;
  status: 'pending' | 'countered' | 'accepted' | 'rejected' | 'withdrawn' | 'expired';
  finalAgreedPrice?: number;
  finalTotalValue?: number;
  agreedAt?: string;
  dealSummary?: any;
  messages: NegotiationMessageItem[];
  createdAt: string;
  updatedAt: string;
}

export interface NearbyFarmer {
  id: string;
  userId?: string;
  farmName: string;
  farmerName?: string;
  name?: string;
  avatar?: string;
  phone: string;
  location: string;
  city?: string;
  latitude: number;
  longitude: number;
  rating: number;
  verificationStatus?: string;
  isVerified?: boolean;
  distanceKm: number;
  activeProductsCount?: number;
  topProducts?: Array<{
    id: string;
    name: string;
    price: number;
    unit: string;
    image?: string;
    category?: string;
  }>;
}

export interface SavedSearch {
  id: string;
  userId: string;
  searchName?: string;
  productQuery?: string;
  queryText?: string;
  categoryName?: string;
  city?: string;
  maxDistanceKm?: number;
  minPrice?: number;
  maxPrice?: number;
  isActive: boolean;
  notificationFrequency?: 'instant' | 'daily';
  alertFrequency?: string;
  lastMatchedAt?: string;
  createdAt: string;
  updatedAt: string;
}
