import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ApiClient } from '../../api/client';
import { ShieldCheck, ShieldAlert, Lock, KeyRound, X, ArrowRight, AlertTriangle, Eye, EyeOff } from 'lucide-react';

export const AdminAuthModal: React.FC = () => {
  const { isAdminAuthModalOpen, setIsAdminAuthModalOpen, setRole, setCurrentUser, showToast } = useApp();

  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(() => {
    try {
      return Number(localStorage.getItem('halder_admin_pin_fails') || 0);
    } catch {
      return 0;
    }
  });
  const [lockoutUntil, setLockoutUntil] = useState<number>(() => {
    try {
      return Number(localStorage.getItem('halder_admin_lockout_until') || 0);
    } catch {
      return 0;
    }
  });

  const isLockedOut = lockoutUntil > Date.now();

  useEffect(() => {
    if (isAdminAuthModalOpen) {
      setPin('');
      setErrorMsg('');
    }
  }, [isAdminAuthModalOpen]);

  if (!isAdminAuthModalOpen) return null;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedOut) {
      setErrorMsg(`Access temporarily locked due to multiple failed attempts. Please wait ${Math.ceil((lockoutUntil - Date.now()) / 60000)} minutes.`);
      return;
    }

    if (!pin || pin.trim().length < 4) {
      setErrorMsg('Please enter a valid 6-digit Admin Security PIN.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg('');
      const res = await ApiClient.verifyAdminPin(pin.trim());

      if (res?.token) {
        ApiClient.setToken(res.token);
      }
      if (res?.user) {
        setCurrentUser(res.user);
      }

      // Reset lockout counters on successful auth
      setFailedAttempts(0);
      localStorage.removeItem('halder_admin_pin_fails');
      localStorage.removeItem('halder_admin_lockout_until');

      setIsAdminAuthModalOpen(false);
      // Now safe to grant admin role
      setRole('admin');
      showToast('🛡️ Superadmin Clearance Granted: Tier-1 Control Session Active', 'success');
    } catch (err: any) {
      const newFails = failedAttempts + 1;
      setFailedAttempts(newFails);
      localStorage.setItem('halder_admin_pin_fails', String(newFails));

      if (newFails >= 5) {
        const lockoutTime = Date.now() + 15 * 60 * 1000; // 15 mins lockout
        setLockoutUntil(lockoutTime);
        localStorage.setItem('halder_admin_lockout_until', String(lockoutTime));
        setErrorMsg('Security Lockout: 5 failed attempts recorded. Access blocked for 15 minutes.');
      } else {
        setErrorMsg(err.message || `Invalid Admin Security PIN. (${5 - newFails} attempts remaining)`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-md bg-white dark:bg-[#181F1A] rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-start justify-between bg-gradient-to-r from-purple-50/80 via-zinc-50 to-transparent dark:from-purple-950/40 dark:via-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-lg ring-4 ring-purple-100 dark:ring-purple-950/60 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300">
                  Tier-1 Authorization
                </span>
                <span className="text-[10px] font-mono text-zinc-400">HS256 PIN Guard</span>
              </div>
              <h3 className="text-base font-heading font-black text-zinc-900 dark:text-white mt-0.5">
                Admin Security Clearance
              </h3>
            </div>
          </div>

          <button
            onClick={() => setIsAdminAuthModalOpen(false)}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-xl transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleVerify} className="p-6 space-y-4">
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            You are attempting to access the HALDER Superadmin Control Console. Enter your 6-digit Master PIN to unlock governance controls.
          </p>

          {/* Lockout Warning */}
          {isLockedOut && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-2xl text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
              <span>Security lockout in effect. Brute-force protection active.</span>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && !isLockedOut && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* PIN Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
              <span>Admin Master PIN (6-Digit)</span>
              <span className="text-[10px] font-mono text-zinc-400">Default: 984501</span>
            </label>

            <div className="relative">
              <KeyRound className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPin ? 'text' : 'password'}
                autoFocus
                maxLength={8}
                disabled={isLockedOut || isLoading}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="••••••"
                className="w-full pl-10 pr-10 py-3 text-center text-lg tracking-widest font-mono font-black bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-600 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Quick Demo Helper Pill */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-zinc-400">Demo Authorized Admin Key:</span>
            <button
              type="button"
              onClick={() => setPin('984501')}
              className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400 hover:underline"
            >
              Autofill 984501
            </button>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsAdminAuthModalOpen(false)}
              className="min-h-[48px] flex-1 px-4 py-2.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-xs font-heading font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isLockedOut || isLoading || pin.length < 4}
              className="min-h-[48px] flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 active:scale-95 text-white text-xs font-heading font-black rounded-2xl shadow-md transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isLoading ? (
                <span>Verifying...</span>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Authenticate</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
