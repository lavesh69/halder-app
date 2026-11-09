import React from 'react';
import { formatCurrency } from '../../utils/formatters';
import {
  X,
  Printer,
  Share2,
  Phone,
  MessageCircle,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  Calendar,
  AlertCircle,
  Copy,
  Receipt,
  Truck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export interface DealSummaryData {
  dealReferenceId: string;
  dealDate?: string;
  status: string;
  product: {
    id: string;
    name: string;
    category?: string;
    image?: string;
  };
  farmer: {
    id: string;
    name: string;
    phone: string;
    farmName?: string;
    location?: string;
    address?: string;
  };
  buyer: {
    id: string;
    name: string;
    phone: string;
    deliveryPreference?: string;
    location?: string;
  };
  agreedTerms: {
    quantity: number;
    unit: string;
    agreedPricePerUnit: number;
    totalAmount: number;
    requiredDate?: string;
    deliveryPreference?: string;
    notes?: string;
  };
  commission: {
    platformFee: number;
    commissionRate: string;
    message: string;
  };
}

interface DealSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealSummary: DealSummaryData | null;
}

export const DealSummaryModal: React.FC<DealSummaryModalProps> = ({
  isOpen,
  onClose,
  dealSummary,
}) => {
  const { showToast } = useApp();

  if (!isOpen || !dealSummary) return null;

  const { dealReferenceId, product, farmer, buyer, agreedTerms, commission } = dealSummary;

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    const text = `🤝 HALDER Deal Agreement #${dealReferenceId}\n` +
      `Product: ${product.name} (${agreedTerms.quantity} ${agreedTerms.unit})\n` +
      `Agreed Rate: ₹${agreedTerms.agreedPricePerUnit}/${agreedTerms.unit} (Total: ₹${agreedTerms.totalAmount})\n` +
      `Farmer: ${farmer.name} (${farmer.phone})\n` +
      `Buyer: ${buyer.name} (${buyer.phone})\n` +
      `Direct Farmer Payout • 0% Platform Fee on HALDER.`;

    if (navigator.share) {
      navigator.share({ title: `HALDER Deal #${dealReferenceId}`, text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      showToast('Deal agreement details copied to clipboard!');
    }
  };

  const farmerPhoneDigits = (farmer.phone || '').replace(/[^0-9]/g, '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in print:p-0 print:bg-white">
      <div
        className="w-full max-w-lg bg-white dark:bg-[#1B201D] rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-900/50 print:bg-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg text-zinc-900 dark:text-white">
                  Farm Trade Agreement
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[10px] font-extrabold uppercase tracking-wide">
                  AGREED
                </span>
              </div>
              <p className="text-[11px] font-mono text-zinc-500">
                Ref ID: <strong className="text-emerald-700 dark:text-emerald-400">{dealReferenceId}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 transition-colors print:hidden"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Zero-Commission Payout Guarantee Banner */}
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold text-emerald-900 dark:text-emerald-200 block">
                Direct Farmer Trade • Zero Platform Commission (₹0 Fee)
              </span>
              <p className="text-emerald-800/90 dark:text-emerald-300/80 text-[11px] mt-0.5 leading-relaxed">
                {commission?.message || 'Both parties trade directly. HALDER does not take a cut or hold your money.'}
              </p>
            </div>
          </div>

          {/* Agreed Deal Breakdown Card */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Commodity / Produce
                </span>
                <h4 className="text-base font-black text-zinc-900 dark:text-white mt-0.5">
                  {product.name}
                </h4>
                {product.category && (
                  <span className="text-xs text-zinc-500">
                    Category: {product.category}
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Total Deal Value
                </span>
                <span className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5 block">
                  {formatCurrency(agreedTerms.totalAmount)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-200/60 dark:border-zinc-700/60 text-xs">
              <div>
                <span className="text-zinc-500 block">Agreed Quantity:</span>
                <strong className="text-zinc-900 dark:text-white text-sm font-bold">
                  {agreedTerms.quantity} {agreedTerms.unit}
                </strong>
              </div>
              <div>
                <span className="text-zinc-500 block">Negotiated Rate:</span>
                <strong className="text-emerald-600 dark:text-emerald-400 text-sm font-bold">
                  ₹{agreedTerms.agreedPricePerUnit} / {agreedTerms.unit}
                </strong>
              </div>
              {agreedTerms.deliveryPreference && (
                <div>
                  <span className="text-zinc-500 block">Fulfillment:</span>
                  <span className="capitalize font-semibold text-zinc-800 dark:text-zinc-200">
                    {agreedTerms.deliveryPreference.replace('_', ' ')}
                  </span>
                </div>
              )}
              {agreedTerms.requiredDate && (
                <div>
                  <span className="text-zinc-500 block">Target Date:</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {agreedTerms.requiredDate}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Farmer Contact & Pickup Info */}
          <div className="p-3.5 bg-white dark:bg-[#202722] rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                Farmer / Producer
              </span>
              <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Verified Farmer
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-black text-sm text-zinc-900 dark:text-white">
                  {farmer.name}
                </h5>
                <p className="text-xs text-zinc-500">
                  {farmer.farmName || 'Direct Farmland'} • {farmer.location || 'Local Farm'}
                </p>
                <p className="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200 mt-1">
                  📞 {farmer.phone}
                </p>
              </div>

              {/* Direct Quick Actions */}
              <div className="flex items-center gap-1.5 print:hidden">
                <a
                  href={`tel:${farmerPhoneDigits}`}
                  className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-800 dark:text-zinc-200 transition"
                  title="Call Farmer"
                >
                  <Phone className="w-4 h-4 text-emerald-600" />
                </a>
                <a
                  href={`https://wa.me/${farmerPhoneDigits}?text=${encodeURIComponent(`Namaste ${farmer.name}, I have confirmed our deal for ${agreedTerms.quantity} ${agreedTerms.unit} of ${product.name} (Ref #${dealReferenceId}). Let us coordinate pickup.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 transition"
                  title="WhatsApp Farmer"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                </a>
              </div>
            </div>
          </div>

          {/* Buyer Info */}
          <div className="p-3.5 bg-white dark:bg-[#202722] rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80 space-y-1">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">
              Buyer Information
            </span>
            <div className="flex items-center justify-between text-xs">
              <div>
                <h5 className="font-bold text-zinc-900 dark:text-white">
                  {buyer.name}
                </h5>
                <span className="font-mono text-zinc-600 dark:text-zinc-400">
                  📞 {buyer.phone}
                </span>
              </div>
              <span className="text-zinc-500">
                {buyer.location || 'Local Buyer'}
              </span>
            </div>
          </div>

          {/* Settlement Guidance Note */}
          <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Next Steps for Payment & Pickup</span>
            </div>
            <p className="leading-relaxed">
              1. Call or WhatsApp the farmer to confirm exact farm gate pickup or transport dispatch time.<br />
              2. Inspect produce upon receipt and settle agreed payment (Cash / UPI) directly with the farmer.
            </p>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-3.5 sm:p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between gap-2 print:hidden">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-bold transition flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-zinc-500" />
            <span>Print Receipt</span>
          </button>

          <button
            onClick={handleShare}
            className="flex-1 py-2.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-soft transition flex items-center justify-center gap-1.5"
          >
            <Share2 className="w-4 h-4" />
            <span>Share Deal Details</span>
          </button>
        </div>
      </div>
    </div>
  );
};
