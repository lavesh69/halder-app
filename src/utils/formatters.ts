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

/**
 * Vernacular Hindi & Hinglish agricultural produce synonyms
 */
export const AGRI_SYNONYMS: Record<string, string[]> = {
  potato: ['aloo', 'aalu', 'alu', 'आलू', 'बटाटा', 'batata'],
  potatoes: ['aloo', 'aalu', 'alu', 'आलू'],
  aloo: ['potato', 'potatoes', 'आलू'],
  onion: ['pyaz', 'pyaaz', 'कांदा', 'kanda', 'प्याज'],
  onions: ['pyaz', 'pyaaz', 'कांदा', 'kanda', 'प्याज'],
  pyaz: ['onion', 'onions', 'प्याज', 'kanda'],
  tomato: ['tamatar', 'टमाटर'],
  tomatoes: ['tamatar', 'टमाटर'],
  tamatar: ['tomato', 'tomatoes', 'टमाटर'],
  wheat: ['gehun', 'gehu', 'गेहूं', 'atta', 'kanak'],
  gehun: ['wheat', 'गेहूं'],
  rice: ['chawal', 'dhan', 'paddy', 'चावल', 'धान', 'basmati'],
  chawal: ['rice', 'paddy', 'चावल', 'basmati'],
  mango: ['aam', 'आम'],
  aam: ['mango', 'आम'],
  garlic: ['lahsun', 'lehsun', 'लहसुन'],
  ginger: ['adrak', 'अदरक'],
  chilli: ['mirch', 'mirchi', 'मिर्च', 'hari mirch'],
  milk: ['doodh', 'दूध', 'dairy', 'milk'],
  cow: ['desi cow', 'गाय', 'gai'],
  mustard: ['sarson', 'sarso', 'सरसों'],
  peas: ['matar', 'मटर'],
  cauliflower: ['gobi', 'phool gobi', 'गोभी'],
};

/**
 * Smart matching that checks produce names, descriptions, locations, and synonyms
 */
export const matchesSearchQuery = (product: any, rawQuery: string): boolean => {
  const q = (rawQuery || '').trim().toLowerCase();
  if (!q) return true;

  const targetText = [
    product.name,
    product.category,
    product.farmerName,
    product.farmName,
    product.description,
    product.city,
    product.location,
    product.district,
    product.state,
    product.village,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  // 1. Direct substring match
  if (targetText.includes(q)) return true;

  // 2. Query words split match
  const qWords = q.split(/\s+/).filter(Boolean);
  const allWordsMatch = qWords.every((w) => targetText.includes(w));
  if (allWordsMatch) return true;

  // 3. Synonym expansion match
  for (const w of qWords) {
    const syns = AGRI_SYNONYMS[w] || [];
    for (const syn of syns) {
      if (targetText.includes(syn.toLowerCase())) return true;
    }
  }

  // 4. Reverse check: does any word in product name map to query?
  const nameWords = (product.name || '').toLowerCase().split(/\s+/).filter(Boolean);
  for (const nw of nameWords) {
    const syns = AGRI_SYNONYMS[nw] || [];
    for (const syn of syns) {
      if (syn.toLowerCase().includes(q) || q.includes(syn.toLowerCase())) return true;
    }
  }

  return false;
};
