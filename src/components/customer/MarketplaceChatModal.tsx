import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n';
import { useChatSocket, ChatWsMessage } from '../../hooks/useChatSocket';
import { ApiClient } from '../../api/client';
import { NegotiationThread } from '../../types';
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
  HandCoins,
  FileText,
  Loader2,
  ArrowRight,
} from 'lucide-react';

const quickReplies = [
  'Is this produce available today?',
  'Can I order 5 kg for morning delivery?',
  'Where is your farm located in Dehradun?',
  'Can you harvest and pack fresh early morning?',
];

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
    setSelectedProduct,
    setIsNegotiationsOpen,
  } = useApp();

  const { t } = useTranslation();
  const [inputMsg, setInputMsg] = useState('');
  const [showChatOfferModal, setShowChatOfferModal] = useState(false);
  const [chatOfferPrice, setChatOfferPrice] = useState<number | ''>('');
  const [chatOfferQuantity, setChatOfferQuantity] = useState<number | ''>(5);
  const [activeNegotiation, setActiveNegotiation] = useState<NegotiationThread | null>(null);
  const [showCounterInput, setShowCounterInput] = useState(false);
  const [counterPriceInput, setCounterPriceInput] = useState<number | ''>('');
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const loadNegotiationContext = async () => {
    try {
      const res = await ApiClient.getNegotiationThreads();
      const threads: NegotiationThread[] = Array.isArray(res) ? res : (res as any)?.data || [];
      const matched = threads.find(
        (t) =>
          ((activeConversationProductId && t.productId === activeConversationProductId) ||
           t.farmerId === chatFarmer?.id ||
           t.buyerId === chatFarmer?.id) &&
          t.status !== 'withdrawn'
      );
      setActiveNegotiation(matched || null);
    } catch {
      // Ignore if offline or unauthenticated
    }
  };

  useEffect(() => {
    if (isChatModalOpen && chatFarmer) {
      loadNegotiationContext();
    }
  }, [isChatModalOpen, chatFarmer, activeConversationProductId]);

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

  const handleCreateChatOffer = async () => {
    if (!productContext) {
      showToast('Please open chat with a specific product to make an offer.');
      return;
    }
    if (!chatOfferPrice || Number(chatOfferPrice) <= 0) {
      showToast('Please enter your proposed price per unit.');
      return;
    }
    try {
      setIsSubmittingOffer(true);
      await ApiClient.createOffer({
        productId: productContext.id,
        proposedPrice: Number(chatOfferPrice),
        quantity: Number(chatOfferQuantity) || 1,
        message: `Proposed ₹${chatOfferPrice}/${productContext.unit} via Direct Chat.`,
      });
      showToast('Offer submitted to seller!');
      setShowChatOfferModal(false);
      setChatOfferPrice('');
      await loadNegotiationContext();
      await sendMessage(`🤝 OFFER: I have submitted a price offer of ₹${chatOfferPrice}/${productContext.unit} for ${chatOfferQuantity || 1} ${productContext.unit}.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to submit offer', 'error');
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  const handleAcceptOffer = async () => {
    if (!activeNegotiation) return;
    try {
      setIsSubmittingOffer(true);
      await ApiClient.acceptOffer(activeNegotiation.id);
      showToast('Deal agreed! 0% platform commission.');
      await loadNegotiationContext();
      await sendMessage(`🤝 DEAL AGREED: Terms accepted at ₹${activeNegotiation.currentPrice}/${activeNegotiation.unit}. Agreed trade terms confirmed.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to accept offer', 'error');
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  const handleCounterOffer = async () => {
    if (!activeNegotiation || !counterPriceInput || Number(counterPriceInput) <= 0) {
      showToast('Please enter a valid counter price.');
      return;
    }
    try {
      setIsSubmittingOffer(true);
      await ApiClient.counterOffer(activeNegotiation.id, Number(counterPriceInput), 'Counter-offer via chat');
      showToast('Counter-offer sent!');
      setShowCounterInput(false);
      setCounterPriceInput('');
      await loadNegotiationContext();
      await sendMessage(`🤝 COUNTER-OFFER: Proposed revised price ₹${counterPriceInput}/${activeNegotiation.unit}.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to send counter-offer', 'error');
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  const handleRejectOffer = async () => {
    if (!activeNegotiation) return;
    try {
      setIsSubmittingOffer(true);
      await ApiClient.rejectOffer(activeNegotiation.id, 'Declined terms');
      showToast('Offer declined.');
      await loadNegotiationContext();
      await sendMessage(`❌ OFFER DECLINED: Proposed offer was declined.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to decline offer', 'error');
    } finally {
      setIsSubmittingOffer(false);
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
    if (currentUser?.id) {
      if (msg.sender_id === currentUser.id || msg.senderId === currentUser.id) {
        return true;
      }
    }
    if (role === 'farmer') {
      return msg.sender_role === 'farmer' || msg.senderRole === 'farmer';
    }
    return msg.sender_role === 'user' || msg.senderRole === 'user' || (msg as any).sender === 'user';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-fade-in">
      <div
        className="w-full max-w-lg bg-white dark:bg-[#1B201D] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 h-[85vh] max-h-[750px] flex flex-col overflow-hidden animate-slide-up"
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
                title={isConnected ? t('chat.online') : isConnecting ? 'Connecting...' : t('chat.offline')}
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
                  {isConnected ? `🟢 ${t('chat.online')}` : isConnecting ? '🟡 Connecting...' : `🔴 ${t('chat.offline')}`}
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
              className="p-2 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
              title={t('common.close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Product Context Banner (OLX In-Chat Clickable Ad Card) */}
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
              View Ad
            </button>
          </div>
        )}

        {/* Zero-Trust Encrypted Banner */}
        <div className="bg-zinc-100/70 dark:bg-zinc-800/40 px-4 py-1 text-[10px] text-zinc-500 dark:text-zinc-400 text-center flex items-center justify-center gap-1.5 shrink-0 border-b border-zinc-100 dark:border-zinc-800/60">
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          <span>{t('chat.secure_encrypted')}</span>
        </div>

        {/* Module 5: Embedded In-Chat Active Offer & Deal Agreement Banner */}
        {activeNegotiation ? (
          <div className="bg-amber-50/90 dark:bg-amber-950/40 border-b border-amber-200/80 dark:border-amber-800/60 p-3 shrink-0 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="p-1 bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-lg">
                  <HandCoins className="w-3.5 h-3.5" />
                </span>
                <span className="font-bold text-xs text-zinc-900 dark:text-white">
                  Active Price Offer
                </span>
                <span
                  className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                    activeNegotiation.status === 'accepted'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                      : activeNegotiation.status === 'countered'
                      ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                      : activeNegotiation.status === 'rejected'
                      ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                      : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                  }`}
                >
                  {activeNegotiation.status === 'accepted' ? 'Deal Finalized' : activeNegotiation.status}
                </span>
              </div>

              <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                ₹{activeNegotiation.currentPrice}/{activeNegotiation.unit}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-zinc-600 dark:text-zinc-300">
              <span>
                Quantity: <strong>{activeNegotiation.quantity} {activeNegotiation.unit}</strong> (Est. Total: ₹{activeNegotiation.currentPrice * activeNegotiation.quantity})
              </span>
              <span className="text-[10px] text-zinc-400">
                Ref: {activeNegotiation.id.slice(-6).toUpperCase()}
              </span>
            </div>

            {/* Quick Actions depending on status */}
            {activeNegotiation.status === 'accepted' ? (
              <button
                type="button"
                onClick={() => {
                  setIsChatModalOpen(false);
                  setIsNegotiationsOpen(true);
                }}
                className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-2xs transition flex items-center justify-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>View Deal Summary & Receipt (₹0 Commission)</span>
              </button>
            ) : activeNegotiation.status !== 'rejected' && activeNegotiation.status !== 'withdrawn' ? (
              <div className="space-y-1.5 pt-0.5">
                {!showCounterInput ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isSubmittingOffer}
                      onClick={handleAcceptOffer}
                      className="flex-1 py-1 px-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-2xs transition flex items-center justify-center gap-1"
                    >
                      {isSubmittingOffer ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      <span>Accept (₹{activeNegotiation.currentPrice})</span>
                    </button>
                    <button
                      type="button"
                      disabled={isSubmittingOffer}
                      onClick={() => {
                        setCounterPriceInput(activeNegotiation.currentPrice);
                        setShowCounterInput(true);
                      }}
                      className="px-3 py-1 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 font-bold text-xs rounded-xl transition"
                    >
                      Counter
                    </button>
                    <button
                      type="button"
                      disabled={isSubmittingOffer}
                      onClick={handleRejectOffer}
                      className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
                      title="Decline offer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-zinc-500">₹</span>
                    <input
                      type="number"
                      value={counterPriceInput}
                      onChange={(e) => setCounterPriceInput(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Your price"
                      className="w-24 px-2 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs font-bold text-zinc-900 dark:text-white"
                    />
                    <button
                      type="button"
                      disabled={isSubmittingOffer}
                      onClick={handleCounterOffer}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition"
                    >
                      Submit
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCounterInput(false)}
                      className="p-1 text-zinc-400 hover:text-zinc-600"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        ) : productContext ? (
          <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border-b border-emerald-100/60 dark:border-emerald-900/30 px-3.5 py-1.5 flex items-center justify-between text-xs shrink-0">
            <span className="text-zinc-600 dark:text-zinc-300 text-[11px]">
              Want bulk discount or negotiate price?
            </span>
            <button
              type="button"
              onClick={() => {
                setChatOfferPrice(Math.round(productContext.price * 0.9));
                setShowChatOfferModal(true);
              }}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] rounded-lg shadow-2xs transition flex items-center gap-1"
            >
              <HandCoins className="w-3 h-3" />
              <span>Make Offer</span>
            </button>
          </div>
        ) : null}

        {/* Modal for In-Chat Make an Offer */}
        {showChatOfferModal && productContext && (
          <div className="bg-amber-50 dark:bg-amber-950/70 border-b border-amber-200 dark:border-amber-800/80 p-3 shrink-0 space-y-2 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-900 dark:text-white">
                Submit Price Offer for {productContext.name}
              </span>
              <button
                type="button"
                onClick={() => setShowChatOfferModal(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] text-zinc-500 block mb-0.5">Offer Price (₹/{productContext.unit})</label>
                <input
                  type="number"
                  value={chatOfferPrice}
                  onChange={(e) => setChatOfferPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder={`Asking: ₹${productContext.price}`}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 block mb-0.5">Quantity ({productContext.unit})</label>
                <input
                  type="number"
                  value={chatOfferQuantity}
                  onChange={(e) => setChatOfferQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="5"
                  className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-bold"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowChatOfferModal(false)}
                className="px-2.5 py-1 text-xs text-zinc-500"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingOffer}
                onClick={handleCreateChatOffer}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-2xs transition flex items-center gap-1"
              >
                {isSubmittingOffer ? <Loader2 className="w-3 h-3 animate-spin" /> : <HandCoins className="w-3.5 h-3.5" />}
                <span>Send Offer</span>
              </button>
            </div>
          </div>
        )}

        {/* Messages Feed */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1 text-xs">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400">
              <MessageCircle className="w-10 h-10 text-emerald-500/40 mb-2 stroke-[1.5]" />
              <p className="font-semibold text-zinc-700 dark:text-zinc-300 text-xs">
                {t('chat.start_conversation')}
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 max-w-xs mt-1">
                Ask about fresh morning harvest, direct farm pickup, or custom crate sizes.
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
                    {msg.message.startsWith('🤝 OFFER:') ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-xs pb-1 border-b border-black/10 dark:border-white/10">
                          <span className="text-base">🤝</span>
                          <span className="uppercase tracking-wider text-[10px]">Price Offer</span>
                        </div>
                        <p className="text-xs leading-relaxed whitespace-pre-wrap break-words font-medium">{msg.message.replace('🤝 OFFER:', '').trim()}</p>
                        {!isMe && (
                          <div className="flex gap-2 pt-2 border-t border-black/10 dark:border-white/10">
                            <button
                              onClick={() => {
                                sendMessage('🤝 Offer Accepted! When can we arrange delivery or pickup?');
                              }}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold shadow-2xs transition"
                            >
                              Accept Offer
                            </button>
                            <button
                              onClick={() => {
                                sendMessage('Sorry, that is too low for this produce. Could you do a slightly higher price?');
                              }}
                              className="px-3 py-1 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-lg text-[10px] font-bold transition"
                            >
                              Counter / Decline
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.message}</p>
                    )}
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

        {/* OLX Quick Action Shortcuts */}
        <div className="px-3.5 pt-2 pb-1 bg-zinc-50/70 dark:bg-zinc-900/40 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 border-t border-zinc-100 dark:border-zinc-800">
          <button
            onClick={() => handleSend(`📍 My inspection location is: ${currentLocation}. When can we arrange to meet?`)}
            className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[10px] font-bold text-zinc-700 dark:text-zinc-200 hover:border-emerald-500 shadow-2xs"
          >
            <MapPin className="w-3 h-3 text-emerald-600" />
            <span>Send Location</span>
          </button>
          <button
            onClick={() => {
              const phone = currentUser?.phone || '+91 98765 43210';
              handleSend(`📞 You can call or WhatsApp me directly at: ${phone}`);
            }}
            className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[10px] font-bold text-zinc-700 dark:text-zinc-200 hover:border-blue-500 shadow-2xs"
          >
            <Phone className="w-3 h-3 text-blue-600" />
            <span>Share Phone</span>
          </button>
          {productContext ? (
            <button
              onClick={() => {
                setChatOfferPrice(Math.round(productContext.price * 0.9));
                setShowChatOfferModal(true);
              }}
              className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 shadow-2xs"
            >
              <span>🤝</span>
              <span>Make Offer (₹{Math.round(productContext.price * 0.9)})</span>
            </button>
          ) : (
            <button
              onClick={() => handleSend('🤝 Hi! Could you please share your final best price for this?')}
              className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[10px] font-bold text-zinc-700 dark:text-zinc-200 hover:border-amber-500 shadow-2xs"
            >
              <span className="text-amber-500">🤝</span>
              <span>Final Price?</span>
            </button>
          )}
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
        <div className="p-3 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-[#1B201D] flex items-center gap-2 shrink-0">
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
            className="flex-1 px-4 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-zinc-400"
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

        {/* OLX In-Chat Make Offer Modal */}
        {showChatOfferModal && productContext && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
            <div className="w-full max-w-sm bg-white dark:bg-[#1B201D] rounded-3xl p-5 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                <h4 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <span>🤝 Make Price Offer</span>
                </h4>
                <button
                  onClick={() => setShowChatOfferModal(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs space-y-2">
                <p className="text-zinc-500">
                  Original Listing Price: <strong className="text-zinc-900 dark:text-white">₹{productContext.price} / {productContext.unit}</strong>
                </p>

                <div className="flex gap-2">
                  {[0.95, 0.9, 0.85].map((discount) => {
                    const discounted = Math.round(productContext.price * discount);
                    return (
                      <button
                        key={discount}
                        type="button"
                        onClick={() => setChatOfferPrice(discounted)}
                        className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold border transition ${
                          chatOfferPrice === discounted
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        ₹{discounted} ({(1 - discount) * 100}% off)
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2">
                  <label className="text-[10px] font-bold text-zinc-400 block mb-1">
                    Your Counter Offer Price (₹/{productContext.unit}):
                  </label>
                  <input
                    type="number"
                    value={chatOfferPrice}
                    onChange={(e) => setChatOfferPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Enter amount"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowChatOfferModal(false)}
                  className="flex-1 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (chatOfferPrice && Number(chatOfferPrice) > 0) {
                      setShowChatOfferModal(false);
                      handleSend(`🤝 OFFER: Hello ${chatFarmer.name}, I would like to offer ₹${chatOfferPrice}/${productContext.unit} for "${productContext.name}". Would you accept this price?`);
                      showToast(`Offer of ₹${chatOfferPrice}/${productContext.unit} sent!`, 'success');
                    }
                  }}
                  disabled={!chatOfferPrice || Number(chatOfferPrice) <= 0}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-soft"
                >
                  Send Offer
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
