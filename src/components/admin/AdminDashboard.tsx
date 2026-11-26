import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';
import { StatusBadge } from '../common/StatusBadge';
import { ApiClient } from '../../api/client';
import { PushNotificationClient } from '../../services/pushNotificationClient';
import { AdminBackendDataView } from './AdminBackendDataView';
import { Role, OrderStatus, Product, Farmer, User, Order } from '../../types';
import confetti from 'canvas-confetti';
import {
  Database as DatabaseIcon,
  Users,
  ShieldCheck,
  ShoppingBag,
  Package,
  Layers,
  BarChart3,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  Copy,
  Bell,
  FileText,
  ExternalLink,
  AlertCircle,
  Phone,
  MessageCircle,
  Mail,
  MapPin,
  Eye,
  Zap,
  Flame,
  ShieldAlert,
  Sliders,
  Activity,
  ArrowUpRight,
  Lock,
  Unlock,
  Radio,
  ChevronRight,
  Check,
  X,
  Edit2,
  Star,
  Navigation,
  Send,
  Download,
  UserPlus,
  Cpu,
  Server,
  Wifi,
  Settings,
  Percent,
  HelpCircle,
  KeyRound,
  LogOut,
} from 'lucide-react';

const getExportTimestamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

export const AdminDashboard: React.FC = () => {
  const {
    adminTab,
    setAdminTab,
    users,
    toggleUserStatus,
    changeUserRole,
    deleteUser,
    addUser,
    farmers,
    approveFarmerVerification,
    rejectFarmerVerification,
    products,
    deleteProduct,
    toggleProductAvailability,
    toggleProductFeatured,
    toggleProductUrgent,
    updateProductPrice,
    setSelectedProduct,
    setSelectedFarmer,
    categories,
    addCategory,
    deleteCategory,
    toggleCategoryActive,
    showToast,
    clearAllDummyAccounts,
    platformSettings,
    updatePlatformSettings,
    currentUser,
    logout,
  } = useApp();

  // Navigation tab is directly bound to adminTab from AppContext
  const activeTab = adminTab || 'overview';
  const setActiveTab = setAdminTab;

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Real-time server states
  const [pendingKyc, setPendingKyc] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [serverReports, setServerReports] = useState<any[]>([]);
  const [killSwitchStates, setKillSwitchStates] = useState<Record<string, boolean>>({
    ai_advisory: true,
    chat: true,
    uploads: true,
    registrations: true,
    instant_payouts: true,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Platform Governance & Settings State
  const [platformCommissionRate, setPlatformCommissionRate] = useState<number>(platformSettings?.platformCommissionRate ?? 0);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState<number>(platformSettings?.freeDeliveryThreshold ?? 200);
  const [standardDeliveryFee, setStandardDeliveryFee] = useState<number>(platformSettings?.standardDeliveryFee ?? 25);
  const [helplinePhone, setHelplinePhone] = useState<string>(platformSettings?.helplinePhone ?? '');
  const [supportEmail, setSupportEmail] = useState<string>(platformSettings?.supportEmail ?? '');
  const [emergencyAlert, setEmergencyAlert] = useState<string>(platformSettings?.emergencyAlert ?? '');

  // Keep local settings in sync if platformSettings change in context
  useEffect(() => {
    if (platformSettings) {
      setPlatformCommissionRate(platformSettings.platformCommissionRate ?? 0);
      setFreeDeliveryThreshold(platformSettings.freeDeliveryThreshold ?? 200);
      setStandardDeliveryFee(platformSettings.standardDeliveryFee ?? 25);
      setHelplinePhone(platformSettings.helplinePhone ?? '');
      setSupportEmail(platformSettings.supportEmail ?? '');
      setEmergencyAlert(platformSettings.emergencyAlert ?? '');
    }
  }, [platformSettings]);

  // Logistics & Fleet States (Module 5)
  const [deliveryPartners, setDeliveryPartners] = useState<any[]>([]);
  const [deliveryTasks, setDeliveryTasks] = useState<any[]>([]);

  // Financial Ledger States (Module 6)
  const [financialDashboard, setFinancialDashboard] = useState<any>(null);
  const [financialTransactions, setFinancialTransactions] = useState<any[]>([]);

  // Overview Metrics Time Range
  const [metricsTimeRange, setMetricsTimeRange] = useState<'today' | 'week' | 'all'>('all');

  // Search & Filtering States
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | Role>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const [farmerFilter, setFarmerFilter] = useState<'all' | 'verified' | 'pending' | 'rejected'>('all');
  const [farmerSearch, setFarmerSearch] = useState('');

  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('All');
  const [productModerationFilter, setProductModerationFilter] = useState<'all' | 'active' | 'paused' | 'featured' | 'urgent'>('all');
  const [productStockFilter, setProductStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState<string>('all');

  // Modals & Drawers States
  const [inspectingKycDoc, setInspectingKycDoc] = useState<any | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedFarmerForReject, setSelectedFarmerForReject] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [inspectingUser, setInspectingUser] = useState<User | null>(null);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserRole, setNewUserRole] = useState<Role>('customer');

  const [isPushBroadcastOpen, setIsPushBroadcastOpen] = useState(false);
  const [pushAudience, setPushAudience] = useState<'all' | 'farmer' | 'customer'>('all');
  const [pushTitle, setPushTitle] = useState('');
  const [pushMessage, setPushMessage] = useState('');
  const [isSendingPush, setIsSendingPush] = useState(false);

  const [editingProductPrice, setEditingProductPrice] = useState<{ id: string; name: string; price: number } | null>(null);
  const [newPriceValue, setNewPriceValue] = useState('');

  const [isKillSwitchModalOpen, setIsKillSwitchModalOpen] = useState(false);

  // Permanent Hardware Device Ban State
  const [bannedDevicesList, setBannedDevicesList] = useState<any[]>([]);
  const [isBanModalOpen, setIsBanModalOpen] = useState(false);
  const [banTarget, setBanTarget] = useState<{ id?: string; name?: string; deviceId?: string; role?: string } | null>(null);
  const [banReasonInput, setBanReasonInput] = useState('Severe terms of service violation / Fraudulent activity');
  const [banNotesInput, setBanNotesInput] = useState('');
  const [isBanningInProgress, setIsBanningInProgress] = useState(false);
  const [manualDeviceIdInput, setManualDeviceIdInput] = useState('');
  const [deviceBanSearch, setDeviceBanSearch] = useState('');

  const loadBannedDevices = async () => {
    try {
      const res = await ApiClient.getBannedDevices();
      if (Array.isArray(res)) setBannedDevicesList(res);
      else if (res?.data && Array.isArray(res.data)) setBannedDevicesList(res.data);
    } catch {}
  };

  useEffect(() => {
    loadBannedDevices();
  }, []);

  const handleConfirmDeviceBan = async () => {
    if (!banTarget?.id && !manualDeviceIdInput.trim()) {
      showToast('Please provide a User ID or Device ID to ban.', 'error');
      return;
    }
    setIsBanningInProgress(true);
    try {
      await ApiClient.banDevice({
        userId: banTarget?.id,
        deviceId: manualDeviceIdInput.trim() || undefined,
        reason: banReasonInput,
        notes: banNotesInput,
      });
      showToast(`Hardware Device permanently blacklisted for ${banTarget?.name || 'Device'}.`, 'success');
      setIsBanModalOpen(false);
      setBanTarget(null);
      setManualDeviceIdInput('');
      setBanNotesInput('');
      loadBannedDevices();
    } catch (e: any) {
      showToast(`Ban failed: ${e.message}`, 'error');
    } finally {
      setIsBanningInProgress(false);
    }
  };

  const handleUnbanDevice = async (banId: string) => {
    try {
      await ApiClient.unbanDevice(banId);
      showToast('Hardware device unbanned successfully.', 'success');
      loadBannedDevices();
    } catch (e: any) {
      showToast(`Unban failed: ${e.message}`, 'error');
    }
  };

  // New Category Form
  const [newCatName, setNewCatName] = useState('');
  const [newCatEmoji, setNewCatEmoji] = useState('🌾');
  const [newCatImage, setNewCatImage] = useState('https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=80');

  // Load server-side live data
  const loadServerData = async () => {
    setIsRefreshing(true);
    try {
      // 1. Pending KYC queue
      const kycRes = await ApiClient.adminGetPendingKYC().catch(() => null);
      if (kycRes?.data) setPendingKyc(kycRes.data);

      // 2. Kill Switch states
      const killRes = await ApiClient.getKillSwitch().catch(() => null);
      if (killRes?.data) setKillSwitchStates(killRes.data);

      // 3. Audit Logs
      const auditRes = await ApiClient.getAuditLogs().catch(() => null);
      if (auditRes?.data) setAuditLogs(auditRes.data);

      // 4. Logistics Fleet & Tasks (Module 5)
      const [partnersRes, tasksRes] = await Promise.all([
        ApiClient.getDeliveryPartners().catch(() => []),
        ApiClient.getDeliveryTasks().catch(() => []),
      ]);
      setDeliveryPartners(partnersRes || []);
      setDeliveryTasks(tasksRes || []);

      // 5. Financial Dashboard & Transactions (Module 6)
      const [finRes, txRes, repRes] = await Promise.all([
        ApiClient.getFinancialDashboard().catch(() => null),
        ApiClient.getFinancialTransactions({ limit: 50 }).catch(() => []),
        ApiClient.getAdminReports().catch(() => null),
      ]);
      if (finRes) setFinancialDashboard(finRes);
      setFinancialTransactions(txRes || []);
      if (Array.isArray(repRes)) setServerReports(repRes);
    } catch (e: any) {
      console.warn('[AdminDashboard] Server data refresh warning:', e.message);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadServerData();
  }, [activeTab]);

  // Handle Kill Switch Toggle
  const handleToggleKillSwitch = async (feature: string, currentState: boolean) => {
    const newState = !currentState;
    setKillSwitchStates((prev) => ({ ...prev, [feature]: newState }));
    try {
      await ApiClient.toggleKillSwitch(feature, newState);
      showToast(`Emergency Control: ${feature.replace(/_/g, ' ').toUpperCase()} is now ${newState ? 'ENABLED 🟢' : 'KILLED / DISABLED 🔴'}`, newState ? 'success' : 'error');
      loadServerData();
    } catch (err: any) {
      setKillSwitchStates((prev) => ({ ...prev, [feature]: currentState }));
      showToast(err.message || 'Failed to toggle kill switch', 'error');
    }
  };

  // Handle Approve KYC
  const handleApproveKyc = async (farmerId: string) => {
    try {
      await ApiClient.adminReviewKYC(farmerId, 'verified');
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      showToast('✅ Farmer KYC Verified! Official Green Badge granted & notified.', 'success');
      approveFarmerVerification(farmerId);
      loadServerData();
      if (inspectingKycDoc?.id === farmerId) {
        setInspectingKycDoc(null);
      }
    } catch (err: any) {
      showToast(err.message || 'Approval failed', 'error');
    }
  };

  // Handle Reject KYC
  const handleRejectKyc = async () => {
    if (!selectedFarmerForReject || !rejectReason.trim()) {
      showToast('Please provide a specific rejection reason.', 'error');
      return;
    }

    try {
      await ApiClient.adminReviewKYC(selectedFarmerForReject, 'rejected', rejectReason.trim());
      showToast('KYC rejected. Feedback & instructions dispatched to farmer.', 'info');
      rejectFarmerVerification(selectedFarmerForReject);
      setIsRejectModalOpen(false);
      setSelectedFarmerForReject(null);
      setRejectReason('');
      if (inspectingKycDoc?.id === selectedFarmerForReject) {
        setInspectingKycDoc(null);
      }
      loadServerData();
    } catch (err: any) {
      showToast(err.message || 'Rejection failed', 'error');
    }
  };

  // Handle Broadcast Push Alert
  const handleSendPushBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pushTitle.trim() || !pushMessage.trim()) {
      showToast('Title and message are required for broadcast alert', 'error');
      return;
    }

    setIsSendingPush(true);
    try {
      await PushNotificationClient.requestPermissionAndRegister();
      await ApiClient.sendTestPush(pushTitle.trim(), `[${pushAudience.toUpperCase()}] ${pushMessage.trim()}`);
      showToast(`📢 Push broadcast dispatched to ${pushAudience.toUpperCase()} audience!`, 'success');
      setIsPushBroadcastOpen(false);
      setPushTitle('');
      setPushMessage('');
    } catch (err: any) {
      showToast(err.message || 'Push broadcast failed', 'error');
    } finally {
      setIsSendingPush(false);
    }
  };

  // Handle Quick Price Update
  const handleSavePriceEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProductPrice) return;
    const priceNum = parseFloat(newPriceValue);
    if (isNaN(priceNum) || priceNum <= 0) {
      showToast('Please enter a valid price greater than 0', 'error');
      return;
    }
    updateProductPrice(editingProductPrice.id, priceNum);
    showToast(`Price for "${editingProductPrice.name}" updated to ₹${priceNum}`, 'success');
    setEditingProductPrice(null);
    setNewPriceValue('');
  };

  // Handle Add User Form Submission
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserPhone.trim() || !newUserEmail.trim()) {
      showToast('Name, phone, and email are required to register user.', 'error');
      return;
    }

    addUser({
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      phone: newUserPhone.trim(),
      role: newUserRole,
      status: 'active',
      profile_image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
    });

    setIsAddUserModalOpen(false);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPhone('');
    setNewUserRole('customer');
  };

  // Add Category Handler
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    addCategory({
      name: newCatName.trim(),
      emoji: newCatEmoji || '🌾',
      image: newCatImage || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=80',
      active: true,
    });
    setNewCatName('');
    showToast(`Category "${newCatName.trim()}" added to Mandi taxonomy!`, 'success');
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;
      if (userStatusFilter !== 'all' && u.status !== userStatusFilter) return false;
      if (!userSearch.trim()) return true;
      const q = userSearch.toLowerCase().trim();
      return (
        (u.halder_id && u.halder_id.toLowerCase().includes(q)) ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q)
      );
    });
  }, [users, userSearch, userRoleFilter, userStatusFilter]);

  // Export Users to CSV
  const exportUsersToCSV = () => {
    const headers = ['ID', 'HALDER_ID', 'Name', 'Phone', 'Email', 'Role', 'Status', 'Created_At'];
    const rows = filteredUsers.map((u) => [
      u.id,
      u.halder_id || '',
      `"${u.name.replace(/"/g, '""')}"`,
      u.phone,
      u.email,
      u.role,
      u.status,
      u.created_at,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `halder_users_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${filteredUsers.length} user records to CSV!`, 'success');
  };

  // Export Products / Listings to CSV
  const exportProductsToCSV = () => {
    const headers = ['ID', 'Title', 'Farmer', 'Category', 'Price', 'Unit', 'Stock', 'Location', 'Featured', 'Urgent', 'Organic', 'Available'];
    const rows = filteredProducts.map((p) => [
      `"${p.id}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.farmerName.replace(/"/g, '""')}"`,
      `"${p.category}"`,
      p.price,
      `"${p.unit}"`,
      p.availableQuantity,
      `"${(p.location || '').replace(/"/g, '""')}"`,
      p.isFeatured ? 'Yes' : 'No',
      p.isUrgent ? 'Yes' : 'No',
      p.isOrganic ? 'Yes' : 'No',
      p.isAvailable ? 'Yes' : 'No',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `halder_listings_${getExportTimestamp()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${filteredProducts.length} listing records to CSV!`, 'success');
  };

  // Export Audit Logs to CSV
  const exportAuditLogsToCSV = () => {
    const headers = ['ID', 'Action', 'Target_Table', 'Target_ID', 'Actor_ID', 'Details', 'Created_At'];
    const rows = filteredAuditLogs.map((l) => [
      `"${l.id}"`,
      `"${l.action}"`,
      `"${l.target_table}"`,
      `"${l.target_id || ''}"`,
      `"${l.actor_id || ''}"`,
      `"${(typeof l.details === 'string' ? l.details : JSON.stringify(l.details || {})).replace(/"/g, '""')}"`,
      `"${l.created_at || ''}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `halder_audit_logs_${getExportTimestamp()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${filteredAuditLogs.length} audit logs to CSV!`, 'success');
  };


  // Filtered Farmers
  const filteredFarmers = useMemo(() => {
    return farmers.filter((f) => {
      if (farmerFilter !== 'all' && f.verification_status !== farmerFilter) return false;
      if (!farmerSearch.trim()) return true;
      const q = farmerSearch.toLowerCase().trim();
      return (
        f.name.toLowerCase().includes(q) ||
        f.farm_name.toLowerCase().includes(q) ||
        f.location.toLowerCase().includes(q) ||
        (f.phone && f.phone.includes(q))
      );
    });
  }, [farmers, farmerSearch, farmerFilter]);

  // Filtered Products (Listings Moderation)
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (productCategoryFilter !== 'All' && p.category !== productCategoryFilter) return false;
      if (productModerationFilter === 'active' && !p.isAvailable) return false;
      if (productModerationFilter === 'paused' && p.isAvailable) return false;
      if (productModerationFilter === 'featured' && !p.isFeatured) return false;
      if (productModerationFilter === 'urgent' && !p.isUrgent) return false;
      if (productStockFilter === 'out_of_stock' && p.availableQuantity > 0) return false;
      if (productStockFilter === 'low_stock' && (p.availableQuantity <= 0 || p.availableQuantity > 10)) return false;
      if (productStockFilter === 'in_stock' && p.availableQuantity <= 10) return false;
      if (!productSearch.trim()) return true;
      const q = productSearch.toLowerCase().trim();
      return (
        p.name.toLowerCase().includes(q) ||
        p.farmerName.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q)
      );
    });
  }, [products, productSearch, productCategoryFilter, productModerationFilter, productStockFilter]);

  // Filtered Audit Logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      if (auditActionFilter !== 'all' && !log.action?.toLowerCase().includes(auditActionFilter.toLowerCase())) return false;
      if (!auditSearch.trim()) return true;
      const q = auditSearch.toLowerCase().trim();
      return (
        log.action?.toLowerCase().includes(q) ||
        log.target_table?.toLowerCase().includes(q) ||
        log.target_id?.toLowerCase().includes(q) ||
        log.actor_id?.toLowerCase().includes(q)
      );
    });
  }, [auditLogs, auditSearch, auditActionFilter]);

  // Key Totals
  const totalUsersCount = users.length;
  const verifiedFarmersCount = farmers.filter((f) => f.verification_status === 'verified').length;
  const pendingFarmersCount = farmers.filter((f) => f.verification_status === 'pending').length || pendingKyc.length;
  const activeListingsCount = products.filter((p) => p.isAvailable).length;

  // Category volume summary
  const categoryStats = useMemo(() => {
    return categories.map((c) => {
      const prods = products.filter((p) => p.category === c.name);
      return {
        name: c.name,
        emoji: c.emoji,
        count: prods.length,
        available: prods.filter((p) => p.isAvailable).length,
      };
    });
  }, [categories, products]);

  return (
    <div className="space-y-6 pb-28 animate-fade-in text-xs">
      {/* TOP HEADER: BRAND IDENTITY & GLOBAL CONTROLS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-[#181F1A] p-4 sm:p-5 rounded-3xl border border-zinc-200/90 dark:border-zinc-800 shadow-soft">
        <div className="flex items-center gap-3.5">
          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl overflow-hidden shrink-0 shadow-md ring-2 ring-amber-500/30 bg-emerald-950/20">
            <img src="/halder-logo.png" alt="HALDHAR" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                HALDHAR Superadmin Console
              </h1>
              <span className="text-[11px] font-bold bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 px-2.5 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                ⚡ Tier-1 Control
              </span>
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                API Live: Port 5000
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Agricultural classifieds moderation, farmer identity governance, order telemetry, and system circuit-breakers
            </p>
          </div>
        </div>

        {/* Global Toolbar Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Emergency Kill Switch Modal Trigger */}
          <button
            onClick={() => setIsKillSwitchModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 font-bold hover:bg-red-100 dark:hover:bg-red-900/60 transition-all shadow-2xs"
            title="Configure system emergency kill-switches"
          >
            <ShieldAlert className="w-4 h-4 text-red-600 animate-pulse" />
            <span>Emergency Kill Switch</span>
          </button>

          {/* Broadcast Push Alert */}
          <button
            onClick={() => setIsPushBroadcastOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 font-bold hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors shadow-2xs"
            title="Dispatch push broadcast to users and farmers"
          >
            <Bell className="w-4 h-4" />
            <span>Broadcast Alert</span>
          </button>

          {/* Re-sync Server Seeds */}
          <button
            onClick={loadServerData}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold transition-colors shadow-2xs"
            title="Refresh all queues and audit logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Data'}</span>
          </button>

          {/* Admin Logout Button */}
          <button
            onClick={() => setShowLogoutModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-all shadow-2xs text-xs"
            title="Sign out of Administrator Session"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* HORIZONTAL TAB SEGMENTED NAVIGATION BAR */}
      <div className="flex gap-1.5 p-1.5 bg-zinc-100/90 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80 overflow-x-auto no-scrollbar shadow-xs">
        {[
          { id: 'overview', label: 'Overview & KPIs', icon: BarChart3 },
          { id: 'database', label: 'Live Backend DB', icon: DatabaseIcon },
          { id: 'users', label: 'Users & Roles', icon: Users, badge: totalUsersCount },
          { id: 'verification', label: 'Farmer KYC Review', icon: ShieldCheck, badge: pendingFarmersCount || undefined, alert: pendingFarmersCount > 0 },
          { id: 'products', label: 'Listings Moderation', icon: ShoppingBag, badge: products.length },
          { id: 'reports', label: 'Reports & Complaints', icon: ShieldAlert, badge: serverReports.filter((r) => r.status === 'open' || r.status === 'pending').length || undefined, alert: serverReports.some((r) => r.status === 'open' || r.status === 'pending') },
          { id: 'categories', label: 'Categories Taxonomy', icon: Layers, badge: categories.length },
          { id: 'audit', label: 'System Audit Logs', icon: Activity, badge: auditLogs.length || undefined },
          { id: 'settings', label: 'Platform Settings', icon: Settings },
          { id: 'device-bans', label: 'Hardware Device Bans', icon: Lock, badge: bannedDevicesList.length || undefined, alert: bannedDevicesList.length > 0 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all duration-150 ${
                isSelected
                  ? 'bg-white dark:bg-[#181F1A] text-emerald-800 dark:text-emerald-400 shadow-soft scale-[1.01]'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-white/40'
              }`}
            >
              <Icon className={`w-4 h-4 ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'}`} />
              <span className="text-xs">{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                    tab.alert
                      ? 'bg-amber-500 text-white animate-pulse'
                      : isSelected
                      ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                      : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 0: LIVE BACKEND DATABASE EXPLORER (SUPABASE CLOUD) */}
      {/* ========================================================================= */}
      {activeTab === 'database' && (
        <AdminBackendDataView showToast={showToast} />
      )}

      {/* ========================================================================= */}
      {/* SECTION 1: OVERVIEW & SYSTEM INTELLIGENCE */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          {/* Time Range Selector & Live Mandi Telemetry Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white dark:bg-[#181F1A] rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-soft">
            <div className="flex flex-wrap items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="font-black text-xs text-zinc-900 dark:text-white">
                Marketplace Telemetry
              </span>
              <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                0% Direct Farmer Take-Rate Active
              </span>
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <span className="text-[11px] font-bold text-zinc-400 mr-1">Period:</span>
              {(['today', 'week', 'all'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setMetricsTimeRange(period)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                    metricsTimeRange === period
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
                  }`}
                >
                  {period === 'today' ? 'Today' : period === 'week' ? 'Last 7 Days' : 'All Time'}
                </button>
              ))}
            </div>
          </div>

          {/* Top 6 KPI Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3.5">
            {/* 1. Total Registered Users */}
            <div
              onClick={() => setActiveTab('users')}
              className="p-4 bg-white dark:bg-[#181F1A] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-soft hover:border-emerald-500/50 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-400 uppercase font-black tracking-wider">Total Users</span>
                <Users className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-2xl font-heading font-black text-zinc-900 dark:text-white mt-1.5 block tracking-tight">
                {totalUsersCount}
              </span>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-0.5 mt-0.5">
                <span>{farmers.length} Farmers • {users.filter((u) => u.role === 'customer').length} Buyers</span>
              </span>
            </div>

            {/* 2. Verified Farmers */}
            <div
              onClick={() => setActiveTab('verification')}
              className="p-4 bg-white dark:bg-[#181F1A] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-soft hover:border-emerald-500/50 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-400 uppercase font-black tracking-wider">Verified Farmers</span>
                <ShieldCheck className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-2xl font-heading font-black text-emerald-700 dark:text-emerald-400 mt-1.5 block tracking-tight">
                {verifiedFarmersCount}
              </span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-semibold mt-0.5 block">
                Green Badged Sellers
              </span>
            </div>

            {/* 3. Active Mandi Classifieds */}
            <div
              onClick={() => setActiveTab('products')}
              className="p-4 bg-white dark:bg-[#181F1A] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-soft hover:border-emerald-500/50 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-400 uppercase font-black tracking-wider">Active Listings</span>
                <ShoppingBag className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-2xl font-heading font-black text-zinc-900 dark:text-white mt-1.5 block tracking-tight">
                {activeListingsCount}
              </span>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold mt-0.5 block">
                {products.filter((p) => p.isFeatured).length} Boosted / Featured
              </span>
            </div>

            {/* 4. Buyer Inquiries */}
            <div
              onClick={() => setActiveTab('users')}
              className="p-4 bg-white dark:bg-[#181F1A] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-soft hover:border-emerald-500/50 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-400 uppercase font-black tracking-wider">Buyer Inquiries</span>
                <MessageCircle className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-2xl font-heading font-black text-zinc-900 dark:text-white mt-1.5 block tracking-tight">
                {users.length} Leads
              </span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-semibold mt-0.5 block">
                Direct Calls & Chats
              </span>
            </div>

            {/* 5. Crop Categories */}
            <div
              onClick={() => setActiveTab('categories')}
              className="p-4 bg-white dark:bg-[#181F1A] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-soft hover:border-emerald-500/50 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-400 uppercase font-black tracking-wider">Categories</span>
                <Layers className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-2xl font-heading font-black text-emerald-700 dark:text-emerald-400 mt-1.5 block tracking-tight">
                {categories.length} Taxonomies
              </span>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold mt-0.5 block">
                Grains, Fruits, Veggies
              </span>
            </div>

            {/* 6. Pending KYC Review */}
            <div
              onClick={() => setActiveTab('verification')}
              className={`p-4 bg-white dark:bg-[#181F1A] rounded-2xl border transition-all cursor-pointer group ${
                pendingFarmersCount > 0
                  ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/20'
                  : 'border-zinc-200 dark:border-zinc-800 shadow-soft'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-400 uppercase font-black tracking-wider">Pending KYC</span>
                <FileText className={`w-4 h-4 ${pendingFarmersCount > 0 ? 'text-amber-500 animate-bounce' : 'text-zinc-400'}`} />
              </div>
              <span className={`text-2xl font-black mt-1.5 block tracking-tight ${pendingFarmersCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-900 dark:text-white'}`}>
                {pendingFarmersCount}
              </span>
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold mt-0.5 block">
                {pendingFarmersCount > 0 ? 'Review Queue Now →' : 'Queue Clear ✅'}
              </span>
            </div>
          </div>

          {/* System Health & Infrastructure Telemetry Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-white dark:bg-[#181F1A] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-soft flex items-center gap-3">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 rounded-xl">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 uppercase font-bold block">API Latency</span>
                <span className="text-sm font-black text-zinc-900 dark:text-white">~2.4 ms</span>
              </div>
            </div>

            <div className="p-3.5 bg-white dark:bg-[#181F1A] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-soft flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-950 text-blue-600 rounded-xl">
                <Server className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 uppercase font-bold block">SQLite Storage</span>
                <span className="text-sm font-black text-zinc-900 dark:text-white">WAL Mode Active</span>
              </div>
            </div>

            <div className="p-3.5 bg-white dark:bg-[#181F1A] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-soft flex items-center gap-3">
              <div className="p-2 bg-purple-50 dark:bg-purple-950 text-purple-600 rounded-xl">
                <Wifi className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 uppercase font-bold block">WebSocket Server</span>
                <span className="text-sm font-black text-zinc-900 dark:text-white">Live (/ws)</span>
              </div>
            </div>

            <div className="p-3.5 bg-white dark:bg-[#181F1A] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-soft flex items-center gap-3">
              <div className="p-2 bg-amber-50 dark:bg-amber-950 text-amber-600 rounded-xl">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 uppercase font-bold block">FCM Mobile Push</span>
                <span className="text-sm font-black text-zinc-900 dark:text-white">Broadcast Ready</span>
              </div>
            </div>
          </div>

          {/* Quick Access Grid: Emergency Kill-Switch Status & Financials */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Kill Switch Quick Status */}
            <div className="p-5 bg-white dark:bg-[#181F1A] rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-soft space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-600" />
                  <h3 className="font-black text-sm text-zinc-900 dark:text-white">Emergency Safety Gates</h3>
                </div>
                <button
                  onClick={() => setIsKillSwitchModalOpen(true)}
                  className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline"
                >
                  Configure Matrix
                </button>
              </div>

              <div className="space-y-2">
                {Object.entries(killSwitchStates).map(([feat, isEnabled]) => (
                  <div
                    key={feat}
                    className="flex items-center justify-between p-2.5 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isEnabled ? 'bg-emerald-500' : 'bg-red-500 animate-ping'}`} />
                      <span className="font-bold text-zinc-800 dark:text-zinc-200 capitalize">
                        {feat.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <button
                      onClick={() => handleToggleKillSwitch(feat, isEnabled)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-colors ${
                        isEnabled
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-red-100 hover:text-red-700'
                          : 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 hover:bg-emerald-100 hover:text-emerald-700'
                      }`}
                    >
                      {isEnabled ? 'Enabled 🟢' : 'KILLED 🔴'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Produce & Machinery Taxonomy Volume */}
            <div className="p-5 bg-white dark:bg-[#181F1A] rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-soft space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-black text-sm text-zinc-900 dark:text-white">Category Classifieds Volume</h3>
                </div>
                <button onClick={() => setActiveTab('categories')} className="text-xs font-bold text-emerald-600 hover:underline">
                  Taxonomy Studio
                </button>
              </div>

              <div className="space-y-2">
                {categoryStats.slice(0, 5).map((cs) => (
                  <div key={cs.name} className="flex items-center justify-between p-2 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{cs.emoji}</span>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">{cs.name}</span>
                    </div>
                    <span className="font-mono font-black text-xs text-emerald-700 dark:text-emerald-400">
                      {cs.count} ads ({cs.available} active)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: USERS & ROLE GOVERNANCE */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <div className="p-5 bg-white dark:bg-[#181F1A] rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-soft space-y-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-black text-base text-zinc-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <span>Users & Role Governance ({filteredUsers.length} of {users.length})</span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Manage user identities, promote between buyer and seller, create users, and export CSV
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={clearAllDummyAccounts}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold rounded-xl transition text-xs shadow-2xs"
                title="Purge all test/dummy fixtures from database and local storage"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Dummy Accounts</span>
              </button>

              <button
                onClick={exportUsersToCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 font-bold rounded-xl transition text-xs shadow-2xs"
                title="Download users export as CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={() => setIsAddUserModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition text-xs shadow-xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add User</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="sm:col-span-2 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search by HALDHAR ID (e.g. HLD-CUS-00000001), Name, Phone, or Email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {userSearch && (
                <button
                  onClick={() => setUserSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value as any)}
                className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-800 dark:text-zinc-200 focus:outline-none"
              >
                <option value="all">All Roles ({users.length})</option>
                <option value="farmer">Farmers ({users.filter((u) => u.role === 'farmer').length})</option>
                <option value="customer">Buyers ({users.filter((u) => u.role === 'customer').length})</option>
                <option value="admin">Admins ({users.filter((u) => u.role === 'admin').length})</option>
              </select>

              <select
                value={userStatusFilter}
                onChange={(e) => setUserStatusFilter(e.target.value as any)}
                className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-800 dark:text-zinc-200 focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="suspended">Suspended Only</option>
              </select>
            </div>
          </div>

          {/* Multi-Select Bulk Actions Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={filteredUsers.length > 0 && selectedUserIds.length === filteredUsers.length}
                onChange={() => {
                  if (selectedUserIds.length === filteredUsers.length) {
                    setSelectedUserIds([]);
                  } else {
                    setSelectedUserIds(filteredUsers.map((u) => u.id));
                  }
                }}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>Select All ({filteredUsers.length} Users)</span>
            </label>

            {selectedUserIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 animate-fade-in">
                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2.5 py-0.5 rounded-lg border border-emerald-300">
                  {selectedUserIds.length} Selected
                </span>

                <button
                  onClick={() => {
                    selectedUserIds.forEach((id) => {
                      const u = users.find((user) => user.id === id);
                      if (u && u.status === 'active' && u.role !== 'admin') {
                        toggleUserStatus(id);
                      }
                    });
                    showToast(`Bulk suspended ${selectedUserIds.length} users.`, 'info');
                    setSelectedUserIds([]);
                  }}
                  className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 rounded-lg font-bold text-[11px] transition"
                >
                  Bulk Suspend
                </button>

                <button
                  onClick={() => {
                    selectedUserIds.forEach((id) => {
                      const u = users.find((user) => user.id === id);
                      if (u && u.status === 'suspended' && u.role !== 'admin') {
                        toggleUserStatus(id);
                      }
                    });
                    showToast(`Bulk reactivated ${selectedUserIds.length} users.`, 'success');
                    setSelectedUserIds([]);
                  }}
                  className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg font-bold text-[11px] transition"
                >
                  Bulk Reactivate
                </button>

                <button
                  onClick={() => {
                    selectedUserIds.forEach((id) => {
                      const u = users.find((user) => user.id === id);
                      if (u && u.role !== 'admin') {
                        changeUserRole(id, 'farmer');
                      }
                    });
                    showToast(`Promoted ${selectedUserIds.length} users to Farmers!`, 'success');
                    setSelectedUserIds([]);
                  }}
                  className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-lg font-bold text-[11px] transition"
                >
                  Role: Farmer
                </button>

                <button
                  onClick={() => {
                    selectedUserIds.forEach((id) => {
                      const u = users.find((user) => user.id === id);
                      if (u && u.role !== 'admin') {
                        changeUserRole(id, 'customer');
                      }
                    });
                    showToast(`Role changed to Buyer for ${selectedUserIds.length} users.`, 'success');
                    setSelectedUserIds([]);
                  }}
                  className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 rounded-lg font-bold text-[11px] transition"
                >
                  Role: Buyer
                </button>

                <button
                  onClick={() => setSelectedUserIds([])}
                  className="px-2 py-1 text-zinc-400 hover:text-zinc-600 text-[11px]"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* User List / Responsive Table */}
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {filteredUsers.length === 0 ? (
              <div className="py-12 text-center text-zinc-400 bg-zinc-50/50 dark:bg-zinc-800/20 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-700">
                <Users className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
                <span className="font-bold text-sm block text-zinc-700 dark:text-zinc-300">No users found</span>
                <span className="text-xs text-zinc-400">Try modifying your search or filter options.</span>
              </div>
            ) : (
              filteredUsers.map((u) => {
                const isFarmer = u.role === 'farmer';
                const isAdmin = u.role === 'admin';
                const isSelected = selectedUserIds.includes(u.id);
                return (
                  <div key={u.id} className={`py-4 px-2 rounded-2xl transition flex flex-col md:flex-row md:items-center justify-between gap-3 ${isSelected ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          setSelectedUserIds((prev) =>
                            prev.includes(u.id) ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                          );
                        }}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 shrink-0 cursor-pointer"
                      />
                      <img
                        src={u.profile_image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                        alt={u.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500/30 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-black text-sm text-zinc-900 dark:text-white truncate">
                            {u.name}
                          </span>

                          {/* 1-Tap HALDER ID copy pill */}
                          {u.halder_id && (
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(u.halder_id || '');
                                showToast(`Copied ${u.halder_id}!`, 'info');
                              }}
                              className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-700 hover:border-emerald-500 transition select-all"
                              title="Click to copy HALDHAR ID"
                            >
                              <span>{u.halder_id}</span>
                              <Copy className="w-2.5 h-2.5 text-zinc-400" />
                            </button>
                          )}

                          {/* Role Pill */}
                          <span
                            className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                              isAdmin
                                ? 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-300'
                                : isFarmer
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300'
                                : 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300'
                            }`}
                          >
                            {u.role}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                          <a href={`tel:${u.phone}`} className="flex items-center gap-1 hover:text-emerald-600 transition">
                            <Phone className="w-3 h-3" />
                            <span>{u.phone}</span>
                          </a>
                          <span>•</span>
                          <a href={`mailto:${u.email}`} className="flex items-center gap-1 hover:text-emerald-600 transition">
                            <Mail className="w-3 h-3" />
                            <span className="truncate max-w-[200px]">{u.email}</span>
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Role & Status Governance Action Toolbar */}
                    <div className="flex items-center gap-2.5 self-end md:self-center shrink-0">
                      {/* Role Switcher Dropdown */}
                      {!isAdmin && (
                        <select
                          value={u.role}
                          onChange={(e) => changeUserRole(u.id, e.target.value as Role)}
                          className="px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-[11px] font-bold text-zinc-800 dark:text-zinc-200 focus:outline-none"
                          title="Change user role"
                        >
                          <option value="customer">Buyer</option>
                          <option value="farmer">Farmer</option>
                          <option value="admin">Promote to Admin</option>
                        </select>
                      )}

                      {/* Status Badge */}
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${
                          u.status === 'active'
                            ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800'
                            : 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800'
                        }`}
                      >
                        {u.status === 'active' ? 'Active 🟢' : 'Suspended 🔴'}
                      </span>

                      {/* Suspend / Activate Toggle */}
                      {!isAdmin && (
                        <button
                          onClick={() => toggleUserStatus(u.id)}
                          className={`px-3 py-1.5 font-bold rounded-xl text-[11px] transition-colors ${
                            u.status === 'active'
                              ? 'bg-zinc-100 dark:bg-zinc-800 hover:bg-red-50 hover:text-red-600 text-zinc-700 dark:text-zinc-300'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          {u.status === 'active' ? 'Suspend' : 'Reactivate'}
                        </button>
                      )}

                      {/* Permanent Device Ban */}
                      {!isAdmin && (
                        <button
                          onClick={() => {
                            setBanTarget({ id: u.id, name: u.name || u.email, role: u.role });
                            setBanReasonInput('Severe terms of service violation / Fraudulent activity');
                            setIsBanModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 bg-red-50 dark:bg-red-950/40 hover:bg-red-600 hover:text-white text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 font-bold rounded-xl text-[11px] transition-colors flex items-center gap-1"
                          title="Permanently Blacklist Device Hardware"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Ban Device</span>
                        </button>
                      )}

                      {/* View Profile Drawer */}
                      <button
                        onClick={() => setInspectingUser(u)}
                        className="p-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-600 dark:text-zinc-300 rounded-xl transition"
                        title="View Full Profile Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Delete User */}
                      {!isAdmin && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete user "${u.name}" permanently from HALDHAR?`)) {
                              deleteUser(u.id);
                            }
                          }}
                          className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition"
                          title="Delete Account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: FARMER VERIFICATION & KYC REVIEW CONSOLE */}
      {/* ========================================================================= */}
      {activeTab === 'verification' && (
        <div className="space-y-6 animate-fade-in">
          {/* Sub-section A: Pending Government Identity & 7/12 Queue */}
          <div className="p-5 bg-white dark:bg-[#181F1A] rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-soft space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-zinc-900 dark:text-white">
                    Pending KYC Document Verification Queue ({pendingKyc.length})
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Review official Aadhaar cards, 7/12 Land Records, and grant verified seller trust badges
                  </p>
                </div>
              </div>

              <button
                onClick={loadServerData}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-zinc-700 dark:text-zinc-300 font-bold hover:bg-zinc-200 transition self-start sm:self-center"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Queue</span>
              </button>
            </div>

            {pendingKyc.length === 0 ? (
              <div className="p-5 sm:p-8 text-center text-zinc-400 bg-emerald-50/30 dark:bg-emerald-950/20 rounded-2xl border border-dashed border-emerald-200 dark:border-emerald-800">
                <ShieldCheck className="w-10 h-10 text-emerald-600/60 mx-auto mb-2" />
                <span className="font-black text-sm block text-emerald-900 dark:text-emerald-300">
                  All Farmer KYC Submissions Cleared!
                </span>
                <span className="text-xs text-emerald-700/80 dark:text-emerald-400 block mt-0.5">
                  There are no pending identity documents or land records awaiting review.
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingKyc.map((kyc) => (
                  <div
                    key={kyc.id}
                    className="p-5 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/60 space-y-3.5 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-zinc-900 dark:text-white">{kyc.farmer_name}</span>
                          <span className="text-[10px] font-mono font-bold bg-white dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-200 text-emerald-700">
                            {kyc.halder_id || 'HAL-FRM'}
                          </span>
                        </div>
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold mt-0.5">
                          {kyc.farm_name} • 📍 {kyc.city}, {kyc.location}
                        </p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          📞 {kyc.farmer_phone} • ✉️ {kyc.farmer_email}
                        </p>
                      </div>

                      <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                        {kyc.kyc_document_type || 'Aadhaar / 7-12'}
                      </span>
                    </div>

                    {/* Document details box */}
                    <div className="p-3 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-zinc-500 text-[10px] block font-bold">Document Number / Proof ID:</span>
                        <span className="font-mono font-black text-zinc-900 dark:text-white text-xs">
                          {kyc.kyc_document_number || 'AADHAAR-8921-VERIFIED'}
                        </span>
                      </div>

                      {/* Inspect Proof Modal Trigger */}
                      <button
                        onClick={() => setInspectingKycDoc(kyc)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold hover:bg-emerald-100 transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Document</span>
                      </button>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-amber-200/60 dark:border-amber-800/40">
                      <button
                        onClick={() => {
                          setSelectedFarmerForReject(kyc.id);
                          setIsRejectModalOpen(true);
                        }}
                        className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl font-bold text-xs transition"
                      >
                        Reject with Reason
                      </button>
                      <button
                        onClick={() => handleApproveKyc(kyc.id)}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve & Grant Badge</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sub-section B: All Registered Farmers Roster */}
          <div className="p-5 bg-white dark:bg-[#181F1A] rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-soft space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>All Registered Farmer Sellers ({farmers.length})</span>
                </h3>
                <p className="text-xs text-zinc-500">
                  Inspect farmer profiles, ratings, completed orders, and active verification status
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={clearAllDummyAccounts}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold rounded-xl transition text-xs shadow-2xs"
                  title="Purge all test/dummy fixtures from database and local storage"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Dummy Accounts</span>
                </button>
                <input
                  type="text"
                  placeholder="Filter farmer name, farm, city..."
                  value={farmerSearch}
                  onChange={(e) => setFarmerSearch(e.target.value)}
                  className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white"
                />
                <select
                  value={farmerFilter}
                  onChange={(e) => setFarmerFilter(e.target.value as any)}
                  className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-800 dark:text-zinc-200"
                >
                  <option value="all">All Farmers</option>
                  <option value="verified">Verified Badged Only</option>
                  <option value="pending">Pending Review Only</option>
                  <option value="rejected">Rejected Only</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredFarmers.map((farmer) => {
                const isVerified = farmer.verification_status === 'verified';
                return (
                  <div
                    key={farmer.id}
                    className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-700/70 space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={farmer.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100'}
                        alt={farmer.name}
                        className="w-12 h-12 rounded-2xl object-cover shrink-0 border border-emerald-500/20"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-black text-sm text-zinc-900 dark:text-white truncate">{farmer.name}</h4>
                          {isVerified && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                        </div>
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold truncate">
                          {farmer.farm_name} • 📍 {farmer.location}
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          ★ {farmer.rating} • {farmer.total_orders} orders done • {farmer.response_rate}% response
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60">
                      {/* View Storefront modal */}
                      <button
                        onClick={() => setSelectedFarmer(farmer)}
                        className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
                      >
                        <span>View Storefront</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                            isVerified
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {farmer.verification_status}
                        </span>

                        {!isVerified ? (
                          <button
                            onClick={() => handleApproveKyc(farmer.id)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition"
                          >
                            Grant Badge
                          </button>
                        ) : (
                          <button
                            onClick={() => rejectFarmerVerification(farmer.id)}
                            className="px-2.5 py-1 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-red-50 hover:text-red-600 font-bold rounded-xl text-xs transition"
                            title="Revoke Verified Status"
                          >
                            Revoke
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setBanTarget({ id: farmer.user_id || farmer.id, name: farmer.name, role: 'farmer' });
                            setBanReasonInput('Fraudulent farmer profile / Produce scam violation');
                            setIsBanModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-red-50 dark:bg-red-950/40 hover:bg-red-600 hover:text-white text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 font-bold rounded-xl text-xs transition flex items-center gap-1"
                          title="Permanently Ban Farmer Hardware Device"
                        >
                          <Lock className="w-3 h-3" />
                          <span>Ban</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: LISTINGS & CLASSIFIEDS MODERATION (HALDHAR MANDI) */}
      {/* ========================================================================= */}
      {activeTab === 'products' && (
        <div className="p-5 bg-white dark:bg-[#181F1A] rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-soft space-y-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-black text-base text-zinc-900 dark:text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-600" />
                <span>Marketplace Listings & Classifieds Moderation ({filteredProducts.length} of {products.length})</span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Inspect produce, farm machinery, livestock ads, feature worthy sellers, adjust prices, and remove fraudulent ads
              </p>
            </div>

            <button
              onClick={exportProductsToCSV}
              title="Download listings as CSV"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors shadow-2xs shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            <div className="lg:col-span-2 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search ads by title, farmer, category, or location..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <select
              value={productCategoryFilter}
              onChange={(e) => setProductCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-800 dark:text-zinc-200"
            >
              <option value="All">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.emoji} {c.name}
                </option>
              ))}
            </select>

            <select
              value={productModerationFilter}
              onChange={(e) => setProductModerationFilter(e.target.value as any)}
              className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-800 dark:text-zinc-200"
            >
              <option value="all">All Moderation Status</option>
              <option value="active">Active in Mandi</option>
              <option value="paused">Paused / Sold</option>
              <option value="featured">⚡ Boosted / Featured Only</option>
              <option value="urgent">🔥 Urgent Ads Only</option>
            </select>

            <select
              value={productStockFilter}
              onChange={(e) => setProductStockFilter(e.target.value as any)}
              className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-800 dark:text-zinc-200"
            >
              <option value="all">All Inventory Levels</option>
              <option value="in_stock">In Stock (&gt; 10 units)</option>
              <option value="low_stock">Low Stock (≤ 10 units)</option>
              <option value="out_of_stock">Out of Stock (0 units)</option>
            </select>
          </div>

          {/* Listings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.length === 0 ? (
              <div className="col-span-full py-12 text-center text-zinc-400 bg-zinc-50/50 dark:bg-zinc-800/20 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-700">
                <ShoppingBag className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
                <span className="font-bold text-sm block text-zinc-700 dark:text-zinc-300">No listings match criteria</span>
                <span className="text-xs text-zinc-400">Modify your search query or category filters.</span>
              </div>
            ) : (
              filteredProducts.map((prod) => (
                <div
                  key={prod.id}
                  className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80 space-y-3 flex flex-col justify-between shadow-2xs hover:border-emerald-500/40 transition"
                >
                  <div className="space-y-2.5">
                    {/* Image & Photo Counter */}
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-200 dark:bg-zinc-700 group cursor-pointer" onClick={() => setSelectedProduct(prod)}>
                      <img
                        src={prod.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400'}
                        alt={prod.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                        {prod.isFeatured && (
                          <span className="px-2 py-0.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-zinc-950 font-black text-[9px] rounded-full shadow-xs flex items-center gap-0.5">
                            <Zap className="w-2.5 h-2.5 fill-current" />
                            FEATURED
                          </span>
                        )}
                        {prod.isUrgent && (
                          <span className="px-2 py-0.5 bg-red-600 text-white font-black text-[9px] rounded-full shadow-xs flex items-center gap-0.5">
                            <Flame className="w-2.5 h-2.5 fill-current" />
                            URGENT
                          </span>
                        )}
                        {!prod.isAvailable && (
                          <span className="px-2 py-0.5 bg-zinc-900/90 text-white font-bold text-[9px] rounded-full">
                            PAUSED / SOLD
                          </span>
                        )}
                      </div>

                      <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold rounded-md">
                        📷 {prod.images?.length || 1}
                      </span>
                    </div>

                    {/* Listing Info */}
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="font-black text-sm text-zinc-900 dark:text-white line-clamp-1">{prod.name}</h4>
                        <span className="text-sm font-black text-emerald-700 dark:text-emerald-400 shrink-0">
                          {prod.price > 0 ? `${formatCurrency(prod.price)} / ${prod.unit}` : 'Negotiable'}
                        </span>
                      </div>
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold mt-0.5">
                        Farmer: {prod.farmerName} • 📍 {prod.location}
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-1">
                        📦 {prod.availableQuantity} {prod.unit} stock • Category: {prod.category}
                      </p>
                    </div>
                  </div>

                  {/* Moderation Controls Toolbar */}
                  <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1">
                      {/* Preview Ad */}
                      <button
                        onClick={() => setSelectedProduct(prod)}
                        className="p-1.5 bg-white dark:bg-zinc-700 hover:bg-zinc-100 text-zinc-700 dark:text-zinc-200 rounded-lg text-xs font-bold transition shadow-2xs"
                        title="Preview Public Mandi Ad"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {/* Edit Price */}
                      <button
                        onClick={() => {
                          setEditingProductPrice({ id: prod.id, name: prod.name, price: prod.price });
                          setNewPriceValue(String(prod.price));
                        }}
                        className="p-1.5 bg-white dark:bg-zinc-700 hover:bg-zinc-100 text-zinc-700 dark:text-zinc-200 rounded-lg text-xs font-bold transition shadow-2xs"
                        title="Edit Price"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Boost / Feature Override */}
                      <button
                        onClick={() => toggleProductFeatured(prod.id)}
                        className={`p-1.5 rounded-lg text-xs font-bold transition shadow-2xs ${
                          prod.isFeatured
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                            : 'bg-white dark:bg-zinc-700 text-zinc-400 hover:text-amber-500'
                        }`}
                        title={prod.isFeatured ? 'Remove Featured Status' : 'Feature / Boost this Ad'}
                      >
                        <Zap className="w-3.5 h-3.5" />
                      </button>

                      {/* Urgent Badge Override */}
                      <button
                        onClick={() => toggleProductUrgent(prod.id)}
                        className={`p-1.5 rounded-lg text-xs font-bold transition shadow-2xs ${
                          prod.isUrgent
                            ? 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300'
                            : 'bg-white dark:bg-zinc-700 text-zinc-400 hover:text-red-500'
                        }`}
                        title={prod.isUrgent ? 'Remove Urgent Status' : 'Mark as Urgent Ad'}
                      >
                        <Flame className="w-3.5 h-3.5" />
                      </button>

                      {/* Pause / Resume */}
                      <button
                        onClick={() => toggleProductAvailability(prod.id)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition shadow-2xs ${
                          prod.isAvailable
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-zinc-200 text-zinc-600'
                        }`}
                        title={prod.isAvailable ? 'Mark as Paused / Sold' : 'Mark Available'}
                      >
                        {prod.isAvailable ? 'Active' : 'Paused'}
                      </button>
                    </div>

                    {/* Delete Product */}
                    <button
                      onClick={() => {
                        if (window.confirm(`Permanently remove ad "${prod.name}" from HALDHAR Mandi?`)) {
                          deleteProduct(prod.id);
                        }
                      }}
                      className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
                      title="Delete / Take down Ad"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 5B: USER REPORTS & AD FRAUD MODERATION */}
      {/* ========================================================================= */}
      {activeTab === 'reports' && (
        <div className="p-5 bg-white dark:bg-[#181F1A] rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-soft space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <h2 className="font-black text-base text-zinc-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-600" />
                <span>Buyer Complaints & Ad Reports ({serverReports.length})</span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Review middleman complaints, fraud reports, fake harvest claims, and take swift moderation actions.
              </p>
            </div>
            <button
              onClick={loadServerData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          {/* Reports List */}
          <div className="space-y-3">
            {serverReports.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                <ShieldCheck className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-60" />
                <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">No Pending Reports</p>
                <p className="text-xs mt-1">Marketplace is running cleanly. No unreviewed middleman or ad complaints.</p>
              </div>
            ) : (
              serverReports.map((rep) => (
                <div
                  key={rep.id}
                  className="p-4 bg-zinc-50/60 dark:bg-zinc-900/40 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 text-[10px] font-black uppercase tracking-wider">
                        {rep.reason || 'Fraud Report'}
                      </span>
                      <span className="text-[11px] font-bold text-zinc-500">
                        Status: <strong className="capitalize">{rep.status || 'open'}</strong>
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        {rep.created_at ? new Date(rep.created_at).toLocaleString() : 'Recent'}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      {rep.description || 'Reported listing'}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-500 dark:text-zinc-400 pt-1">
                      {rep.product_id && (
                        <span>Product ID: <code className="bg-zinc-200 dark:bg-zinc-800 px-1 rounded">{rep.product_id}</code></span>
                      )}
                      {rep.reported_user_id && (
                        <span>Seller User ID: <code className="bg-zinc-200 dark:bg-zinc-800 px-1 rounded">{rep.reported_user_id}</code></span>
                      )}
                      {rep.reporter_id && (
                        <span>Reporter: <code className="bg-zinc-200 dark:bg-zinc-800 px-1 rounded">{rep.reporter_id}</code></span>
                      )}
                    </div>
                  </div>

                  {/* Moderation Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {rep.status !== 'resolved' && (
                      <button
                        onClick={async () => {
                          try {
                            await ApiClient.updateReportStatus(rep.id, { status: 'resolved', resolutionNotes: 'Reviewed & verified by Admin' });
                            setServerReports((prev) => prev.map((r) => r.id === rep.id ? { ...r, status: 'resolved' } : r));
                            showToast('Report marked as Resolved', 'success');
                          } catch {
                            showToast('Failed to resolve report', 'error');
                          }
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Resolve</span>
                      </button>
                    )}

                    {rep.product_id && (
                      <button
                        onClick={async () => {
                          if (confirm('Are you sure you want to take down this reported listing?')) {
                            try {
                              await ApiClient.deleteProduct(rep.product_id);
                              await ApiClient.updateReportStatus(rep.id, { status: 'resolved', resolutionNotes: 'Listing taken down' });
                              setServerReports((prev) => prev.map((r) => r.id === rep.id ? { ...r, status: 'resolved' } : r));
                              showToast('Reported listing removed from marketplace', 'success');
                            } catch {
                              showToast('Failed to delete listing', 'error');
                            }
                          }
                        }}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Take Down Ad</span>
                      </button>
                    )}

                    {rep.status === 'open' && (
                      <button
                        onClick={async () => {
                          try {
                            await ApiClient.updateReportStatus(rep.id, { status: 'dismissed', resolutionNotes: 'Dismissed - insufficient evidence' });
                            setServerReports((prev) => prev.map((r) => r.id === rep.id ? { ...r, status: 'dismissed' } : r));
                            showToast('Report dismissed', 'info');
                          } catch {
                            showToast('Failed to dismiss report', 'error');
                          }
                        }}
                        className="px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 text-zinc-600 dark:text-zinc-300 rounded-xl text-xs font-semibold transition"
                      >
                        <span>Dismiss</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 6: CATEGORIES & TAXONOMIES */}
      {/* ========================================================================= */}
      {activeTab === 'categories' && (
        <div className="p-5 bg-white dark:bg-[#181F1A] rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-soft space-y-6 animate-fade-in">
          <div>
            <h2 className="font-black text-base text-zinc-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-600" />
              <span>Marketplace Categories & Taxonomies ({categories.length})</span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Control category visibility, add new produce or equipment groupings, and configure visual emojis
            </p>
          </div>

          {/* Add Category Form */}
          <form
            onSubmit={handleAddCategory}
            className="p-5 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200 dark:border-zinc-700 space-y-3.5"
          >
            <span className="font-black text-sm text-zinc-900 dark:text-white block">
              Add New Marketplace Category
            </span>

            {/* Quick emoji presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-zinc-500 mr-1">Choose Preset Icon:</span>
              {['🌾', '🚜', '🐄', '🥦', '🍎', '🧴', '🍯', '🌶️', '🌽', '🌱', '🍅', '🧄'].map((emoji) => (
                <button
                  type="button"
                  key={emoji}
                  onClick={() => setNewCatEmoji(emoji)}
                  className={`text-lg p-1.5 rounded-lg border transition ${
                    newCatEmoji === emoji
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 scale-110 shadow-xs'
                      : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input
                type="text"
                placeholder="Category Name (e.g. Farm Tractors)"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />

              <input
                type="text"
                placeholder="Custom Emoji (e.g. 🚜)"
                value={newCatEmoji}
                onChange={(e) => setNewCatEmoji(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />

              <input
                type="text"
                placeholder="Cover Image URL (optional)"
                value={newCatImage}
                onChange={(e) => setNewCatImage(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />

              <button
                type="submit"
                disabled={!newCatName.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Create Category</span>
              </button>
            </div>
          </form>

          {/* Categories Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {categories.map((cat) => {
              const count = products.filter((p) => p.category === cat.name).length;
              return (
                <div
                  key={cat.id}
                  className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80 flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl p-2 bg-white dark:bg-zinc-700 rounded-2xl border border-zinc-200/60 dark:border-zinc-600 shadow-2xs">
                      {cat.emoji}
                    </span>
                    <div>
                      <h4 className="font-black text-sm text-zinc-900 dark:text-white">{cat.name}</h4>
                      <span className="text-[11px] text-zinc-500 font-semibold">{count} listings</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60">
                    <button
                      onClick={() => toggleCategoryActive(cat.id)}
                      className={`text-[10px] font-black px-2.5 py-0.5 rounded-full transition-colors ${
                        cat.active
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                          : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {cat.active ? 'Active 🟢' : 'Hidden ⚪'}
                    </button>

                    <button
                      onClick={() => {
                        if (window.confirm(`Delete category "${cat.name}"?`)) {
                          deleteCategory(cat.id);
                        }
                      }}
                      className="p-1 text-zinc-400 hover:text-red-500 rounded-lg transition"
                      title="Delete category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 7: SYSTEM AUDIT LOGS */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        <div className="p-5 bg-white dark:bg-[#181F1A] rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-soft space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-black text-base text-zinc-900 dark:text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-600" />
                <span>Security & Administrative Audit Logs ({filteredAuditLogs.length} of {auditLogs.length})</span>
              </h2>
              <p className="text-xs text-zinc-500">
                Immutable SQLite audit trail tracking administrative verifications, user suspensions, and feature kill switches
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Filter logs by action, table, ID..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white"
              />
              <button
                onClick={exportAuditLogsToCSV}
                title="Download audit logs as CSV"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors shadow-2xs shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={loadServerData}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-zinc-700 dark:text-zinc-300 font-bold hover:bg-zinc-200 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {filteredAuditLogs.length === 0 ? (
            <div className="p-5 sm:p-8 text-center text-zinc-400 bg-zinc-50 dark:bg-zinc-800/20 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-700">
              <Activity className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
              <span className="font-bold text-sm block text-zinc-700 dark:text-zinc-300">No logs matching criteria</span>
              <span className="text-xs">Audit logs record every administrative action in real-time.</span>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[600px] overflow-y-auto no-scrollbar">
              {filteredAuditLogs.map((log) => (
                <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300">
                        {log.action}
                      </span>
                      <span className="font-bold text-zinc-900 dark:text-white text-xs">
                        Target: {log.target_table} ({log.target_id})
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">
                      Admin: {log.actor_id} • IP: {log.ip_address || '127.0.0.1'}
                    </p>
                  </div>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      
      {/* ========================================================================= */}
      {/* SECTION 8: PLATFORM GOVERNANCE & SETTINGS */}
      {/* ========================================================================= */}
      {activeTab === 'settings' && (
        <div className="p-5 bg-white dark:bg-[#181F1A] rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-soft space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-black text-base text-zinc-900 dark:text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-600" />
                <span>Platform Governance & Commercial Settings</span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Configure commission structure, delivery thresholds, and customer support contacts
              </p>
            </div>

            <button
              onClick={() => {
                updatePlatformSettings({
                  platformCommissionRate,
                  freeDeliveryThreshold,
                  standardDeliveryFee,
                  helplinePhone,
                  supportEmail,
                  emergencyAlert,
                });
                showToast('Platform settings saved! Marketplace delivery thresholds and contacts updated across all devices.', 'success');
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Check className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 1. Commercial & Commission Rules */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200 dark:border-zinc-700 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-zinc-200 dark:border-zinc-700">
                <Percent className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Fee & Commission Structure</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                      Platform Farmer Take-Rate (%)
                    </label>
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded">
                      0% (Zero Commission Guarantee)
                    </span>
                  </div>
                  <input
                    type="number"
                    value={platformCommissionRate}
                    onChange={(e) => setPlatformCommissionRate(Number(e.target.value))}
                    min="0"
                    max="20"
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-zinc-400 mt-1">
                    HALDHAR promises 100% direct sale proceeds to farmers with zero intermediary cut.
                  </p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                      Free Ad Listings per Farmer
                    </label>
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded">Unlimited Free</span>
                  </div>
                  <input
                    type="number"
                    value={25}
                    readOnly
                    className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-500 dark:text-zinc-400"
                  />
                  <p className="text-[10px] text-zinc-400 mt-1">
                    Farmers can list unlimited crop ads for free on the HALDHAR classifieds network.
                  </p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                      Ad Validity Period (Days)
                    </label>
                    <span className="text-[10px] font-bold text-zinc-500">30 Days Active</span>
                  </div>
                  <input
                    type="number"
                    value={30}
                    readOnly
                    className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-500 dark:text-zinc-400"
                  />
                  <p className="text-[10px] text-zinc-400 mt-1">
                    Listings remain active for 30 days before requiring farmer re-confirmation.
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Operations & Customer Support */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200 dark:border-zinc-700 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-zinc-200 dark:border-zinc-700">
                <HelpCircle className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Helpline & Platform Notices</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Official Kisan & Buyer Helpline Phone
                  </label>
                  <input
                    type="tel"
                    value={helplinePhone}
                    onChange={(e) => setHelplinePhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Support & Dispute Escalation Email
                  </label>
                  <input
                    type="email"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Global Broadcast Advisory Banner
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 🌧️ Heavy rainfall advisory across Doon valley - farm deliveries running on safe transit mode."
                    value={emergencyAlert}
                    onChange={(e) => setEmergencyAlert(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-zinc-400 mt-1">
                    Shown globally on Buyer and Farmer dashboards when not empty.
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Administrator Account & Session Security */}
            <div className="p-4 bg-red-50/50 dark:bg-red-950/20 rounded-2xl border border-red-200 dark:border-red-900/60 space-y-4 md:col-span-2">
              <div className="flex items-center justify-between pb-2 border-b border-red-200/80 dark:border-red-900/50">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-red-600" />
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                    Administrator Account & Session Security
                  </h3>
                </div>
                <span className="text-[10px] font-mono font-bold bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 px-2 py-0.5 rounded">
                  Active Admin Session
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1 text-xs">
                  <p className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <span>Logged in as:</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-black">{currentUser?.name || 'Administrator'}</span>
                    <span className="text-zinc-500 font-mono">({currentUser?.email || 'admin@halder.com'})</span>
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Role: <span className="font-bold text-purple-600 dark:text-purple-400">System Administrator</span> • ID: <span className="font-mono">{currentUser?.halder_id || 'HAL-ADM-90000001'}</span>
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    Signing out will invalidate current administrative JWT tokens and return to the login screen.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowLogoutModal(true)}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition shadow-xs flex items-center gap-2 shrink-0 text-xs"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out of Admin Account</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 9: HARDWARE DEVICE BAN & CYBERSECURITY BLACKLIST */}
      {/* ========================================================================= */}
      {activeTab === 'device-bans' && (
        <div className="p-5 bg-white dark:bg-[#181F1A] rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-soft space-y-6 animate-fade-in">
          {/* Header */}
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
              onClick={loadBannedDevices}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 font-bold rounded-xl transition text-xs shadow-2xs self-start sm:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Blacklist</span>
            </button>
          </div>

          {/* KPI Summary Cards */}
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

          {/* Manual Device Ban Form */}
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
                onClick={handleConfirmDeviceBan}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition shadow-xs flex items-center justify-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isBanningInProgress ? 'Enforcing...' : 'Ban Hardware Device Now'}</span>
              </button>
            </div>
          </div>

          {/* Search & List of Banned Devices */}
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
                {bannedDevicesList
                  .filter((b) => {
                    const q = deviceBanSearch.toLowerCase();
                    return (
                      (b.device_id || '').toLowerCase().includes(q) ||
                      (b.user_name || '').toLowerCase().includes(q) ||
                      (b.user_phone || '').toLowerCase().includes(q) ||
                      (b.reason || '').toLowerCase().includes(q)
                    );
                  })
                  .map((ban) => (
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
                        onClick={() => handleUnbanDevice(ban.id)}
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
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: INTERACTIVE KYC PROOF DOCUMENT VIEWER */}
      {/* ========================================================================= */}
      {inspectingKycDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-2xl bg-white dark:bg-[#181F1A] rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-5 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
                <div>
                  <h3 className="font-black text-base text-zinc-900 dark:text-white">
                    Official Farmer Proof Document Review
                  </h3>
                  <span className="text-xs text-zinc-500">{inspectingKycDoc.farmer_name} • {inspectingKycDoc.farm_name}</span>
                </div>
              </div>
              <button
                onClick={() => setInspectingKycDoc(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-full"
              >
                ✕
              </button>
            </div>

            {/* Simulated Government Aadhaar Card */}
            <div className="space-y-2">
              <span className="text-[11px] font-black uppercase text-zinc-400 tracking-wider">
                1. Government Aadhaar Card
              </span>

              <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-zinc-900 dark:to-zinc-800 rounded-2xl border-2 border-amber-300 dark:border-amber-700/60 shadow-md relative overflow-hidden">
                {/* Tricolor top border accent */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-500 via-white to-emerald-600" />

                <div className="flex items-center justify-between pb-2 border-b border-amber-200 dark:border-zinc-700">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🇮🇳</span>
                    <div>
                      <span className="font-black text-xs text-amber-950 dark:text-amber-200 block">
                        Government of India
                      </span>
                      <span className="text-[9px] text-zinc-500">Unique Identification Authority of India</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-amber-200/60 dark:bg-amber-950 px-2 py-0.5 rounded text-amber-900 dark:text-amber-300">
                    AADHAAR VERIFIED
                  </span>
                </div>

                <div className="flex items-center gap-4 pt-3">
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160"
                    alt="Farmer Aadhaar photo"
                    className="w-16 h-20 rounded-lg object-cover border-2 border-amber-400 dark:border-amber-600 shadow-sm shrink-0"
                  />
                  <div className="space-y-1 text-xs text-zinc-800 dark:text-zinc-200 min-w-0">
                    <p className="font-black text-sm text-zinc-900 dark:text-white">
                      Name: {inspectingKycDoc.farmer_name}
                    </p>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                      DOB: 14/08/1982 | Gender: Male
                    </p>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                      Address: Village {inspectingKycDoc.city}, {inspectingKycDoc.location}, India
                    </p>
                    <p className="font-mono font-black text-sm text-amber-950 dark:text-amber-300 tracking-widest pt-1">
                      {inspectingKycDoc.kyc_document_number || 'XXXX XXXX 8921'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Simulated 7/12 (Saat-Baara) Land Record Certificate */}
            <div className="space-y-2">
              <span className="text-[11px] font-black uppercase text-zinc-400 tracking-wider">
                2. Land Title & 7/12 Saat-Baara Record
              </span>

              <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border-2 border-emerald-300 dark:border-emerald-800 space-y-2.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-emerald-200 dark:border-emerald-800">
                  <span className="font-black text-xs text-emerald-950 dark:text-emerald-200">
                    State Land Revenue Dept • Form VII-XII
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                    Khasra # {Math.abs((inspectingKycDoc.id || 'khasra').split('').reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0) % 800) + 120}/B
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-zinc-500 text-[10px] block">Farm / Khata Name:</span>
                    <span className="font-bold text-zinc-900 dark:text-white">{inspectingKycDoc.farm_name}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[10px] block">Verified Agricultural Area:</span>
                    <span className="font-bold text-zinc-900 dark:text-white">4.5 Hectares</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[10px] block">District / Taluka:</span>
                    <span className="font-bold text-zinc-900 dark:text-white">{inspectingKycDoc.city}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[10px] block">Status of Cultivation:</span>
                    <span className="font-bold text-emerald-600">Active Crop Season (Kharif / Rabi)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Bar inside modal */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              {inspectingKycDoc.phone ? (
                <a
                  href={`https://wa.me/${inspectingKycDoc.phone.replace(/[^0-9]/g, '').length === 10 ? `91${inspectingKycDoc.phone.replace(/[^0-9]/g, '')}` : inspectingKycDoc.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Namaste ${inspectingKycDoc.farmer_name}! We are reviewing your HALDHAR Farmer Verification documents.`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 rounded-xl font-bold text-xs flex items-center gap-1.5 transition"
                >
                  <span>💬 WhatsApp Farmer</span>
                </a>
              ) : (
                <span className="text-xs text-zinc-400">No phone number on file</span>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedFarmerForReject(inspectingKycDoc.id);
                    setIsRejectModalOpen(true);
                  }}
                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl font-bold text-xs transition"
                >
                  Reject Documents
                </button>
                <button
                  onClick={() => handleApproveKyc(inspectingKycDoc.id)}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve & Grant Verified Green Badge</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 9: HARDWARE DEVICE BAN & CYBERSECURITY BLACKLIST */}
      {/* ========================================================================= */}
      {activeTab === 'device-bans' && (
        <div className="p-5 bg-white dark:bg-[#181F1A] rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-soft space-y-6 animate-fade-in">
          {/* Header */}
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
              onClick={loadBannedDevices}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 font-bold rounded-xl transition text-xs shadow-2xs self-start sm:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Blacklist</span>
            </button>
          </div>

          {/* KPI Summary Cards */}
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

          {/* Manual Device Ban Form */}
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
                onClick={handleConfirmDeviceBan}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition shadow-xs flex items-center justify-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isBanningInProgress ? 'Enforcing...' : 'Ban Hardware Device Now'}</span>
              </button>
            </div>
          </div>

          {/* Search & List of Banned Devices */}
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
                {bannedDevicesList
                  .filter((b) => {
                    const q = deviceBanSearch.toLowerCase();
                    return (
                      (b.device_id || '').toLowerCase().includes(q) ||
                      (b.user_name || '').toLowerCase().includes(q) ||
                      (b.user_phone || '').toLowerCase().includes(q) ||
                      (b.reason || '').toLowerCase().includes(q)
                    );
                  })
                  .map((ban) => (
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
                        onClick={() => handleUnbanDevice(ban.id)}
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
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: STRUCTURED KYC REJECTION MODAL */}
      {/* ========================================================================= */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#181F1A] rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                Specify KYC Rejection Reason
              </h3>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Select or type a reason. This will be sent directly to the farmer via instant push notification and in-app alert.
            </p>

            {/* Reason preset chips */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase text-zinc-400">Quick Reason Presets:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Document photo is blurry or illegible.',
                  'Name mismatch between Aadhaar and Land Record.',
                  'Land record survey number is invalid or incomplete.',
                  'Expired government identity proof.',
                ].map((preset) => (
                  <button
                    type="button"
                    key={preset}
                    onClick={() => setRejectReason(preset)}
                    className="text-[10px] px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-red-50 hover:text-red-700 transition"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Type specific instructions for the farmer..."
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setSelectedFarmerForReject(null);
                  setRejectReason('');
                }}
                className="flex-1 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectKyc}
                disabled={!rejectReason.trim()}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EMERGENCY KILL SWITCH MATRIX */}
      {/* ========================================================================= */}
      {isKillSwitchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-[#181F1A] rounded-3xl shadow-2xl border-2 border-red-500/30 p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-red-600">
                <ShieldAlert className="w-6 h-6 animate-pulse" />
                <div>
                  <h3 className="font-black text-base text-zinc-900 dark:text-white">
                    Emergency System Kill-Switch Console
                  </h3>
                  <span className="text-[11px] text-zinc-500">Instant circuit breakers for platform safety</span>
                </div>
              </div>
              <button onClick={() => setIsKillSwitchModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Flipping any switch instantly shuts down that specific endpoint on the backend API server. Users attempting to access disabled features will receive a friendly 503 maintenance response.
            </p>

            <div className="space-y-2.5">
              {Object.entries(killSwitchStates).map(([feat, isEnabled]) => (
                <div
                  key={feat}
                  className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-black text-sm text-zinc-900 dark:text-white capitalize">
                      {feat.replace(/_/g, ' ')}
                    </h4>
                    <span className="text-[11px] text-zinc-500">
                      {isEnabled ? 'Operational & serving traffic' : '🚨 KILLED: Routes returning 503'}
                    </span>
                  </div>

                  <button
                    onClick={() => handleToggleKillSwitch(feat, isEnabled)}
                    className={`px-3.5 py-1.5 font-black text-xs rounded-xl shadow-xs transition ${
                      isEnabled
                        ? 'bg-emerald-600 hover:bg-red-600 text-white'
                        : 'bg-red-600 hover:bg-emerald-600 text-white'
                    }`}
                  >
                    {isEnabled ? 'Enabled 🟢 (Click to Cut)' : 'KILLED 🔴 (Click to Restore)'}
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <button
                onClick={() => setIsKillSwitchModalOpen(false)}
                className="w-full py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-800 dark:text-zinc-200 font-bold rounded-xl text-xs transition"
              >
                Close Safety Console
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: BROADCAST PUSH ALERT CONSOLE */}
      {/* ========================================================================= */}
      {isPushBroadcastOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#181F1A] rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-purple-600" />
                <h3 className="font-black text-base text-zinc-900 dark:text-white">
                  Broadcast Push Notification
                </h3>
              </div>
              <button onClick={() => setIsPushBroadcastOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleSendPushBroadcast} className="space-y-3.5">
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1">Target Audience</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'all', label: 'All Users' },
                    { id: 'farmer', label: 'Farmers Only' },
                    { id: 'customer', label: 'Buyers Only' },
                  ].map((aud) => (
                    <button
                      type="button"
                      key={aud.id}
                      onClick={() => setPushAudience(aud.id as any)}
                      className={`min-h-[40px] py-2 px-2 rounded-xl font-bold text-xs transition border flex items-center justify-center ${
                        pushAudience === aud.id
                          ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300'
                          : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {aud.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1">Alert Title</label>
                <input
                  type="text"
                  placeholder="e.g. 🌾 Wheat Mandi Rates Revised"
                  value={pushTitle}
                  onChange={(e) => setPushTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1">Alert Message</label>
                <textarea
                  rows={3}
                  placeholder="e.g. MSP announced for Rabi season crops. Check new rates in your Mandi dashboard."
                  value={pushMessage}
                  onChange={(e) => setPushMessage(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Notification Preview Card */}
              {pushTitle && (
                <div className="p-3 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-1">
                  <span className="text-[9px] font-black uppercase text-zinc-400 block">Mobile Notification Preview</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">🔔</span>
                    <span className="font-bold text-xs text-zinc-900 dark:text-white">{pushTitle}</span>
                  </div>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-300">{pushMessage || 'Your message preview...'}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPushBroadcastOpen(false)}
                  className="flex-1 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingPush || !pushTitle.trim() || !pushMessage.trim()}
                  className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSendingPush ? 'Broadcasting...' : 'Send Broadcast'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: ADD NEW USER / FARMER MODAL */}
      {/* ========================================================================= */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#181F1A] rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-base text-zinc-900 dark:text-white">Add New Platform User</h3>
              </div>
              <button onClick={() => setIsAddUserModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Patel"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 98765 43210"
                  value={newUserPhone}
                  onChange={(e) => setNewUserPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. ramesh@kisan.in"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1">Assigned Role</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'customer', label: 'Buyer' },
                    { id: 'farmer', label: 'Farmer' },
                    { id: 'admin', label: 'Admin' },
                  ].map((r) => (
                    <button
                      type="button"
                      key={r.id}
                      onClick={() => setNewUserRole(r.id as Role)}
                      className={`min-h-[40px] py-2 px-2 rounded-xl font-bold text-xs transition border flex items-center justify-center ${
                        newUserRole === r.id
                          ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                          : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="flex-1 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: EDIT PRODUCT PRICE MODAL */}
      {/* ========================================================================= */}
      {editingProductPrice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-[#181F1A] rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4">
            <h3 className="font-black text-sm text-zinc-900 dark:text-white">
              Edit Price for "{editingProductPrice.name}"
            </h3>

            <form onSubmit={handleSavePriceEdit} className="space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1">New Price (₹)</label>
                <input
                  type="number"
                  step="any"
                  value={newPriceValue}
                  onChange={(e) => setNewPriceValue(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingProductPrice(null)}
                  className="flex-1 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                >
                  Save Price
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* ========================================================================= */}
      {/* MODAL 8: USER PROFILE DETAILS DRAWER */}
      {/* ========================================================================= */}
      {inspectingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#181F1A] rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <img
                  src={inspectingUser.profile_image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160'}
                  alt={inspectingUser.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500/30"
                />
                <div>
                  <h3 className="font-black text-sm text-zinc-900 dark:text-white">{inspectingUser.name}</h3>
                  <span className="text-xs text-emerald-700 font-bold">{inspectingUser.halder_id}</span>
                </div>
              </div>
              <button onClick={() => setInspectingUser(null)} className="text-zinc-400 hover:text-zinc-600">
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-500">Phone:</span>
                <span className="font-bold text-zinc-900 dark:text-white">{inspectingUser.phone}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-500">Email:</span>
                <span className="font-bold text-zinc-900 dark:text-white">{inspectingUser.email}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-500">Current Role:</span>
                <span className="font-black text-purple-700 dark:text-purple-300 uppercase">{inspectingUser.role}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-500">Account Status:</span>
                <span className="font-bold text-emerald-600">{inspectingUser.status}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-zinc-500">Joined HALDHAR:</span>
                <span className="font-mono text-zinc-600 dark:text-zinc-400">
                  {new Date(inspectingUser.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            <button
              onClick={() => setInspectingUser(null)}
              className="w-full py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-800 dark:text-zinc-200 font-bold rounded-xl text-xs transition"
            >
              Close Profile
            </button>
          </div>
        </div>
      )}

      {/* MODAL: ADMIN LOGOUT CONFIRMATION */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#181F1A] rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600">
                <LogOut className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-base text-zinc-900 dark:text-white">
                  Confirm Admin Logout
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Are you sure you want to exit your administrator session?
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              Are you sure you want to end your Administrator session? You will be signed out and redirected to the HALDHAR sign-in screen.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutModal(false);
                  logout();
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PERMANENT DEVICE BAN CONFIRMATION */}
      {isBanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
          <div
            className="w-full max-w-md bg-white dark:bg-[#181F1A] rounded-3xl p-6 shadow-2xl border border-red-500/30 space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800 flex items-center justify-center text-red-600 shrink-0">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-base text-zinc-900 dark:text-white">
                  Permanently Ban Device Hardware
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Target: <strong className="text-red-600">{banTarget?.name || 'Device Hardware'}</strong>
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              This will permanently blacklist the physical phone / hardware identifier. The user will be immediately logged out and cannot re-register or use HALDHAR even after clearing app data or reinstalling the APK.
            </p>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block">
                Reason for Permanent Hardware Ban *
              </label>
              <input
                type="text"
                value={banReasonInput}
                onChange={(e) => setBanReasonInput(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="e.g. Repeated scamming, fake produce ads, payment fraud"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block">
                Internal Security Notes (Optional)
              </label>
              <textarea
                value={banNotesInput}
                onChange={(e) => setBanNotesInput(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Audit notes for administrative records..."
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setIsBanModalOpen(false);
                  setBanTarget(null);
                }}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isBanningInProgress || !banReasonInput.trim()}
                onClick={handleConfirmDeviceBan}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isBanningInProgress ? 'Enforcing Ban...' : 'Confirm & Ban Device'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
