import React from 'react';
import { useApp } from '../../context/AppContext';
import { Bell, X, CheckCheck, Package, ShieldCheck, MessageCircle, Sparkles } from 'lucide-react';

export const NotificationModal: React.FC = () => {
  const {
    isNotificationModalOpen,
    setIsNotificationModalOpen,
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    role,
  } = useApp();

  if (!isNotificationModalOpen) return null;

  const relevantNotifications = notifications.filter(
    (n) => n.recipientRole === role || n.recipientRole === 'customer'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4 animate-fade-in text-xs">
      <div
        className="w-full max-w-md bg-white dark:bg-[#1B201D] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 max-h-[88dvh] flex flex-col overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800/80 shrink-0">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-zinc-900 dark:text-white text-base">
              Mandi Notifications
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

        <div className="p-4 space-y-2.5 overflow-y-auto flex-1">
          {relevantNotifications.length === 0 ? (
            <div className="p-6 sm:p-8 text-center space-y-2">
              <Bell className="w-8 h-8 text-zinc-300 mx-auto" />
              <p className="font-bold text-zinc-700 dark:text-zinc-300">No notifications yet</p>
              <p className="text-zinc-400 text-[11px]">
                Updates on your harvest orders and farm alerts will appear here.
              </p>
            </div>
          ) : (
            relevantNotifications.map((notif) => {
              const Icon =
                notif.type === 'order'
                  ? Package
                  : notif.type === 'verification'
                  ? ShieldCheck
                  : notif.type === 'chat'
                  ? MessageCircle
                  : Sparkles;

              return (
                <div
                  key={notif.id}
                  onClick={() => markNotificationAsRead(notif.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                    !notif.isRead
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50 shadow-xs'
                      : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200/60 dark:border-zinc-700/60'
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${
                    !notif.isRead
                      ? 'bg-emerald-600 text-white'
                      : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                  }`}>
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