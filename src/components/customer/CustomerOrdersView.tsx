import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ApiClient } from '../../api/client';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { StatusBadge } from '../common/StatusBadge';
import { InvoiceModal } from '../common/InvoiceModal';
import { ReviewModal } from '../common/ReviewModal';
import {
  Clock,
  ArrowRight,
  RotateCcw,
  Package,
  ChevronRight,
  FileText,
  Star,
  Phone,
  MessageCircle,
  MapPin,
  Search,
  X,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Truck,
} from 'lucide-react';

export const CustomerOrdersView: React.FC = () => {
  const {
    orders,
    farmers,
    setTrackingOrder,
    addToCart,
    setCustomerTab,
    showToast,
    setChatFarmer,
    setActiveConversationId,
    setIsChatModalOpen,
    updateOrderStatus,
    raiseDispute,
    disputes,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [reviewOrder, setReviewOrder] = useState<any | null>(null);

  // Cancellation and Dispute States
  const [cancellingOrder, setCancellingOrder] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState('Placed order by mistake');
  const [disputeOrder, setDisputeOrder] = useState<any | null>(null);
  const [disputeCategory, setDisputeCategory] = useState('Spoiled / Rotten Produce');
  const [disputeDetails, setDisputeDetails] = useState('');

  const handleConfirmCancel = () => {
    if (!cancellingOrder) return;
    updateOrderStatus(cancellingOrder.id, 'rejected');
    showToast(`Order ${cancellingOrder.orderNumber} cancelled. Refund credited to original payment method.`, 'info');
    setCancellingOrder(null);
  };

  const handleConfirmDispute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeOrder) return;
    const details = disputeDetails || 'Produce received does not meet organic grade quality.';
    raiseDispute({
      orderId: disputeOrder.id,
      orderNumber: disputeOrder.orderNumber,
      farmerId: disputeOrder.farmerId,
      farmerName: disputeOrder.farmerName,
      customerName: disputeOrder.customerName,
      customerPhone: disputeOrder.customerPhone,
      category: disputeCategory,
      details,
      amount: disputeOrder.total,
    });

    // Also persist ticket in backend support registry
    ApiClient.submitReport({
      orderId: disputeOrder.id,
      category: disputeCategory,
      priority: 'high',
      reason: disputeCategory,
      description: details,
    }).catch(() => {});

    setDisputeOrder(null);
    setDisputeDetails('');
  };

  const activeOrders = orders.filter(
    (o) => !['delivered', 'rejected', 'cancelled'].includes(o.status)
  );
  const completedOrders = orders.filter((o) =>
    ['delivered', 'rejected', 'cancelled'].includes(o.status)
  );

  const displayedOrders = (activeTab === 'active' ? activeOrders : completedOrders).filter((order) => {
    const q = searchQuery.toLowerCase();
    return (
      order.orderNumber.toLowerCase().includes(q) ||
      (order.farmerName && order.farmerName.toLowerCase().includes(q)) ||
      order.items.some((it) => it.product.name.toLowerCase().includes(q))
    );
  });

  const handleReorder = (order: any) => {
    order.items.forEach((item: any) => {
      addToCart(item.product, item.quantity);
    });
    showToast('Items added back to your cart!', 'success');
    setCustomerTab('cart');
  };

  const handleChatFarmer = (order: any) => {
    const matchedFarmer = farmers.find((f) => f.id === order.farmerId) || {
      id: order.farmerId || 'farmer-1',
      user_id: order.farmerId || 'farmer-1',
      name: order.farmerName || 'Rajesh Kumar',
      phone: order.farmerPhone || '+91 98450 12345',
      farm_name: order.farmName || 'Green Valley Farm',
      location: 'Sarjapur Agro Belt',
      city: 'Dehradun',
      latitude: 30.3165,
      longitude: 78.0322,
      description: 'Certified organic farmer',
      verification_status: 'verified' as const,
      rating: 4.9,
      reviews_count: 24,
      total_orders: 140,
      total_listings_count: 6,
      response_rate: 99,
      joined_year: 2024,
      badges: ['Verified Kisan', 'Organic Certified'],
      avatar: 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=200',
      cover_image: '',
      created_at: new Date().toISOString(),
      verified: true,
      bio: 'Farm-fresh harvest supplier',
    };

    setChatFarmer(matchedFarmer);
    setActiveConversationId(`conv-order-${order.id}`);
    setIsChatModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      {/* Invoice Modal */}
      {selectedInvoiceId && (
        <InvoiceModal
          orderId={selectedInvoiceId}
          onClose={() => setSelectedInvoiceId(null)}
        />
      )}

      {/* Review Modal */}
      {reviewOrder && (
        <ReviewModal
          farmerId={reviewOrder.farmerId}
          farmerName={reviewOrder.farmerName}
          orderId={reviewOrder.id || reviewOrder.orderNumber}
          onClose={() => setReviewOrder(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-zinc-900 dark:text-white">
            My Mandi Orders (मेरे ऑर्डर)
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Live GPS route tracking, direct farmer contact & official tax invoices
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
            Total Placed: <strong className="text-zinc-900 dark:text-white">{orders.length}</strong>
          </span>
        </div>
      </div>

      {/* Search Orders */}
      <div className="relative">
        <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by order ID, farmer name, or produce item..."
          className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-[#1B201D] border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
        />
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/60">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'active'
              ? 'bg-white dark:bg-[#1B201D] text-emerald-700 dark:text-emerald-400 shadow-soft'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <span>Active In-Transit</span>
          {activeOrders.length > 0 && (
            <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-black animate-pulse">
              {activeOrders.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'completed'
              ? 'bg-white dark:bg-[#1B201D] text-emerald-700 dark:text-emerald-400 shadow-soft'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <span>Delivered & Completed</span>
          <span className="text-[10px] text-zinc-400">({completedOrders.length})</span>
        </button>
      </div>

      {/* Orders List */}
      {displayedOrders.length === 0 ? (
        <div className="p-5 sm:p-8 text-center bg-white dark:bg-[#1B201D] rounded-3xl border border-zinc-200 dark:border-zinc-800 space-y-3">
          <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
            <Package className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
            No {activeTab} orders found
          </h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto">
            {activeTab === 'active'
              ? 'You have no orders currently in transit. Order fresh harvest directly from verified growers!'
              : 'Your completed and delivered orders will appear here for easy reordering.'}
          </p>
          <button
            onClick={() => setCustomerTab('home')}
            className="min-h-[44px] px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition inline-flex items-center justify-center"
          >
            Browse Farm Produce
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedOrders.map((order) => {
            const matchedFarmer = farmers.find((f) => f.id === order.farmerId);
            const farmerPhone = order.farmerPhone || matchedFarmer?.phone || '+91 98450 12345';
            const farmerName = order.farmerName || matchedFarmer?.name || 'Local Farmer';

            return (
              <div
                key={order.id}
                className="p-4 bg-white dark:bg-[#1B201D] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-soft space-y-3 flex flex-col justify-between"
              >
                {/* Order Card Header */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-zinc-900 dark:text-white">
                          {order.orderNumber}
                        </span>
                        <StatusBadge status={order.status} size="sm" />
                      </div>
                      <span className="text-[11px] text-zinc-400 mt-0.5 block">
                        {formatDate(order.createdAt)} • {order.items.length} items
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-black text-emerald-700 dark:text-emerald-400">
                        {formatCurrency(order.total)}
                      </span>
                      <span className="text-[10px] text-zinc-400 block uppercase font-bold">
                        {order.paymentMethod} • {order.paymentStatus}
                      </span>
                    </div>
                  </div>

                  {/* Items Preview */}
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50 space-y-1.5">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs text-zinc-700 dark:text-zinc-300">
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={item.product.image || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=200'}
                            alt={item.product.name}
                            className="w-7 h-7 rounded-lg object-cover shrink-0"
                          />
                          <span className="font-bold truncate max-w-[140px] text-zinc-900 dark:text-white">
                            {item.product.name}
                          </span>
                          <span className="text-zinc-400 text-[11px]">
                            ({item.quantity} {item.product.unit})
                          </span>
                        </div>
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
                          {formatCurrency(item.subtotal)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Farmer Info with Contact Buttons */}
                  <div className="p-2.5 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-800/40 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] text-zinc-400 uppercase font-bold block">
                        Farmer / Grower
                      </span>
                      <strong className="text-xs text-zinc-900 dark:text-white block truncate">
                        {farmerName}
                      </strong>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                      <a
                        href={`tel:${farmerPhone}`}
                        className="p-1.5 bg-white dark:bg-zinc-800 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-lg text-xs font-bold hover:bg-emerald-50 transition flex items-center gap-1"
                        title="Call Farmer"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span className="text-[11px]">Call</span>
                      </a>

                      <a
                        href={`https://wa.me/${farmerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Namaste ${farmerName} ji, regarding my HALDER order #${order.orderNumber}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-100 transition flex items-center gap-1"
                        title="Chat on WhatsApp"
                      >
                        <span className="text-[11px] font-bold">WhatsApp</span>
                      </a>

                      <button
                        onClick={() => handleChatFarmer(order)}
                        className="p-1.5 bg-white dark:bg-zinc-800 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-lg text-xs font-bold hover:bg-emerald-50 transition flex items-center gap-1"
                        title="Chat with Farmer"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span className="text-[11px]">Chat</span>
                      </button>
                    </div>
                  </div>

                  {/* Assigned Kisan Transport Fleet Details */}
                  {(order.driverName || order.vehicleNumber) && (
                    <div className="p-2.5 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 text-xs flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div className="min-w-0">
                          <span className="font-bold text-zinc-900 dark:text-white block truncate">
                            Kisan Fleet: {order.driverName || 'Farm Driver'} ({order.vehicleNumber || 'Vehicle Assigned'})
                          </span>
                          {order.driverPhone && (
                            <span className="text-[11px] text-zinc-500">Contact: {order.driverPhone}</span>
                          )}
                        </div>
                      </div>
                      {order.driverPhone && (
                        <a
                          href={`tel:${order.driverPhone}`}
                          className="px-2 py-1 bg-white dark:bg-zinc-800 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 rounded-lg font-bold text-[11px] shrink-0 hover:bg-emerald-50"
                        >
                          Call Driver
                        </a>
                      )}
                    </div>
                  )}

                  {/* Buyer Delivery Notes / Instructions */}
                  {order.instructions && (
                    <div className="text-[11px] text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/40 p-2 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50">
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">Notes for Farmer: </span>
                      {order.instructions}
                    </div>
                  )}
                </div>

                {/* Bottom Actions Row */}
                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2 flex-wrap">
                  <button
                    onClick={() => setSelectedInvoiceId(order.id)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:text-emerald-600"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    <span>GST Receipt</span>
                  </button>

                  <div className="flex items-center gap-2 flex-wrap">
                    {order.status === 'placed' && (
                      <button
                        onClick={() => setCancellingOrder(order)}
                        className="px-3 py-1.5 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 font-bold text-xs rounded-xl border border-red-200 dark:border-red-900/50 hover:bg-red-100 transition-colors flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Cancel Order</span>
                      </button>
                    )}

                    {order.status === 'delivered' && (() => {
                      const dispute = disputes.find((d) => d.orderId === order.id);
                      if (dispute) {
                        if (dispute.status === 'REFUNDED') {
                          return (
                            <span className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Refund Credited (₹{dispute.amount || order.total})</span>
                            </span>
                          );
                        }
                        if (dispute.status === 'RESOLVED_DISMISSED') {
                          return (
                            <span className="px-2.5 py-1 text-[11px] font-bold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500" />
                              <span>Dispute Resolved</span>
                            </span>
                          );
                        }
                        return (
                          <span className="px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800/60 flex items-center gap-1">
                            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                            <span>Dispute Under Review</span>
                          </span>
                        );
                      }
                      return (
                        <button
                          onClick={() => setDisputeOrder(order)}
                          className="px-3 py-1.5 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold text-xs rounded-xl border border-purple-200 dark:border-purple-800/50 hover:bg-purple-100 transition-colors flex items-center gap-1"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Report Issue</span>
                        </button>
                      );
                    })()}

                    {order.status === 'delivered' && (
                      <button
                        onClick={() => setReviewOrder(order)}
                        className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold text-xs rounded-xl border border-amber-200 dark:border-amber-800/50 transition-colors flex items-center gap-1"
                      >
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span>Rate Harvest</span>
                      </button>
                    )}

                    {order.status !== 'delivered' && order.status !== 'rejected' ? (
                      <button
                        onClick={() => setTrackingOrder(order)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1"
                      >
                        <span>Track Live Route</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReorder(order)}
                        className="px-3.5 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-emerald-50 dark:hover:bg-emerald-950 font-bold text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 transition-all flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3 text-emerald-600" />
                        <span>Reorder</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel Order Confirmation Modal */}
      {cancellingOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1B201D] rounded-3xl max-w-sm w-full p-5 border border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-1.5 text-red-600">
                <AlertTriangle className="w-4 h-4" />
                <span>Cancel Order {cancellingOrder.orderNumber}</span>
              </h3>
              <button
                onClick={() => setCancellingOrder(null)}
                className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-300">
              Are you sure you want to cancel this order with <strong>{cancellingOrder.farmerName}</strong>? This will release reserved farm crates.
            </p>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-500">Reason for cancellation:</label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-white outline-none"
              >
                <option value="Placed order by mistake">Placed order by mistake</option>
                <option value="Need to change delivery location">Need to change delivery location</option>
                <option value="Ordered duplicate produce">Ordered duplicate produce</option>
                <option value="Will purchase in person from Mandi">Will purchase in person from Mandi</option>
              </select>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancellingOrder(null)}
                className="flex-1 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-600 dark:text-zinc-300"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quality Issue & Dispute Claim Modal */}
      {disputeOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1B201D] rounded-3xl max-w-md w-full p-6 border border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                <ShieldAlert className="w-4 h-4" />
                <span>Report Quality Issue: {disputeOrder.orderNumber}</span>
              </h3>
              <button
                onClick={() => setDisputeOrder(null)}
                className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmDispute} className="space-y-3.5">
              <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200/50 text-[11px] text-purple-800 dark:text-purple-300 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-purple-600" />
                <p>HALDER Direct Quality Guarantee: If delivered produce is spoiled, damaged in transit, or missing weight, you are eligible for an instant replacement or refund.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Issue Category
                </label>
                <select
                  value={disputeCategory}
                  onChange={(e) => setDisputeCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-white"
                >
                  <option value="Spoiled / Rotten Produce">Spoiled / Rotten Produce</option>
                  <option value="Weight Discrepancy (Underweight)">Weight Discrepancy (Underweight)</option>
                  <option value="Missing Item from Basket">Missing Item from Basket</option>
                  <option value="Incorrect Produce Delivered">Incorrect Produce Delivered</option>
                  <option value="Packaging Damaged during Transit">Packaging Damaged during Transit</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Describe what went wrong
                </label>
                <textarea
                  rows={3}
                  value={disputeDetails}
                  onChange={(e) => setDisputeDetails(e.target.value)}
                  placeholder="e.g. 2 kg Tomatoes were bruised and overripe upon morning delivery..."
                  className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-white outline-none resize-none"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDisputeOrder(null)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-600 dark:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition"
                >
                  Submit Dispute Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
