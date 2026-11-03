import React from 'react';
import { X, ShieldCheck, Lock, Trash2, EyeOff, FileText, CheckCircle2 } from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeleteAccount?: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  isOpen,
  onClose,
  onDeleteAccount,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg max-h-[88dvh] bg-white dark:bg-[#1A201C] rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-white">
                HALDER Privacy Policy
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Play Store User Data Safety & Terms</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Scrollable */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
          {/* Section 1 */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-600" />
              1. Information We Collect
            </h4>
            <p>
              HALDER collects only the minimal data required to connect local farmers with nearby customers:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-1 text-[11px]">
              <li><b>Account Profile</b>: Name, phone number, role (Customer or Farmer).</li>
              <li><b>Location Data</b>: Approximate or precise GPS location used strictly for calculating distance to local farms. Never tracked in the background.</li>
              <li><b>Camera & Images</b>: Used optionally by farmers to capture and upload crop listing photos.</li>
              <li><b>Orders & Communications</b>: Direct order history and transactional chat between buyer and farmer.</li>
            </ul>
          </div>

          {/* Section 2 */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-emerald-600" />
              2. How Data Is Used & Protected
            </h4>
            <p>
              Your personal data is encrypted in transit using HTTPS / TLS and protected by strict role-based access control. We do <b>NOT</b> sell, rent, or trade your personal data to third-party advertisers or data brokers.
            </p>
          </div>

          {/* Section 3 */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              3. Direct Payment Privacy
            </h4>
            <p>
              Payment for produce is made directly between customer and farmer via direct UPI or cash. HALDER does not store sensitive bank account credentials, debit card numbers, or UPI PINs.
            </p>
          </div>

          {/* Section 4: Account Deletion (Play Store Requirement) */}
          <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl space-y-2">
            <h4 className="font-bold text-xs text-rose-900 dark:text-rose-300 flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-600" />
              4. In-App Account & Data Deletion
            </h4>
            <p className="text-[11px] text-rose-800/80 dark:text-rose-300/80">
              In compliance with Google Play User Data policies, you can permanently delete your account, saved addresses, and active sessions at any time.
            </p>
            {onDeleteAccount && (
              <button
                type="button"
                onClick={onDeleteAccount}
                className="mt-2 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Request Permanent Account Deletion
              </button>
            )}
          </div>

          {/* Section 5: Contact */}
          <div className="pt-2 text-[11px] text-zinc-400 border-t border-zinc-200 dark:border-zinc-800">
            Grievance Officer: Support Team • Email: <code>support@halder.in</code> • Dehradun, Uttarakhand.
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-right">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-soft transition-all"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
