import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n';
import { useChatSocket, ChatWsMessage } from '../../hooks/useChatSocket';
import { ApiClient } from '../../api/client';
import { ChatSkeleton } from '../common/ChatSkeleton';
import { ChatAttachmentPreview } from '../chat/ChatAttachmentPreview';
import { DEFAULT_AVATAR_IMAGE, DEFAULT_PRODUCE_IMAGE, handleAvatarError, handleImageError } from '../../utils/imageFallback';
import type { ChatAttachmentItem } from '../../types';
import {
  X,
  Send,
  MessageCircle,
  Phone,
  ShieldCheck,
  MapPin,
  Check,
  CheckCheck,
  Wifi,
  WifiOff,
  Loader2,
  Paperclip,
  Reply,
  Copy,
  Pencil,
  Trash2,
  Bell,
  BellOff,
  Search,
  RotateCcw,
  AlertCircle,
  Clock,
  ArrowDown,
  FileText,
} from 'lucide-react';

interface StagedAttachment {
  localId: string;
  file: File;
  progress: number;
  status: 'uploading' | 'ready' | 'error';
  error?: string;
  uploaded?: ChatAttachmentItem;
}

function formatMessageTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getDateKey(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toDateString();
}

export const MarketplaceChatModal: React.FC = () => {
  const { isChatModalOpen, chatFarmer, activeConversationId } = useApp();
  if (!isChatModalOpen || !chatFarmer) return null;
  return <MarketplaceChatModalInner key={`${chatFarmer.id}-${activeConversationId || 'pending'}`} />;
};

