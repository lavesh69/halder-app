import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ApiClient } from '../../api/client';
import {
  Database,
  RefreshCw,
  Search,
  Download,
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  ShoppingBag,
  Sprout,
  Layers,
  MessageCircle,
  Heart,
  Flag,
  Bell,
  Activity,
  Settings,
  Bookmark,
} from 'lucide-react';

interface AdminBackendDataViewProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const TABLE_META: { key: string; label: string; icon: any }[] = [
  { key: 'users', label: 'Users', icon: Users },
  { key: 'products', label: 'Crop Ads', icon: ShoppingBag },
  { key: 'farmer_profiles', label: 'Farmers', icon: Sprout },
  { key: 'messages', label: 'Chat Messages', icon: MessageCircle },
  { key: 'conversations', label: 'Chats', icon: MessageCircle },
  { key: 'favorites', label: 'Favorites', icon: Heart },
  { key: 'categories', label: 'Categories', icon: Layers },
  { key: 'reports', label: 'Reports', icon: Flag },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'saved_searches', label: 'Crop Alerts', icon: Bookmark },
  { key: 'audit_logs', label: 'Audit Logs', icon: Activity },
  { key: 'platform_settings', label: 'Settings', icon: Settings },
];

export const AdminBackendDataView: React.FC<AdminBackendDataViewProps> = ({ showToast }) => {
  const [readyInfo, setReadyInfo] = useState<any>(null);
  const [snapshot, setSnapshot] = useState<{
    database: any;
    counts: Record<string, number>;
    tables: Record<string, any[]>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [selectedTable, setSelectedTable] = useState<string>('users');
  const [searchQuery, setSearchQuery] = useState('');

  // Inline Admin Login state (when viewer switched to Admin role without an Admin JWT)
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const loadBackendData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const ready = await ApiClient.getBackendReady().catch(() => null);
      if (ready) setReadyInfo(ready);

      const data = await ApiClient.getAdminDbSnapshot();
      setSnapshot(data);
      setAuthRequired(false);
    } catch (err: any) {
      const msg = err?.message || 'Failed to load backend data';
      if (
        msg.toLowerCase().includes('auth') ||
        msg.toLowerCase().includes('token') ||
        msg.toLowerCase().includes('admin') ||
        msg.toLowerCase().includes('forbidden') ||
        msg.toLowerCase().includes('login')
      ) {
        setAuthRequired(true);
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) void loadBackendData();
    });
    return () => {
      active = false;
    };
  }, [loadBackendData]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      const res = await ApiClient.login(adminEmail.trim(), adminPassword, 'admin');
      if (res?.token) {
        ApiClient.setToken(res.token);
      }
      showToast('Admin verified! Loading live Supabase database rows...', 'success');
      await loadBackendData();
    } catch (err: any) {
      showToast(err?.message || 'Admin login failed', 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const rows = useMemo(() => {
    const raw = snapshot?.tables?.[selectedTable] || [];
    if (!searchQuery.trim()) return raw;
    const q = searchQuery.toLowerCase().trim();
    return raw.filter((row) =>
      Object.values(row).some((val) => String(val ?? '').toLowerCase().includes(q))
    );
  }, [snapshot, selectedTable, searchQuery]);

  const columns = useMemo(() => {
    if (rows.length === 0) return [];
    return Object.keys(rows[0]);
  }, [rows]);

  const handleExportJSON = () => {
    if (!rows.length) return;
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `halder_${selectedTable}_live.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${rows.length} rows from ${selectedTable} (JSON)`, 'success');
  };

  const handleExportCSV = () => {
    if (!rows.length || !columns.length) return;
    const escapeCell = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [columns.join(','), ...rows.map((r) => columns.map((c) => escapeCell(r[c])).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `halder_${selectedTable}_live.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${rows.length} rows from ${selectedTable} (CSV)`, 'success');
  };

  const dbMode = snapshot?.database?.mode || readyInfo?.database || 'checking...';
  const syncedVersion =
    snapshot?.database?.supabase?.syncedVersion ?? readyInfo?.supabase?.syncedVersion ?? 0;
  const projectUrl =
    snapshot?.database?.supabase?.projectUrl || readyInfo?.supabase?.projectUrl || '';
  const isCloudLive = dbMode === 'supabase-postgres' || dbMode === 'turso-cloud';

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Live Cloud DB Status Banner */}
      <div className="p-4 sm:p-5 bg-white dark:bg-[#181F1A] rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Database className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm sm:text-base font-black text-zinc-900 dark:text-white">
              Live Backend Database Explorer (Supabase Cloud)
            </h3>
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                isCloudLive
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>{dbMode}</span>
              {syncedVersion > 0 && <span>• v{syncedVersion}</span>}
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Real-time rows stored in your backend database. Every new signup, crop ad, chat message, and report appears here instantly.
            {projectUrl && (
              <span className="ml-1.5 font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
                ({projectUrl.replace('https://', '')})
              </span>
            )}
          </p>
        </div>

        <button
          onClick={loadBackendData}
          disabled={isLoading}
          className="shrink-0 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-soft transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Syncing...' : 'Refresh Live DB'}</span>
        </button>
      </div>

      {/* Inline Admin Auth Gate if viewer isn't signed in with an Admin JWT */}
      {authRequired && (
        <div className="p-5 sm:p-6 bg-white dark:bg-[#181F1A] rounded-3xl border border-amber-200 dark:border-amber-800/60 shadow-soft max-w-md mx-auto space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-black text-sm text-zinc-900 dark:text-white">
                Admin Authentication Required
              </h4>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Verify Admin credentials to inspect live backend database records securely.
              </p>
            </div>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-3">
            <div>
              <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300 block mb-1">
                Admin Email
              </label>
              <input
                type="email"
                required
                placeholder="admin@halder.com"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300 block mb-1">
                Admin Password
              </label>
              <input
                type="password"
                required
                placeholder="Enter admin password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 transition"
            >
              {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>{isLoggingIn ? 'Verifying...' : 'Unlock Live Backend Data'}</span>
            </button>
          </form>
        </div>
      )}

      {errorMsg && !authRequired && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Live Tables Grid + Data Table */}
      {snapshot && !authRequired && (
        <>
          {/* Clickable Table Count Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {TABLE_META.map((tbl) => {
              const Icon = tbl.icon;
              const count = snapshot.counts?.[tbl.key] ?? 0;
              const isSelected = selectedTable === tbl.key;
              return (
                <button
                  key={tbl.key}
                  onClick={() => {
                    setSelectedTable(tbl.key);
                    setSearchQuery('');
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 shadow-soft scale-[1.01]'
                      : 'bg-white dark:bg-[#181F1A] border-zinc-200/80 dark:border-zinc-800 hover:border-emerald-400/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Icon
                      className={`w-4 h-4 ${
                        isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'
                      }`}
                    />
                    <span
                      className={`text-sm font-black ${
                        isSelected ? 'text-emerald-800 dark:text-emerald-300' : 'text-zinc-900 dark:text-white'
                      }`}
                    >
                      {count}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300 block mt-1.5 truncate">
                    {tbl.label}
                  </span>
                  <span className="text-[9px] font-mono text-zinc-400 block truncate">{tbl.key}</span>
                </button>
              );
            })}
          </div>

          {/* Search & Export Toolbar */}
          <div className="bg-white dark:bg-[#181F1A] rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-soft overflow-hidden">
            <div className="p-3.5 sm:p-4 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-mono bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-lg">
                  public.{selectedTable}
                </span>
                <span className="text-xs font-bold text-zinc-500">
                  Showing {rows.length} of {snapshot.counts?.[selectedTable] ?? rows.length} rows
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 sm:w-56">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Search ${selectedTable}...`}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <button
                  onClick={handleExportCSV}
                  disabled={!rows.length}
                  className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-40 text-zinc-700 dark:text-zinc-200 text-xs font-bold flex items-center gap-1 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
                <button
                  onClick={handleExportJSON}
                  disabled={!rows.length}
                  className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-40 text-zinc-700 dark:text-zinc-200 text-xs font-bold flex items-center gap-1 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>JSON</span>
                </button>
              </div>
            </div>

            {/* Live Table Rows */}
            {rows.length === 0 ? (
              <div className="p-10 text-center text-xs text-zinc-400 space-y-1">
                <Database className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-700 mb-2" />
                <p className="font-bold text-zinc-600 dark:text-zinc-300">
                  No records found in <span className="font-mono">{selectedTable}</span>
                </p>
                <p>New rows saved by users will appear here immediately when you click Refresh.</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[540px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-zinc-50 dark:bg-zinc-900/80 sticky top-0 z-10 border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="px-3 py-2.5 text-[10px] font-black uppercase text-zinc-400">#</th>
                      {columns.map((col) => (
                        <th
                          key={col}
                          className="px-3 py-2.5 text-[10px] font-black uppercase text-zinc-500 dark:text-zinc-400 whitespace-nowrap font-mono"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                    {rows.map((row, idx) => (
                      <tr
                        key={row.id || row.key || idx}
                        className="hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors"
                      >
                        <td className="px-3 py-2 text-[10px] text-zinc-400 font-mono">{idx + 1}</td>
                        {columns.map((col) => {
                          const rawVal = row[col];
                          const strVal =
                            rawVal === null || rawVal === undefined
                              ? '—'
                              : typeof rawVal === 'object'
                              ? JSON.stringify(rawVal)
                              : String(rawVal);
                          return (
                            <td
                              key={col}
                              className="px-3 py-2 text-zinc-800 dark:text-zinc-200 max-w-[240px] truncate"
                              title={strVal}
                            >
                              {col === 'role' || col === 'status' || col === 'verification_status' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                                  {strVal}
                                </span>
                              ) : (
                                strVal
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {snapshot.database?.fetchedAt && (
              <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 text-[10px] text-zinc-400 flex items-center justify-between">
                <span>Last fetched from backend: {new Date(snapshot.database.fetchedAt).toLocaleTimeString()}</span>
                <span>Sensitive fields (password hashes) are masked server-side</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
