import { useState, useEffect, useRef, useCallback } from 'react';
import { ApiClient, getApiBaseUrl } from '../api/client';
import type { ChatAttachmentItem, ChatPresenceInfo, ChatReplyPreview } from '../types';
import {
  type ChatWsMessage,
  type OutboxQueueItem,
  computeBackoffDelayMs,
  generateClientMessageId,
  isNonRetryableError,
  loadCachedMessages,
  loadOutboxQueue,
  mergeMessages,
  normalizeMessage,
  outboxItemToMessage,
  removeOutboxItem,
  saveCachedMessages,
  upsertOutboxItem,
} from './chatSocketUtils';

export type { ChatWsMessage };
export { normalizeMessage };

export type ChatConnectionStatus = 'connected' | 'connecting' | 'reconnecting' | 'fallback' | 'offline';

export interface SendMessagePayloadOptions {
  replyToId?: string | null;
  replyTo?: ChatReplyPreview | null;
  attachmentIds?: string[];
  attachments?: ChatAttachmentItem[];
  clientMessageId?: string;
}

export interface UseChatSocketOptions {
  conversationId?: string | null;
  token?: string | null;
  currentUserId?: string | null;
  userRole?: 'user' | 'farmer' | 'admin';
  onMessageReceived?: (message: ChatWsMessage) => void;
  onTyping?: (data: { conversationId: string; userId: string; userName?: string; isTyping: boolean }) => void;
  onRead?: (data: { conversationId: string; userId: string; readAt: string }) => void;
  onPresence?: (data: ChatPresenceInfo & { userId: string }) => void;
  autoConnect?: boolean;
}

export interface UseChatSocketReturn {
  isConnected: boolean;
  isOnline: boolean;
  isConnecting: boolean;
  connectionStatus: ChatConnectionStatus;
  messages: ChatWsMessage[];
  isLoadingHistory: boolean;
  isLoadingMore: boolean;
  hasMoreHistory: boolean;
  historyError: string | null;
  isOtherUserTyping: boolean;
  typingUserName: string | null;
  partnerPresence: ChatPresenceInfo | null;
  pendingCount: number;
  failedCount: number;
  error: string | null;
  sendMessage: (text: string, options?: SendMessagePayloadOptions) => Promise<ChatWsMessage | null>;
  retryMessage: (clientMessageId: string) => Promise<ChatWsMessage | null>;
  discardFailedMessage: (clientMessageId: string) => void;
  editMessage: (messageId: string, newText: string) => Promise<ChatWsMessage | null>;
  deleteMessage: (messageId: string) => Promise<boolean>;
  sendTyping: (isTyping: boolean) => void;
  markAsRead: () => Promise<void>;
  loadHistory: (convId?: string) => Promise<ChatWsMessage[]>;
  loadOlderMessages: () => Promise<ChatWsMessage[]>;
  searchMessages: (query: string) => Promise<ChatWsMessage[]>;
  reconnect: () => void;
  clearError: () => void;
}

const MAX_WS_RECONNECT_ATTEMPTS = 10;

/**
 * Dynamically resolves the WebSocket URL based on environment or window location.
 */
export function getWebSocketUrl(token?: string | null): string {
  let wsUrl: string;

  if (import.meta.env.VITE_WS_URL) {
    wsUrl = import.meta.env.VITE_WS_URL;
  } else {
    const apiUrl = getApiBaseUrl();
    try {
      const parsed = new URL(apiUrl);
      const wsProto = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${wsProto}//${parsed.host}/ws`;
    } catch {
      wsUrl = 'wss://halder-app.vercel.app/ws';
    }
  }

  if (token) {
    const separator = wsUrl.includes('?') ? '&' : '?';
    return `${wsUrl}${separator}token=${encodeURIComponent(token)}`;
  }
  return wsUrl;
}

function notifyChatUpdated(conversationId?: string | null) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('halder:chat-updated', { detail: { conversationId } }));
  }
}

