import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/appContextUtils';
import { useTranslation } from '../../i18n';
import { handleAvatarError, DEFAULT_AVATAR_IMAGE } from '../../utils/imageFallback';
import { ChatSkeleton } from '../common/ChatSkeleton';
import {
  MessageCircle,
  Search,
  Clock,
  ShieldCheck,
  RefreshCw,
  ShoppingBag,
  ArrowRight,
  BellOff,
  AlertCircle,
} from 'lucide-react';

function formatListTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export const CustomerChatsView: React.FC = () => {
  const {
    chatConversations,
    refreshChatConversations,
    setChatFarmer,
    setActiveConversationId,
    setActiveConversationProductId,
    setPendingChatInitialMessage,
    setIsChatModalOpen,
    unreadChatCount,
    setCustomerTab,
    farmers,
    products,
    currentUser,
    showToast,
  } = useApp();

  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(() => chatConversations.length === 0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [chatTab, setChatTab] = useState<'all' | 'buying' | 'selling'>('all');

  const loadConversations = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      await refreshChatConversations();
    } catch (err: any) {
      setLoadError(err?.message || t('chat.open_error'));
    } finally {
      setIsLoading(false);
    }
  }, [refreshChatConversations, t]);

  useEffect(() => {
    refreshChatConversations()
      .catch((err: any) => setLoadError(err?.message || t('chat.open_error')))
      .finally(() => setIsLoading(false));

    const handleChatUpdated = () => {
      refreshChatConversations();
    };
    window.addEventListener('halder:chat-updated', handleChatUpdated);

    const fallbackTimer = setInterval(() => {
      if (
        (typeof document === 'undefined' || document.visibilityState === 'visible') &&
        (typeof navigator === 'undefined' || navigator.onLine)
      ) {
        refreshChatConversations();
      }
    }, 25000);

    return () => {
      window.removeEventListener('halder:chat-updated', handleChatUpdated);
      clearInterval(fallbackTimer);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sortedConversations = [...chatConversations].sort((a, b) => {
    const tA = new Date(a.lastMessageAt || a.lastMessage?.createdAt || a.updatedAt || 0).getTime();
    const tB = new Date(b.lastMessageAt || b.lastMessage?.createdAt || b.updatedAt || 0).getTime();
    return tB - tA;
  });

  const filteredConversations = sortedConversations.filter((c: any) => {
    const isSelling = Boolean(
      c.type === 'selling' ||
        (currentUser?.farmerProfileId && c.farmerId === currentUser.farmerProfileId)
    );
    if (chatTab === 'buying' && isSelling) return false;
    if (chatTab === 'selling' && !isSelling) return false;

    const name = c.otherParty?.name || c.farmerName || c.customerName || '';
    const lastMsg = c.lastMessage?.message || '';
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return name.toLowerCase().includes(term) || lastMsg.toLowerCase().includes(term);
  });

  const handleOpenConversation = (conv: any) => {
    const other = conv.otherParty;
    const foundFarmer = farmers.find(
      (f) => f.id === conv.farmerId || f.user_id === other?.userId || f.user_id === other?.id
    );
    const fallbackId = other?.farmerProfileId || other?.userId || other?.id || conv.farmerId || conv.customerId;
    if (!foundFarmer && (!fallbackId || !other?.name)) {
      showToast(t('chat.open_error'), 'error');
      return;
    }

    const partner = foundFarmer || {
      id: fallbackId,
      user_id: other.userId || fallbackId,
      name: other.name,
      phone: other.phone || '',
      farm_name: other.farmName || other.farm_name || '',
      farmName: other.farmName || other.farm_name || '',
      location: other.location || other.city || '',
      city: other.city || other.location || '',
      latitude: 0,
      longitude: 0,
      description: '',
      verification_status: (other.verificationStatus === 'verified' ? 'verified' : 'pending') as 'verified' | 'pending',
      rating: typeof other.rating === 'number' ? other.rating : 0,
      reviews_count: 0,
      total_orders: 0,
      total_listings_count: 0,
      response_rate: 0,
      joined_year: 0,
      badges: [],
      avatar: other.avatar || '',
      cover_image: '',
      created_at: conv.createdAt || new Date().toISOString(),
      verified: other.verificationStatus === 'verified',
      bio: '',
    };

    setPendingChatInitialMessage(null);
    setChatFarmer(partner);
    setActiveConversationId(conv.id);
    setActiveConversationProductId(conv.productId || conv.product_id || null);
    setIsChatModalOpen(true);
  };

  return (
    <div className="space-y-4 pb-24 animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-zinc-900 dark:text-white">
              {t('chat.title')}
            </h2>
            {unreadChatCount > 0 && (
              <span className="px-2 py-0.5 bg-emerald-600 text-white text-xs font-bold rounded-full">
                {unreadChatCount} new
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {t('chat.subtitle')}
          </p>
        </div>

        <button
          type="button"
          onClick={loadConversations}
          disabled={isLoading}
          aria-label="Refresh conversations"
          className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-emerald-50 hover:text-emerald-600 transition"
          title="Refresh messages"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
        </button>
      </div>

      {/* Error State */}
      {loadError && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-2xl flex items-center justify-between gap-2 text-xs text-red-700 dark:text-red-300">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="truncate">{loadError}</span>
          </div>
          <button
            type="button"
            onClick={loadConversations}
            className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-[11px] shrink-0"
          >
            {t('chat.retry')}
          </button>
        </div>
      )}

      {/* Mandi Chat Sub-Tabs (All / Buying / Selling) */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800" role="tablist">
        {(['all', 'buying', 'selling'] as const).map((tabKey) => (
          <button
            type="button"
            role="tab"
            aria-selected={chatTab === tabKey}
            key={tabKey}
            onClick={() => setChatTab(tabKey)}
            className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-all ${
              chatTab === tabKey
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            {t(`chat.tab_${tabKey}`)}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t('chat.search_seller_placeholder')}
          aria-label={t('chat.search_seller_placeholder')}
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#1B201D] border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-zinc-900 dark:text-white placeholder:text-zinc-400"
        />
      </div>

      {/* Conversation List */}
      <div className="space-y-2.5" role="list">
        {isLoading && filteredConversations.length === 0 ? (
          <ChatSkeleton count={4} />
        ) : filteredConversations.length === 0 ? (
          <div className="py-12 px-4 text-center bg-white dark:bg-[#1B201D] rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto">
              <MessageCircle className="w-7 h-7" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-zinc-900 dark:text-white">
                {t('chat.no_active_chats')}
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs mx-auto">
                {t('chat.no_active_chats_desc')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCustomerTab('home')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              <span>{t('chat.explore_marketplace')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const otherName = conv.otherParty?.name || conv.farmerName || 'Participant';
            const otherAvatar = conv.otherParty?.avatar || conv.farmerAvatar || DEFAULT_AVATAR_IMAGE;
            const isVerified = conv.otherParty?.verificationStatus === 'verified';
            const isPartnerOnline = Boolean(conv.otherParty?.isOnline);
            const isMuted = Boolean(conv.isMuted);
            const lastMsg = conv.lastMessage?.deletedAt
              ? t('chat.deleted_message')
              : conv.lastMessage?.message || 'Conversation started';
            const lastMsgTime =
              conv.lastMessage?.created_at ||
              conv.lastMessage?.createdAt ||
              conv.lastMessageAt ||
              conv.updatedAt;
            const unread = conv.unreadCount || conv.unread_count || 0;
            const attachedProduct =
              conv.product || products.find((p) => p.id === (conv.productId || conv.product_id));

            return (
              <div
                key={conv.id}
                role="button"
                tabIndex={0}
                aria-label={`Open chat with ${otherName}`}
                onClick={() => handleOpenConversation(conv)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleOpenConversation(conv);
                  }
                }}
                className="p-3.5 bg-white dark:bg-[#1B201D] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 hover:border-emerald-500/50 hover:shadow-soft transition-all cursor-pointer flex items-center gap-3 relative group focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {/* User Avatar */}
                <div className="relative shrink-0">
                  <img
                    src={otherAvatar}
                    alt={otherName}
                    className="w-12 h-12 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700"
                    onError={handleAvatarError}
                  />
                  {isPartnerOnline && (
                    <span
                      className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-[#1B201D] rounded-full"
                      title={t('chat.online')}
                    />
                  )}
                  {unread > 0 && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-600 border-2 border-white dark:border-[#1B201D] rounded-full" />
                  )}
                </div>

                {/* Conversation Meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 truncate">
                      <h4 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-white truncate">
                        {otherName}
                      </h4>
                      {isVerified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                      {isMuted && (
                        <BellOff
                          className="w-3 h-3 text-zinc-400 shrink-0"
                          aria-label={t('chat.muted_label')}
                        />
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-400 shrink-0 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {formatListTime(lastMsgTime)}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate mt-0.5">
                    {lastMsg}
                  </p>

                  {attachedProduct && (
                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[10px] text-zinc-600 dark:text-zinc-300 font-medium">
                        <ShoppingBag className="w-3 h-3 text-emerald-600" />
                        <span className="truncate max-w-[160px]">{attachedProduct.name}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Unread count badge */}
                {unread > 0 && (
                  <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-full shrink-0">
                    {unread}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
