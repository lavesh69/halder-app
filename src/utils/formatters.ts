export const formatCurrency = (amount: number): string => {
  return '₹' + amount.toLocaleString('en-IN');
};

export const formatDistance = (km: number): string => {
  return `${km.toFixed(1)} km away`;
};

export const formatDate = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

export const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'placed':
      return 'Order Placed';
    case 'accepted':
      return 'Farmer Accepted';
    case 'preparing':
      return 'Preparing';
    case 'out_for_delivery':
      return 'Out for Delivery';
    case 'delivered':
      return 'Delivered';
    case 'rejected':
      return 'Rejected';
    default:
      return status;
  }
};

/**
 * Normalizes Indian phone numbers with country code (91) for WhatsApp wa.me links
 */
export const formatWhatsAppPhone = (rawPhone: string): string => {
  let digits = (rawPhone || '').replace(/[^0-9]/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return `91${digits.slice(1)}`;
  }
  return digits;
};

/**
 * Builds direct WhatsApp click-to-chat URL with pre-filled message
 */
export const getWhatsAppUrl = (rawPhone: string, message: string): string => {
  const cleanPhone = formatWhatsAppPhone(rawPhone);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
};

/**
 * Calculates real geographical distance in km using the Haversine formula
 */
export const calculateDistanceKm = (
  lat1?: number,
  lon1?: number,
  lat2?: number,
  lon2?: number
): number => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 1.2;
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};
