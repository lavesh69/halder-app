import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n';
import {
  MessageCircle,
  Search,
  Clock,
  ShieldCheck,
  RefreshCw,
  ShoppingBag,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export const CustomerChatsView: React.FC = () => {
  const {
    chatConversations,
    refreshChatConversations,
    setChatFarmer,
    setActiveConversationId,
    setActiveConversationProductId,
    setIsChatModalOpen,
    unreadChatCount,
    setCustomerTab,
    farmers,
    products,
  } = useApp();

  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatTab, setChatTab] = useState<'all' | 'buying' | 'selling'>('all');

  useEffect(() => {
    setIsLoading(true);
    refreshChatConversations().finally(() => setIsLoading(false));
  }, []);

  // Sample conversations fallback for realistic OLX feel
  const sampleConvs = [
    {
      id: 'conv-sample-1',
      farmerId: 'farmer-1',
      farmerName: 'Rajesh Kumar',
      farmerAvatar: 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=200',
      productId: 'prod-1',
      product_id: 'prod-1',
      type: 'buying',
      unreadCount: 1,
      lastMessage: {
        message: 'Yes, fresh harvest is ready. You can inspect or order today.',
        time: '10:45 AM',
      },
    },
    {
      id: 'conv-sample-2',
      farmerId: 'farmer-2',
      farmerName: 'Amit Singh',
      farmerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
      productId: 'prod-live-1',
      product_id: 'prod-live-1',
      type: 'buying',
      unreadCount: 0,
      lastMessage: {
        message: '🤝 OFFER: Price ₹42,000 accepted. Please visit between 3 PM to 6 PM.',
        time: 'Yesterday',
      },
    },
    {
      id: 'conv-sample-3',
      farmerId: 'user-cust-2',
      farmerName: 'Vikram Joshi (Buyer)',
      farmerAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
      productId: 'prod-equip-1',
      product_id: 'prod-equip-1',
      type: 'selling',
      unreadCount: 1,
      lastMessage: {
        message: 'Is the tractor tiller still available for testing in Doiwala?',
        time: 'Yesterday',
      },
    },
  ];

  const effectiveConversations = chatConversations.length > 0 ? chatConversations : sampleConvs;

  // Filter conversations by tab and search
  const filteredConversations = effectiveConversations.filter((c: any) => {
    if (chatTab === 'buying' && c.type === 'selling') return false;
    if (chatTab === 'selling' && c.type !== 'selling') return false;
    const name = c.otherParty?.name || c.farmerName || c.customerName || '';
    const lastMsg = c.lastMessage?.message || '';
    return (
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lastMsg.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleOpenConversation = (conv: any) => {
    // If other party is a farmer
    const foundFarmer = farmers.find((f) => f.id === conv.farmerId || f.user_id === conv.otherParty?.id);
    const partner = foundFarmer || {
      id: conv.otherParty?.id || conv.farmerId || 'farmer-1',
      user_id: conv.otherParty?.id || conv.farmerId || 'farmer-1',
      name: conv.otherParty?.name || conv.farmerName || 'Local Seller',
      phone: conv.otherParty?.phone || '+91 98450 12345',
      farm_name: conv.otherParty?.farmName || 'Green Valley Farm',
      location: conv.otherParty?.city || 'Dehradun',
      city: conv.otherParty?.city || 'Dehradun',
      latitude: 30.3165,
      longitude: 78.0322,
      description: 'Verified seller on HALDER marketplace',
      verification_status: 'verified' as const,
      rating: 4.9,
      reviews_count: 18,
      total_orders: 45,
      total_listings_count: 5,
      response_rate: 98,
      joined_year: 2024,
      badges: ['Verified Seller'],
      avatar: conv.otherParty?.avatar || 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=200',
      cover_image: '',
      created_at: new Date().toISOString(),
      verified: true,
      bio: 'Verified seller on HALDER marketplace',
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
              Chats (चैट)
            </h2>
            {unreadChatCount > 0 && (
              <span className="px-2 py-0.5 bg-emerald-600 text-white text-xs font-bold rounded-full animate-pulse">
                {unreadChatCount} new
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            OLX-style messaging with local sellers and buyers
          </p>
        </div>

        <button
          onClick={() => {
            setIsLoading(true);
            refreshChatConversations().finally(() => setIsLoading(false));
          }}
          disabled={isLoading}
          className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-emerald-50 hover:text-emerald-600 transition"
          title="Refresh messages"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
        </button>
      </div>

      {/* OLX-Style Chat Sub-Tabs (All / Buying / Selling) */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setChatTab('all')}
          className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-all ${
            chatTab === 'all'
              ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          All (सभी)
        </button>
        <button
          onClick={() => setChatTab('buying')}
          className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-all ${
            chatTab === 'buying'
              ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          Buying (खरीदारी)
        </button>
        <button
          onClick={() => setChatTab('selling')}
          className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-all ${
            chatTab === 'selling'
              ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          Selling (बिक्री)
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by seller name or message..."
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#1B201D] border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-zinc-900 dark:text-white placeholder:text-zinc-400"
        />
      </div>

      {/* Conversation List */}
      <div className="space-y-2.5">
        {filteredConversations.length === 0 ? (
          <div className="py-12 px-4 text-center bg-white dark:bg-[#1B201D] rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto">
              <MessageCircle className="w-7 h-7" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-zinc-900 dark:text-white">
                No active chats yet
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs mx-auto">
                When you contact sellers or receive inquiries on your advertisements, conversations will show here!
              </p>
            </div>
            <button
              onClick={() => setCustomerTab('home')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              <span>Explore Marketplace Ads</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const otherName = conv.otherParty?.name || conv.farmerName || 'Local Seller';
            const otherAvatar =
              conv.otherParty?.avatar ||
              conv.farmerAvatar ||
              'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=200';
            const lastMsg = conv.lastMessage?.message || 'Chat started regarding marketplace produce';
            const unread = conv.unreadCount || 0;
            const attachedProduct = products.find((p) => p.id === (conv.productId || conv.product_id));

            return (
              <div
                key={conv.id}
                onClick={() => handleOpenConversation(conv)}
                className="p-3.5 bg-white dark:bg-[#1B201D] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 hover:border-emerald-500/50 hover:shadow-soft transition-all cursor-pointer flex items-center gap-3 relative group"
              >
                {/* User Avatar */}
                <div className="relative shrink-0">
                  <img
                    src={otherAvatar}
                    alt={otherName}
                    className="w-12 h-12 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700"
                  />
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
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    </div>
                    <span className="text-[10px] text-zinc-400 shrink-0 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {conv.lastMessage?.time || 'Recent'}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate mt-0.5">
                    {lastMsg}
                  </p>

                  {/* Attached Produce Pill if available */}
                  {attachedProduct && (
                    <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[10px] text-zinc-600 dark:text-zinc-300 font-medium">
                      <ShoppingBag className="w-3 h-3 text-emerald-600" />
                      <span className="truncate max-w-[160px]">{attachedProduct.name}</span>
                      <span className="font-bold text-emerald-600">?{attachedProduct.price}</span>
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
