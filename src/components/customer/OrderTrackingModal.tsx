import React from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';
import { StatusBadge } from '../common/StatusBadge';
import { InvoiceModal } from '../common/InvoiceModal';
import {
  X,
  Phone,
  MapPin,
  Clock,
  ShieldCheck,
  Play,
  CheckCircle2,
  Printer,
  Truck,
} from 'lucide-react';

export const OrderTrackingModal: React.FC = () => {
  const {
    trackingOrder,
    setTrackingOrder,
    advanceOrderDemoStep,
    showToast,
    updateOrderStatus,
  } = useApp();
  const [showCancelConfirm, setShowCancelConfirm] = React.useState(false);
  const [showInvoice, setShowInvoice] = React.useState(false);

  if (!trackingOrder) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-fade-in">
      <div
        className="w-full max-w-lg bg-white dark:bg-[#1B201D] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 max-h-[90vh] flex flex-col overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/80">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-lg text-zinc-900 dark:text-white">
                Track {trackingOrder.orderNumber}
              </h3>
              <StatusBadge status={trackingOrder.status} size="sm" />
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Placed {trackingOrder.createdAt}
            </p>
          </div>

          <button
            onClick={() => setTrackingOrder(null)}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Estimated ETA Banner */}
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-600 text-white">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">
                  Estimated Delivery
                </span>
                <h4 className="text-base font-black text-emerald-950 dark:text-emerald-100">
                  {trackingOrder.status === 'delivered' ? 'Delivered to Doorstep' : `Arriving in ~${trackingOrder.estimatedDeliveryTime}`}
                </h4>
              </div>
            </div>

            {/* Interactive demo simulator button */}
            {trackingOrder.status !== 'delivered' && trackingOrder.status !== 'rejected' && (
              <button
                onClick={() => advanceOrderDemoStep(trackingOrder.id)}
                className="flex items-center gap-1 text-xs font-bold bg-white dark:bg-zinc-800 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 px-3 py-1.5 rounded-xl shadow-xs hover:bg-emerald-100 transition-colors"
                title="Simulate next step for demo"
              >
                <Play className="w-3 h-3 fill-emerald-600" />
                <span>Simulate Next</span>
              </button>
            )}
          </div>

          {/* Visual Step-by-Step Timeline */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Live Order Progress
            </h4>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200 dark:before:bg-zinc-800">
              {trackingOrder.timeline.map((step, idx) => {
                return (
                  <div key={idx} className="relative flex items-start gap-3">
                    {/* Circle marker */}
                    <div
                      className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all ${
                        step.completed
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-400'
                      } ${step.current ? 'ring-4 ring-emerald-500/20 animate-pulse' : ''}`}
                    >
                      {step.completed ? (
                        <CheckCircle2 className="w-3 h-3 stroke-[3]" />
                      ) : (
                        <span className="w-1.5 h-1.5 bg-zinc-300 rounded-full" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-bold text-sm ${
                            step.current
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : step.completed
                              ? 'text-zinc-900 dark:text-white'
                              : 'text-zinc-400 dark:text-zinc-600'
                          }`}
                        >
                          {step.title}
                        </span>
                        {step.time && (
                          <span className="text-[11px] font-medium text-zinc-400">
                            {step.time}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Assigned Farmer Card */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Assigned Farmer & Packhouse
            </h4>
            <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center font-bold text-emerald-800 dark:text-emerald-300">
                  🌾
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h5 className="font-bold text-sm text-zinc-900 dark:text-white">
                      {trackingOrder.farmerName}
                    </h5>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {trackingOrder.farmName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowInvoice(true)}
                  className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-2xs"
                  title="View Official Farm Invoice / Receipt"
                >
                  <Printer className="w-4 h-4 text-emerald-600" />
                </button>
                <a
                  href={`https://wa.me/${(trackingOrder.farmerPhone || '9876543210').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Namaste ${trackingOrder.farmerName} ji, tracking my HALDER order #${trackingOrder.orderNumber}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 transition-colors shadow-2xs text-[11px] font-bold"
                  title="Chat on WhatsApp"
                >
                  WA
                </a>
                <a
                  href={`tel:${trackingOrder.farmerPhone || '+919876543210'}`}
                  onClick={() => {
                    showToast(`Calling ${trackingOrder.farmerName}...`, 'info');
                  }}
                  className="p-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-2xs"
                  title="Call Farmer"
                >
                  <Phone className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Assigned Kisan Transport Fleet Details */}
          {(trackingOrder.driverName || trackingOrder.vehicleNumber) && (
            <div className="p-4 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-xs text-zinc-900 dark:text-white uppercase tracking-wider">
                    Assigned Farm Fleet (किसान वाहन)
                  </span>
                </div>
                <span className="text-[10px] font-black bg-emerald-600 text-white px-2.5 py-0.5 rounded-full">
                  Direct Dispatch
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-black text-zinc-900 dark:text-white block text-sm">
                    {trackingOrder.driverName || 'Kisan Driver'}
                  </span>
                  <span className="text-zinc-500 font-mono text-[11px] block mt-0.5">
                    Vehicle: {trackingOrder.vehicleNumber || 'Plate Assigned'}
                  </span>
                </div>
                {trackingOrder.driverPhone && (
                  <a
                    href={`tel:${trackingOrder.driverPhone}`}
                    className="px-3 py-1.5 bg-white dark:bg-zinc-800 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 rounded-xl font-bold text-xs hover:bg-emerald-50 flex items-center gap-1 shadow-2xs"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Driver</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Order Items Summary */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Ordered Items ({trackingOrder.items.length})
            </h4>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/60 p-3">
              {trackingOrder.items.map((item, i) => (
                <div key={i} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <img
                      src={item.product.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200'}
                      alt={item.product.name}
                      className="w-8 h-8 rounded-lg object-cover"
                    />
                    <div>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                        {item.product.name}
                      </span>
                      <span className="text-zinc-400 block text-[11px]">
                        {item.quantity} {item.product.unit} × {formatCurrency(item.product.price)}
                      </span>
                    </div>
                  </div>
                  <span className="font-bold text-zinc-900 dark:text-white">
                    {formatCurrency(item.subtotal)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Address */}
          <div className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 flex items-start gap-2">
            <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-zinc-900 dark:text-white block">
                Delivery Address:
              </span>
              <span>{trackingOrder.deliveryAddress}</span>
            </div>
          </div>

          {/* Delivery Instructions */}
          {trackingOrder.instructions && (
            <div className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40">
              <span className="font-bold text-emerald-950 dark:text-emerald-200 block text-[11px] uppercase tracking-wider">
                Special Delivery Instructions (किसान के लिए निर्देश):
              </span>
              <p className="text-zinc-700 dark:text-zinc-300 font-medium">{trackingOrder.instructions}</p>
            </div>
          )}
          {/* Cancel Order Action (Available when order is in placed status) */}
          {trackingOrder.status === 'placed' && (
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
              {showCancelConfirm ? (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-2xl space-y-2">
                  <p className="text-xs font-bold text-red-700 dark:text-red-300">
                    Are you sure you want to cancel this order?
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Reserved crates will be released back to the farmer immediately.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => setShowCancelConfirm(false)}
                      className="flex-1 py-1.5 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-bold transition"
                    >
                      Keep Order
                    </button>
                    <button
                      onClick={() => {
                        updateOrderStatus(trackingOrder.id, 'rejected');
                        showToast(`Order ${trackingOrder.orderNumber} has been cancelled.`, 'info');
                        setTrackingOrder(null);
                      }}
                      className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition"
                    >
                      Confirm Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="w-full py-2.5 px-4 rounded-xl border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-bold transition-colors"
                >
                  Cancel Order / ऑर्डर रद्द करें
                </button>
              )}
            </div>
          )}

        </div>
      </div>
      {/* Official Tax Invoice Sheet Modal */}
      {showInvoice && (
        <InvoiceModal
          orderId={trackingOrder.id}
          onClose={() => setShowInvoice(false)}
        />
      )}

    </div>
  );
};
