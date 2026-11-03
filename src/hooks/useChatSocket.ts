import { useState, useEffect, useRef, useCallback } from 'react';
import { ApiClient } from '../api/client';

export interface ChatWsMessage {
  id: string;
  conversation_id?: string;
  conversationId?: string;
  sender_id?: string;
  senderId?: string;
  sender_role?: 'user' | 'farmer' | 'admin';
  senderRole?: 'user' | 'farmer' | 'admin';
  message: string;
  read_at?: string | null;
  readAt?: string | null;
  created_at?: string;
  createdAt?: string;
}

export interface UseChatSocketOptions {
  conversationId?: string | null;
  token?: string | null;
  currentUserId?: string | null;
  onMessageReceived?: (message: ChatWsMessage) => void;
  onTyping?: (data: { conversationId: string; userId: string; userName?: string; isTyping: boolean }) => void;
  onRead?: (data: { conversationId: string; userId: string; readAt: string }) => void;
  autoConnect?: boolean;
}

export interface UseChatSocketReturn {
  isConnected: boolean;
  isConnecting: boolean;
  messages: ChatWsMessage[];
  isOtherUserTyping: boolean;
  typingUserName: string | null;
  error: string | null;
  sendMessage: (text: string) => Promise<ChatWsMessage | null>;
  sendTyping: (isTyping: boolean) => void;
  markAsRead: () => Promise<void>;
  loadHistory: (convId?: string) => Promise<ChatWsMessage[]>;
  reconnect: () => void;
  clearError: () => void;
}

/**
 * Dynamically resolves the WebSocket URL based on environment or window location.
 */
export function getWebSocketUrl(token?: string | null): string {
  let wsUrl: string;

  if (import.meta.env.VITE_WS_URL) {
    wsUrl = import.meta.env.VITE_WS_URL;
  } else {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
    try {
      const parsed = new URL(apiUrl);
      const wsProto = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${wsProto}//${parsed.host}/ws`;
    } catch {
      const wsProto = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = typeof window !== 'undefined' ? window.location.host : 'localhost:5000';
      wsUrl = `${wsProto}//${host}/ws`;
    }
  }

  if (token) {
    const separator = wsUrl.includes('?') ? '&' : '?';
    return `${wsUrl}${separator}token=${encodeURIComponent(token)}`;
  }
  return wsUrl;
}

/**
 * Normalizes message object from backend (handling snake_case / camelCase parity)
 */
export function normalizeMessage(msg: any): ChatWsMessage {
  return {
    id: msg.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    conversation_id: msg.conversation_id || msg.conversationId,
    conversationId: msg.conversationId || msg.conversation_id,
    sender_id: msg.sender_id || msg.senderId,
    senderId: msg.senderId || msg.sender_id,
    sender_role: msg.sender_role || msg.senderRole || 'user',
    senderRole: msg.senderRole || msg.sender_role || 'user',
    message: msg.message || msg.text || '',
    read_at: msg.read_at !== undefined ? msg.read_at : (msg.readAt !== undefined ? msg.readAt : null),
    readAt: msg.readAt !== undefined ? msg.readAt : (msg.read_at !== undefined ? msg.read_at : null),
    created_at: msg.created_at || msg.createdAt || new Date().toISOString(),
    createdAt: msg.createdAt || msg.created_at || new Date().toISOString(),
  };
}

