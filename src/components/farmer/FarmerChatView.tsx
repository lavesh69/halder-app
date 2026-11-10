import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n';
import { ApiClient } from '../../api/client';
import {
  MessageCircle,
  Search,
  Clock,
  ShieldCheck,
  RefreshCw,
  User,
  ShoppingBag,
  CheckCheck,
} from 'lucide-react';

export const FarmerChatView: React.FC = () => {
  const {
    chatConversations,
    refreshChatConversations,
    setChatFarmer,
    setActiveConversationId,
    setActiveConversationProductId,
    setIsChatModalOpen,
    unreadChatCount,
    showToast,
  } = useApp();

  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    refreshChatConversations().finally(() => setIsLoading(false));
  }, []);

  const sampleFarmerConversations = [
    {
      id: 'conv-sample-farmer-1',
      customerId: 'cust-user-1',
      customerName: 'Aman Sharma (Local Buyer)',
      customerPhone: '+91 98765 43210',
      productId: 'prod-1',
      unreadCount: 1,
      product: { name: 'Organic Hybrid Tomatoes', price: 40, unit: 'kg' },
      otherParty: {
        id: 'cust-user-1',
        name: 'Aman Sharma',
        phone: '+91 98765 43210',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
        city: 'Dehradun',
      },
      lastMessage: {
        message: 'Namaste Rajesh ji! Can I get 15 kg ripe tomatoes for tomorrow morning delivery?',
        created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      },
    },
    {
      id: 'conv-sample-farmer-2',
      customerId: 'cust-user-2',
      customerName: 'Pooja Verma (Organic Kitchen)',
      customerPhone: '+91 98112 33445',
      productId: 'prod-2',
      unreadCount: 0,
      product: { name: 'Farm Spinach (पालक)', price: 30, unit: 'bunch' },
      otherParty: {
        id: 'cust-user-2',
        name: 'Pooja Verma',
        phone: '+91 98112 33445',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
        city: 'Dehradun',
      },
      lastMessage: {
        message: 'Thank you! The morning spinach was exceptionally fresh and crisp.',
        created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
      },
    },
    {
      id: 'conv-sample-farmer-3',
      customerId: 'cust-user-3',
      customerName: 'Sanjay Rawat (Hotel Aroma)',
      customerPhone: '+91 94120 55667',
      productId: 'prod-6',
      unreadCount: 2,
      product: { name: 'Mountain Honey (शहद)', price: 350, unit: 'bottle' },
      otherParty: {
        id: 'cust-user-3',
        name: 'Sanjay Rawat',
        phone: '+91 94120 55667',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200',
        city: 'Rishikesh',
      },
      lastMessage: {
        message: 'What is the bulk price if we order 10 bottles of raw mountain honey?',
        created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      },
    },
  ];

  const effectiveConversations =
    chatConversations.length > 0 ? chatConversations : sampleFarmerConversations;

  const filteredConversations = effectiveConversations.filter((c: any) => {
    const name = c.otherParty?.name || c.customerName || '';
    const lastMsg = c.lastMessage?.message || '';
    return (
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lastMsg.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleOpenConversation = (conv: any) => {
    // Construct farmer/customer partner profile
    const partner = {
      id: conv.otherParty?.id || conv.customerId || 'cust-user',
      user_id: conv.otherParty?.id || conv.customerId || 'cust-user',
      name: conv.otherParty?.name || 'Customer',
      phone: conv.otherParty?.phone || '+91 98765 43210',
      farm_name: conv.otherParty?.farmName || 'Direct Customer',
      location: conv.otherParty?.city || 'Dehradun',
      city: conv.otherParty?.city || 'Dehradun',
      latitude: 30.3165,
      longitude: 78.0322,
      description: 'Verified HALDER buyer',
      verification_status: 'verified' as const,
      rating: 5.0,
      reviews_count: 12,
      total_orders: 5,
      total_listings_count: 0,
      response_rate: 98,
      joined_year: 2025,
      badges: ['Verified Buyer'],
      avatar: conv.otherParty?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
      cover_image: '',
      created_at: new Date().toISOString(),
      verified: true,
      bio: 'Verified buyer on HALDER marketplace',
    };

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
              <span className="px-2 py-0.5 bg-emerald-600 text-white text-xs font-bold rounded-full animate-pulse">
                {unreadChatCount} new
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Real-time messages & produce inquiries from local buyers
          </p>
        </div>

        <button
          onClick={() => {
            setIsLoading(true);
            refreshChatConversations().finally(() => setIsLoading(false));
          }}
          disabled={isLoading}
          className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          title="Refresh Messages"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search customer conversations..."
          className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-[#1B201D] border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
        />
      </div>

      {/* Quick Reply Suggestions for Farmers */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        <span className="text-[10px] uppercase font-bold text-zinc-400 shrink-0">Quick Answers:</span>
        {[
          '✓ हाँ, ताज़ा स्टॉक उपलब्ध है',
          '🚚 कल सुबह 7-9 AM डिलीवरी होगी',
          '🤝 20kg+ पर थोक भाव मिलेगा',
          '📍 फार्म विजिट का समय 3-6 PM',
        ].map((reply, i) => (
          <button
            key={i}
            onClick={() => {
              navigator.clipboard.writeText(reply);
              showToast(`Copied: "${reply}" to clipboard!`, 'info');
            }}
            className="px-2.5 py-1 bg-white dark:bg-[#1B201D] text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 rounded-full text-[11px] font-semibold shrink-0 hover:border-emerald-500 hover:text-emerald-600 transition shadow-2xs"
            title="Click to copy quick answer"
          >
            {reply}
          </button>
        ))}
      </div>

      {/* Conversations List */}
      {filteredConversations.length === 0 ? (
        <div className="p-5 sm:p-8 text-center bg-white dark:bg-[#1B201D] rounded-3xl border border-zinc-200 dark:border-zinc-800">
          <MessageCircle className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
          <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
            {t('chat.no_conversations')}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs mx-auto">
            When buyers contact you regarding your crop listings or placed orders, they will appear here live.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredConversations.map((conv) => {
            const partnerName = conv.otherParty?.name || 'Customer';
            const partnerAvatar =
              conv.otherParty?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200';
            const unread = conv.unreadCount || conv.unread_count || 0;
            const lastMsgText = conv.lastMessage?.message || 'Started a conversation';
            const lastMsgTime = conv.lastMessage?.created_at || conv.lastMessage?.createdAt || conv.updated_at;

            return (
              <div
                key={conv.id}
                onClick={() => handleOpenConversation(conv)}
                className="p-3.5 bg-white dark:bg-[#1B201D] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 hover:border-emerald-500 dark:hover:border-emerald-500 cursor-pointer transition-all shadow-2xs flex items-center justify-between gap-3 active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={partnerAvatar}
                      alt={partnerName}
                      className="w-11 h-11 rounded-full object-cover border-2 border-emerald-600/20"
                    />
                    {unread > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-[#1B201D] animate-pulse">
                        {unread}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-xs text-zinc-900 dark:text-white truncate">
                        {partnerName}
                      </h4>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    </div>

                    <p className={`text-xs truncate mt-0.5 ${unread > 0 ? 'font-semibold text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400'}`}>
                      {lastMsgText}
                    </p>

                    {conv.product && (
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-700 dark:text-emerald-400">
                        <ShoppingBag className="w-3 h-3 shrink-0" />
                        <span className="truncate">{conv.product.name}</span>
                      </div>
                    )}

                    {lastMsgText.includes('OFFER') && (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold text-[9px] mt-1">
                        🤝 Active Offer
                      </span>
                    )}
                    {lastMsgText.includes('DEAL') && (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold text-[9px] mt-1">
                        ✅ Deal Finalized
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] text-zinc-400">
                    {lastMsgTime ? new Date(lastMsgTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
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
