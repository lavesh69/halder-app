import React, { useState } from 'react';
import { ShieldCheck, Lock, Eye, EyeOff, Loader2, X, AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({ isOpen, onClose }) => {
  const { verifyAndSwitchToAdmin, showToast } = useApp();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMsg('Please enter the administrator password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      const success = await verifyAndSwitchToAdmin(password.trim());
      if (success) {
        onClose();
      } else {
        setErrorMsg('Invalid administrator credentials.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseSeedPassword = () => {
    setPassword('halder123');
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-[#1B201D] border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400 shadow-xs">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Superadmin Security Gate
              </h3>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                RBAC Level 3
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Enter admin password to access governance console
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
              <span>Admin Account</span>
              <span className="text-[11px] text-zinc-400">admin@halder.com</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="Enter admin password (halder123)"
                autoFocus
                className="w-full pl-10 pr-10 py-2.5 bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium transition"
              />
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-600 dark:text-red-400 font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleUseSeedPassword}
              className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline"
            >
              Fill Demo Key (halder123)
            </button>
            <span className="text-[11px] text-zinc-400">
              Zero-Trust Enforcement
            </span>
          </div>

          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !password}
              className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <span>Authenticate & Enter</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
