import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n';
import { useChatSocket, ChatWsMessage } from '../../hooks/useChatSocket';
import { ApiClient } from '../../api/client';
import {
  X,
  Send,
  MessageCircle,
  Phone,
  ShieldCheck,
  MapPin,
  Sparkles,
  Check,
  CheckCheck,
  Wifi,
  WifiOff,
  ShoppingBag,
  Loader2,
  ArrowRight,
} from 'lucide-react';

export const MarketplaceChatModal: React.FC = () => {
  const {
    isChatModalOpen,
    setIsChatModalOpen,
    chatFarmer,
    activeConversationId,
    setActiveConversationId,
    activeConversationProductId,
    products,
    currentUser,
    role,
    showToast,
    currentLocation,
    activeCity,
    setSelectedProduct,
  } = useApp();

  const { t } = useTranslation();
  const userCity = activeCity || (currentLocation ? currentLocation.split(',')[0].trim() : '') || 'Local Mandi';
  const quickReplies = [
    t('chat.quick_available'),
    t('chat.quick_order'),
    t('chat.quick_location', { city: userCity }),
    t('chat.quick_harvest'),
  ];
  const [inputMsg, setInputMsg] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Hook for real-time WebSocket messaging, typing indicator, and read receipts
  const {
    isConnected,
    isConnecting,
    messages,
    isOtherUserTyping,
    typingUserName,
    sendMessage,
    sendTyping,
    markAsRead,
    reconnect,
  } = useChatSocket({
    conversationId: activeConversationId,
    currentUserId: currentUser?.id,
    userRole: role === 'farmer' ? 'farmer' : 'user',
  });

  // Ensure backend SQLite conversation exists when modal is opened
  useEffect(() => {
    if (isChatModalOpen && chatFarmer && !activeConversationId) {
      ApiClient.createConversation(chatFarmer.id, activeConversationProductId || undefined)
        .then((res: any) => {
          const conv = res?.data || res;
          if (conv?.id) {
            setActiveConversationId(conv.id);
          }
        })
        .catch((e) => {
          console.warn('[MarketplaceChatModal] Conversation init fallback:', e.message);
          setActiveConversationId(`conv-${chatFarmer.id}`);
        });
    }
  }, [isChatModalOpen, chatFarmer, activeConversationId, activeConversationProductId, setActiveConversationId]);

  // Mark messages as read when modal opens or conversation is active
  useEffect(() => {
    if (isChatModalOpen && activeConversationId) {
      markAsRead();
    }
  }, [isChatModalOpen, activeConversationId, markAsRead]);

  // Auto-scroll to newest message
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOtherUserTyping]);

  if (!isChatModalOpen || !chatFarmer) return null;

  // Find product context if attached
  const productContext = activeConversationProductId
    ? products.find((p) => p.id === activeConversationProductId)
    : null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputMsg(val);
    sendTyping(val.trim().length > 0);
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputMsg).trim();
    if (!text) return;

    setInputMsg('');
    sendTyping(false);

    try {
      await sendMessage(text);
      scrollToBottom();
    } catch (err: any) {
      showToast(err.message || 'Failed to send message', 'error');
    }
  };

  const formatMessageTime = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
      <div
        className="w-full h-full sm:h-[80vh] max-w-lg md:max-w-xl bg-white dark:bg-[#1B201D] rounded-none sm:rounded-3xl shadow-2xl border-0 sm:border border-zinc-200 dark:border-zinc-800 max-h-[100dvh] sm:max-h-[750px] flex flex-col overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/60 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <img
                src={chatFarmer.avatar || 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=200'}
                alt={chatFarmer.name}
                className="w-10 h-10 rounded-full object-cover border-2 border-emerald-600/30"
              />
              <span
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-[#1B201D] ${
                  isConnected ? 'bg-emerald-500' : isConnecting ? 'bg-amber-500 animate-pulse' : 'bg-zinc-400'
                }`}
                title={isConnected ? t('chat.online') : isConnecting ? t('chat.connecting') : t('chat.offline')}
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                  {chatFarmer.name}
                </h4>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 truncate">
                <span>{chatFarmer.farmName || 'Kisan Direct'}</span>
                <span>•</span>
                <span className={isConnected ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-zinc-400'}>
                  {isConnected ? `🟢 ${t('chat.online')}` : isConnecting ? `🟡 ${t('chat.connecting')}` : `🔴 ${t('chat.offline')}`}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {chatFarmer.phone && (
              <a
                href={`tel:${chatFarmer.phone}`}
                onClick={() => showToast(`Calling ${chatFarmer.name} (${chatFarmer.phone})`, 'info')}
                className="p-2 rounded-full text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors inline-flex items-center justify-center"
                title="Call Farmer"
              >
                <Phone className="w-4 h-4" />
              </a>
            )}
            {!isConnected && !isConnecting && (
              <button
                onClick={() => reconnect()}
                className="p-2 rounded-full text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                title="Reconnect WebSocket"
              >
                <WifiOff className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => {
                sendTyping(false);
                setIsChatModalOpen(false);
              }}
              aria-label="Close modal"
              className="p-2 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
              title={t('common.close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Product Context Banner (In-Chat Clickable Ad Card) */}
        {productContext && (
          <div
            onClick={() => setSelectedProduct(productContext)}
            className="px-4 py-2 bg-emerald-50/80 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between gap-2 shrink-0 cursor-pointer hover:bg-emerald-100/70 transition"
            title="Click to view full Ad details"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={productContext.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200'}
                alt={productContext.name}
                className="w-9 h-9 rounded-lg object-cover border border-emerald-200 dark:border-emerald-800/60 shrink-0"
              />
              <div className="min-w-0">
                <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                  {productContext.name}
                </p>
                <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                  ₹{productContext.price} / {productContext.unit} • {productContext.availableQuantity} {productContext.unit} {t('catalog.in_stock')}
                </p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedProduct(productContext);
              }}
              className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded-lg shrink-0 shadow-2xs transition"
            >
              {t('chat.view_ad')}
            </button>
          </div>
        )}

        {/* Zero-Trust Encrypted Banner */}
        <div className="bg-zinc-100/70 dark:bg-zinc-800/40 px-4 py-1 text-[10px] text-zinc-500 dark:text-zinc-400 text-center flex items-center justify-center gap-1.5 shrink-0 border-b border-zinc-100 dark:border-zinc-800/60">
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          <span>{t('chat.secure_encrypted')}</span>
        </div>

        {/* Messages Feed */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1 text-xs">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400">
              <MessageCircle className="w-10 h-10 text-emerald-500/40 mb-2 stroke-[1.5]" />
              <p className="font-semibold text-zinc-700 dark:text-zinc-300 text-xs">
                {t('chat.start_conversation')}
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 max-w-xs mt-1">
                {t('chat.start_conversation_desc')}
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = isSenderMe(msg);
              const isRead = Boolean(msg.read_at || msg.readAt);

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fade-in`}
                >
                  <div
                    className={`max-w-[82%] p-3 rounded-2xl shadow-2xs ${
                      isMe
                        ? 'bg-emerald-600 text-white rounded-br-xs'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 rounded-bl-xs'
                    }`}
                  >
                    <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.message}</p>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-zinc-400 mt-1 px-1">
                    <span>{formatMessageTime(msg.created_at || msg.createdAt)}</span>
                    {isMe && (
                      <span
                        className={`flex items-center ${isRead ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-zinc-400'}`}
                        title={isRead ? t('chat.read') : t('chat.delivered')}
                      >
                        {isRead ? <CheckCheck className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
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
        </div>

        {/* Mandi Quick Action Shortcuts */}
        <div className="px-3.5 pt-2 pb-1 bg-zinc-50/70 dark:bg-zinc-900/40 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 border-t border-zinc-100 dark:border-zinc-800">
          <button
            onClick={() => handleSend(t('chat.action_send_location_msg', { location: currentLocation || userCity }))}
            className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[10px] font-bold text-zinc-700 dark:text-zinc-200 hover:border-emerald-500 shadow-2xs"
          >
            <MapPin className="w-3 h-3 text-emerald-600" />
            <span>{t('chat.action_send_location')}</span>
          </button>
          <button
            onClick={() => {
              const phone = currentUser?.phone || '+91 98765 43210';
              handleSend(t('chat.action_share_phone_msg', { phone }));
            }}
            className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[10px] font-bold text-zinc-700 dark:text-zinc-200 hover:border-blue-500 shadow-2xs"
          >
            <Phone className="w-3 h-3 text-blue-600" />
            <span>{t('chat.action_share_phone')}</span>
          </button>
          <button
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
            type="text"
            value={inputMsg}
            onChange={handleInputChange}
            onBlur={() => sendTyping(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={t('chat.type_a_message', { name: chatFarmer.name })}
            className="flex-1 px-4 py-2.5 text-base sm:text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-zinc-400"
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputMsg.trim()}
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