const MarketplaceChatModalInner: React.FC = () => {
  const {
    isChatModalOpen,
    setIsChatModalOpen,
    chatFarmer,
    activeConversationId,
    activeConversationProductId,
    pendingChatInitialMessage,
    setPendingChatInitialMessage,
    chatConversationError,
    isOpeningChat,
    retryOpenChat,
    chatConversations,
    products,
    currentUser,
    role,
    showToast,
    currentLocation,
    activeCity,
    setSelectedProduct,
    refreshChatConversations,
  } = useApp();

  const { t } = useTranslation();
  const userCity = activeCity || (currentLocation ? currentLocation.split(',')[0].trim() : '');
  const quickReplies = [
    t('chat.quick_available'),
    t('chat.quick_order'),
    userCity ? t('chat.quick_location', { city: userCity }) : t('chat.quick_available'),
    t('chat.quick_harvest'),
  ];

  const [inputMsg, setInputMsg] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatWsMessage | null>(null);
  const [editingMsg, setEditingMsg] = useState<ChatWsMessage | null>(null);
  const [stagedAttachments, setStagedAttachments] = useState<StagedAttachment[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatWsMessage[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [muteOverrides, setMuteOverrides] = useState<Record<string, boolean>>({});
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [seenMsgCount, setSeenMsgCount] = useState(0);
  const [firstUnreadId, setFirstUnreadId] = useState<string | null>(null);

  const feedRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sentInitialForConvRef = useRef<string | null>(null);
  const unreadCapturedForConvRef = useRef<string | null>(null);

  const {
    isConnected,
    connectionStatus,
    messages,
    isLoadingHistory,
    isLoadingMore,
    hasMoreHistory,
    historyError,
    isOtherUserTyping,
    typingUserName,
    partnerPresence,
    error: socketError,
    sendMessage,
    retryMessage,
    discardFailedMessage,
    editMessage,
    deleteMessage,
    sendTyping,
    markAsRead,
    loadHistory,
    loadOlderMessages,
    searchMessages,
    reconnect,
    clearError,
  } = useChatSocket({
    conversationId: isChatModalOpen ? activeConversationId : null,
    currentUserId: currentUser?.id,
    userRole: role === 'farmer' ? 'farmer' : 'user',
  });

  // Derive mute preference cleanly without effect cascades
  const currentConvMeta = useMemo(
    () => chatConversations.find((c: any) => c.id === activeConversationId),
    [chatConversations, activeConversationId]
  );

  const isMuted = activeConversationId
    ? (muteOverrides[activeConversationId] ?? Boolean(currentConvMeta?.isMuted))
    : false;

  const hasNewWhileScrolled = !isNearBottom && messages.length > seenMsgCount;

  // Escape key closes reply/edit/search or modal
  useEffect(() => {
    if (!isChatModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isSearchOpen) {
          setIsSearchOpen(false);
          setSearchResults(null);
        } else if (editingMsg) {
          setEditingMsg(null);
          setInputMsg('');
        } else if (replyingTo) {
          setReplyingTo(null);
        } else {
          sendTyping(false);
          setIsChatModalOpen(false);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isChatModalOpen, isSearchOpen, editingMsg, replyingTo, sendTyping, setIsChatModalOpen]);

  // Send pending initial message through real-time socket/outbox once conversationId is ready
  useEffect(() => {
    if (
      isChatModalOpen &&
      activeConversationId &&
      pendingChatInitialMessage &&
      sentInitialForConvRef.current !== `${activeConversationId}:${pendingChatInitialMessage}`
    ) {
      sentInitialForConvRef.current = `${activeConversationId}:${pendingChatInitialMessage}`;
      const text = pendingChatInitialMessage;
      setPendingChatInitialMessage(null);
      sendMessage(text);
    }
  }, [isChatModalOpen, activeConversationId, pendingChatInitialMessage, setPendingChatInitialMessage, sendMessage]);

  const isSenderMe = (msg: ChatWsMessage) => {
    const senderId = msg.sender_id || msg.senderId;
    if (currentUser?.id && senderId) {
      if (senderId === currentUser.id) return true;
      if (currentUser.farmerProfileId && senderId === currentUser.farmerProfileId) return true;
    }
    if (role === 'farmer') {
      return msg.sender_role === 'farmer' || msg.senderRole === 'farmer';
    }
    return msg.sender_role === 'user' || msg.senderRole === 'user';
  };

  // Capture first unread incoming message marker on load before marking conversation read
  useEffect(() => {
    if (!isChatModalOpen || !activeConversationId || isLoadingHistory || messages.length === 0) return;
    if (unreadCapturedForConvRef.current === activeConversationId) return;

    unreadCapturedForConvRef.current = activeConversationId;
    const firstUnread = messages.find((m) => !isSenderMe(m) && !m.readAt && !m.read_at);
    setFirstUnreadId(firstUnread?.id || null);
    markAsRead();
  }, [isChatModalOpen, activeConversationId, isLoadingHistory, messages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll when near bottom
  useEffect(() => {
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isOtherUserTyping, isNearBottom]);

  // Mark incoming messages read immediately if modal is visible
  useEffect(() => {
    if (isChatModalOpen && activeConversationId && messages.some((m) => !isSenderMe(m) && !m.readAt)) {
      markAsRead();
    }
  }, [isChatModalOpen, activeConversationId, messages]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isChatModalOpen || !chatFarmer) return null;

  const productContext = activeConversationProductId
    ? products.find((p) => p.id === activeConversationProductId) || currentConvMeta?.product
    : currentConvMeta?.product;

  const isVerified = Boolean(
    chatFarmer.verification_status === 'verified' ||
      chatFarmer.verified === true ||
      currentConvMeta?.otherParty?.verificationStatus === 'verified'
  );

  const isPartnerOnline = Boolean(
    partnerPresence?.isOnline ?? currentConvMeta?.otherParty?.isOnline
  );
  const partnerLastSeen =
    partnerPresence?.lastSeenAt || currentConvMeta?.otherParty?.lastSeenAt || null;

  const isUploadingAttachment = stagedAttachments.some((a) => a.status === 'uploading');
  const readyAttachments = stagedAttachments
    .filter((a) => a.status === 'ready' && a.uploaded)
    .map((a) => a.uploaded!);

  const handleFeedScroll = () => {
    const el = feedRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const near = distanceFromBottom < 80;
    setIsNearBottom(near);
    if (near) setSeenMsgCount(messages.length);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputMsg(val);
    if (!editingMsg) {
      sendTyping(val.trim().length > 0);
    }
  };

  const startAttachmentUpload = async (localId: string, file: File) => {
    if (!activeConversationId) return;
    setStagedAttachments((prev) =>
      prev.map((a) => (a.localId === localId ? { ...a, status: 'uploading', progress: 0, error: undefined } : a))
    );
    try {
      const uploaded = await ApiClient.uploadChatAttachment(activeConversationId, file, (pct) => {
        setStagedAttachments((prev) =>
          prev.map((a) => (a.localId === localId ? { ...a, progress: pct } : a))
        );
      });
      setStagedAttachments((prev) =>
        prev.map((a) =>
          a.localId === localId ? { ...a, status: 'ready', progress: 100, uploaded } : a
        )
      );
    } catch (err: any) {
      setStagedAttachments((prev) =>
        prev.map((a) =>
          a.localId === localId
            ? { ...a, status: 'error', error: err?.message || 'Upload failed' }
            : a
        )
      );
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    if (!activeConversationId) {
      showToast('Wait for conversation to connect before attaching files.', 'info');
      return;
    }

    for (const file of files.slice(0, 5 - stagedAttachments.length)) {
      const localId = `att-up-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setStagedAttachments((prev) => [
        ...prev,
        { localId, file, progress: 0, status: 'uploading' },
      ]);
      startAttachmentUpload(localId, file);
    }
  };

  const handleSend = async (textOverride?: string) => {
    const text = (textOverride !== undefined ? textOverride : inputMsg).trim();

    if (editingMsg && textOverride === undefined) {
      if (!text) return;
      const updated = await editMessage(editingMsg.id, text);
      if (updated) {
        setEditingMsg(null);
        setInputMsg('');
      }
      return;
    }

    if (!text && readyAttachments.length === 0) return;
    if (isUploadingAttachment) {
      showToast('Please wait for attachments to finish uploading.', 'info');
      return;
    }

    const attachmentIds = readyAttachments.map((a) => a.id);
    const replyTarget = replyingTo;

    if (textOverride === undefined) {
      setInputMsg('');
      setReplyingTo(null);
      setStagedAttachments([]);
    }
    sendTyping(false);

    await sendMessage(text, {
      replyToId: replyTarget?.id || null,
      replyTo: replyTarget
        ? {
            id: replyTarget.id,
            senderId: replyTarget.senderId,
            senderRole: replyTarget.senderRole,
            message: replyTarget.deletedAt ? t('chat.deleted_message') : replyTarget.message,
            deletedAt: replyTarget.deletedAt || null,
          }
        : null,
      attachmentIds: attachmentIds.length > 0 ? attachmentIds : undefined,
      attachments: readyAttachments.length > 0 ? readyAttachments : undefined,
    });
    setIsNearBottom(true);
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleToggleMute = async () => {
    if (!activeConversationId) return;
    const nextMuted = !isMuted;
    setMuteOverrides((prev) => ({ ...prev, [activeConversationId]: nextMuted }));
    try {
      await ApiClient.setConversationMuted(activeConversationId, nextMuted);
      refreshChatConversations();
      showToast(nextMuted ? t('chat.mute') : t('chat.unmute'), 'info');
    } catch (err: any) {
      setMuteOverrides((prev) => ({ ...prev, [activeConversationId]: !nextMuted }));
      showToast(err?.message || 'Failed to update mute preference', 'error');
    }
  };

  const handleRunSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    setIsSearching(true);
    try {
      const found = await searchMessages(searchQuery);
      setSearchResults(found);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const renderDateLabel = (dateStr?: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return t('chat.today');
    if (d.toDateString() === yesterday.toDateString()) return t('chat.yesterday');
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const displayedMessages = searchResults !== null ? searchResults : messages;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={`Chat with ${chatFarmer.name}`}
    >
      <div
        className="w-full h-full sm:h-[85vh] max-w-lg md:max-w-xl bg-white dark:bg-[#1B201D] rounded-none sm:rounded-3xl shadow-2xl border-0 sm:border border-zinc-200 dark:border-zinc-800 max-h-[100dvh] sm:max-h-[780px] flex flex-col overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/60 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <img
                src={chatFarmer.avatar || DEFAULT_AVATAR_IMAGE}
                alt={chatFarmer.name}
                onError={handleAvatarError}
                className="w-10 h-10 rounded-full object-cover border-2 border-emerald-600/30"
              />
              <span
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-[#1B201D] ${
                  isPartnerOnline ? 'bg-emerald-500' : 'bg-zinc-400'
                }`}
                title={isPartnerOnline ? t('chat.online') : t('chat.offline')}
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                  {chatFarmer.name}
                </h4>
                {isVerified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 truncate">
                {chatFarmer.farmName || chatFarmer.farm_name ? (
                  <>
                    <span className="truncate">{chatFarmer.farmName || chatFarmer.farm_name}</span>
                    <span>•</span>
                  </>
                ) : null}
                <span className={isPartnerOnline ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-zinc-400'}>
                  {isPartnerOnline
                    ? t('chat.online')
                    : partnerLastSeen
                      ? t('chat.last_seen', { time: formatMessageTime(partnerLastSeen) })
                      : t('chat.offline')}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {chatFarmer.phone && (
              <a
                href={`tel:${chatFarmer.phone}`}
                onClick={() => showToast(`Calling ${chatFarmer.name} (${chatFarmer.phone})`, 'info')}
                aria-label={`Call ${chatFarmer.name}`}
                className="p-2 rounded-full text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors inline-flex items-center justify-center"
                title="Call Participant"
              >
                <Phone className="w-4 h-4" />
              </a>
            )}
            {activeConversationId && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIsSearchOpen((v) => !v);
                    if (isSearchOpen) setSearchResults(null);
                  }}
                  aria-label={t('chat.search_messages')}
                  title={t('chat.search_messages')}
                  className={`p-2 rounded-full transition-colors ${
                    isSearchOpen
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                      : 'text-zinc-500 hover:bg-zinc-200/70 dark:hover:bg-zinc-700'
                  }`}
                >
                  <Search className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleToggleMute}
                  aria-label={isMuted ? t('chat.unmute') : t('chat.mute')}
                  title={isMuted ? t('chat.unmute') : t('chat.mute')}
                  className="p-2 rounded-full text-zinc-500 hover:bg-zinc-200/70 dark:hover:bg-zinc-700 transition-colors"
                >
                  {isMuted ? <BellOff className="w-4 h-4 text-amber-500" /> : <Bell className="w-4 h-4" />}
                </button>
              </>
            )}
            {isConnected ? (
              <span className="p-2 rounded-full text-emerald-600 dark:text-emerald-400 inline-flex items-center justify-center" title="Live WebSocket Connected">
                <Wifi className="w-4 h-4" />
              </span>
            ) : (
              <button
                type="button"
                onClick={reconnect}
                aria-label="Reconnect live chat"
                className="p-2 rounded-full text-amber-500 hover:text-emerald-600 transition-colors"
                title={t('chat.reconnecting')}
              >
                <WifiOff className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                sendTyping(false);
                setIsChatModalOpen(false);
              }}
              aria-label={t('common.close')}
              className="p-2 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
              title={t('common.close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Network / Connection Status Banner */}
        {connectionStatus === 'offline' && (
          <div role="status" className="px-4 py-1.5 bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 text-[11px] font-semibold flex items-center justify-center gap-1.5 border-b border-red-200 dark:border-red-900/50 shrink-0">
            <WifiOff className="w-3.5 h-3.5 shrink-0" />
            <span>{t('chat.offline_banner')}</span>
          </div>
        )}
        {(connectionStatus === 'reconnecting' || connectionStatus === 'connecting') && activeConversationId && (
          <div role="status" className="px-4 py-1.5 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 text-[11px] font-medium flex items-center justify-between gap-2 border-b border-amber-200/70 dark:border-amber-900/50 shrink-0">
            <span className="flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              {t('chat.reconnecting')}
            </span>
            <button type="button" onClick={reconnect} className="underline font-bold">
              {t('chat.retry')}
            </button>
          </div>
        )}

        {/* Search In Chat Bar */}
        {isSearchOpen && (
          <form onSubmit={handleRunSearch} className="px-3.5 py-2 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2 shrink-0">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!e.target.value.trim()) setSearchResults(null);
              }}
              placeholder={t('chat.search_messages')}
              aria-label={t('chat.search_messages')}
              autoFocus
              className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shrink-0"
            >
              {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t('nav.search')}
            </button>
          </form>
        )}

        {/* Product Context Banner (Price-free per Haldhar standard) */}
        {productContext && (
          <div
            onClick={() => 'price' in productContext && setSelectedProduct(productContext as any)}
            className="px-4 py-2 bg-emerald-50/80 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between gap-2 shrink-0 cursor-pointer hover:bg-emerald-100/70 transition"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={productContext.image || DEFAULT_PRODUCE_IMAGE}
                alt={productContext.name}
                onError={handleImageError}
                className="w-9 h-9 rounded-lg object-cover border border-emerald-200 dark:border-emerald-800/60 shrink-0"
              />
              <div className="min-w-0">
                <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                  {productContext.name}
                </p>
                {'availableQuantity' in productContext && (
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                    {productContext.availableQuantity} {productContext.unit} {t('catalog.in_stock')}
                  </p>
                )}
              </div>
            </div>
            {'price' in productContext && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedProduct(productContext as any);
                }}
                className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded-lg shrink-0 shadow-2xs transition"
              >
                {t('chat.view_ad')}
              </button>
            )}
          </div>
        )}

        {/* Security Banner */}
        <div className="bg-zinc-100/70 dark:bg-zinc-800/40 px-4 py-1 text-[10px] text-zinc-500 dark:text-zinc-400 text-center flex items-center justify-center gap-1.5 shrink-0 border-b border-zinc-100 dark:border-zinc-800/60">
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          <span>{t('chat.secure_encrypted')}</span>
        </div>

        {/* Socket / Validation Error */}
        {socketError && (
          <div role="alert" className="mx-3 mt-2 px-3 py-2 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl flex items-center justify-between gap-2 text-[11px] text-red-700 dark:text-red-300 shrink-0">
            <span className="truncate">{socketError}</span>
            <button type="button" onClick={clearError} aria-label={t('common.close')} className="shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Messages Feed */}
        <div
          ref={feedRef}
          onScroll={handleFeedScroll}
          className="relative p-4 space-y-2 overflow-y-auto flex-1 text-xs"
          aria-live="polite"
        >
          {/* Conversation Opening Error */}
          {chatConversationError && !activeConversationId ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <AlertCircle className="w-10 h-10 text-red-500" />
              <p className="font-semibold text-zinc-800 dark:text-zinc-200 text-xs max-w-xs">
                {chatConversationError}
              </p>
              <button
                type="button"
                onClick={retryOpenChat}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('chat.retry')}</span>
              </button>
            </div>
          ) : (isOpeningChat && !activeConversationId) || (isLoadingHistory && messages.length === 0) ? (
            <ChatSkeleton count={5} />
          ) : historyError && messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <AlertCircle className="w-9 h-9 text-red-500" />
              <p className="text-xs text-zinc-600 dark:text-zinc-300">{historyError}</p>
              <button
                type="button"
                onClick={() => loadHistory()}
                className="px-4 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('chat.retry')}</span>
              </button>
            </div>
          ) : displayedMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400">
              <MessageCircle className="w-10 h-10 text-emerald-500/40 mb-2 stroke-[1.5]" />
              <p className="font-semibold text-zinc-700 dark:text-zinc-300 text-xs">
                {searchResults !== null ? 'No matching messages found' : t('chat.start_conversation')}
              </p>
              {searchResults === null && (
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 max-w-xs mt-1">
                  {t('chat.start_conversation_desc')}
                </p>
              )}
            </div>
          ) : (
            <>
              {hasMoreHistory && searchResults === null && (
                <div className="flex justify-center pb-2">
                  <button
                    type="button"
                    onClick={loadOlderMessages}
                    disabled={isLoadingMore}
                    className="px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 text-[11px] font-semibold inline-flex items-center gap-1.5"
                  >
                    {isLoadingMore && <Loader2 className="w-3 h-3 animate-spin" />}
                    <span>{t('chat.load_older')}</span>
                  </button>
                </div>
              )}

              {displayedMessages.map((msg, idx) => {
                const isMe = isSenderMe(msg);
                const prevMsg = idx > 0 ? displayedMessages[idx - 1] : null;
                const currentDate = getDateKey(msg.createdAt || msg.created_at);
                const prevDate = prevMsg ? getDateKey(prevMsg.createdAt || prevMsg.created_at) : '';
                const showDateDivider = currentDate && currentDate !== prevDate;
                const isGroupedWithPrev =
                  prevMsg &&
                  !showDateDivider &&
                  isSenderMe(prevMsg) === isMe &&
                  Math.abs(
                    new Date(msg.createdAt || msg.created_at || 0).getTime() -
                      new Date(prevMsg.createdAt || prevMsg.created_at || 0).getTime()
                  ) < 180000;

                const isDeleted = Boolean(msg.deletedAt || msg.deleted_at);
                const isEdited = Boolean(msg.editedAt || msg.edited_at);
                const status = msg.status || (msg.readAt || msg.read_at ? 'read' : msg.deliveredAt || msg.delivered_at ? 'delivered' : 'sent');

                return (
                  <React.Fragment key={msg.id}>
                    {showDateDivider && (
                      <div className="flex items-center justify-center py-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
                          {renderDateLabel(msg.createdAt || msg.created_at)}
                        </span>
                      </div>
                    )}

                    {firstUnreadId === msg.id && (
                      <div className="flex items-center gap-2 py-1">
                        <div className="flex-1 h-px bg-emerald-300 dark:bg-emerald-800" />
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                          {t('chat.new_messages')}
                        </span>
                        <div className="flex-1 h-px bg-emerald-300 dark:bg-emerald-800" />
                      </div>
                    )}

                    <div
                      className={`group flex flex-col ${isMe ? 'items-end' : 'items-start'} ${
                        isGroupedWithPrev ? 'mt-0.5' : 'mt-2.5'
                      }`}
                    >
                      <div className={`flex items-end gap-1.5 max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div
                          className={`p-2.5 sm:p-3 rounded-2xl shadow-2xs ${
                            isDeleted
                              ? 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-400 italic border border-dashed border-zinc-300 dark:border-zinc-700'
                              : isMe
                                ? status === 'failed'
                                  ? 'bg-red-600 text-white rounded-br-xs'
                                  : 'bg-emerald-600 text-white rounded-br-xs'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 rounded-bl-xs'
                          }`}
                        >
                          {/* Quoted Reply Block */}
                          {!isDeleted && msg.replyTo && (
                            <div
                              className={`mb-1.5 px-2.5 py-1 rounded-lg border-l-2 text-[11px] truncate max-w-[240px] ${
                                isMe
                                  ? 'bg-emerald-700/60 border-white/60 text-emerald-50'
                                  : 'bg-zinc-200/70 dark:bg-zinc-700/70 border-emerald-500 text-zinc-600 dark:text-zinc-300'
                              }`}
                            >
                              {msg.replyTo.deletedAt ? t('chat.deleted_message') : msg.replyTo.message}
                            </div>
                          )}

                          {isDeleted ? (
                            <p className="text-[11px]">{t('chat.deleted_message')}</p>
                          ) : (
                            <>
                              {msg.message && (
                                <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.message}</p>
                              )}
                              {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                                <div className="space-y-1.5">
                                  {msg.attachments.map((att) => (
                                    <ChatAttachmentPreview key={att.id} attachment={att} isMine={isMe} />
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {/* Contextual Message Actions */}
                        {!isDeleted && status !== 'sending' && status !== 'failed' && (
                          <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity shrink-0">
                            <button
                              type="button"
                              onClick={() => setReplyingTo(msg)}
                              aria-label={t('chat.reply')}
                              title={t('chat.reply')}
                              className="p-1 rounded-lg text-zinc-400 hover:text-emerald-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            >
                              <Reply className="w-3.5 h-3.5" />
                            </button>
                            {msg.message && (
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard?.writeText(msg.message);
                                  showToast(t('chat.copied_clipboard', { text: msg.message.slice(0, 32) }), 'info');
                                }}
                                aria-label={t('chat.copy')}
                                title={t('chat.copy')}
                                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {isMe && (
                              <>
                                {msg.message && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingMsg(msg);
                                      setReplyingTo(null);
                                      setInputMsg(msg.message);
                                    }}
                                    aria-label={t('chat.edit')}
                                    title={t('chat.edit')}
                                    className="p-1 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => deleteMessage(msg.id)}
                                  aria-label={t('chat.delete')}
                                  title={t('chat.delete')}
                                  className="p-1 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Timestamp + 5-State Delivery Receipt + Failed Retry Controls */}
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mt-0.5 px-1">
                        <span>{formatMessageTime(msg.created_at || msg.createdAt)}</span>
                        {isEdited && !isDeleted && <span>• {t('chat.edited')}</span>}

                        {isMe && (
                          <>
                            {status === 'sending' && (
                              <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400" title={t('chat.sending')}>
                                <Clock className="w-3 h-3 animate-pulse" />
                                <span>{t('chat.sending')}</span>
                              </span>
                            )}
                            {status === 'sent' && (
                              <span className="inline-flex items-center text-zinc-400" title={t('chat.sent')} aria-label={t('chat.sent')}>
                                <Check className="w-3.5 h-3.5" />
                              </span>
                            )}
                            {status === 'delivered' && (
                              <span className="inline-flex items-center text-zinc-500 dark:text-zinc-300" title={t('chat.delivered')} aria-label={t('chat.delivered')}>
                                <CheckCheck className="w-3.5 h-3.5" />
                              </span>
                            )}
                            {status === 'read' && (
                              <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-semibold" title={t('chat.read')} aria-label={t('chat.read')}>
                                <CheckCheck className="w-3.5 h-3.5" />
                              </span>
                            )}
                            {status === 'failed' && (
                              <div className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400 font-semibold">
                                <AlertCircle className="w-3 h-3" />
                                <span>{msg.error || t('chat.failed')}</span>
                                <button
                                  type="button"
                                  onClick={() => retryMessage(msg.clientMessageId || msg.id)}
                                  className="underline hover:text-red-700"
                                >
                                  {t('chat.retry')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => discardFailedMessage(msg.clientMessageId || msg.id)}
                                  className="text-zinc-400 hover:text-zinc-600 underline"
                                >
                                  {t('chat.discard')}
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </>
          )}

          {/* Live Typing Indicator */}
          {isOtherUserTyping && (
            <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-xs px-1 animate-fade-in">
              <div className="bg-zinc-100 dark:bg-zinc-800 p-2.5 rounded-2xl rounded-bl-xs flex items-center gap-1.5 shadow-2xs">
                <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                  {t('chat.typing', { name: typingUserName || chatFarmer.name })}
                </span>
                <div className="flex gap-1 items-center ml-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />

          {/* Floating Scroll-to-Bottom New Message Pill */}
          {hasNewWhileScrolled && (
            <button
              type="button"
              onClick={() => {
                setIsNearBottom(true);
                setSeenMsgCount(messages.length);
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="sticky bottom-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg text-[11px] font-bold inline-flex items-center gap-1 z-10"
            >
              <span>{t('chat.new_messages')}</span>
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Replying / Editing Preview Strip */}
        {(replyingTo || editingMsg) && (
          <div className="px-3.5 py-2 bg-emerald-50/70 dark:bg-emerald-950/30 border-t border-emerald-200 dark:border-emerald-900/50 flex items-center justify-between gap-2 text-[11px] shrink-0">
            <div className="min-w-0">
              <span className="font-bold text-emerald-700 dark:text-emerald-300 block">
                {editingMsg ? t('chat.editing') : t('chat.replying_to')}
              </span>
              <p className="text-zinc-600 dark:text-zinc-300 truncate">
                {(editingMsg || replyingTo)?.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setReplyingTo(null);
                if (editingMsg) {
                  setEditingMsg(null);
                  setInputMsg('');
                }
              }}
              aria-label={t('common.close')}
              className="p-1 text-zinc-400 hover:text-zinc-700 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Staged Attachment Upload Queue */}
        {stagedAttachments.length > 0 && (
          <div className="px-3.5 py-2 bg-zinc-50 dark:bg-zinc-900/60 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap gap-2 shrink-0">
            {stagedAttachments.map((att) => (
              <div
                key={att.localId}
                className={`px-2.5 py-1.5 rounded-xl border text-[11px] flex items-center gap-2 max-w-[230px] ${
                  att.status === 'error'
                    ? 'border-red-300 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300'
                    : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{att.file.name}</p>
                  {att.status === 'uploading' && (
                    <div className="w-full h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full bg-emerald-600 transition-all"
                        style={{ width: `${att.progress}%` }}
                      />
                    </div>
                  )}
                  {att.status === 'error' && (
                    <button
                      type="button"
                      onClick={() => startAttachmentUpload(att.localId, att.file)}
                      className="text-[10px] underline font-bold"
                    >
                      {att.error || t('chat.retry')}
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setStagedAttachments((prev) => prev.filter((x) => x.localId !== att.localId))}
                  aria-label="Remove attachment"
                  className="text-zinc-400 hover:text-zinc-700 shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Mandi Quick Action Shortcuts */}
        <div className="px-3.5 pt-2 pb-1 bg-zinc-50/70 dark:bg-zinc-900/40 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 border-t border-zinc-100 dark:border-zinc-800">
          {userCity && (
            <button
              type="button"
              onClick={() => handleSend(t('chat.action_send_location_msg', { location: currentLocation || userCity }))}
              className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[10px] font-bold text-zinc-700 dark:text-zinc-200 hover:border-emerald-500 shadow-2xs"
            >
              <MapPin className="w-3 h-3 text-emerald-600" />
              <span>{t('chat.action_send_location')}</span>
            </button>
          )}
          {currentUser?.phone && (
            <button
              type="button"
              onClick={() => handleSend(t('chat.action_share_phone_msg', { phone: currentUser.phone }))}
              className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[10px] font-bold text-zinc-700 dark:text-zinc-200 hover:border-blue-500 shadow-2xs"
            >
              <Phone className="w-3 h-3 text-blue-600" />
              <span>{t('chat.action_share_phone')}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => handleSend(t('chat.action_final_price_msg'))}
            className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[10px] font-bold text-zinc-700 dark:text-zinc-200 hover:border-amber-500 shadow-2xs"
          >
            <span className="text-amber-500">🤝</span>
            <span>{t('chat.action_final_price')}</span>
          </button>
        </div>

        {/* Quick Inquiry Chips */}
        <div className="px-3.5 py-1.5 bg-zinc-50/70 dark:bg-zinc-900/40 flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {quickReplies.map((q, i) => (
            <button
              type="button"
              key={i}
              onClick={() => handleSend(q)}
              className="shrink-0 px-2.5 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-full text-[10px] font-medium hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors shadow-2xs"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-[#1B201D] flex items-center gap-2 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom,0.75rem))]">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf,.doc,.docx,text/plain"
            multiple
            className="hidden"
            onChange={handleFileSelected}
          />
          {!editingMsg && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!activeConversationId}
              aria-label={t('chat.attach_file')}
              title={t('chat.attach_file')}
              className="p-2.5 text-zinc-500 hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-400 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors"
            >
              <Paperclip className="w-4 h-4" />
            </button>
          )}
          <input
            type="text"
            value={inputMsg}
            onChange={handleInputChange}
            onBlur={() => sendTyping(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={t('chat.type_a_message', { name: chatFarmer.name })}
            aria-label={t('chat.type_a_message', { name: chatFarmer.name })}
            className="flex-1 px-4 py-2.5 text-base sm:text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-zinc-400"
          />
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={(!inputMsg.trim() && readyAttachments.length === 0) || isUploadingAttachment || !activeConversationId}
            aria-label={t('chat.send')}
            className="p-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-2xl transition-all active:scale-95 shadow-soft"
            title={t('chat.send')}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