export function useChatSocket({
  conversationId,
  token,
  currentUserId,
  onMessageReceived,
  onTyping,
  onRead,
  autoConnect = true,
}: UseChatSocketOptions = {}): UseChatSocketReturn {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatWsMessage[]>([]);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState<boolean>(false);
  const [typingUserName, setTypingUserName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const myTypingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);
  const activeConversationIdRef = useRef<string | null | undefined>(conversationId);

  activeConversationIdRef.current = conversationId;

  // Resolve current token
  const getAuthToken = useCallback(() => {
    return token || (typeof localStorage !== 'undefined' ? localStorage.getItem('halder-auth-token') : null);
  }, [token]);

  // Load message history via REST API
  const loadHistory = useCallback(async (convId?: string): Promise<ChatWsMessage[]> => {
    const targetConvId = convId || activeConversationIdRef.current;
    if (!targetConvId) return [];

    try {
      const res = await ApiClient.getMessages(targetConvId);
      const rawList = Array.isArray(res) ? res : (res?.messages || res?.data || []);
      const normalized = rawList.map(normalizeMessage);
      if (isMountedRef.current) {
        setMessages(normalized);
      }
      return normalized;
    } catch (err: any) {
      console.warn('[useChatSocket] Failed to load message history via REST:', err.message);
      return [];
    }
  }, []);

  // Send typed event via WebSocket
  const sendWsPayload = useCallback((payload: Record<string, any>): boolean => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(payload));
        return true;
      } catch (e) {
        console.warn('[useChatSocket] Failed to send WebSocket payload:', e);
        return false;
      }
    }
    return false;
  }, []);

  // Emit Read Receipt (WS + REST fallback)
  const markAsRead = useCallback(async () => {
    const targetConvId = activeConversationIdRef.current;
    if (!targetConvId) return;

    // Send via WS
    sendWsPayload({
      type: 'chat:read',
      conversationId: targetConvId,
    });

    // Send via REST fallback
    try {
      await ApiClient.request(`/chat/conversations/${targetConvId}/read`, {
        method: 'PATCH',
      });
    } catch {
      // Ignore or retry via POST
      try {
        await ApiClient.request(`/chat/conversations/${targetConvId}/read`, {
          method: 'POST',
        });
      } catch {}
    }

    // Optimistically mark messages as read locally
    if (isMountedRef.current) {
      const now = new Date().toISOString();
      setMessages((prev) =>
        prev.map((m) => {
          if (!m.read_at && !m.readAt) {
            return {
              ...m,
              read_at: now,
              readAt: now,
            };
          }
          return m;
        })
      );
    }
  }, [sendWsPayload]);

  // Emit Typing Indicator
  const sendTyping = useCallback(
    (isTyping: boolean) => {
      const targetConvId = activeConversationIdRef.current;
      if (!targetConvId) return;

      sendWsPayload({
        type: 'chat:typing',
        conversationId: targetConvId,
        isTyping,
      });

      if (isTyping) {
        // Auto-stop typing after 3 seconds if no new keystroke
        if (myTypingStopTimerRef.current) {
          clearTimeout(myTypingStopTimerRef.current);
        }
        myTypingStopTimerRef.current = setTimeout(() => {
          sendWsPayload({
            type: 'chat:typing',
            conversationId: targetConvId,
            isTyping: false,
          });
        }, 3000);
      }
    },
    [sendWsPayload]
  );

  // Send message via WebSocket with seamless REST fallback
  const sendMessage = useCallback(
    async (text: string): Promise<ChatWsMessage | null> => {
      const targetConvId = activeConversationIdRef.current;
      const cleanText = text.trim();
      if (!targetConvId || !cleanText) return null;

      // Stop any typing indicator
      sendTyping(false);

      const authToken = getAuthToken();

      // Try sending via WebSocket first
      const sentViaWs = sendWsPayload({
        type: 'chat:send',
        conversationId: targetConvId,
        message: cleanText,
        token: authToken,
      });

      if (sentViaWs) {
        // Optimistic local preview message (will be confirmed or updated on server echo)
        const optimisticMsg: ChatWsMessage = {
          id: `opt-${Date.now()}`,
          conversation_id: targetConvId,
          conversationId: targetConvId,
          sender_id: currentUserId || 'current-user',
          senderId: currentUserId || 'current-user',
          sender_role: 'user',
          senderRole: 'user',
          message: cleanText,
          read_at: null,
          readAt: null,
          created_at: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };

        return optimisticMsg;
      }

      // REST API Fallback if WebSocket is disconnected or send failed
      try {
        const res = await ApiClient.sendChatMessage(targetConvId, cleanText);
        const serverMsg = res?.message || res?.data || res;
        const normalized = normalizeMessage(serverMsg);

        if (isMountedRef.current) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === normalized.id)) return prev;
            return [...prev, normalized];
          });
        }
        return normalized;
      } catch (err: any) {
        const errMsg = err.message || 'Failed to send message';
        if (isMountedRef.current) {
          setError(errMsg);
        }
        console.error('[useChatSocket] REST message send error:', errMsg);
        return null;
      }
    },
    [sendWsPayload, sendTyping, getAuthToken, currentUserId]
  );

  // Handle incoming WebSocket messages
  const handleIncomingMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data);
        const eventType = payload.type || payload.event || '';
        const data = payload.data || payload;

        switch (eventType) {
          case 'connected':
          case 'chat:authenticated': {
            if (isMountedRef.current) {
              setIsConnected(true);
              setIsConnecting(false);
              setError(null);
            }
            retryCountRef.current = 0;

            // Join conversation room if active
            const currentConv = activeConversationIdRef.current;
            if (currentConv) {
              const currentToken = getAuthToken();
              sendWsPayload({
                type: 'chat:join',
                conversationId: currentConv,
                token: currentToken,
              });
            }
            break;
          }

          case 'pong':
          case 'chat:pong': {
            // Heartbeat received
            break;
          }

          case 'chat:joined': {
            // Successfully joined room
            break;
          }

          case 'chat:message':
          case 'new_message':
          case 'message': {
            const rawMsg = data.message || data;
            const normalized = normalizeMessage(rawMsg);

            if (isMountedRef.current) {
              setMessages((prev) => {
                // Deduplicate by message ID or replace matching optimistic message
                const exists = prev.some((m) => m.id === normalized.id);
                if (exists) return prev;
                // Remove optimistic messages with identical text if sent recently
                const filtered = prev.filter((m) => !m.id.startsWith('opt-') || m.message !== normalized.message);
                return [...filtered, normalized];
              });

              // If message is from other party and conversation is open, mark as read
              if (normalized.sender_id && currentUserId && normalized.sender_id !== currentUserId) {
                markAsRead();
              }
            }

            if (onMessageReceived) {
              onMessageReceived(normalized);
            }
            break;
          }

          case 'chat:typing':
          case 'user_typing':
          case 'typing': {
            const typingData = {
              conversationId: data.conversationId || payload.conversationId,
              userId: data.userId || payload.userId,
              userName: data.userName || payload.userName || 'User',
              isTyping: Boolean(data.isTyping !== undefined ? data.isTyping : payload.isTyping),
            };

            const isCurrentConv = typingData.conversationId === activeConversationIdRef.current;
            const isNotMe = !currentUserId || typingData.userId !== currentUserId;

            if (isCurrentConv && isNotMe && isMountedRef.current) {
              setIsOtherUserTyping(typingData.isTyping);
              setTypingUserName(typingData.isTyping ? typingData.userName : null);

              // Auto-clear typing after 4 seconds
              if (typingTimerRef.current) {
                clearTimeout(typingTimerRef.current);
              }
              if (typingData.isTyping) {
                typingTimerRef.current = setTimeout(() => {
                  if (isMountedRef.current) {
                    setIsOtherUserTyping(false);
                    setTypingUserName(null);
                  }
                }, 4000);
              }
            }

            if (onTyping) {
              onTyping(typingData);
            }
            break;
          }

          case 'chat:read':
          case 'messages_read':
          case 'read': {
            const readData = {
              conversationId: data.conversationId || payload.conversationId,
              userId: data.userId || payload.userId,
              readAt: data.readAt || payload.readAt || new Date().toISOString(),
            };

            if (readData.conversationId === activeConversationIdRef.current && isMountedRef.current) {
              setMessages((prev) =>
                prev.map((m) => {
                  if (!m.read_at && !m.readAt) {
                    return {
                      ...m,
                      read_at: readData.readAt,
                      readAt: readData.readAt,
                    };
                  }
                  return m;
                })
              );
            }

            if (onRead) {
              onRead(readData);
            }
            break;
          }

          case 'chat:error':
          case 'error': {
            console.warn('[useChatSocket] Server Error Event:', data.message || payload.message);
            if (isMountedRef.current && data.code !== 'BAD_REQUEST') {
              setError(data.message || 'WebSocket server error');
            }
            break;
          }

          default:
            break;
        }
      } catch (err) {
        console.warn('[useChatSocket] Error parsing incoming WS frame:', err);
      }
    },
    [getAuthToken, sendWsPayload, currentUserId, markAsRead, onMessageReceived, onTyping, onRead]
  );

  // Connect / Reconnect function with exponential backoff
  const connect = useCallback(() => {
    if (typeof window === 'undefined') return;

    // Close any previous socket cleanly
    if (wsRef.current) {
      try {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.onmessage = null;
        wsRef.current.onopen = null;
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    const authToken = getAuthToken();
    const wsUrl = getWebSocketUrl(authToken);

    setIsConnecting(true);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMountedRef.current) return;
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        retryCountRef.current = 0;

        // Authenticate explicitly if token present
        if (authToken) {
          sendWsPayload({ type: 'auth', token: authToken });
        }

        // Join room
        const activeConv = activeConversationIdRef.current;
        if (activeConv) {
          sendWsPayload({
            type: 'chat:join',
            conversationId: activeConv,
            token: authToken,
          });
        }

        // Setup 25-second heartbeat ping
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000);
      };

      ws.onmessage = handleIncomingMessage;

      ws.onerror = (err) => {
        console.warn('[useChatSocket] WebSocket error event:', err);
      };

      ws.onclose = (event) => {
        if (!isMountedRef.current) return;
        setIsConnected(false);
        setIsConnecting(false);

        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }

        // If not deliberately closed (e.g. 1000 normal closure), schedule auto-reconnection with backoff
        if (event.code !== 1000) {
          const attempt = retryCountRef.current;
          // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s + jitter
          const baseDelay = Math.min(1000 * Math.pow(2, attempt), 30000);
          const jitter = Math.random() * 800;
          const delay = baseDelay + jitter;
          retryCountRef.current += 1;

          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              connect();
            }
          }, delay);
        }
      };
    } catch (err: any) {
      console.warn('[useChatSocket] Connection initiation error:', err);
      setIsConnecting(false);
      setIsConnected(false);
    }
  }, [getAuthToken, sendWsPayload, handleIncomingMessage]);

  // Initial connection & cleanup lifecycle
  useEffect(() => {
    isMountedRef.current = true;

    if (autoConnect) {
      connect();
    }

    return () => {
      isMountedRef.current = false;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
      if (myTypingStopTimerRef.current) {
        clearTimeout(myTypingStopTimerRef.current);
      }

      if (wsRef.current) {
        try {
          // Send leave before closing
          const conv = activeConversationIdRef.current;
          if (conv && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'chat:leave', conversationId: conv }));
          }
          wsRef.current.close(1000, 'Component unmounted');
        } catch {}
        wsRef.current = null;
      }
    };
  }, [autoConnect, connect]);

  // Handle conversationId change: join new room, leave old room, load message history
  useEffect(() => {
    if (conversationId) {
      loadHistory(conversationId);

      if (isConnected && wsRef.current?.readyState === WebSocket.OPEN) {
        const authToken = getAuthToken();
        sendWsPayload({
          type: 'chat:join',
          conversationId,
          token: authToken,
        });
      }
    } else {
      setMessages([]);
      setIsOtherUserTyping(false);
      setTypingUserName(null);
    }

    return () => {
      if (conversationId && wsRef.current?.readyState === WebSocket.OPEN) {
        sendWsPayload({
          type: 'chat:leave',
          conversationId,
        });
      }
    };
  }, [conversationId, isConnected, getAuthToken, sendWsPayload, loadHistory]);

  const clearError = useCallback(() => setError(null), []);

  return {
    isConnected,
    isConnecting,
    messages,
    isOtherUserTyping,
    typingUserName,
    error,
    sendMessage,
    sendTyping,
    markAsRead,
    loadHistory,
    reconnect: connect,
    clearError,
  };
}
