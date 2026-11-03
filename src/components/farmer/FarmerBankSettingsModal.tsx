import React, { useState } from 'react';
import { X, Building2, Smartphone, ShieldCheck, Check, AlertCircle } from 'lucide-react';
import { ApiClient } from '../../api/client';

interface FarmerBankSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  farmerId: string;
  initialSettings?: {
    bankAccountName?: string;
    bankAccountNumber?: string;
    bankIfsc?: string;
    bankName?: string;
    upiId?: string;
  };
  onSuccess: (updated: any) => void;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const FarmerBankSettingsModal: React.FC<FarmerBankSettingsModalProps> = ({
  isOpen,
  onClose,
  farmerId,
  initialSettings,
  onSuccess,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'upi' | 'bank'>(
    initialSettings?.upiId ? 'upi' : 'bank'
  );

  const [upiId, setUpiId] = useState(initialSettings?.upiId || '');
  const [accountName, setAccountName] = useState(initialSettings?.bankAccountName || '');
  const [bankName, setBankName] = useState(initialSettings?.bankName || '');
  const [accountNumber, setAccountNumber] = useState(initialSettings?.bankAccountNumber || '');
  const [confirmAccount, setConfirmAccount] = useState(initialSettings?.bankAccountNumber || '');
  const [ifsc, setIfsc] = useState(initialSettings?.bankIfsc || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (activeTab === 'upi') {
      const cleanUpi = upiId.trim();
      if (!cleanUpi) {
        setError('Please enter your UPI ID (e.g. 9876543210@sbi)');
        return;
      }
      if (!cleanUpi.includes('@')) {
        setError('Invalid UPI ID. Must include "@" (e.g. kisan@upi)');
        return;
      }
    } else {
      if (!accountName.trim()) {
        setError('Account holder name is required');
        return;
      }
      if (!accountNumber.trim() || accountNumber.length < 8) {
        setError('Please enter a valid bank account number (min 8 digits)');
        return;
      }
      if (accountNumber !== confirmAccount) {
        setError('Account numbers do not match');
        return;
      }
      if (!ifsc.trim() || ifsc.trim().length !== 11) {
        setError('Valid 11-character IFSC Code required (e.g. SBIN0001234)');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        upiId: activeTab === 'upi' ? upiId.trim().toLowerCase() : (initialSettings?.upiId || ''),
        bankAccountName: activeTab === 'bank' ? accountName.trim() : (initialSettings?.bankAccountName || ''),
        bankName: activeTab === 'bank' ? bankName.trim() : (initialSettings?.bankName || ''),
        bankAccountNumber: activeTab === 'bank' ? accountNumber.trim() : (initialSettings?.bankAccountNumber || ''),
        bankIfsc: activeTab === 'bank' ? ifsc.trim().toUpperCase() : (initialSettings?.bankIfsc || ''),
      };

      const res = await ApiClient.updateFarmerPayoutSettings(farmerId, payload);
      showToast('? Settlement details saved successfully!', 'success');
      onSuccess(res?.data || payload);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save payout settings');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div
        className="w-full max-w-md bg-white dark:bg-[#1B201D] rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                Bank & UPI Settlement Setup
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                100% direct payouts for your farm harvest sales
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch: UPI vs Direct Bank */}
        <div className="p-5 space-y-4">
          <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/60">
            <button
              type="button"
              onClick={() => setActiveTab('upi')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'upi'
                  ? 'bg-white dark:bg-[#1B201D] text-emerald-700 dark:text-emerald-300 shadow-soft'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Instant UPI ID</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('bank')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'bank'
                  ? 'bg-white dark:bg-[#1B201D] text-emerald-700 dark:text-emerald-300 shadow-soft'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Bank Account</span>
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {activeTab === 'upi' ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Your UPI VPA / PhonePe / GPay ID (यूपीआई आईडी)
                  </label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. 9845012345@sbi or rajesh@okaxis"
                    className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[11px] text-zinc-500 mt-1 block">
                    Instant zero-fee transfer directly to your phone's UPI app.
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Account Holder Name (खाताधारक का नाम)
                  </label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="e.g. Rajesh Kumar"
                    className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Bank Name (बैंक का नाम)
                  </label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. State Bank of India"
                    className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Account Number (खाता संख्या)
                    </label>
                    <input
                      type="password"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="Account No."
                      className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Confirm Account
                    </label>
                    <input
                      type="text"
                      value={confirmAccount}
                      onChange={(e) => setConfirmAccount(e.target.value)}
                      placeholder="Confirm No."
                      className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    IFSC Code (आईएफएससी कोड)
                  </label>
                  <input
                    type="text"
                    value={ifsc}
                    onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                    placeholder="e.g. SBIN0001234"
                    maxLength={11}
                    className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-mono tracking-wider text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
                  />
                </div>
              </div>
            )}

            <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/40 rounded-xl text-[11px] text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                Encrypted & NPCI compliant. Your details are strictly used to credit sales directly to you without third-party delay.
              </span>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save Details (विवरण सहेजें)</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
