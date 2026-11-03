import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { StatusBadge } from '../common/StatusBadge';
import { Order } from '../../types';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Package,
  Truck,
  CheckCheck,
  MapPin,
  Phone,
  Search,
  Printer,
  X,
  QrCode,
  FileText,
  MessageCircle,
} from 'lucide-react';

export const FarmerOrdersView: React.FC = () => {
  const {
    orders,
    updateOrderStatus,
    showToast,
    currentUser,
    setChatFarmer,
    setActiveConversationId,
    setIsChatModalOpen,
  } = useApp();

  const [orderTab, setOrderTab] = useState<'all' | 'new' | 'preparing' | 'delivery' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectingChallanOrder, setInspectingChallanOrder] = useState<Order | null>(null);

  // Dispatch Logistics Modal State
  const [dispatchingOrder, setDispatchingOrder] = useState<Order | null>(null);
  const [dispatchTransportMode, setDispatchTransportMode] = useState('🛺 E-Rickshaw Mandi Express');
  const [dispatchDriverName, setDispatchDriverName] = useState('Ramesh Kumar');
  const [dispatchDriverPhone, setDispatchDriverPhone] = useState('+91 98765 11223');
  const [dispatchVehicleNumber, setDispatchVehicleNumber] = useState('UK07-ER-4492');
  const [dispatchEstTime, setDispatchEstTime] = useState('25 mins');

  const handleConfirmDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchingOrder) return;
    updateOrderStatus(dispatchingOrder.id, 'out_for_delivery', {
      driverName: dispatchDriverName,
      driverPhone: dispatchDriverPhone,
      vehicleNumber: dispatchVehicleNumber,
      estTime: dispatchEstTime,
    });
    showToast(`Order ${dispatchingOrder.orderNumber} dispatched with ${dispatchDriverName} (${dispatchVehicleNumber})!`, 'success');
    setDispatchingOrder(null);
  };

  const newOrders = orders.filter((o) => o.status === 'placed');
  const preparingOrders = orders.filter(
    (o) => o.status === 'accepted' || o.status === 'preparing'
  );
  const deliveryOrders = orders.filter((o) => o.status === 'out_for_delivery');
  const completedOrders = orders.filter((o) =>
    ['delivered', 'cancelled', 'rejected'].includes(o.status)
  );

  const displayedOrders = orders.filter((order) => {
    // Search query filter
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customerPhone && order.customerPhone.includes(searchQuery)) ||
      order.items.some((it) => it.product.name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (orderTab === 'new') return order.status === 'placed';
    if (orderTab === 'preparing') return order.status === 'accepted' || order.status === 'preparing';
    if (orderTab === 'delivery') return order.status === 'out_for_delivery';
    if (orderTab === 'completed') return ['delivered', 'cancelled', 'rejected'].includes(order.status);
    return true;
  });

  const handleOpenBuyerChat = (order: Order) => {
    const partner = {
      id: order.customerId || 'cust-user',
      user_id: order.customerId || 'cust-user',
      name: order.customerName || 'Customer',
      phone: order.customerPhone || '+91 98765 43210',
      farm_name: 'Direct Buyer',
      location: order.deliveryAddress?.split(',')[0] || 'Local Mandi',
      city: 'Dehradun',
      latitude: 30.3165,
      longitude: 78.0322,
      description: 'Verified HALDER buyer',
      verification_status: 'verified' as const,
      rating: 5.0,
      reviews_count: 5,
      total_orders: 2,
      total_listings_count: 0,
      response_rate: 98,
      joined_year: 2025,
      badges: ['Verified Buyer'],
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
      cover_image: '',
      created_at: new Date().toISOString(),
      verified: true,
      bio: 'Verified buyer on HALDER marketplace',
    };

    setChatFarmer(partner);
    setActiveConversationId(`conv-order-${order.id}`);
    setIsChatModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-zinc-900 dark:text-white">
            Farmer Order Dispatch & Fulfillment
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Accept incoming harvest orders, update packaging status & generate delivery gate passes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
            Total Orders: <strong className="text-zinc-900 dark:text-white">{orders.length}</strong>
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by order ID, customer name, phone, or crop item..."
          className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-[#1B201D] border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
        />
      </div>

      {/* Order Category Filter Tabs */}
      <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/60 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setOrderTab('all')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center justify-center gap-1 ${
            orderTab === 'all'
              ? 'bg-white dark:bg-[#1B201D] text-zinc-900 dark:text-white shadow-soft'
              : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <span>All Orders</span>
          <span className="text-[10px] text-zinc-400">({orders.length})</span>
        </button>

        <button
          onClick={() => setOrderTab('new')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center justify-center gap-1 ${
            orderTab === 'new'
              ? 'bg-white dark:bg-[#1B201D] text-amber-700 dark:text-amber-400 shadow-soft'
              : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <span>New</span>
          {newOrders.length > 0 && (
            <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black animate-pulse">
              {newOrders.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setOrderTab('preparing')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center justify-center gap-1 ${
            orderTab === 'preparing'
              ? 'bg-white dark:bg-[#1B201D] text-emerald-700 dark:text-emerald-400 shadow-soft'
              : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <span>Packing</span>
          <span className="text-[10px] text-zinc-400">({preparingOrders.length})</span>
        </button>

        <button
          onClick={() => setOrderTab('delivery')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center justify-center gap-1 ${
            orderTab === 'delivery'
              ? 'bg-white dark:bg-[#1B201D] text-blue-700 dark:text-blue-400 shadow-soft'
              : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <span>Out for Delivery</span>
          <span className="text-[10px] text-zinc-400">({deliveryOrders.length})</span>
        </button>

        <button
          onClick={() => setOrderTab('completed')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center justify-center gap-1 ${
            orderTab === 'completed'
              ? 'bg-white dark:bg-[#1B201D] text-emerald-700 dark:text-emerald-400 shadow-soft'
              : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <span>Completed</span>
          <span className="text-[10px] text-zinc-400">({completedOrders.length})</span>
        </button>
      </div>

      {/* Orders List */}
      {displayedOrders.length === 0 ? (
        <div className="p-10 text-center bg-white dark:bg-[#1B201D] rounded-3xl border border-zinc-200 dark:border-zinc-800 space-y-2">
          <Package className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto" />
          <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-200">No orders found in this stage</h4>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            When buyers place orders for your crops, they will automatically appear here with real-time alerts.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedOrders.map((order) => (
            <div
              key={order.id}
              className="p-4 bg-white dark:bg-[#1B201D] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-soft space-y-3 flex flex-col justify-between"
            >
              {/* Upper Details */}
              <div className="space-y-3">
                {/* Top Row */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-zinc-900 dark:text-white">
                        {order.orderNumber}
                      </span>
                      <StatusBadge status={order.status} size="sm" />
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        {order.customerName}
                      </span>
                      <a
                        href={`tel:${order.customerPhone}`}
                        className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                        title="Call Customer"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{order.customerPhone}</span>
                      </a>
                    </div>
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

                {/* Produce Items Box */}
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50 text-xs space-y-1.5">
                  {order.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-zinc-700 dark:text-zinc-300">
                      <span className="font-medium">
                        • <strong>{it.product.name}</strong> ({it.quantity} {it.product.unit})
                      </span>
                      <span className="font-semibold">{formatCurrency(it.subtotal)}</span>
                    </div>
                  ))}
                  <div className="pt-1.5 mt-1 border-t border-zinc-200/60 dark:border-zinc-700/60 flex justify-between text-[11px] text-zinc-500">
                    <span>Delivery Mode: Direct Farm Pickup / E-Rickshaw</span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">
                      Total: {formatCurrency(order.total)}
                    </span>
                  </div>
                </div>

                {/* Delivery Address */}
                <div className="flex items-start gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="line-clamp-1">{order.deliveryAddress || 'Local pickup from farm'}</span>
                </div>

                {/* Buyer Special Notes / Instructions */}
                {order.instructions && (
                  <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200/60 dark:border-amber-800/40 text-[11px] text-amber-900 dark:text-amber-200">
                    <span className="font-bold">📝 Buyer Note: </span>
                    <span>{order.instructions}</span>
                  </div>
                )}

                {/* Assigned Vehicle & Driver Info (When Out for Delivery or Delivered) */}
                {(order.vehicleNumber || order.driverName) && (
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200/60 dark:border-blue-800/40 text-[11px] text-blue-900 dark:text-blue-200 flex items-center justify-between">
                    <span className="font-bold">🛺 {order.vehicleNumber || 'Kisan Vahan'}</span>
                    <span>Driver: {order.driverName} ({order.driverPhone})</span>
                  </div>
                )}
              </div>

              {/* Status Actions & Gate Pass Row */}
              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 space-y-2">
                <div className="flex items-center justify-between gap-1.5 flex-wrap">
                  <button
                    onClick={() => handleOpenBuyerChat(order)}
                    className="p-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                    title="Chat with Customer"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Chat</span>
                  </button>

                  <button
                    onClick={() => {
                      const msg = `🌾 Namaste ${order.customerName}! Your farm produce order ${order.orderNumber} with Green Valley Farm is confirmed (${order.status === 'out_for_delivery' ? 'Dispatched via ' + (order.vehicleNumber || 'Kisan Vahan') : order.status}). Delivery location: ${order.deliveryAddress}. Live Tracking on HALDER.`;
                      window.open(`https://wa.me/${order.customerPhone?.replace(/[^0-9]/g, '') || '919876543210'}?text=${encodeURIComponent(msg)}`, '_blank');
                    }}
                    className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                    title="Notify Customer via WhatsApp"
                  >
                    <span>WhatsApp</span>
                  </button>

                  <button
                    onClick={() => setInspectingChallanOrder(order)}
                    className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                    title="View & Print Mandi Gate Pass"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Mandi Challan</span>
                  </button>
                </div>

                {/* Lifecycle Status Buttons */}
                {order.status === 'placed' && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => updateOrderStatus(order.id, 'rejected')}
                      className="py-2.5 px-3 rounded-xl border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex items-center justify-center gap-1"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                    <button
                      onClick={() => updateOrderStatus(order.id, 'accepted')}
                      className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1 shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Accept Order</span>
                    </button>
                  </div>
                )}

                {order.status === 'accepted' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'preparing')}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Package className="w-4 h-4" />
                    <span>Mark as Preparing (Harvest & Pack Produce)</span>
                  </button>
                )}

                {order.status === 'preparing' && (
                  <button
                    onClick={() => setDispatchingOrder(order)}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Truck className="w-4 h-4" />
                    <span>Ready for Delivery (Assign Vehicle & Dispatch)</span>
                  </button>
                )}

                {order.status === 'out_for_delivery' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'delivered')}
                    className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-900 dark:bg-zinc-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <CheckCheck className="w-4 h-4 text-emerald-400" />
                    <span>Confirm Final Delivery (वितरित हुआ)</span>
                  </button>
                )}

                {order.status === 'delivered' && (
                  <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40">
                    <span>✓ Successfully delivered to buyer</span>
                    <span>Payout Credited</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MANDI GATE PASS / DELIVERY CHALLAN PRINTABLE MODAL */}
      {/* ========================================================================= */}
      {inspectingChallanOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white text-zinc-900 w-full max-w-md rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Actions Header */}
            <div className="p-4 bg-emerald-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-300" />
                <div>
                  <h3 className="font-black text-sm">Mandi Dispatch Challan (गेट पास)</h3>
                  <span className="text-[10px] text-emerald-200">HALDER Direct Kisan Delivery</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white transition flex items-center gap-1 text-xs font-bold"
                  title="Print Gate Pass"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  onClick={() => setInspectingChallanOrder(null)}
                  className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Challan Body */}
            <div className="p-6 space-y-4 overflow-y-auto text-xs font-mono">
              {/* Slip Header */}
              <div className="text-center pb-3 border-b-2 border-dashed border-zinc-300">
                <h4 className="font-black text-base uppercase tracking-wider text-emerald-800 font-sans">
                  HALDER AGRI DISPATCH
                </h4>
                <p className="text-[10px] text-zinc-500">Kisan Mandi Gate Pass & Transport Challan</p>
                <div className="mt-2 text-xs font-bold">
                  Order Ref: <span className="text-emerald-700">{inspectingChallanOrder.orderNumber}</span>
                </div>
                <div className="text-[10px] text-zinc-400">
                  Date: {formatDate(inspectingChallanOrder.createdAt)}
                </div>
              </div>

              {/* Farmer and Customer Info */}
              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-zinc-200">
                <div>
                  <span className="text-[9px] uppercase font-bold text-zinc-400 block font-sans">
                    Dispatched By (किसान)
                  </span>
                  <strong className="block text-zinc-800">{inspectingChallanOrder.farmerName || 'Green Valley Farm'}</strong>
                  <span className="text-[10px] text-zinc-500 block">Dehradun Agro Belt</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-zinc-400 block font-sans">
                    Recipient (खरीदार)
                  </span>
                  <strong className="block text-zinc-800">{inspectingChallanOrder.customerName}</strong>
                  <span className="text-[10px] text-zinc-500 block">{inspectingChallanOrder.customerPhone}</span>
                </div>
              </div>

              {/* Destination Address */}
              <div className="pb-3 border-b border-zinc-200">
                <span className="text-[9px] uppercase font-bold text-zinc-400 block font-sans">
                  Delivery Destination
                </span>
                <span className="text-zinc-700 text-[11px] block mt-0.5">
                  {inspectingChallanOrder.deliveryAddress}
                </span>
              </div>

              {/* Logistics & Dispatch Vehicle */}
              <div className="pb-3 border-b border-zinc-200">
                <span className="text-[9px] uppercase font-bold text-zinc-400 block font-sans">
                  Transport & Assigned Vehicle
                </span>
                <strong className="text-zinc-800 text-[11px] block mt-0.5">
                  {inspectingChallanOrder.vehicleNumber || 'UK07-ER-4492'} ({inspectingChallanOrder.trackingCourier || 'Kisan Vahan / E-Rickshaw'})
                </strong>
                <span className="text-zinc-500 text-[10px] block">
                  Driver: {inspectingChallanOrder.driverName || 'Ramesh Kumar'} • Contact: {inspectingChallanOrder.driverPhone || '+91 98765 11223'}
                </span>
              </div>

              {/* Buyer Special Instructions if any */}
              {inspectingChallanOrder.instructions && (
                <div className="pb-3 border-b border-zinc-200 bg-amber-50/50 p-2 rounded-lg">
                  <span className="text-[9px] uppercase font-bold text-amber-800 block font-sans">
                    Buyer Special Instructions
                  </span>
                  <span className="text-amber-900 text-[10px] block font-sans">
                    {inspectingChallanOrder.instructions}
                  </span>
                </div>
              )}

              {/* Items Table */}
              <div className="space-y-1.5 pb-3 border-b-2 border-dashed border-zinc-300">
                <div className="flex justify-between font-bold text-zinc-900 border-b border-zinc-200 pb-1">
                  <span>Produce Item</span>
                  <span>Qty</span>
                  <span>Amount</span>
                </div>
                {inspectingChallanOrder.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-zinc-700">
                    <span className="truncate max-w-[150px]">{it.product.name}</span>
                    <span>{it.quantity} {it.product.unit}</span>
                    <span>{formatCurrency(it.subtotal)}</span>
                  </div>
                ))}
              </div>

              {/* Total & Payment Mode */}
              <div className="space-y-1 pb-3 border-b border-zinc-200">
                <div className="flex justify-between text-xs font-black text-zinc-900">
                  <span>Gross Produce Total:</span>
                  <span className="text-emerald-700">{formatCurrency(inspectingChallanOrder.total)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-zinc-500">
                  <span>Payment Method:</span>
                  <span className="font-bold uppercase text-zinc-800">{inspectingChallanOrder.paymentMethod}</span>
                </div>
                <div className="flex justify-between text-[11px] text-zinc-500">
                  <span>Settlement Status:</span>
                  <span className="font-bold text-emerald-700 uppercase">{inspectingChallanOrder.paymentStatus}</span>
                </div>
              </div>

              {/* QR Code and Transport Sign */}
              <div className="pt-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 border-2 border-zinc-900 rounded-lg">
                    <QrCode className="w-10 h-10 text-zinc-900" />
                  </div>
                  <div className="text-[9px] text-zinc-400">
                    Scan for GPS tracking & proof of delivery
                  </div>
                </div>
                <div className="text-right">
                  <div className="border-b border-zinc-400 w-24 mb-1" />
                  <span className="text-[9px] text-zinc-500 font-sans">Farmer Signature</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DISPATCH LOGISTICS & VEHICLE ASSIGNMENT MODAL */}
      {/* ========================================================================= */}
      {dispatchingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#1B201D] text-zinc-900 dark:text-zinc-100 w-full max-w-md rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col">
            <div className="p-4 bg-emerald-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-200" />
                <div>
                  <h3 className="font-black text-sm">Assign Transport for {dispatchingOrder.orderNumber}</h3>
                  <span className="text-[10px] text-emerald-100">Kisan Direct Fleet Dispatch</span>
                </div>
              </div>
              <button
                onClick={() => setDispatchingOrder(null)}
                className="p-1.5 text-white/80 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmDispatch} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Transport Fleet Type (वाहन प्रकार)
                </label>
                <select
                  value={dispatchTransportMode}
                  onChange={(e) => setDispatchTransportMode(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none font-medium"
                >
                  <option value="🛺 E-Rickshaw Mandi Express">🛺 E-Rickshaw Mandi Express</option>
                  <option value="🚜 Kisan Vahan / Self Tractor">🚜 Kisan Vahan / Self Tractor</option>
                  <option value="🚚 Tata Ace / Mini Truck">🚚 Tata Ace / Mini Truck (छोटा हाथी)</option>
                  <option value="🛵 Two Wheeler / Bicycle Drop">🛵 Two Wheeler / Bicycle Drop</option>
                  <option value="📦 Local Farm Delivery Associate">📦 Local Farm Delivery Associate</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Driver / Courier Name
                  </label>
                  <input
                    type="text"
                    required
                    value={dispatchDriverName}
                    onChange={(e) => setDispatchDriverName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Driver Mobile Phone
                  </label>
                  <input
                    type="tel"
                    required
                    value={dispatchDriverPhone}
                    onChange={(e) => setDispatchDriverPhone(e.target.value)}
                    placeholder="+91 98765 11223"
                    className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Vehicle Number Plate
                  </label>
                  <input
                    type="text"
                    required
                    value={dispatchVehicleNumber}
                    onChange={(e) => setDispatchVehicleNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. UK07-ER-4492"
                    className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none font-mono font-bold uppercase"
                  />
                </div>

                <div>
                  <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Est. Transit Time
                  </label>
                  <input
                    type="text"
                    required
                    value={dispatchEstTime}
                    onChange={(e) => setDispatchEstTime(e.target.value)}
                    placeholder="e.g. 25 mins"
                    className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 text-[11px] text-emerald-900 dark:text-emerald-200">
                <p>✓ Buyer will receive a real-time notification with driver phone and vehicle registration.</p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDispatchingOrder(null)}
                  className="flex-1 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black shadow-xs transition flex items-center justify-center gap-1.5"
                >
                  <Truck className="w-4 h-4" />
                  <span>Confirm Dispatch (रवाना करें)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
