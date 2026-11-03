import React, { useState } from 'react';
import { ApiClient } from '../../api/client';
import { X, Lock, ShieldAlert, Check, Loader2, AlertCircle, Trash2, KeyRound } from 'lucide-react';

interface CustomerSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  isGoogleConnected?: boolean;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onAccountDeleted?: () => void;
}

export const CustomerSecurityModal: React.FC<CustomerSecurityModalProps> = ({
  isOpen,
  onClose,
  isGoogleConnected,
  showToast,
  onAccountDeleted,
}) => {
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);

  // Deletion state
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      setPassError('Please fill out all password fields.');
      return;
    }
    if (newPassword.length < 8) {
      setPassError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError('New passwords do not match.');
      return;
    }

    setIsChangingPass(true);
    setPassError(null);

    try {
      await ApiClient.changePassword(currentPassword, newPassword);
      showToast('Password successfully changed!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPassError(err.message || 'Failed to change password.');
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await ApiClient.deleteAccount(deleteConfirmPassword || undefined);
      showToast('Your HALDER account and personal data have been permanently deleted.', 'info');
      if (onAccountDeleted) {
        onAccountDeleted();
      } else {
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete account.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-[#1B201D] w-full max-w-md rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-white">
                Security & Account Credentials
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Manage your authentication security
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-6">
          {/* Google SSO Status */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-700 shadow-xs flex items-center justify-center text-sm font-bold">
                  G
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white">Google Authentication</h4>
                  <p className="text-[11px] text-zinc-500">
                    {isGoogleConnected ? 'Account linked with Google OAuth' : 'Standard email/phone login'}
                  </p>
                </div>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isGoogleConnected
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                    : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                {isGoogleConnected ? '✓ Connected' : 'Not Linked'}
              </span>
            </div>
          </div>

          {/* Change Password */}
          <form onSubmit={handlePasswordChange} className="space-y-3.5">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                Change Password (पासवर्ड बदलें)
              </h4>
            </div>

            {passError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl flex items-center gap-2 text-xs text-red-700 dark:text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500"
                placeholder="Enter current password"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                New Password (Min. 8 characters)
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500"
                placeholder="Enter new strong password"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500"
                placeholder="Re-enter new password"
              />
            </div>

            <div className="pt-1 flex justify-end">
              <button
                type="submit"
                disabled={isChangingPass}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {isChangingPass ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Update Password</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Account Deletion Section */}
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/80 space-y-3">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <ShieldAlert className="w-4 h-4" />
              <h4 className="text-xs font-bold uppercase tracking-wider">
                Permanent Account Deletion (खाता हटाना)
              </h4>
            </div>

            {deleteError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl flex items-center gap-2 text-xs text-red-700 dark:text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            {deleteStep === 1 ? (
              <div className="p-3.5 bg-red-50/50 dark:bg-red-950/20 rounded-2xl border border-red-200/60 dark:border-red-800/40 space-y-2.5">
                <p className="text-xs text-zinc-600 dark:text-zinc-300">
                  Deleting your account permanently erases your personal profile, saved delivery addresses, favorites, and invalidates all active sessions. This action cannot be undone.
                </p>
                <button
                  type="button"
                  onClick={() => setDeleteStep(2)}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Proceed to Delete Account</span>
                </button>
              </div>
            ) : (
              <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-2xl border border-red-300 dark:border-red-800 space-y-3">
                <p className="text-xs font-bold text-red-700 dark:text-red-300">
                  Please enter your password to confirm permanent deletion:
                </p>
                <input
                  type="password"
                  value={deleteConfirmPassword}
                  onChange={(e) => setDeleteConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-red-300 dark:border-red-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-xs focus:ring-2 focus:ring-red-500"
                  placeholder="Password confirmation"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleteStep(1)}
                    disabled={isDeleting}
                    className="px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Purging...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Confirm Permanent Delete</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
