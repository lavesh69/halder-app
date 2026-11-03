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
