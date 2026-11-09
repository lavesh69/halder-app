import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Bell,
  X,
  CheckCheck,
  Package,
  ShieldCheck,
  MessageCircle,
  Sparkles,
  HandCoins,
  Megaphone,
  Boxes,
  Tag,
} from 'lucide-react';

interface NotificationModalProps {
  onOpenNegotiation?: (threadId?: string) => void;
  onOpenRequirements?: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  onOpenNegotiation,
  onOpenRequirements,
}) => {
  const {
    isNotificationModalOpen,
    setIsNotificationModalOpen,
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    role,
  } = useApp();

  const [activeFilter, setActiveFilter] = useState<'all' | 'offers' | 'requirements' | 'alerts'>('all');

  if (!isNotificationModalOpen) return null;

  const relevantNotifications = notifications.filter(
    (n) => n.recipientRole === role || n.recipientRole === 'customer' || !n.recipientRole
  );

  const filteredNotifications = relevantNotifications.filter((n) => {
    if (activeFilter === 'offers') return n.type === 'offer' || n.type === 'negotiation' || n.type === 'deal';
    if (activeFilter === 'requirements') return n.type === 'requirement' || n.type === 'quotation';
    if (activeFilter === 'alerts') return n.type === 'alert' || n.type === 'stock';
    return true;
  });

  const handleNotificationClick = (notif: any) => {
    markNotificationAsRead(notif.id);
    if ((notif.type === 'offer' || notif.type === 'deal') && onOpenNegotiation) {
      setIsNotificationModalOpen(false);
      onOpenNegotiation();
    } else if ((notif.type === 'requirement' || notif.type === 'quotation') && onOpenRequirements) {
      setIsNotificationModalOpen(false);
      onOpenRequirements();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4 animate-fade-in text-xs">
      <div
        className="w-full max-w-lg bg-white dark:bg-[#1B201D] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 max-h-[88dvh] flex flex-col overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800/80 shrink-0">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-zinc-900 dark:text-white text-base">
              Market Notifications (सूचनाएं)
            </h3>
            {relevantNotifications.some((n) => !n.isRead) && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={markAllNotificationsAsRead}
              className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 p-1.5 min-h-[36px]"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
            <button
              onClick={() => setIsNotificationModalOpen(false)}
              className="p-2 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Categorized Filter Tabs */}
        <div className="flex border-b border-zinc-100 dark:border-zinc-800 px-3 bg-zinc-50/50 dark:bg-zinc-900/30 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'All' },
            { id: 'offers', label: 'Offers & Deals' },
            { id: 'requirements', label: 'Demands' },
            { id: 'alerts', label: 'Crop Alerts' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`px-3 py-2 text-xs font-bold whitespace-nowrap border-b-2 transition ${
                activeFilter === tab.id
                  ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="p-4 space-y-2.5 overflow-y-auto flex-1">
          {filteredNotifications.length === 0 ? (
            <div className="p-6 sm:p-8 text-center space-y-2">
              <Bell className="w-8 h-8 text-zinc-300 mx-auto" />
              <p className="font-bold text-zinc-700 dark:text-zinc-300">No notifications here</p>
              <p className="text-zinc-400 text-[11px]">
                Updates on farm offers, crop price alerts, and buyer demands will appear here.
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const Icon =
                notif.type === 'offer' || notif.type === 'deal'
                  ? HandCoins
                  : notif.type === 'requirement' || notif.type === 'quotation'
                  ? Megaphone
                  : notif.type === 'stock'
                  ? Boxes
                  : notif.type === 'order'
                  ? Package
                  : notif.type === 'alert'
                  ? Tag
                  : notif.type === 'chat'
                  ? MessageCircle
                  : Sparkles;

              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                    !notif.isRead
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50 shadow-xs'
                      : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200/60 dark:border-zinc-700/60'
                  }`}
                >
                  <div
                    className={`p-2 rounded-xl shrink-0 ${
                      !notif.isRead
                        ? 'bg-emerald-600 text-white'
                        : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="font-bold text-zinc-900 dark:text-white truncate">
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-zinc-400 shrink-0">
                        {notif.createdAt}
                      </span>
                    </div>
                    <p className="text-zinc-600 dark:text-zinc-300 mt-0.5 leading-relaxed">
                      {notif.message}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
