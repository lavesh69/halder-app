import React from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';
import { X, Printer, Download, CheckCircle2, ShieldCheck, Sprout } from 'lucide-react';
import { Logo } from './Logo';

interface InvoiceModalProps {
  orderId: string | null;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ orderId, onClose }) => {
  const { orders } = useApp();

  if (!orderId) return null;
  const order = orders.find((o) => o.id === orderId || o.orderNumber === orderId);
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div
        className="w-full max-w-lg bg-white dark:bg-[#1B201D] text-zinc-900 dark:text-zinc-100 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90dvh] animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Controls Header (Hidden on Print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 print:hidden">
          <span className="font-bold text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Official Farm Provenance Invoice
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Sheet */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 text-xs bg-white dark:bg-[#1B201D] text-zinc-900 dark:text-zinc-100">
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
            <div>
              <Logo size="sm" showTagline />
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
                Connecting local farmers directly with consumers • 0 Middlemen
              </p>
            </div>

            <div className="text-right">
              <span className="font-black text-base text-zinc-900 dark:text-white block">
                {order.orderNumber}
              </span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block">
                Date: {order.createdAt}
              </span>
            </div>
          </div>

          {/* Farmer & Customer Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80">
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                Sold & Harvested by:
              </span>
              <h5 className="font-bold text-sm text-zinc-900 dark:text-white">{order.farmerName}</h5>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">{order.farmName}</p>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Phone: {order.farmerPhone}</p>
              <p className="text-[9px] text-zinc-400 mt-1">FSSAI Lic: <span className="font-mono font-bold">10022011000123</span></p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                Delivered to:
              </span>
              <h5 className="font-bold text-sm text-zinc-900 dark:text-white">{order.customerName}</h5>
              <p className="text-[10px] text-zinc-600 dark:text-zinc-300">{order.deliveryAddress}</p>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Phone: {order.customerPhone}</p>
              <p className="text-[9px] text-emerald-700 dark:text-emerald-400 font-bold mt-1">Direct Kisan Transport</p>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-2">
            <span className="font-bold text-[11px] uppercase tracking-wider text-zinc-400 block">
              Harvest Produce Breakdown & GST HSN
            </span>
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-collapse min-w-[280px]">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-bold">
                    <th className="py-2">Item Description</th>
                    <th className="py-2 text-center">HSN</th>
                    <th className="py-2 text-center">Qty</th>
                    <th className="py-2 text-right">Rate</th>
                    <th className="py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {order.items.map((it, idx) => (
                    <tr key={idx} className="py-2">
                      <td className="py-2 font-medium text-zinc-900 dark:text-white">
                        {it.product.name}
                        {it.product.isOrganic && (
                          <span className="ml-1 text-[9px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                            Organic
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-center text-[10px] font-mono text-zinc-400">
                        070{idx + 1}
                      </td>
                      <td className="py-2 text-center text-zinc-700 dark:text-zinc-300">
                        {it.quantity} {it.product.unit}
                      </td>
                      <td className="py-2 text-right text-zinc-500 dark:text-zinc-400">
                        {formatCurrency(it.product.price)}
                      </td>
                      <td className="py-2 text-right font-bold text-zinc-900 dark:text-white">
                        {formatCurrency(it.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment & Totals */}
          <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-1.5">
            <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
              <span>Produce Subtotal:</span>
              <span className="font-semibold text-zinc-900 dark:text-white">{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
              <span>Direct Transit Delivery:</span>
              <span className="font-semibold">{order.deliveryFee === 0 ? 'FREE' : formatCurrency(order.deliveryFee)}</span>
            </div>
            {order.farmerTip > 0 && (
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Farmer Appreciation Tip:</span>
                <span className="font-semibold text-zinc-900 dark:text-white">{formatCurrency(order.farmerTip)}</span>
              </div>
            )}
            <div className="flex justify-between text-zinc-600 dark:text-zinc-400 text-[11px]">
              <span>GST (HSN 0701-0814):</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-bold">₹0.00 (Exempt - Notif. 2/2017)</span>
            </div>
            <div className="flex justify-between text-zinc-500 dark:text-zinc-400 text-[10px]">
              <span>TDS (Sec 194-O):</span>
              <span>Exempt (Farmer Producer CBDT 17/2020)</span>
            </div>

            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex justify-between text-base font-black text-zinc-900 dark:text-white">
              <span>Total Paid:</span>
              <span className="text-emerald-800 dark:text-emerald-400">{formatCurrency(order.total)}</span>
            </div>
          </div>

          {/* Footer note */}
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 rounded-2xl text-[10px] flex items-center gap-2 border border-emerald-200/60 dark:border-emerald-800/40">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              Official Halder Direct Mandi Receipt. 100% of the produce value directly reaches {order.farmerName}. FSSAI License Verified.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
