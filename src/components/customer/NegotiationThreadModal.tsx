import React, { useState, useEffect } from 'react';
import { NegotiationThread } from '../../types';
import { ApiClient } from '../../api/client';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';
import {
  X,
  HandCoins,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRightLeft,
  Calendar,
  Truck,
  MessageSquare,
  ShieldCheck,
  Receipt,
  RotateCcw,
} from 'lucide-react';
import { DealSummaryModal, DealSummaryData } from './DealSummaryModal';

interface NegotiationThreadModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialThreadId?: string;
  productId?: string;
  roleMode?: 'buyer' | 'farmer';
}

export const NegotiationThreadModal: React.FC<NegotiationThreadModalProps> = ({
  isOpen,
  onClose,
  initialThreadId,
  productId,
  roleMode = 'buyer',
}) => {
  const { showToast, currentUser } = useApp();

  const [threads, setThreads] = useState<NegotiationThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<NegotiationThread | null>(null);
  const [loading, setLoading] = useState(false);
  const [counterPrice, setCounterPrice] = useState<number | ''>('');
  const [counterMessage, setCounterMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeDealSummary, setActiveDealSummary] = useState<DealSummaryData | null>(null);
  const [showDealSummaryModal, setShowDealSummaryModal] = useState(false);

  const fetchThreads = async () => {
    try {
      setLoading(true);
      const res = await ApiClient.listNegotiations({
        productId,
        role: roleMode,
      });
      const threadList: NegotiationThread[] = Array.isArray(res) ? res : (res as any).negotiations || [];
      setThreads(threadList);

      if (initialThreadId) {
        const found = threadList.find((t: NegotiationThread) => t.id === initialThreadId);
        if (found) setSelectedThread(found);
      } else if (threadList.length > 0 && !selectedThread) {
        setSelectedThread(threadList[0]);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load negotiations', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchThreads();
    }
  }, [isOpen, initialThreadId, productId, roleMode]);

  if (!isOpen) return null;

  const handleCounter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedThread) return;
    if (!counterPrice || Number(counterPrice) <= 0) {
      showToast('Please enter a valid counter price');
      return;
    }

    try {
      setIsSubmitting(true);
      await ApiClient.counterOffer(selectedThread.id, {
        proposedPrice: Number(counterPrice),
        message: counterMessage.trim() || undefined,
      });

      showToast(`Counter-offer of ₹${counterPrice} sent!`);
      setCounterPrice('');
      setCounterMessage('');
      await fetchThreads();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit counter offer', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAccept = async () => {
    if (!selectedThread) return;
    try {
      setIsSubmitting(true);
      const res = await ApiClient.acceptOffer(selectedThread.id);
      showToast('Offer accepted! Deal agreement generated.');
      if (res.dealSummary) {
        setActiveDealSummary(res.dealSummary);
        setShowDealSummaryModal(true);
      }
      await fetchThreads();
    } catch (err: any) {
      showToast(err.message || 'Failed to accept offer', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedThread) return;
    if (!window.confirm('Are you sure you want to decline this offer?')) return;
    try {
      setIsSubmitting(true);
      await ApiClient.rejectOffer(selectedThread.id);
      showToast('Offer declined.');
      await fetchThreads();
    } catch (err: any) {
      showToast(err.message || 'Failed to reject offer', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDealSummary = async () => {
    if (!selectedThread) return;
    try {
      const summary = await ApiClient.getDealSummary(selectedThread.id);
      setActiveDealSummary(summary);
      setShowDealSummaryModal(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to load deal agreement', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Accepted
          </span>
        );
      case 'countered':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-[10px] font-bold flex items-center gap-1">
            <ArrowRightLeft className="w-3 h-3 text-amber-600" />
            Countered
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-300 text-[10px] font-bold flex items-center gap-1">
            <XCircle className="w-3 h-3 text-red-600" />
            Declined
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 text-[10px] font-bold flex items-center gap-1">
            <Clock className="w-3 h-3 text-blue-600" />
            Pending
          </span>
        );
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
        <div
          className="w-full max-w-3xl bg-white dark:bg-[#1B201D] rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[92vh] animate-slide-up"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/60 dark:bg-zinc-900/40">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
                <HandCoins className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base sm:text-lg text-zinc-900 dark:text-white">
                  Negotiations & Offers (मोल-भाव)
                </h3>
                <p className="text-[11px] text-zinc-500">
                  Direct price offers without platform commission
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchThreads}
                className="p-1.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
                title="Refresh offers"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 2-Column Content: Thread List & Detail */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
            {/* Left Thread List */}
            <div className="w-full md:w-72 border-r border-zinc-100 dark:border-zinc-800 overflow-y-auto shrink-0 p-3 space-y-2 bg-zinc-50/30 dark:bg-zinc-950/20 max-h-48 md:max-h-none">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Active Offers ({threads.length})
                </span>
              </div>

              {loading && threads.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-400">Loading offers...</div>
              ) : threads.length === 0 ? (
                <div className="py-8 text-center px-3 space-y-1">
                  <span className="text-2xl block">🤝</span>
                  <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">No active offers</p>
                  <p className="text-[11px] text-zinc-400">
                    Use &quot;Make an Offer&quot; on any product card to start negotiating.
                  </p>
                </div>
              ) : (
                threads.map((t) => {
                  const isSelected = selectedThread?.id === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedThread(t)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer text-left ${
                        isSelected
                          ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 shadow-xs'
                          : 'bg-white dark:bg-[#202722] border-zinc-200/80 dark:border-zinc-800 hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="font-bold text-xs text-zinc-900 dark:text-white truncate">
                          {t.productName}
                        </h4>
                        {getStatusBadge(t.status)}
                      </div>
                      <div className="mt-1 flex items-baseline justify-between text-xs">
                        <span className="font-extrabold text-emerald-700 dark:text-emerald-400">
                          ₹{t.currentPrice}/{t.unit}
                        </span>
                        <span className="text-[11px] text-zinc-500">
                          Qty: {t.quantity} {t.unit}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400 block mt-1">
                        {t.dealReferenceId}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Right Chat & Negotiation Panel */}
            <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-white dark:bg-[#1B201D]">
              {selectedThread ? (
                <>
                  {/* Thread Header Info */}
                  <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/40 dark:bg-zinc-900/30">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-sm text-zinc-900 dark:text-white">
                          {selectedThread.productName}
                        </h4>
                        {getStatusBadge(selectedThread.status)}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 mt-1">
                        <span>Original: <del>₹{selectedThread.originalPrice || selectedThread.originalAskingPrice || selectedThread.currentPrice}/{selectedThread.unit}</del></span>
                        <span>Current Offer: <strong className="text-emerald-600 font-bold">₹{selectedThread.currentPrice}/{selectedThread.unit}</strong></span>
                        <span>Total: <strong className="text-zinc-800 dark:text-zinc-200 font-bold">{formatCurrency(selectedThread.totalAmount || (selectedThread.currentPrice * selectedThread.quantity))}</strong></span>
                      </div>
                    </div>

                    {selectedThread.status === 'accepted' && (
                      <button
                        onClick={handleOpenDealSummary}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 shrink-0"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>View Deal Agreement</span>
                      </button>
                    )}
                  </div>

                  {/* Messages & Counter History Timeline */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-3">
                    {/* Zero commission disclaimer */}
                    <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/40 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Zero Platform Fee: Settle agreed prices directly with farmer at farm gate or on delivery.</span>
                    </div>

                    {selectedThread.messages?.map((msg) => {
                      const isMe = msg.senderRole === roleMode || (currentUser && msg.senderId === currentUser.id);
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[85%] sm:max-w-[75%] p-3 rounded-2xl text-xs space-y-1 ${
                              isMe
                                ? 'bg-emerald-600 text-white rounded-br-xs'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-bl-xs'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3 text-[10px] opacity-80">
                              <span className="font-bold uppercase tracking-wider">
                                {msg.senderName} ({msg.senderRole})
                              </span>
                              <span className="font-mono">
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            {msg.proposedPrice && (
                              <div className="font-black text-sm pt-0.5">
                                Offered Rate: ₹{msg.proposedPrice} / {selectedThread.unit}
                              </div>
                            )}

                            {msg.message && (
                              <p className="leading-relaxed opacity-95">{msg.message}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Bottom Counter & Action Toolbar */}
                  {selectedThread.status !== 'accepted' && selectedThread.status !== 'rejected' ? (
                    <div className="p-3 sm:p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 space-y-3">
                      {/* Accept / Decline Row */}
                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={handleReject}
                          disabled={isSubmitting}
                          className="px-3.5 py-2 rounded-xl border border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-700 dark:text-red-400 text-xs font-bold transition flex items-center gap-1.5"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Decline</span>
                        </button>

                        <button
                          onClick={handleAccept}
                          disabled={isSubmitting}
                          className="flex-1 py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-soft transition flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Accept Rate (₹{selectedThread.currentPrice}/{selectedThread.unit})</span>
                        </button>
                      </div>

                      {/* Counter-Offer Form */}
                      <form onSubmit={handleCounter} className="flex gap-2 items-center">
                        <div className="relative w-28 shrink-0">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500">₹</span>
                          <input
                            type="number"
                            value={counterPrice}
                            onChange={(e) => setCounterPrice(e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="Counter ₹"
                            className="w-full pl-6 pr-2 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <input
                          type="text"
                          value={counterMessage}
                          onChange={(e) => setCounterMessage(e.target.value)}
                          placeholder="Optional message..."
                          className="flex-1 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                        />

                        <button
                          type="submit"
                          disabled={isSubmitting || !counterPrice}
                          className="px-3 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1 shrink-0"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Counter</span>
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="p-3 text-center text-xs font-semibold text-zinc-500 bg-zinc-50/50 dark:bg-zinc-900/30 border-t border-zinc-100 dark:border-zinc-800">
                      This negotiation is finalized ({selectedThread.status}).
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-2 text-zinc-400">
                  <HandCoins className="w-10 h-10 text-zinc-300 dark:text-zinc-700 stroke-1" />
                  <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                    Select an offer thread to view discussion
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Render Deal Summary Modal if active */}
      <DealSummaryModal
        isOpen={showDealSummaryModal}
        onClose={() => setShowDealSummaryModal(false)}
        dealSummary={activeDealSummary}
      />
    </>
  );
};