export function useChatSocket({
  conversationId,
  token,
  currentUserId,
  userRole = 'user',
  onMessageReceived,
  onTyping,
  onRead,
  onPresence,
  autoConnect = true,
}: UseChatSocketOptions = {}): UseChatSocketReturn {
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatWsMessage[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [hasMoreHistory, setHasMoreHistory] = useState<boolean>(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState<boolean>(false);
  const [typingUserName, setTypingUserName] = useState<string | null>(null);
  const [partnerPresence, setPartnerPresence] = useState<ChatPresenceInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const outgoingTypingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingEmitRef = useRef<number>(0);
  const pendingAckWaitersRef = useRef<
    Map<string, { resolve: (msg: ChatWsMessage) => void; timer: ReturnType<typeof setTimeout> }>
  >(new Map());
  const flushingOutboxRef = useRef<boolean>(false);
  const activeConvIdRef = useRef<string | null | undefined>(conversationId);
  const currentUserIdRef = useRef<string | null | undefined>(currentUserId);
  const userRoleRef = useRef(userRole);
  const isOnlineRef = useRef(isOnline);
  const wsConnectedRef = useRef(wsConnected);
  const lastSyncedTimestampRef = useRef<string | null>(null);
  const connectRef = useRef<() => void>(() => {});

  const onMessageReceivedRef = useRef(onMessageReceived);
  const onTypingRef = useRef(onTyping);
  const onReadRef = useRef(onRead);
  const onPresenceRef = useRef(onPresence);

  useEffect(() => {
    activeConvIdRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
    userRoleRef.current = userRole;
  }, [currentUserId, userRole]);

  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);

  useEffect(() => {
    wsConnectedRef.current = wsConnected;
  }, [wsConnected]);

  useEffect(() => {
    onMessageReceivedRef.current = onMessageReceived;
    onTypingRef.current = onTyping;
    onReadRef.current = onRead;
    onPresenceRef.current = onPresence;
  }, [onMessageReceived, onTyping, onRead, onPresence]);

  useEffect(() => {
    const serverMsgs = messages.filter((m) => !m.localOnly);
    if (serverMsgs.length > 0) {
      lastSyncedTimestampRef.current =
        serverMsgs[serverMsgs.length - 1].createdAt ||
        serverMsgs[serverMsgs.length - 1].created_at ||
        null;
    }
  }, [messages]);

  const sendRaw = useCallback((data: Record<string, unknown>): boolean => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(data));
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }, []);

  const joinRoom = useCallback(
    (convId: string) => {
      if (!convId) return false;
      const authToken = token || ApiClient.getToken();
      return sendRaw({
        type: 'chat:join',
        conversationId: convId,
        token: authToken || undefined,
      });
    },
    [sendRaw, token]
  );

  // Merge incoming server messages while preserving persisted outbox entries
  const applyMergedMessages = useCallback((convId: string, updater: (prev: ChatWsMessage[]) => ChatWsMessage[]) => {
    setMessages((prev) => {
      const next = updater(prev);
      saveCachedMessages(convId, next);
      return next;
    });
  }, []);

  // Load initial paginated history for active conversation
  const loadHistory = useCallback(
    async (convId?: string): Promise<ChatWsMessage[]> => {
      const targetId = convId || activeConvIdRef.current;
      if (!targetId) {
        setMessages([]);
        setHasMoreHistory(false);
        setNextCursor(null);
        return [];
      }

      const cached = loadCachedMessages(targetId);
      const outbox = loadOutboxQueue(targetId).map(outboxItemToMessage);
      if (cached.length > 0 || outbox.length > 0) {
        setMessages(mergeMessages(cached, outbox));
      }

      setIsLoadingHistory(true);
      setHistoryError(null);
      try {
        const res = await ApiClient.getMessages(targetId, { limit: 30 });
        const list = res?.messages || res?.data || [];
        const normalized = Array.isArray(list) ? list.map(normalizeMessage) : [];
        const latestOutbox = loadOutboxQueue(targetId).map(outboxItemToMessage);
        if (activeConvIdRef.current === targetId) {
          applyMergedMessages(targetId, (prev) => {
            const inFlightConfirmed = prev.filter(
              (m) => !m.localOnly && (m.conversationId === targetId || m.conversation_id === targetId)
            );
            const next = mergeMessages(inFlightConfirmed, mergeMessages(normalized, latestOutbox));
            saveCachedMessages(targetId, next);
            return next;
          });
          setHasMoreHistory(Boolean(res?.pagination?.hasMore));
          setNextCursor(res?.pagination?.nextCursor || (normalized[0]?.createdAt ?? null));
        }
        return mergeMessages(normalized, latestOutbox);
      } catch (err: any) {
        if (activeConvIdRef.current === targetId) {
          setHistoryError(err?.message || 'Unable to load conversation history.');
        }
        return [];
      } finally {
        if (activeConvIdRef.current === targetId) {
          setIsLoadingHistory(false);
        }
      }
    },
    [applyMergedMessages]
  );

  // Lazy-load older message pages via cursor pagination
  const loadOlderMessages = useCallback(async (): Promise<ChatWsMessage[]> => {
    const targetId = activeConvIdRef.current;
    if (!targetId || !nextCursor || isLoadingMore || !hasMoreHistory) return [];

    setIsLoadingMore(true);
    try {
      const res = await ApiClient.getMessages(targetId, { limit: 30, before: nextCursor });
      const list = res?.messages || res?.data || [];
      const normalized = Array.isArray(list) ? list.map(normalizeMessage) : [];
      if (activeConvIdRef.current === targetId) {
        applyMergedMessages(targetId, (prev) => mergeMessages(normalized, prev));
        setHasMoreHistory(Boolean(res?.pagination?.hasMore));
        setNextCursor(res?.pagination?.nextCursor || (normalized[0]?.createdAt ?? nextCursor));
      }
      return normalized;
    } catch (err: any) {
      setError(err?.message || 'Failed to load older messages.');
      return [];
    } finally {
      if (activeConvIdRef.current === targetId) {
        setIsLoadingMore(false);
      }
    }
  }, [nextCursor, isLoadingMore, hasMoreHistory, applyMergedMessages]);

  // Incremental delta sync on reconnect / visibility restore / REST fallback
  const syncMissedMessages = useCallback(async (convId?: string) => {
    const targetId = convId || activeConvIdRef.current;
    if (!targetId || !isOnlineRef.current) return;
    const since = lastSyncedTimestampRef.current;
    try {
      const res = since
        ? await ApiClient.getMessages(targetId, { after: since })
        : await ApiClient.getMessages(targetId, { limit: 30 });
      const list = res?.messages || res?.data || [];
      const normalized = Array.isArray(list) ? list.map(normalizeMessage) : [];
      if (normalized.length > 0 && activeConvIdRef.current === targetId) {
        applyMergedMessages(targetId, (prev) => mergeMessages(prev, normalized));
        notifyChatUpdated(targetId);
      }
    } catch {
      // Non-fatal background delta sync
    }
  }, [applyMergedMessages]);

  const searchMessages = useCallback(async (query: string): Promise<ChatWsMessage[]> => {
    const targetId = activeConvIdRef.current;
    if (!targetId || !query.trim()) return [];
    const res = await ApiClient.getMessages(targetId, { q: query.trim() });
    const list = res?.messages || res?.data || [];
    return Array.isArray(list) ? list.map(normalizeMessage) : [];
  }, []);

  // Internal dispatch function shared by new send, manual retry, and auto-flush
  const dispatchOutboxItem = useCallback(
    async (item: OutboxQueueItem): Promise<ChatWsMessage | null> => {
      const targetConvId = item.conversationId;

      if (!isOnlineRef.current) {
        const failedItem: OutboxQueueItem = {
          ...item,
          status: 'failed',
          error: 'You appear offline. Message queued to retry when back online.',
        };
        upsertOutboxItem(targetConvId, failedItem);
        if (activeConvIdRef.current === targetConvId) {
          applyMergedMessages(targetConvId, (prev) =>
            mergeMessages(prev, [outboxItemToMessage(failedItem)])
          );
        }
        return null;
      }

      // 1. Try real-time WS path first with explicit chat:ack confirmation
      const wsDispatched =
        wsRef.current?.readyState === WebSocket.OPEN &&
        sendRaw({
          type: 'chat:send',
          conversationId: targetConvId,
          message: item.message,
          clientMessageId: item.clientMessageId,
          replyToId: item.replyToId || undefined,
          attachmentIds: item.attachmentIds,
        });

      if (wsDispatched) {
        const acked = await new Promise<ChatWsMessage | null>((resolve) => {
          const timer = setTimeout(() => {
            pendingAckWaitersRef.current.delete(item.clientMessageId);
            resolve(null);
          }, 4000);
          pendingAckWaitersRef.current.set(item.clientMessageId, {
            resolve: (serverMsg) => {
              clearTimeout(timer);
              resolve(serverMsg);
            },
            timer,
          });
        });

        if (acked) {
          removeOutboxItem(targetConvId, item.clientMessageId);
          notifyChatUpdated(targetConvId);
          return acked;
        }
      }

      // 2. Reliable REST fallback using identical clientMessageId for idempotency
      try {
        const res = await ApiClient.sendChatMessage(targetConvId, item.message, {
          clientMessageId: item.clientMessageId,
          replyToId: item.replyToId || undefined,
          attachmentIds: item.attachmentIds,
        });
        const confirmed = normalizeMessage(res?.data || res);
        removeOutboxItem(targetConvId, item.clientMessageId);
        if (activeConvIdRef.current === targetConvId) {
          applyMergedMessages(targetConvId, (prev) => mergeMessages(prev, [confirmed]));
        }
        notifyChatUpdated(targetConvId);
        return confirmed;
      } catch (err: any) {
        const errMsg = err?.message || 'Failed to deliver message to server.';
        if (isNonRetryableError(err)) {
          setError(errMsg);
        }
        const failedItem: OutboxQueueItem = {
          ...item,
          status: 'failed',
          error: errMsg,
          attempts: item.attempts + 1,
        };
        upsertOutboxItem(targetConvId, failedItem);
        if (activeConvIdRef.current === targetConvId) {
          applyMergedMessages(targetConvId, (prev) =>
            mergeMessages(prev, [outboxItemToMessage(failedItem)])
          );
        }
        return null;
      }
    },
    [sendRaw, applyMergedMessages]
  );

  // Flush queued/failed outbox items sequentially on reconnect or network restoration
  const flushOutbox = useCallback(async () => {
    const targetId = activeConvIdRef.current;
    if (!targetId || flushingOutboxRef.current || !isOnlineRef.current) return;

    const queued = loadOutboxQueue(targetId);
    if (queued.length === 0) return;

    flushingOutboxRef.current = true;
    try {
      for (const item of queued) {
        const sendingState: OutboxQueueItem = { ...item, status: 'sending', error: undefined };
        upsertOutboxItem(targetId, sendingState);
        if (activeConvIdRef.current === targetId) {
          applyMergedMessages(targetId, (prev) =>
            mergeMessages(prev, [outboxItemToMessage(sendingState)])
          );
        }
        await dispatchOutboxItem(sendingState);
      }
    } finally {
      flushingOutboxRef.current = false;
    }
  }, [dispatchOutboxItem, applyMergedMessages]);

  // Connect & bind WebSocket lifecycle
  const connect = useCallback(() => {
    const authToken = token || ApiClient.getToken();
    if (!authToken) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOnline(false);
      setWsConnected(false);
      setIsConnecting(false);
      return;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      if (activeConvIdRef.current) {
        joinRoom(activeConvIdRef.current);
      }
      return;
    }

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
    }

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    setIsConnecting(true);
    try {
      const wsUrl = getWebSocketUrl(authToken);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (wsRef.current !== ws) return;
        reconnectAttemptsRef.current = 0;
        setWsConnected(true);
        setIsConnecting(false);
        setIsReconnecting(false);
        setError(null);

        sendRaw({ type: 'authenticate', token: authToken });
        if (activeConvIdRef.current) {
          joinRoom(activeConvIdRef.current);
          syncMissedMessages(activeConvIdRef.current);
        }
        flushOutbox();

        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          sendRaw({ type: 'ping' });
        }, 25000);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const eventType = payload.type || payload.event;
          const data = payload.data || payload;

          switch (eventType) {
            case 'connected':
            case 'authenticated':
            case 'chat:authenticated': {
              if (data?.authenticated !== false && activeConvIdRef.current) {
                joinRoom(activeConvIdRef.current);
              }
              break;
            }

            case 'chat:joined': {
              if (data?.conversationId === activeConvIdRef.current && data?.partnerPresence) {
                setPartnerPresence(data.partnerPresence);
              }
              break;
            }

            case 'chat:ack': {
              const clientMsgId = data?.clientMessageId || data?.message?.clientMessageId;
              const serverMsg = data?.message ? normalizeMessage(data.message) : null;
              if (serverMsg && activeConvIdRef.current === serverMsg.conversationId) {
                removeOutboxItem(serverMsg.conversationId!, clientMsgId || serverMsg.id);
                applyMergedMessages(serverMsg.conversationId!, (prev) =>
                  mergeMessages(prev, [serverMsg])
                );
              }
              if (clientMsgId && pendingAckWaitersRef.current.has(clientMsgId)) {
                const waiter = pendingAckWaitersRef.current.get(clientMsgId)!;
                pendingAckWaitersRef.current.delete(clientMsgId);
                if (serverMsg) waiter.resolve(serverMsg);
              }
              break;
            }

            case 'chat:message':
            case 'message':
            case 'new_message': {
              const rawMsg = data?.message && typeof data.message === 'object' ? data.message : data;
              const norm = normalizeMessage(rawMsg);
              const msgConvId = norm.conversationId || norm.conversation_id;

              if (msgConvId && msgConvId === activeConvIdRef.current) {
                if (norm.clientMessageId) {
                  removeOutboxItem(msgConvId, norm.clientMessageId);
                }
                applyMergedMessages(msgConvId, (prev) => mergeMessages(prev, [norm]));

                if (norm.senderId !== currentUserIdRef.current) {
                  setIsOtherUserTyping(false);
                  setTypingUserName(null);
                  sendRaw({ type: 'chat:delivered', conversationId: msgConvId });
                }
              }

              notifyChatUpdated(msgConvId);
              onMessageReceivedRef.current?.(norm);
              break;
            }

            case 'chat:delivered': {
              const convId = data?.conversationId;
              const deliveredAt = data?.deliveredAt || new Date().toISOString();
              const ids: string[] | null = Array.isArray(data?.messageIds) ? data.messageIds : null;

              if (convId && convId === activeConvIdRef.current) {
                applyMergedMessages(convId, (prev) =>
                  prev.map((m) => {
                    const isMine = m.senderId === currentUserIdRef.current;
                    if (!isMine || m.status === 'read') return m;
                    if (ids && !ids.includes(m.id)) return m;
                    return {
                      ...m,
                      status: m.readAt ? 'read' : 'delivered',
                      delivered_at: m.delivered_at || deliveredAt,
                      deliveredAt: m.deliveredAt || deliveredAt,
                    };
                  })
                );
              }
              break;
            }

            case 'chat:read':
            case 'read': {
              const convId = data?.conversationId;
              const readAt = data?.readAt || new Date().toISOString();
              if (convId && convId === activeConvIdRef.current) {
                applyMergedMessages(convId, (prev) =>
                  prev.map((m) =>
                    m.senderId === currentUserIdRef.current || data.userId !== m.senderId
                      ? {
                          ...m,
                          status: 'read',
                          delivered_at: m.delivered_at || readAt,
                          deliveredAt: m.deliveredAt || readAt,
                          read_at: m.read_at || readAt,
                          readAt: m.readAt || readAt,
                        }
                      : m
                  )
                );
              }
              onReadRef.current?.(data);
              notifyChatUpdated(convId);
              break;
            }

            case 'chat:message_edited': {
              const convId = data?.conversationId;
              const updated = data?.message ? normalizeMessage(data.message) : null;
              if (updated && convId === activeConvIdRef.current) {
                applyMergedMessages(convId, (prev) => mergeMessages(prev, [updated]));
              }
              notifyChatUpdated(convId);
              break;
            }

            case 'chat:message_deleted': {
              const convId = data?.conversationId;
              const msgId = data?.messageId || data?.message?.id;
              const deletedAt = data?.deletedAt || data?.message?.deletedAt || new Date().toISOString();
              if (msgId && convId === activeConvIdRef.current) {
                applyMergedMessages(convId, (prev) =>
                  prev.map((m) =>
                    m.id === msgId
                      ? {
                          ...m,
                          message: '',
                          attachments: [],
                          deletedAt,
                          deleted_at: deletedAt,
                        }
                      : m
                  )
                );
              }
              notifyChatUpdated(convId);
              break;
            }

            case 'chat:typing':
            case 'typing': {
              if (
                data.conversationId === activeConvIdRef.current &&
                data.userId !== currentUserIdRef.current
              ) {
                setIsOtherUserTyping(Boolean(data.isTyping));
                setTypingUserName(data.isTyping ? data.userName || 'User' : null);

                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                if (data.isTyping) {
                  typingTimeoutRef.current = setTimeout(() => {
                    setIsOtherUserTyping(false);
                    setTypingUserName(null);
                  }, 4000);
                }
              }
              onTypingRef.current?.(data);
              break;
            }

            case 'chat:presence': {
              if (data?.userId && data.userId !== currentUserIdRef.current) {
                setPartnerPresence((prev) => {
                  if (prev?.userId && prev.userId !== data.userId) return prev;
                  return {
                    userId: data.userId,
                    isOnline: Boolean(data.isOnline),
                    lastSeenAt: data.lastSeenAt || prev?.lastSeenAt || null,
                  };
                });
                onPresenceRef.current?.(data);
              }
              break;
            }

            case 'chat:notification': {
              notifyChatUpdated(data?.conversationId);
              break;
            }

            case 'chat:error':
            case 'error': {
              setError(data?.message || payload?.message || 'Chat operation error');
              break;
            }

            default:
              break;
          }
        } catch {
          // Ignore malformed WS frames
        }
      };

      ws.onclose = () => {
        if (wsRef.current === ws) {
          wsRef.current = null;
        }
        setWsConnected(false);
        setIsConnecting(false);

        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        if (!autoConnect || !isOnlineRef.current) return;

        if (reconnectAttemptsRef.current < MAX_WS_RECONNECT_ATTEMPTS) {
          const delay = computeBackoffDelayMs(reconnectAttemptsRef.current);
          reconnectAttemptsRef.current += 1;
          setIsReconnecting(true);
          reconnectTimerRef.current = setTimeout(() => {
            connectRef.current();
          }, delay);
        } else {
          setIsReconnecting(false);
        }
      };

      ws.onerror = () => {
        setIsConnecting(false);
      };
    } catch {
      setIsConnecting(false);
      setWsConnected(false);
    }
  }, [token, autoConnect, joinRoom, sendRaw, applyMergedMessages, flushOutbox, syncMissedMessages]);

  // Network online/offline + cross-tab storage/visibility listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      isOnlineRef.current = true;
      reconnectAttemptsRef.current = 0;
      connect();
      syncMissedMessages();
      flushOutbox();
    };
    const handleOffline = () => {
      setIsOnline(false);
      isOnlineRef.current = false;
      setWsConnected(false);
      setIsReconnecting(false);
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible' && isOnlineRef.current) {
        syncMissedMessages();
        if (!wsConnectedRef.current && autoConnect) {
          reconnectAttemptsRef.current = 0;
          connect();
        }
      }
    };
    const handleStorage = (ev: StorageEvent) => {
      const targetId = activeConvIdRef.current;
      if (!targetId || !ev.key) return;
      if (ev.key === `halder-chat-cache-${targetId}` || ev.key === `halder-chat-outbox-${targetId}`) {
        const cached = loadCachedMessages(targetId);
        const outbox = loadOutboxQueue(targetId).map(outboxItemToMessage);
        setMessages(mergeMessages(cached, outbox));
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      window.addEventListener('storage', handleStorage);
      document?.addEventListener?.('visibilitychange', handleVisibility);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('storage', handleStorage);
        document?.removeEventListener?.('visibilitychange', handleVisibility);
      }
    };
  }, [autoConnect, connect, flushOutbox, syncMissedMessages]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  // Connect WebSocket when active/authenticated
  useEffect(() => {
    let active = true;
    const hasAuth = Boolean(token || ApiClient.getToken());
    const ackWaiters = pendingAckWaitersRef.current;
    if (autoConnect && hasAuth && isOnline) {
      queueMicrotask(() => {
        if (active) connectRef.current();
      });
    }

    return () => {
      active = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (outgoingTypingStopTimerRef.current) clearTimeout(outgoingTypingStopTimerRef.current);
      ackWaiters.forEach((waiter) => clearTimeout(waiter.timer));
      ackWaiters.clear();
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {}
        wsRef.current = null;
      }
    };
  }, [autoConnect, token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load history and join room whenever conversationId switches
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setIsOtherUserTyping(false);
      setTypingUserName(null);
      setPartnerPresence(null);
      setHasMoreHistory(false);
      setNextCursor(null);
      setHistoryError(null);
      if (!conversationId) {
        setMessages([]);
      }
    });
    lastSyncedTimestampRef.current = null;

    if (conversationId) {
      loadHistory(conversationId).then(() => {
        if (active) flushOutbox();
      });

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        joinRoom(conversationId);
      }
    }

    return () => {
      active = false;
    };
  }, [conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Public sendMessage with persistent outbox + idempotent clientMessageId
  const sendMessage = useCallback(
    async (text: string, options?: SendMessagePayloadOptions): Promise<ChatWsMessage | null> => {
      const targetConvId = activeConvIdRef.current;
      const trimmed = (text || '').trim();
      const hasAttachments = Boolean(options?.attachmentIds && options.attachmentIds.length > 0);
      if (!targetConvId || (!trimmed && !hasAttachments)) return null;

      const senderId = currentUserIdRef.current || '';
      const clientMessageId = options?.clientMessageId || generateClientMessageId();
      const item: OutboxQueueItem = {
        clientMessageId,
        conversationId: targetConvId,
        senderId,
        senderRole: userRoleRef.current,
        message: trimmed,
        replyToId: options?.replyToId || null,
        replyTo: options?.replyTo || null,
        attachmentIds: options?.attachmentIds,
        attachments: options?.attachments,
        status: 'sending',
        createdAt: new Date().toISOString(),
        attempts: 0,
      };

      upsertOutboxItem(targetConvId, item);
      const optimisticMsg = outboxItemToMessage(item);
      applyMergedMessages(targetConvId, (prev) => mergeMessages(prev, [optimisticMsg]));

      // Clear typing indicator on send
      if (outgoingTypingStopTimerRef.current) {
        clearTimeout(outgoingTypingStopTimerRef.current);
        outgoingTypingStopTimerRef.current = null;
      }
      sendRaw({ type: 'chat:typing', conversationId: targetConvId, isTyping: false });

      return dispatchOutboxItem(item);
    },
    [applyMergedMessages, dispatchOutboxItem, sendRaw]
  );

  const retryMessage = useCallback(
    async (clientMessageId: string): Promise<ChatWsMessage | null> => {
      const targetConvId = activeConvIdRef.current;
      if (!targetConvId) return null;
      const queue = loadOutboxQueue(targetConvId);
      const item = queue.find((q) => q.clientMessageId === clientMessageId);
      if (!item) return null;

      const retrying: OutboxQueueItem = { ...item, status: 'sending', error: undefined };
      upsertOutboxItem(targetConvId, retrying);
      applyMergedMessages(targetConvId, (prev) =>
        mergeMessages(prev, [outboxItemToMessage(retrying)])
      );
      return dispatchOutboxItem(retrying);
    },
    [applyMergedMessages, dispatchOutboxItem]
  );

  const discardFailedMessage = useCallback((clientMessageId: string) => {
    const targetConvId = activeConvIdRef.current;
    if (!targetConvId) return;
    removeOutboxItem(targetConvId, clientMessageId);
    setMessages((prev) => prev.filter((m) => m.id !== clientMessageId && m.clientMessageId !== clientMessageId));
  }, []);

  const editMessage = useCallback(
    async (messageId: string, newText: string): Promise<ChatWsMessage | null> => {
      const targetConvId = activeConvIdRef.current;
      const trimmed = newText.trim();
      if (!targetConvId || !messageId || !trimmed) return null;

      try {
        const res = await ApiClient.editChatMessage(targetConvId, messageId, trimmed);
        const updated = normalizeMessage(res?.data || res);
        applyMergedMessages(targetConvId, (prev) => mergeMessages(prev, [updated]));
        notifyChatUpdated(targetConvId);
        return updated;
      } catch (err: any) {
        setError(err?.message || 'Failed to edit message.');
        return null;
      }
    },
    [applyMergedMessages]
  );

  const deleteMessage = useCallback(
    async (messageId: string): Promise<boolean> => {
      const targetConvId = activeConvIdRef.current;
      if (!targetConvId || !messageId) return false;

      try {
        const res = await ApiClient.deleteChatMessage(targetConvId, messageId);
        const deleted = normalizeMessage(res?.data || res);
        applyMergedMessages(targetConvId, (prev) => mergeMessages(prev, [deleted]));
        notifyChatUpdated(targetConvId);
        return true;
      } catch (err: any) {
        setError(err?.message || 'Failed to delete message.');
        return false;
      }
    },
    [applyMergedMessages]
  );

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      const targetId = activeConvIdRef.current;
      if (!targetId || wsRef.current?.readyState !== WebSocket.OPEN) return;

      if (!isTyping) {
        if (outgoingTypingStopTimerRef.current) {
          clearTimeout(outgoingTypingStopTimerRef.current);
          outgoingTypingStopTimerRef.current = null;
        }
        sendRaw({ type: 'chat:typing', conversationId: targetId, isTyping: false });
        return;
      }

      const now = Date.now();
      if (now - lastTypingEmitRef.current >= 1500) {
        lastTypingEmitRef.current = now;
        sendRaw({ type: 'chat:typing', conversationId: targetId, isTyping: true });
      }

      if (outgoingTypingStopTimerRef.current) {
        clearTimeout(outgoingTypingStopTimerRef.current);
      }
      outgoingTypingStopTimerRef.current = setTimeout(() => {
        sendRaw({ type: 'chat:typing', conversationId: targetId, isTyping: false });
      }, 2500);
    },
    [sendRaw]
  );

  const markAsRead = useCallback(async () => {
    const targetId = activeConvIdRef.current;
    if (!targetId) return;

    const readAtNow = new Date().toISOString();
    applyMergedMessages(targetId, (prev) =>
      prev.map((m) =>
        m.senderId !== currentUserIdRef.current && !m.readAt
          ? {
              ...m,
              read_at: readAtNow,
              readAt: readAtNow,
              delivered_at: m.delivered_at || readAtNow,
              deliveredAt: m.deliveredAt || readAtNow,
              status: 'read',
            }
          : m
      )
    );

    const wsSent = sendRaw({ type: 'chat:read', conversationId: targetId });
    if (!wsSent) {
      try {
        await ApiClient.markConversationRead(targetId);
      } catch {
        // Ignore network transient read error
      }
    }
    notifyChatUpdated(targetId);
  }, [applyMergedMessages, sendRaw]);

  // Infrequent incremental fallback sync ONLY while WS is disconnected on a visible online tab
  useEffect(() => {
    if (!conversationId || wsConnected || !isOnline) return;
    const pollTimer = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        syncMissedMessages(conversationId);
      }
    }, 12000);

    return () => clearInterval(pollTimer);
  }, [conversationId, wsConnected, isOnline, syncMissedMessages]);

  const manualReconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    setError(null);
    connect();
    syncMissedMessages();
    flushOutbox();
  }, [connect, syncMissedMessages, flushOutbox]);

  const clearError = useCallback(() => setError(null), []);

  const connectionStatus: ChatConnectionStatus = !isOnline
    ? 'offline'
    : wsConnected
      ? 'connected'
      : isReconnecting
        ? 'reconnecting'
        : isConnecting
          ? 'connecting'
          : 'fallback';

  const pendingCount = messages.filter((m) => m.status === 'sending').length;
  const failedCount = messages.filter((m) => m.status === 'failed').length;

  return {
    isConnected: wsConnected,
    isOnline,
    isConnecting,
    connectionStatus,
    messages,
    isLoadingHistory,
    isLoadingMore,
    hasMoreHistory,
    historyError,
    isOtherUserTyping,
    typingUserName,
    partnerPresence,
    pendingCount,
    failedCount,
    error,
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
    reconnect: manualReconnect,
    clearError,
  };
}
