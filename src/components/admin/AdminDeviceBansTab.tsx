import React from 'react';
import { Lock, RefreshCw, Search, ShieldAlert, ShieldCheck } from 'lucide-react';

interface BanTarget {
  id?: string;
  name?: string;
  deviceId?: string;
  role?: string;
}

interface AdminDeviceBansTabProps {
  bannedDevicesList: any[];
  manualDeviceIdInput: string;
  setManualDeviceIdInput: (val: string) => void;
  banReasonInput: string;
  setBanReasonInput: (val: string) => void;
  banTarget: BanTarget | null;
  isBanningInProgress: boolean;
  deviceBanSearch: string;
  setDeviceBanSearch: (val: string) => void;
  onRefresh: () => void;
  onConfirmDeviceBan: () => void;
  onUnbanDevice: (banId: string) => void;
}

export const AdminDeviceBansTab: React.FC<AdminDeviceBansTabProps> = ({
  bannedDevicesList,
  manualDeviceIdInput,
  setManualDeviceIdInput,
  banReasonInput,
  setBanReasonInput,
  banTarget,
  isBanningInProgress,
  deviceBanSearch,
  setDeviceBanSearch,
  onRefresh,
  onConfirmDeviceBan,
  onUnbanDevice,
}) => {
  const filteredBans = bannedDevicesList.filter((b) => {
    const q = deviceBanSearch.toLowerCase();
    return (
      (b.device_id || '').toLowerCase().includes(q) ||
      (b.user_name || '').toLowerCase().includes(q) ||
      (b.user_phone || '').toLowerCase().includes(q) ||
      (b.reason || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-5 bg-white dark:bg-[#181F1A] rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-soft space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-black text-base text-zinc-900 dark:text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-red-600" />
            <span>Permanent Hardware Device Bans & Blacklist</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Block fraudulent phones and browsers at the hardware level. Survives app re-installation, cache wipes, and account recreation.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 font-bold rounded-xl transition text-xs shadow-2xs self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Blacklist</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 bg-red-50/70 dark:bg-red-950/30 border border-red-200/80 dark:border-red-800/60 rounded-2xl">
          <span className="text-[10px] uppercase font-bold text-red-700 dark:text-red-400 block tracking-wider">
            Total Banned Devices
          </span>
          <span className="text-2xl font-black text-red-900 dark:text-red-200 mt-1 block">
            {bannedDevicesList.length}
          </span>
          <span className="text-[11px] text-red-600 dark:text-red-400 mt-0.5 block">
            Physical hardware banned permanently
          </span>
        </div>

        <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl">
          <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block tracking-wider">
            Reinstall Shield
          </span>
          <span className="text-2xl font-black text-emerald-900 dark:text-emerald-200 mt-1 block">
            Active 🛡️
          </span>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 block">
            SSAID & Multi-Store Fingerprinting
          </span>
        </div>

        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl">
          <span className="text-[10px] uppercase font-bold text-zinc-500 block tracking-wider">
            Enforcement Gate
          </span>
          <span className="text-2xl font-black text-zinc-900 dark:text-white mt-1 block">
            Global Gateway
          </span>
          <span className="text-[11px] text-zinc-500 mt-0.5 block">
            Blocks API & Socket requests at Edge
          </span>
        </div>
      </div>

      <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200/70 dark:border-zinc-700/70 space-y-3">
        <h3 className="font-black text-xs uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-600" />
          <span>Quick Hardware Ban Tool</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <input
            type="text"
            placeholder="Hardware Device ID or User ID (e.g. user-xxx or hal-dev-xxx)..."
            value={manualDeviceIdInput}
            onChange={(e) => setManualDeviceIdInput(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500"
          />

          <input
            type="text"
            placeholder="Reason for ban (e.g. Payment fraud, fake produce)..."
            value={banReasonInput}
            onChange={(e) => setBanReasonInput(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500"
          />

          <button
            type="button"
            disabled={isBanningInProgress || (!manualDeviceIdInput.trim() && !banTarget?.id)}
            onClick={onConfirmDeviceBan}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition shadow-xs flex items-center justify-center gap-1.5"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{isBanningInProgress ? 'Enforcing...' : 'Ban Hardware Device Now'}</span>
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
            Active Banned Hardware List ({bannedDevicesList.length})
          </h3>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search banned ID, user, phone..."
              value={deviceBanSearch}
              onChange={(e) => setDeviceBanSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white placeholder-zinc-400"
            />
          </div>
        </div>

        {bannedDevicesList.length === 0 ? (
          <div className="p-8 text-center text-zinc-400 bg-zinc-50/50 dark:bg-zinc-800/20 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-700">
            <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <span className="font-bold text-xs block text-zinc-700 dark:text-zinc-300">No Banned Devices</span>
            <span className="text-[11px] text-zinc-500">Your marketplace is clean. Any banned hardware devices will appear here.</span>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900/40">
            {filteredBans.map((ban) => (
              <div key={ban.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-red-600 dark:text-red-400 truncate max-w-xs sm:max-w-md">
                      {ban.device_id}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 uppercase">
                      Banned
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                    {ban.user_name && (
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                        User: {ban.user_name}
                      </span>
                    )}
                    {ban.user_phone && <span>• {ban.user_phone}</span>}
                    {ban.device_model && <span>• Model: {ban.device_model}</span>}
                    <span>• Date: {new Date(ban.banned_at).toLocaleDateString()}</span>
                  </div>

                  <p className="text-[11px] text-red-700 dark:text-red-400 font-medium">
                    Reason: {ban.reason}
                  </p>
                </div>

                <button
                  onClick={() => onUnbanDevice(ban.id)}
                  className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-emerald-50 hover:text-emerald-700 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 transition self-end md:self-center shrink-0"
                >
                  Unban Hardware
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
