export const ORDER_STATUSES = [
  'placed',
  'accepted',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
  'rejected',
  'cancelled',
] as const;

export type OrderStatusType = typeof ORDER_STATUSES[number];

export const VALID_STATUS_TRANSITIONS: Record<OrderStatusType, OrderStatusType[]> = {
  placed: ['accepted', 'rejected', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: [],
  rejected: [],
  cancelled: [],
};

export const PRODUCT_UNITS = [
  'kg',
  'gram',
  'litre',
  'bunch',
  'piece',
  'packet',
  'dozen',
  'box',
] as const;

export const USER_ROLES = ['customer', 'farmer', 'admin'] as const;
export const VERIFICATION_STATUSES = ['verified', 'pending', 'rejected'] as const;
export const PRODUCT_STATUSES = ['active', 'unavailable', 'draft'] as const;
export const MODERATION_STATUSES = ['approved', 'pending', 'flagged'] as const;
export const PAYMENT_METHODS = ['upi', 'cod', 'card', 'wallet', 'phonepe', 'gpay', 'paytm'] as const;
export const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'] as const;

export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export const DEFAULT_DELIVERY_FEE = 25;
export const FREE_DELIVERY_THRESHOLD = 200;
export const DEFAULT_FARMER_TIP = 10;
