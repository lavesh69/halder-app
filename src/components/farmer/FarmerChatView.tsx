import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n';
import { handleAvatarError, DEFAULT_AVATAR_IMAGE } from '../../utils/imageFallback';
import { ChatSkeleton } from '../common/ChatSkeleton';
import {
  MessageCircle,
  Search,
  ShieldCheck,
  RefreshCw,
  ShoppingBag,
  CheckCheck,
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

export const FarmerChatView: React.FC = () => {
  const {
    chatConversations,
    refreshChatConversations,
    setChatFarmer,
    setActiveConversationId,
    setActiveConversationProductId,
    setPendingChatInitialMessage,
    setIsChatModalOpen,
    unreadChatCount,
    showToast,
  } = useApp();

  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(() => chatConversations.length === 0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const quickAnswers = [
    t('chat.farmer_quick_1'),
    t('chat.farmer_quick_2'),
    t('chat.farmer_quick_3'),
    t('chat.farmer_quick_4'),
  ];

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

    // Visibility-aware fallback sync (25s instead of tight polling)
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
    const name = c.otherParty?.name || c.customerName || '';
    const lastMsg = c.lastMessage?.message || '';
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return name.toLowerCase().includes(term) || lastMsg.toLowerCase().includes(term);
  });

  const handleOpenConversation = (conv: any) => {
    const other = conv.otherParty;
    const partnerId = other?.farmerProfileId || other?.userId || other?.id || conv.customerId;
    if (!partnerId || !other?.name) {
      showToast(t('chat.open_error'), 'error');
      return;
    }

    const partner = {
      id: partnerId,
      user_id: other.userId || partnerId,
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
            {t('chat.farmer_subtitle')}
          </p>
        </div>

        <button
          type="button"
          onClick={loadConversations}
          disabled={isLoading}
          aria-label="Refresh conversations"
          className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          title="Refresh Messages"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
        </button>
      </div>

      {/* Error State Banner */}
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

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t('chat.search_customer_placeholder')}
          aria-label={t('chat.search_customer_placeholder')}
          className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-[#1B201D] border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
        />
      </div>

      {/* Quick Reply Suggestions for Farmers */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        <span className="text-[10px] uppercase font-bold text-zinc-400 shrink-0">{t('chat.quick_replies_label')}</span>
        {quickAnswers.map((reply, i) => (
          <button
            type="button"
            key={i}
            onClick={() => {
              navigator.clipboard?.writeText(reply);
              showToast(t('chat.copied_clipboard', { text: reply }), 'info');
            }}
            className="px-2.5 py-1 bg-white dark:bg-[#1B201D] text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 rounded-full text-[11px] font-semibold shrink-0 hover:border-emerald-500 hover:text-emerald-600 transition shadow-2xs"
            title="Click to copy quick answer"
          >
            {reply}
          </button>
        ))}
      </div>

      {/* Conversations List */}
      {isLoading && filteredConversations.length === 0 ? (
        <ChatSkeleton count={4} />
      ) : filteredConversations.length === 0 ? (
        <div className="p-5 sm:p-8 text-center bg-white dark:bg-[#1B201D] rounded-3xl border border-zinc-200 dark:border-zinc-800">
          <MessageCircle className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
          <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
            {t('chat.no_conversations')}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs mx-auto">
            {t('chat.no_conversations_desc')}
          </p>
        </div>
      ) : (
        <div className="space-y-2" role="list">
          {filteredConversations.map((conv) => {
            const partnerName = conv.otherParty?.name || 'Customer';
            const partnerAvatar = conv.otherParty?.avatar || DEFAULT_AVATAR_IMAGE;
            const isVerified = conv.otherParty?.verificationStatus === 'verified';
            const isPartnerOnline = Boolean(conv.otherParty?.isOnline);
            const isMuted = Boolean(conv.isMuted);
            const unread = conv.unreadCount || conv.unread_count || 0;
            const lastMsgText = conv.lastMessage?.deletedAt
              ? t('chat.deleted_message')
              : conv.lastMessage?.message || conv.lastMessageText || 'Conversation started';
            const lastMsgTime =
              conv.lastMessage?.created_at ||
              conv.lastMessage?.createdAt ||
              conv.lastMessageAt ||
              conv.updatedAt;

            return (
              <div
                key={conv.id}
                role="button"
                tabIndex={0}
                aria-label={`Open chat with ${partnerName}`}
                onClick={() => handleOpenConversation(conv)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleOpenConversation(conv);
                  }
                }}
                className="p-3.5 bg-white dark:bg-[#1B201D] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 hover:border-emerald-500 dark:hover:border-emerald-500 cursor-pointer transition-all shadow-2xs flex items-center justify-between gap-3 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={partnerAvatar}
                      alt={partnerName}
                      className="w-11 h-11 rounded-full object-cover border-2 border-emerald-600/20"
                      onError={handleAvatarError}
                    />
                    {isPartnerOnline && (
                      <span
                        className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-[#1B201D] rounded-full"
                        title={t('chat.online')}
                      />
                    )}
                    {unread > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-[#1B201D]">
                        {unread}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-xs text-zinc-900 dark:text-white truncate">
                        {partnerName}
                      </h4>
                      {isVerified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                      {isMuted && (
                        <BellOff
                          className="w-3 h-3 text-zinc-400 shrink-0"
                          aria-label={t('chat.muted_label')}
                        />
                      )}
                    </div>

                    <p
                      className={`text-xs truncate mt-0.5 ${
                        unread > 0 ? 'font-semibold text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      {lastMsgText}
                    </p>

                    {conv.product && (
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-700 dark:text-emerald-400">
                        <ShoppingBag className="w-3 h-3 shrink-0" />
                        <span className="truncate">{conv.product.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] text-zinc-400">{formatListTime(lastMsgTime)}</span>
                  {unread > 0 ? (
                    <div className="mt-1">
                      <span className="inline-block px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold rounded-md">
                        {t('chat.unread_messages', { count: String(unread) })}
                      </span>
                    </div>
                  ) : (
                    <div className="mt-1 flex justify-end text-emerald-600">
                      <CheckCheck className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
