import React from 'react';
import { ShieldAlert, AlertTriangle, Lock, PhoneCall } from 'lucide-react';

interface DeviceBanScreenProps {
  banDetail?: {
    code?: string;
    message?: string;
    reason?: string;
    deviceId?: string;
    bannedAt?: string;
  } | null;
}

export const DeviceBanScreen: React.FC<DeviceBanScreenProps> = ({ banDetail }) => {
  return (
    <div className="fixed inset-0 z-[99999] bg-[#0A0D0B] text-white flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-md bg-[#131714] border border-red-500/40 rounded-3xl p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden animate-fade-in">
        {/* Glow Effects */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-red-800/20 rounded-full blur-3xl pointer-events-none" />

        {/* Shield Icon */}
        <div className="w-20 h-20 mx-auto rounded-3xl bg-red-950/80 border-2 border-red-500 flex items-center justify-center text-red-500 shadow-lg mb-5 animate-pulse">
          <ShieldAlert className="w-10 h-10 stroke-[2.2]" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-black uppercase tracking-wider mb-3">
          <Lock className="w-3 h-3" />
          <span>Hardware Blacklist Active</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          Device Permanently Banned
        </h2>

        <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
          This physical device has been permanently suspended by HALDHAR Cyber-Security due to severe platform policy or fraud violations.
        </p>

        {/* Ban Details Card */}
        <div className="mt-5 p-4 bg-black/40 border border-red-500/20 rounded-2xl text-left space-y-2 text-xs">
          <div>
            <span className="text-zinc-500 block text-[10px] uppercase font-bold tracking-wider">Violation Reason</span>
            <span className="font-semibold text-red-300">
              {banDetail?.reason || 'Marketplace Rules / Security Policy Violation'}
            </span>
          </div>

          {banDetail?.deviceId && (
            <div>
              <span className="text-zinc-500 block text-[10px] uppercase font-bold tracking-wider">Hardware Identifier</span>
              <span className="font-mono text-[11px] text-zinc-300 break-all">
                {banDetail.deviceId}
              </span>
            </div>
          )}

          <div>
            <span className="text-zinc-500 block text-[10px] uppercase font-bold tracking-wider">Enforcement Scope</span>
            <span className="text-zinc-300">
              Permanent Hardware Level • App Reinstallation Blocked
            </span>
          </div>
        </div>

        {/* Notice */}
        <div className="mt-4 p-3 bg-red-950/30 border border-red-500/30 rounded-xl flex items-start gap-2 text-left">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-red-300 leading-tight">
            Clearing app data or creating new accounts will not bypass this ban. All network access from this device is terminated.
          </p>
        </div>

        {/* Support Contact */}
        <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-center gap-2 text-xs text-zinc-500">
          <PhoneCall className="w-3.5 h-3.5" />
          <span>Support & Appeals: <strong className="text-zinc-400">security@haldhar.org</strong></span>
        </div>
      </div>
    </div>
  );
};
