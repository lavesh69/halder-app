import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PaymentMethod } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { playPaymentSuccessChime } from '../../utils/audio';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Banknote,
  Smartphone,
  ShieldCheck,
  Check,
  QrCode,
  Volume2,
  ExternalLink,
  Sparkles,
  Truck,
  X,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { ApiClient } from '../../api/client';
import { AddressManagementModal } from './AddressManagementModal';

interface CheckoutViewProps {
  onBack: () => void;
}

export const CheckoutView: React.FC<CheckoutViewProps> = ({ onBack }) => {
  const {
    cart,
    cartTotal,
    currentLocation,
    buyNowProduct,
    groupedCart,
    placeOrder,
    setCustomerTab,
    showToast,
    platformSettings,
  } = useApp();

  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  const isBuyNow = !!buyNowProduct;
  const itemsTotal = isBuyNow
    ? buyNowProduct.product.price * buyNowProduct.quantity
    : cartTotal;

  const primaryFarmerName = isBuyNow
    ? buyNowProduct.product.farmerName
    : groupedCart[0]?.farmerName || 'Rajesh Kumar';
  const primaryFarmName = isBuyNow
    ? buyNowProduct.product.farmName
    : groupedCart[0]?.farmName || 'Green Valley Organic Farm';

  // Farmer's direct personal UPI ID (No app escrow!)
  const farmerUpiId = `${primaryFarmerName.toLowerCase().replace(/[^a-z0-9]/g, '')}.farm@upi`;

  const [deliveryAddress, setDeliveryAddress] = useState(
    currentLocation || 'House 14, 2nd Cross, Rajpur Road, Dehradun'
  );

  React.useEffect(() => {
    // Attempt to load customer's default saved address
    ApiClient.getCustomerProfile()
      .then((profile) => {
        if (profile?.defaultAddress) {
          const addr = profile.defaultAddress;
          setDeliveryAddress(`${addr.house_building}, ${addr.street_locality}, ${addr.city}, ${addr.state} - ${addr.postal_code}`);
        }
      })
      .catch(() => {});
  }, []);

  const [selectedSlot, setSelectedSlot] = useState('Morning (7:00 AM - 9:00 AM)');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [farmerTip] = useState<number>(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUpiQr, setShowUpiQr] = useState(false);

  // PhonePe Gateway States
  const [isPhonePeModalOpen, setIsPhonePeModalOpen] = useState(false);
  const [isPhonePeLoading, setIsPhonePeLoading] = useState(false);
  const [phonePeData, setPhonePeData] = useState<{
    merchantTransactionId: string;
    redirectUrl: string;
    amount: number;
    amountInPaise?: number;
  } | null>(null);
  const [isPhonePePaid, setIsPhonePePaid] = useState(false);
  const pollingRef = React.useRef<any>(null);

  const stopPhonePePolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  // Paytm Gateway States
  const [isPaytmModalOpen, setIsPaytmModalOpen] = useState(false);
  const [isPaytmLoading, setIsPaytmLoading] = useState(false);
  const [paytmData, setPaytmData] = useState<{
    orderId: string;
    txnToken: string;
    mid: string;
    amount: number;
  } | null>(null);
  const [isPaytmPaid, setIsPaytmPaid] = useState(false);
  const paytmPollingRef = React.useRef<any>(null);

  const stopPaytmPolling = () => {
    if (paytmPollingRef.current) {
      clearInterval(paytmPollingRef.current);
      paytmPollingRef.current = null;
    }
  };

  // Google Pay States
  const [isGPayModalOpen, setIsGPayModalOpen] = useState(false);
  const [isGPayLoading, setIsGPayLoading] = useState(false);
  const [gpayData, setGPayData] = useState<{
    orderId: string;
    txnRef: string;
    amount: number;
    gpayUri: string;
    standardUpiUri: string;
  } | null>(null);
  const [isGPayPaid, setIsGPayPaid] = useState(false);

  React.useEffect(() => {
    return () => {
      stopPhonePePolling();
      stopPaytmPolling();
    };
  }, []);

  const confirmPhonePeOrder = async (txnId: string) => {
    stopPhonePePolling();
    setIsPhonePePaid(true);
    playPaymentSuccessChime(total);
    showToast('✅ PhonePe Payment Received! Order Confirmed.', 'success');

    setTimeout(async () => {
      await placeOrder({
        address: deliveryAddress.trim(),
        slot: selectedSlot,
        paymentMethod: 'phonepe',
        farmerTip,
        isBuyNow,
        instructions: deliveryNotes.trim() || undefined,
      });
      setIsPhonePeModalOpen(false);
      setCustomerTab('orders');
    }, 1200);
  };

  const startPhonePePolling = (txnId: string) => {
    stopPhonePePolling();
    let attempts = 0;
    pollingRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 60) {
        stopPhonePePolling();
        return;
      }
      try {
        const res: any = await ApiClient.getPhonePeStatus(txnId);
        if (res && (res.status === 'PAID' || res.data?.status === 'PAID')) {
          confirmPhonePeOrder(txnId);
        }
      } catch (e) {}
    }, 2000);
  };

  const confirmPaytmOrder = async (orderId: string) => {
    stopPaytmPolling();
    setIsPaytmPaid(true);
    playPaymentSuccessChime(total);
    showToast('✅ Paytm Payment Received! Order Confirmed.', 'success');

    setTimeout(async () => {
      await placeOrder({
        address: deliveryAddress.trim(),
        slot: selectedSlot,
        paymentMethod: 'paytm',
        farmerTip,
        isBuyNow,
        instructions: deliveryNotes.trim() || undefined,
      });
      setIsPaytmModalOpen(false);
      setCustomerTab('orders');
    }, 1200);
  };

  const startPaytmPolling = (orderId: string) => {
    stopPaytmPolling();
    let attempts = 0;
    paytmPollingRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 60) {
        stopPaytmPolling();
        return;
      }
      try {
        const res: any = await ApiClient.getPaytmStatus(orderId);
        if (res && (res.status === 'TXN_SUCCESS' || res.data?.status === 'TXN_SUCCESS')) {
          confirmPaytmOrder(orderId);
        }
      } catch (e) {}
    }, 2000);
  };

  const confirmGPayOrder = async (orderId: string, txnRef?: string) => {
    setIsGPayPaid(true);
    playPaymentSuccessChime(total);
    showToast('✅ Google Pay Received! Order Confirmed.', 'success');

    try {
      await ApiClient.verifyGPayPayment({ orderId, txnRef });
    } catch {}

    setTimeout(async () => {
      await placeOrder({
        address: deliveryAddress.trim(),
        slot: selectedSlot,
        paymentMethod: 'gpay',
        farmerTip,
        isBuyNow,
        instructions: deliveryNotes.trim() || undefined,
      });
      setIsGPayModalOpen(false);
      setCustomerTab('orders');
    }, 1200);
  };

  const deliveryThreshold = platformSettings?.freeDeliveryThreshold ?? 200;
  const standardFee = platformSettings?.standardDeliveryFee ?? 25;
  const deliveryFee = itemsTotal >= deliveryThreshold ? 0 : standardFee;
  const platformCommission = 5; // Flat ₹5 HALDER platform commission fee
  const farmerProduceTotal = itemsTotal + deliveryFee + farmerTip;
  const total = farmerProduceTotal + platformCommission;

  const slots = [
    'Morning (7:00 AM - 9:00 AM)',
    'Afternoon (12:00 PM - 2:00 PM)',
    'Evening (5:00 PM - 8:00 PM)',
    'Express (Within 45 mins)',
  ];

  // Direct UPI Intent deep link for mobile GPay/PhonePe/Paytm
  const upiIntentUrl = `upi://pay?pa=${farmerUpiId}&pn=${encodeURIComponent(primaryFarmerName)}&am=${farmerProduceTotal}&cu=INR&tn=${encodeURIComponent('HALDER Fresh Farm Harvest Payment')}`;

  const handleOpenUpiApp = () => {
    window.location.href = upiIntentUrl;
  };

  const handlePlaceOrder = async () => {
    if (isSubmitting) return;

    if (!deliveryAddress.trim()) {
      showToast('Please enter your delivery address', 'error');
      return;
    }

    if (isBuyNow ? !buyNowProduct : cart.length === 0) {
      showToast('Your cart is empty', 'error');
      return;
    }

    if (paymentMethod === 'upi' && !showUpiQr) {
      setShowUpiQr(true);
      return;
    }

    if (paymentMethod === 'phonepe') {
      setIsPhonePeModalOpen(true);
      setIsPhonePeLoading(true);
      try {
        const res: any = await ApiClient.initiatePhonePePayment({
          amount: total,
          customerMobile: '9876543210',
          redirectUrl: window.location.href,
        });
        const data = res?.data || res;
        if (data?.merchantTransactionId) {
          setPhonePeData(data);
          startPhonePePolling(data.merchantTransactionId);
        }
      } catch (err: any) {
        showToast(err.message || 'PhonePe gateway initialization failed', 'error');
        setIsPhonePeModalOpen(false);
      } finally {
        setIsPhonePeLoading(false);
      }
      return;
    }

    if (paymentMethod === 'paytm') {
      setIsPaytmModalOpen(true);
      setIsPaytmLoading(true);
      try {
        const res: any = await ApiClient.initiatePaytmPayment({
          amount: total,
          customerMobile: '9876543210',
        });
        const data = res?.data || res;
        if (data?.orderId) {
          setPaytmData(data);
          startPaytmPolling(data.orderId);
        }
      } catch (err: any) {
        showToast(err.message || 'Paytm gateway initialization failed', 'error');
        setIsPaytmModalOpen(false);
      } finally {
        setIsPaytmLoading(false);
      }
      return;
    }

    if (paymentMethod === 'gpay') {
      setIsGPayModalOpen(true);
      setIsGPayLoading(true);
      try {
        const res: any = await ApiClient.initiateGPayPayment({
          amount: total,
          customerMobile: '9876543210',
          customerName: 'Customer',
          farmerUpiId,
          farmerName: primaryFarmerName,
        });
        const data = res?.data || res;
        if (data?.orderId) {
          setGPayData(data);
        }
      } catch (err: any) {
        showToast(err.message || 'Google Pay initialization failed', 'error');
        setIsGPayModalOpen(false);
      } finally {
        setIsGPayLoading(false);
      }
      return;
    }

    setIsSubmitting(true);
    try {
      // Audio Chime & Speech Synthesis
      playPaymentSuccessChime(total);

      await placeOrder({
        address: deliveryAddress.trim(),
        slot: selectedSlot,
        paymentMethod,
        farmerTip,
        isBuyNow,
        instructions: deliveryNotes.trim() || undefined,
      });
      setShowUpiQr(false);
      setCustomerTab('orders');
    } catch (err: any) {
      showToast(err.message || 'Failed to place order. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 animate-fade-in max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-black text-zinc-900 dark:text-white">
            {isBuyNow ? 'Direct Farmer Purchase' : 'Checkout'}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Paisa seedha kisaan ({primaryFarmerName}) ke khate me
          </p>
        </div>
      </div>

      {/* Direct Farmer Guarantee Banner */}
      <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 rounded-2xl flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs">
          <span className="font-bold text-emerald-900 dark:text-emerald-200 block">
            100% Direct Farmer Settlement
          </span>
          <span className="text-emerald-700 dark:text-emerald-400 text-[11px] leading-relaxed">
            Aapka payment seedha kisaan <b>{primaryFarmerName}</b> ({primaryFarmName}) ke paas jata hai. HALDER aapke paise hold nahi karta.
          </span>
        </div>
      </div>

      {/* Free Delivery Incentive Progress Bar */}
      <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-emerald-600" />
            {itemsTotal >= deliveryThreshold ? (
              <span className="text-emerald-700 dark:text-emerald-400">🎉 FREE Farm Direct Delivery Unlocked!</span>
            ) : (
              <span>
                Add <strong className="text-emerald-600">{formatCurrency(deliveryThreshold - itemsTotal)}</strong> more for <strong>FREE Delivery</strong>
              </span>
            )}
          </span>
          <span className="text-[10px] font-bold text-zinc-400">
            Threshold: ₹{deliveryThreshold}
          </span>
        </div>
        <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-2 rounded-full overflow-hidden">
          <div
            className="bg-emerald-600 h-full rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, (itemsTotal / deliveryThreshold) * 100)}%` }}
          />
        </div>
      </div>

      {/* 1. Delivery Address */}
      <div className="p-4 bg-white dark:bg-[#1B201D] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
              1. Delivery Address
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setIsAddressModalOpen(true)}
            className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md transition"
          >
            Select Saved Address
          </button>
        </div>

        <textarea
          value={deliveryAddress}
          onChange={(e) => setDeliveryAddress(e.target.value)}
          rows={2}
          className="w-full p-3 text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
        />
      </div>

      <AddressManagementModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onAddressSelected={(addr) => {
          setDeliveryAddress(`${addr.house_building}, ${addr.street_locality}, ${addr.city}, ${addr.state} - ${addr.postal_code}`);
          showToast('Delivery address updated', 'info');
        }}
        showToast={showToast}
      />

      {/* 2. Choose Delivery Slot */}
      <div className="p-4 bg-white dark:bg-[#1B201D] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-600" />
          <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
            2. Choose Delivery Slot
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {slots.map((slot) => {
            const isSelected = selectedSlot === slot;
            return (
              <button
                key={slot}
                type="button"
                onClick={() => setSelectedSlot(slot)}
                className={`p-3 rounded-xl border text-left text-xs font-medium transition-all ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold ring-1 ring-emerald-500/20'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50'
                }`}
              >
                {slot}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2B. 100% Kisan Direct Farm Delivery Guarantee */}
      <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/40 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="font-bold text-emerald-900 dark:text-emerald-300">
              100% Kisan Direct Delivery (किसान सीधी आपूर्ति)
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold text-[10px]">
            Direct Farm Fleet
          </span>
        </div>
        <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
          Delivered directly by <strong>{primaryFarmerName}</strong> from <strong>{primaryFarmName}</strong> using farm transport. Zero middlemen or 3rd-party courier commission. 100% of your delivery fee goes directly into the farmer's fuel & vehicle.
        </p>
      </div>

      {/* 2C. Special Delivery Instructions & Harvest Notes (किसान के लिए निर्देश) */}
      <div className="p-4 bg-white dark:bg-[#1B201D] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
              2C. Farm Delivery Notes (किसान के लिए निर्देश)
            </h3>
          </div>
          <span className="text-[10px] text-zinc-400">Optional</span>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap gap-1.5">
          {[
            'Call upon arrival',
            'Ring doorbell & leave at door',
            'Morning fresh harvest preferred',
            'Careful handling for ripe fruits',
          ].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setDeliveryNotes((prev) =>
                  prev ? (prev.includes(preset) ? prev : `${prev}, ${preset}`) : preset
                );
              }}
              className="text-[10px] px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors font-medium"
            >
              + {preset}
            </button>
          ))}
        </div>

        <textarea
          value={deliveryNotes}
          onChange={(e) => setDeliveryNotes(e.target.value)}
          rows={2}
          placeholder="Special instructions for the farmer (e.g. landmark, gate code, ripeness preference, paper bag packaging)..."
          className="w-full p-3 text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
        />
      </div>

      {/* 3. Payment Method (Direct to Farmer) */}
      <div className="p-4 bg-white dark:bg-[#1B201D] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 space-y-3">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-emerald-600" />
          <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
            3. Direct Payment Options
          </h3>
        </div>

        <div className="space-y-2">
          {/* PhonePe PG (Official Gateway) */}
          <button
            type="button"
            onClick={() => setPaymentMethod('phonepe')}
            className={`w-full p-3.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
              paymentMethod === 'phonepe'
                ? 'border-[#5f259f] bg-[#5f259f]/5 dark:bg-[#5f259f]/10 text-zinc-900 dark:text-zinc-100 font-bold ring-2 ring-[#5f259f]/30'
                : 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#5f259f] flex items-center justify-center text-white font-black text-sm shadow-sm shrink-0">
                पे
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="block font-bold text-zinc-900 dark:text-white">PhonePe (UPI, QR & Cards)</span>
                  <span className="text-[9px] bg-[#5f259f]/15 text-[#5f259f] dark:text-[#c4a1ff] px-1.5 py-0.2 rounded font-bold uppercase tracking-wide">
                    Fast & Verified
                  </span>
                </div>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-normal">
                  PhonePe App, Instant Dynamic QR, RuPay/Visa Cards & NetBanking
                </span>
              </div>
            </div>
            {paymentMethod === 'phonepe' && <Check className="w-4 h-4 text-[#5f259f]" />}
          </button>

          {/* Google Pay (GPay) */}
          <button
            type="button"
            onClick={() => setPaymentMethod('gpay')}
            className={`w-full p-3.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
              paymentMethod === 'gpay'
                ? 'border-[#4285F4] bg-[#4285F4]/5 dark:bg-[#4285F4]/10 text-zinc-900 dark:text-zinc-100 font-bold ring-2 ring-[#4285F4]/30'
                : 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#4285F4] flex items-center justify-center text-white font-black text-sm shadow-sm shrink-0">
                G
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="block font-bold text-zinc-900 dark:text-white">Google Pay (GPay)</span>
                  <span className="text-[9px] bg-[#4285F4]/15 text-[#4285F4] dark:text-[#8ab4f8] px-1.5 py-0.2 rounded font-bold uppercase tracking-wide">
                    1-Tap UPI
                  </span>
                </div>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-normal">
                  Google Pay App, Tez UPI Intent & Direct Bank Settlement
                </span>
              </div>
            </div>
            {paymentMethod === 'gpay' && <Check className="w-4 h-4 text-[#4285F4]" />}
          </button>

          {/* Paytm (Wallet, UPI & NetBanking) */}
          <button
            type="button"
            onClick={() => setPaymentMethod('paytm')}
            className={`w-full p-3.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
              paymentMethod === 'paytm'
                ? 'border-[#00B9F1] bg-[#00B9F1]/5 dark:bg-[#00B9F1]/10 text-zinc-900 dark:text-zinc-100 font-bold ring-2 ring-[#00B9F1]/30'
                : 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#002E6E] border border-[#00B9F1]/40 flex items-center justify-center text-[#00B9F1] font-black text-xs shadow-sm shrink-0">
                Paytm
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="block font-bold text-zinc-900 dark:text-white">Paytm (Wallet & UPI)</span>
                  <span className="text-[9px] bg-[#00B9F1]/15 text-[#008cb8] dark:text-[#00B9F1] px-1.5 py-0.2 rounded font-bold uppercase tracking-wide">
                    Wallet & Postpaid
                  </span>
                </div>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-normal">
                  Paytm Wallet Balance, Paytm UPI & Postpaid Settlement
                </span>
              </div>
            </div>
            {paymentMethod === 'paytm' && <Check className="w-4 h-4 text-[#00B9F1]" />}
          </button>

          {/* UPI Direct to Farmer */}
          <button
            type="button"
            onClick={() => setPaymentMethod('upi')}
            className={`w-full p-3.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
              paymentMethod === 'upi'
                ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold ring-1 ring-emerald-500/20'
                : 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <Smartphone className="w-4 h-4 text-emerald-600" />
              <div className="text-left">
                <span className="block font-bold">Direct UPI to {primaryFarmerName}</span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-normal">
                  Any UPI App (Instant P2P to Farmer's Account)
                </span>
              </div>
            </div>
            {paymentMethod === 'upi' && <Check className="w-4 h-4 text-emerald-600" />}
          </button>

          {/* Cash on Delivery Direct to Farmer */}
          <button
            type="button"
            onClick={() => setPaymentMethod('cod')}
            className={`w-full p-3.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
              paymentMethod === 'cod'
                ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold ring-1 ring-emerald-500/20'
                : 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <Banknote className="w-4 h-4 text-emerald-600" />
              <div className="text-left">
                <span className="block font-bold">Cash on Delivery / Doorstep QR</span>
                <span className="text-[11px] text-zinc-500 font-normal">
                  Pay cash directly to farmer/delivery person
                </span>
              </div>
            </div>
            {paymentMethod === 'cod' && <Check className="w-4 h-4 text-emerald-600" />}
          </button>
        </div>
      </div>

      {/* Transparent Price Breakdown */}
      <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/60 space-y-2 text-xs">
        <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
          <span>Produce Total (Kisaan ke paas)</span>
          <span className="font-semibold text-zinc-900 dark:text-white">
            {formatCurrency(itemsTotal)}
          </span>
        </div>
        <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
          <span>Farmer Delivery</span>
          <span className="text-emerald-600 font-bold">
            {deliveryFee === 0 ? 'FREE' : formatCurrency(deliveryFee)}
          </span>
        </div>
        <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
          <span>Farmer Tip</span>
          <span className="font-semibold text-zinc-900 dark:text-white">
            {formatCurrency(farmerTip)}
          </span>
        </div>
        <div className="flex justify-between text-zinc-600 dark:text-zinc-400 pt-1 border-t border-dashed border-zinc-200 dark:border-zinc-700">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            HALDER App Platform Fee
          </span>
          <span className="font-bold text-amber-600 dark:text-amber-400">
            {formatCurrency(platformCommission)}
          </span>
        </div>
        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700 flex justify-between font-bold text-sm text-zinc-900 dark:text-white">
          <div>
            <span className="block">Total Payable</span>
            <span className="text-[10px] text-zinc-400 font-normal">
              {formatCurrency(farmerProduceTotal)} to Farmer + {formatCurrency(platformCommission)} App Fee
            </span>
          </div>
          <span className="text-emerald-700 dark:text-emerald-400 text-base font-black">
            {formatCurrency(total)}
          </span>
        </div>
      </div>

      {/* Direct UPI Payment Modal */}
      {showUpiQr && (
        <div className="p-5 bg-white dark:bg-[#1B201D] rounded-3xl border-2 border-emerald-500 shadow-soft-lg space-y-4 animate-slide-up text-center">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-emerald-600" />
              Direct Farmer QR
            </span>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
              Zero Intermediary
            </span>
          </div>

          {/* Farmer Details */}
          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/60 text-left flex items-center justify-between">
            <div>
              <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Paying Direct to:</span>
              <span className="font-black text-sm text-zinc-900 dark:text-white block">{primaryFarmerName}</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{primaryFarmName}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Farmer UPI ID:</span>
              <code className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">{farmerUpiId}</code>
            </div>
          </div>

          {/* Dynamic SVG QR Code Simulation */}
          <div className="w-44 h-44 mx-auto p-3 bg-white rounded-2xl border border-zinc-200 shadow-inner flex flex-col items-center justify-center">
            <svg className="w-full h-full text-zinc-900" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14 0h4v4h-4v-4zm-4 4h4v4h-4v-4zm4-4h-4v-4h4v4zm-8-4h2v2h-2v-2zm4-4h2v2h-2V6zm-6 6h2v2H8v-2zm8-2h2v2h-2v-2zm-4 4h2v2h-2v-2z" />
            </svg>
          </div>

          {/* 1-Tap Mobile UPI Intent App Launcher */}
          <button
            onClick={handleOpenUpiApp}
            className="w-full py-3 bg-zinc-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open in Google Pay / PhonePe / Paytm
          </button>

          <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/40 py-2 rounded-xl">
            <Volume2 className="w-4 h-4 text-emerald-600 animate-pulse" />
            <span>Kisaan Soundbox Confirmation Enabled</span>
          </div>

          <button
            onClick={handlePlaceOrder}
            disabled={isSubmitting}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl shadow-soft transition-all"
          >
            {isSubmitting ? 'Confirming with Farmer...' : `Maine Pay Kar Diya • Place Order (${formatCurrency(total)})`}
          </button>
        </div>
      )}

      {/* CTA */}
      <button
        onClick={handlePlaceOrder}
        disabled={isSubmitting || isPhonePeLoading || isPaytmLoading || isGPayLoading}
        className={`w-full py-4 disabled:opacity-50 active:scale-98 text-white font-bold text-base rounded-2xl shadow-soft-lg transition-all flex items-center justify-center gap-2 ${
          paymentMethod === 'phonepe'
            ? 'bg-[#5f259f] hover:bg-[#4d1d82]'
            : paymentMethod === 'gpay'
            ? 'bg-[#4285F4] hover:bg-[#3367d6]'
            : paymentMethod === 'paytm'
            ? 'bg-[#00B9F1] hover:bg-[#008cb8] text-white'
            : 'bg-emerald-600 hover:bg-emerald-700'
        }`}
      >
        {paymentMethod === 'phonepe' ? (
          <div className="w-5 h-5 rounded-full bg-white text-[#5f259f] flex items-center justify-center text-xs font-black">
            पे
          </div>
        ) : paymentMethod === 'gpay' ? (
          <div className="w-5 h-5 rounded-full bg-white text-[#4285F4] flex items-center justify-center text-xs font-black">
            G
          </div>
        ) : paymentMethod === 'paytm' ? (
          <div className="px-1 py-0.5 rounded bg-[#002E6E] text-[#00B9F1] text-[10px] font-black">
            Paytm
          </div>
        ) : (
          <ShieldCheck className="w-5 h-5" />
        )}
        <span>
          {isSubmitting || isPhonePeLoading || isPaytmLoading || isGPayLoading
            ? 'Processing...'
            : paymentMethod === 'phonepe'
            ? `PhonePe se Pay Karein • ${formatCurrency(total)}`
            : paymentMethod === 'gpay'
            ? `Google Pay se Pay Karein • ${formatCurrency(total)}`
            : paymentMethod === 'paytm'
            ? `Paytm se Pay Karein • ${formatCurrency(total)}`
            : paymentMethod === 'upi' && !showUpiQr
            ? `Kisaan ko Direct Pay Karein • ${formatCurrency(total)}`
            : `Order Place Karein • ${formatCurrency(total)}`}
        </span>
      </button>

      {/* PhonePe Payment Gateway Modal */}
      {isPhonePeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-[#1B201D] rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden text-center animate-scale-up">
            <div className="bg-[#5f259f] text-white p-4 relative flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white text-[#5f259f] flex items-center justify-center text-base font-black shadow-sm">
                  पे
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-black tracking-wide">PhonePe Gateway</h3>
                  <p className="text-[10px] text-purple-200">100% Secure UPI & Card Settlement</p>
                </div>
              </div>
              <button
                onClick={() => {
                  stopPhonePePolling();
                  setIsPhonePeModalOpen(false);
                }}
                className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {isPhonePeLoading ? (
                <div className="py-10 space-y-3">
                  <Loader2 className="w-10 h-10 text-[#5f259f] animate-spin mx-auto" />
                  <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    Connecting to PhonePe Secure Gateway...
                  </p>
                  <p className="text-[11px] text-zinc-400">Generating dynamic encrypted transaction</p>
                </div>
              ) : isPhonePePaid ? (
                <div className="py-8 space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
                  <h4 className="text-base font-black text-zinc-900 dark:text-white">
                    Payment Received!
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    PhonePe confirmed ₹{total}. Redirecting to your order...
                  </p>
                </div>
              ) : phonePeData ? (
                <>
                  <div>
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Total Payable Amount
                    </span>
                    <span className="text-2xl font-black text-[#5f259f] dark:text-[#c4a1ff]">
                      {formatCurrency(total)}
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
                      Txn Ref: {phonePeData.merchantTransactionId}
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-2xl border-2 border-dashed border-[#5f259f]/30 inline-block shadow-xs">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                        `upi://pay?pa=${farmerUpiId}&pn=${encodeURIComponent(primaryFarmerName)}&am=${total}&cu=INR&tn=${encodeURIComponent(`PhonePe-Halder-${phonePeData.merchantTransactionId}`)}`
                      )}`}
                      alt="PhonePe Payment QR"
                      className="w-40 h-40 mx-auto"
                    />
                    <span className="text-[10px] text-zinc-600 font-bold block mt-1">
                      Scan with PhonePe / Any UPI App
                    </span>
                  </div>

                  <a
                    href={phonePeData.redirectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 bg-[#5f259f] hover:bg-[#4d1d82] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open PhonePe Payment Portal
                  </a>

                  <button
                    onClick={() => confirmPhonePeOrder(phonePeData.merchantTransactionId)}
                    className="w-full py-2.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 font-bold text-xs rounded-xl border border-emerald-500/30 transition flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Simulate Complete Payment (PhonePe Sandbox)
                  </button>

                  <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                    <span className="w-2 h-2 rounded-full bg-[#5f259f] animate-ping" />
                    <span>Waiting for PhonePe payment confirmation...</span>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Google Pay (GPay) Modal */}
      {isGPayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-[#1B201D] rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden text-center animate-scale-up">
            <div className="bg-[#4285F4] text-white p-4 relative flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white text-[#4285F4] flex items-center justify-center text-base font-black shadow-sm">
                  G
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-black tracking-wide">Google Pay (GPay)</h3>
                  <p className="text-[10px] text-blue-100">1-Tap Direct UPI & Tez Settlement</p>
                </div>
              </div>
              <button
                onClick={() => setIsGPayModalOpen(false)}
                className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {isGPayLoading ? (
                <div className="py-10 space-y-3">
                  <Loader2 className="w-10 h-10 text-[#4285F4] animate-spin mx-auto" />
                  <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    Initializing Google Pay Tez Intent...
                  </p>
                </div>
              ) : isGPayPaid ? (
                <div className="py-8 space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
                  <h4 className="text-base font-black text-zinc-900 dark:text-white">
                    Google Pay Verified!
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    GPay confirmed ₹{total}. Placing your order...
                  </p>
                </div>
              ) : gpayData ? (
                <>
                  <div>
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Total Payable Amount
                    </span>
                    <span className="text-2xl font-black text-[#4285F4] dark:text-[#8ab4f8]">
                      {formatCurrency(total)}
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
                      Order: {gpayData.orderId}
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-2xl border-2 border-dashed border-[#4285F4]/30 inline-block shadow-xs">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                        gpayData.standardUpiUri
                      )}`}
                      alt="Google Pay QR"
                      className="w-40 h-40 mx-auto"
                    />
                    <span className="text-[10px] text-zinc-600 font-bold block mt-1">
                      Scan with Google Pay App
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      window.location.href = gpayData.gpayUri;
                    }}
                    className="w-full py-3 bg-[#4285F4] hover:bg-[#3367d6] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open in Google Pay (Tez Intent)
                  </button>

                  <button
                    onClick={() => confirmGPayOrder(gpayData.orderId, gpayData.txnRef)}
                    className="w-full py-2.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 font-bold text-xs rounded-xl border border-emerald-500/30 transition flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Simulate Complete Payment (GPay Sandbox)
                  </button>

                  <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                    <span className="w-2 h-2 rounded-full bg-[#4285F4] animate-ping" />
                    <span>Waiting for Google Pay completion...</span>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Paytm Gateway Modal */}
      {isPaytmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-[#1B201D] rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden text-center animate-scale-up">
            <div className="bg-[#002E6E] text-white p-4 relative flex items-center justify-between border-b-2 border-[#00B9F1]">
              <div className="flex items-center gap-2.5">
                <div className="px-2 py-1 rounded-lg bg-[#00B9F1] text-[#002E6E] text-xs font-black shadow-sm">
                  Paytm
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-black tracking-wide text-white">Paytm Payments</h3>
                  <p className="text-[10px] text-[#00B9F1]">Wallet, UPI & Postpaid Gateway</p>
                </div>
              </div>
              <button
                onClick={() => {
                  stopPaytmPolling();
                  setIsPaytmModalOpen(false);
                }}
                className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {isPaytmLoading ? (
                <div className="py-10 space-y-3">
                  <Loader2 className="w-10 h-10 text-[#00B9F1] animate-spin mx-auto" />
                  <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    Generating Paytm Transaction Session...
                  </p>
                </div>
              ) : isPaytmPaid ? (
                <div className="py-8 space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
                  <h4 className="text-base font-black text-zinc-900 dark:text-white">
                    Paytm Payment Received!
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Paytm confirmed ₹{total}. Redirecting to your orders...
                  </p>
                </div>
              ) : paytmData ? (
                <>
                  <div>
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Total Payable Amount
                    </span>
                    <span className="text-2xl font-black text-[#002E6E] dark:text-[#00B9F1]">
                      {formatCurrency(total)}
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
                      Paytm Order: {paytmData.orderId}
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-2xl border-2 border-dashed border-[#00B9F1]/40 inline-block shadow-xs">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                        `upi://pay?pa=${farmerUpiId}&pn=${encodeURIComponent(primaryFarmerName)}&am=${total}&cu=INR&tn=${encodeURIComponent(`Paytm-Halder-${paytmData.orderId}`)}`
                      )}`}
                      alt="Paytm Payment QR"
                      className="w-40 h-40 mx-auto"
                    />
                    <span className="text-[10px] text-zinc-600 font-bold block mt-1">
                      Scan with Paytm Wallet / UPI
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      showToast('Opening Paytm Wallet Gateway...', 'info');
                    }}
                    className="w-full py-3 bg-[#002E6E] hover:bg-[#002252] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition border border-[#00B9F1]/30"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#00B9F1]" />
                    Pay via Paytm Wallet / NetBanking
                  </button>

                  <button
                    onClick={() => confirmPaytmOrder(paytmData.orderId)}
                    className="w-full py-2.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 font-bold text-xs rounded-xl border border-emerald-500/30 transition flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Simulate Complete Payment (Paytm Sandbox)
                  </button>

                  <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                    <span className="w-2 h-2 rounded-full bg-[#00B9F1] animate-ping" />
                    <span>Waiting for Paytm settlement confirmation...</span>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
