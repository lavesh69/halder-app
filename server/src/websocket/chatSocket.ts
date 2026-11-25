import { WebSocketServer, WebSocket, RawData } from 'ws';
import http from 'http';
import { CryptoUtil } from '../utils/crypto';
import { Database } from '../db/database';
import { ChatService } from '../services/chatService';

export interface AuthenticatedWsUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'farmer' | 'admin';
  status: 'active' | 'suspended';
  farmerProfileId?: string;
}

export interface ExtWebSocket extends WebSocket {
  isAlive?: boolean;
  user?: AuthenticatedWsUser;
  rooms?: Set<string>;
  typingRooms?: Set<string>;
}

const WS_MSG_RATE_WINDOW_MS = 60_000;
const WS_MSG_RATE_MAX = 60;

export class ChatSocketService {
  private static wss: WebSocketServer | null = null;
  private static heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  // Map conversationId -> Set of ExtWebSockets
  private static rooms: Map<string, Set<ExtWebSocket>> = new Map();
  // Map userId -> Set of ExtWebSockets (for multi-device presence)
  private static userSockets: Map<string, Set<ExtWebSocket>> = new Map();
  // Map userId -> recent send timestamps (sliding window rate limiter)
  private static msgRateWindows: Map<string, number[]> = new Map();

  static init(server: http.Server): WebSocketServer {
    if (this.wss) return this.wss;

    const wss = new WebSocketServer({ noServer: true });
    this.wss = wss;

    server.on('upgrade', (request, socket, head) => {
      try {
        const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
        const pathname = url.pathname;

        if (pathname === '/ws' || pathname === '/ws/' || pathname === '/' || pathname.startsWith('/ws')) {
          wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
          });
        } else {
          socket.destroy();
        }
      } catch {
        socket.destroy();
      }
    });

    wss.on('connection', (ws: ExtWebSocket, req: http.IncomingMessage) => {
      ws.isAlive = true;
      ws.rooms = new Set<string>();
      ws.typingRooms = new Set<string>();

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      this.authenticateConnection(ws, req);

      ws.on('message', async (data: RawData) => {
        try {
          const messageStr = data.toString('utf-8');
          const payload = JSON.parse(messageStr);
          await this.handleIncomingEvent(ws, payload);
        } catch (err: any) {
          this.sendEvent(ws, 'chat:error', {
            message: err?.message || 'Invalid message format',
            code: 'BAD_REQUEST',
          });
        }
      });

      ws.on('close', () => {
        this.cleanupSocket(ws);
      });

      ws.on('error', (err) => {
        console.error('[WebSocket Error]:', err.message);
        this.cleanupSocket(ws);
      });

      this.sendEvent(ws, 'connected', {
        status: 'connected',
        authenticated: !!ws.user,
        user: ws.user
          ? {
              id: ws.user.id,
              name: ws.user.name,
              role: ws.user.role,
              farmerProfileId: ws.user.farmerProfileId,
            }
          : null,
      });
    });

    // 30-second heartbeat check to clean up stale/dead connections
    const interval = setInterval(() => {
      wss.clients.forEach((client) => {
        const extWs = client as ExtWebSocket;
        if (extWs.isAlive === false) {
          this.cleanupSocket(extWs);
          return extWs.terminate();
        }
        extWs.isAlive = false;
        extWs.ping();
      });
    }, 30000);
    interval.unref?.();
    this.heartbeatInterval = interval;

    // Cleanly tear down WS timers & state when http.Server shuts down
    server.on('close', () => {
      this.reset();
    });

    wss.on('close', () => {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
      this.rooms.clear();
      this.userSockets.clear();
      this.msgRateWindows.clear();
    });

    console.log('🌾 [ChatSocket] Live WebSocket server mounted on /ws');
    return wss;
  }

  private static authenticateConnection(ws: ExtWebSocket, req: http.IncomingMessage) {
    try {
      const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
      let token = url.searchParams.get('token');

      if (!token && req.headers.authorization?.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
      }

      if (!token && req.headers.cookie) {
        const match = req.headers.cookie.match(/halder_token=([^;]+)/);
        if (match) token = match[1];
      }

      if (token) {
        this.applyUserToken(ws, token);
      }
    } catch {
      // Allow handshake open; sensitive events enforce ws.user
    }
  }

  private static isUserActiveInDb(userId: string): boolean {
    const row = Database.get<{ status: string }>('SELECT status FROM users WHERE id = ?', [userId]);
    return Boolean(row && row.status === 'active');
  }

  private static checkMessageRateLimit(userId: string): boolean {
    if (process.env.LOAD_TEST === '1') return true;
    const now = Date.now();
    const recent = (this.msgRateWindows.get(userId) || []).filter((ts) => now - ts < WS_MSG_RATE_WINDOW_MS);
    if (recent.length >= WS_MSG_RATE_MAX) {
      this.msgRateWindows.set(userId, recent);
      return false;
    }
    recent.push(now);
    this.msgRateWindows.set(userId, recent);
    return true;
  }

  private static notifyPartnersPresence(userId: string, isOnline: boolean, lastSeenAt: string) {
    try {
      const partnerIds = ChatService.getPartnerUserIds(userId);
      for (const pid of partnerIds) {
        this.sendToUser(pid, 'chat:presence', {
          userId,
          isOnline,
          lastSeenAt,
        });
      }
    } catch {
      // Non-critical presence fanout
    }
  }

  /**
   * Validate token, register socket in multi-device map, flush pending delivery acks, and broadcast presence.
   */
  public static applyUserToken(ws: ExtWebSocket, token: string): boolean {
    try {
      const payload = CryptoUtil.verifyToken(token);
      const user = Database.get<any>(
        'SELECT id, name, email, phone, role, status FROM users WHERE id = ?',
        [payload.userId]
      );

      if (!user || user.status === 'suspended') {
        return false;
      }

      const fp = Database.get<any>('SELECT id FROM farmer_profiles WHERE user_id = ?', [user.id]);
      const farmerProfileId = fp?.id;

      const wasOnline = this.isUserOnline(user.id);

      ws.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        farmerProfileId,
      };

      if (!this.userSockets.has(user.id)) {
        this.userSockets.set(user.id, new Set());
      }
      this.userSockets.get(user.id)!.add(ws);

      const now = new Date().toISOString();
      ChatService.updateUserLastSeen(user.id, now);

      if (!wasOnline) {
        this.notifyPartnersPresence(user.id, true, now);
        // Mark any messages sent while this user was offline as delivered now
        const deliveredGroups = ChatService.markAllDeliveredForUser(user.id);
        for (const group of deliveredGroups) {
          this.broadcastConversationEvent(group.conversationId, group.senderId, 'chat:delivered', {
            conversationId: group.conversationId,
            userId: user.id,
            deliveredAt: group.deliveredAt,
            messageIds: group.messageIds,
          });
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  private static resolveRecipientUserId(conversationId: string, senderId: string): string | null {
    const meta = ChatService.getConversationMeta(conversationId);
    if (!meta) return null;
    if (senderId === meta.customer_id) return meta.farmer_user_id || meta.farmer_id;
    return meta.customer_id;
  }

  /**
   * Broadcasts an event to room sockets and any additional devices of `recipientUserId` not in that room.
   */
  public static broadcastConversationEvent(
    conversationId: string,
    recipientUserId: string | null | undefined,
    eventType: string,
    payload: any,
    excludeWs?: ExtWebSocket
  ) {
    this.broadcastToConversation(conversationId, eventType, payload, excludeWs);
    if (recipientUserId) {
      this.sendToUserExcludingRoom(recipientUserId, conversationId, eventType, payload);
    }
  }

  private static async handleIncomingEvent(ws: ExtWebSocket, payload: any) {
    const eventType = payload.type || payload.event || payload.action;
    const data = payload.data || payload;

    const eventToken = data.token || payload.token;
    if (eventToken && !ws.user) {
      this.applyUserToken(ws, eventToken);
    }

    switch (eventType) {
      case 'ping': {
        if (ws.user) {
          ChatService.updateUserLastSeen(ws.user.id);
        }
        this.sendEvent(ws, 'pong', { timestamp: new Date().toISOString() });
        break;
      }

      case 'auth':
      case 'authenticate': {
        const token = data.token || payload.token;
        if (!token) {
          return this.sendEvent(ws, 'chat:error', {
            message: 'Token is required for authentication',
            code: 'UNAUTHORIZED',
          });
        }
        const success = this.applyUserToken(ws, token);
        if (success && ws.user) {
          this.sendEvent(ws, 'chat:authenticated', {
            success: true,
            user: {
              id: ws.user.id,
              name: ws.user.name,
              role: ws.user.role,
              farmerProfileId: ws.user.farmerProfileId,
            },
          });
        } else {
          this.sendEvent(ws, 'chat:error', {
            message: 'Invalid or expired authentication token',
            code: 'UNAUTHORIZED',
          });
        }
        break;
      }

      case 'chat:join':
      case 'join_conversation':
      case 'join': {
        const conversationId = data.conversationId || payload.conversationId;
        const token = data.token || payload.token;

        if (token && !ws.user) {
          this.applyUserToken(ws, token);
        }

        if (!ws.user) {
          return this.sendEvent(ws, 'chat:error', {
            message: 'Authentication required to join conversation',
            code: 'UNAUTHORIZED',
            conversationId,
          });
        }

        if (!this.isUserActiveInDb(ws.user.id)) {
          return this.sendEvent(ws, 'chat:error', {
            message: 'Account suspended or unavailable.',
            code: 'FORBIDDEN',
            conversationId,
          });
        }

        if (!conversationId) {
          return this.sendEvent(ws, 'chat:error', {
            message: 'conversationId is required to join room',
            code: 'BAD_REQUEST',
          });
        }

        if (!this.verifyConversationAccess(ws.user, conversationId)) {
          return this.sendEvent(ws, 'chat:error', {
            message: 'You are not a participant in this conversation.',
            code: 'FORBIDDEN',
            conversationId,
          });
        }

        if (!this.rooms.has(conversationId)) {
          this.rooms.set(conversationId, new Set());
        }
        this.rooms.get(conversationId)!.add(ws);
        ws.rooms?.add(conversationId);

        // Deliver any pending messages in this conversation and return partner presence
        const deliveredAt = ChatService.markConversationDelivered(conversationId, ws.user.id);
        const partnerUserId = this.resolveRecipientUserId(conversationId, ws.user.id);
        if (deliveredAt) {
          this.broadcastConversationEvent(conversationId, partnerUserId, 'chat:delivered', {
            conversationId,
            userId: ws.user.id,
            deliveredAt,
          });
        }

        let partnerPresence: { userId: string; isOnline: boolean; lastSeenAt: string | null } | null = null;
        if (partnerUserId) {
          const partnerRow = Database.get<{ last_seen_at: string | null }>(
            'SELECT last_seen_at FROM users WHERE id = ?',
            [partnerUserId]
          );
          partnerPresence = {
            userId: partnerUserId,
            isOnline: this.isUserOnline(partnerUserId),
            lastSeenAt: partnerRow?.last_seen_at || null,
          };
        }

        this.sendEvent(ws, 'chat:joined', {
          conversationId,
          success: true,
          partnerPresence,
          timestamp: new Date().toISOString(),
        });
        break;
      }

      case 'chat:leave':
      case 'leave_conversation':
      case 'leave': {
        const conversationId = data.conversationId || payload.conversationId;
        if (conversationId && ws.rooms) {
          this.rooms.get(conversationId)?.delete(ws);
          ws.rooms.delete(conversationId);
          if (ws.typingRooms?.has(conversationId) && ws.user) {
            ws.typingRooms.delete(conversationId);
            this.broadcastToConversation(
              conversationId,
              'chat:typing',
              { conversationId, userId: ws.user.id, userName: ws.user.name, isTyping: false },
              ws
            );
          }
          this.sendEvent(ws, 'chat:left', { conversationId, success: true });
        }
        break;
      }

      case 'chat:send':
      case 'send_message':
      case 'message': {
        const conversationId = data.conversationId || payload.conversationId;
        const messageText = data.message ?? payload.message ?? data.text ?? payload.text ?? '';
        const clientMessageId = data.clientMessageId || payload.clientMessageId;
        const replyToId = data.replyToId || payload.replyToId;
        const attachmentIds = data.attachmentIds || payload.attachmentIds;

        if (!ws.user) {
          return this.sendEvent(ws, 'chat:error', {
            message: 'Authentication required to send messages',
            code: 'UNAUTHORIZED',
            conversationId,
            clientMessageId,
          });
        }

        if (!this.isUserActiveInDb(ws.user.id)) {
          return this.sendEvent(ws, 'chat:error', {
            message: 'Account suspended.',
            code: 'FORBIDDEN',
            conversationId,
            clientMessageId,
          });
        }

        if (!conversationId || (!String(messageText).trim() && (!Array.isArray(attachmentIds) || attachmentIds.length === 0))) {
          return this.sendEvent(ws, 'chat:error', {
            message: 'conversationId and message or attachmentIds are required',
            code: 'BAD_REQUEST',
            clientMessageId,
          });
        }

        if (!this.checkMessageRateLimit(ws.user.id)) {
          return this.sendEvent(ws, 'chat:error', {
            message: 'You are sending messages too quickly. Please wait a moment.',
            code: 'RATE_LIMITED',
            conversationId,
            clientMessageId,
          });
        }

        if (!this.verifyConversationAccess(ws.user, conversationId)) {
          return this.sendEvent(ws, 'chat:error', {
            message: 'You are not a participant in this conversation.',
            code: 'FORBIDDEN',
            conversationId,
            clientMessageId,
          });
        }

        const recipientUserId = this.resolveRecipientUserId(conversationId, ws.user.id);
        const recipientOnline = Boolean(recipientUserId && this.isUserOnline(recipientUserId));
        const senderRole = ws.user.role === 'farmer' ? 'farmer' : 'user';

        try {
          const msg = ChatService.sendMessage(conversationId, ws.user.id, senderRole, String(messageText), {
            clientMessageId,
            replyToId,
            attachmentIds,
            recipientOnline,
          });

          // Clear typing state on send
          ws.typingRooms?.delete(conversationId);

          // Explicit delivery confirmation back to sending client
          this.sendEvent(ws, 'chat:ack', {
            clientMessageId: clientMessageId || msg.clientMessageId,
            messageId: msg.id,
            conversationId,
            status: msg.status,
            deduplicated: Boolean(msg.deduplicated),
            message: msg,
          });

          if (!msg.deduplicated) {
            // Broadcast to room & recipient's non-room sockets (without duplicate frames on same socket)
            this.broadcastConversationEvent(conversationId, recipientUserId, 'chat:message', msg);

            if (recipientUserId && recipientUserId !== ws.user.id) {
              this.sendToUser(recipientUserId, 'chat:notification', {
                conversationId,
                message: msg,
              });
            }

            // Persist notification + push notification respecting mute & prefs
            ChatService.dispatchChatNotification({
              conversationId,
              senderId: ws.user.id,
              senderName: ws.user.name,
              message: msg,
            });
          }
        } catch (err: any) {
          this.sendEvent(ws, 'chat:error', {
            message: err?.message || 'Failed to send message',
            code: err?.code || 'BAD_REQUEST',
            conversationId,
            clientMessageId,
          });
        }
        break;
      }

      case 'chat:edit': {
        const conversationId = data.conversationId || payload.conversationId;
        const messageId = data.messageId || payload.messageId;
        const newText = data.message || payload.message;

        if (!ws.user || !conversationId || !messageId) return;
        if (!this.verifyConversationAccess(ws.user, conversationId)) {
          return this.sendEvent(ws, 'chat:error', {
            message: 'You are not a participant in this conversation.',
            code: 'FORBIDDEN',
            conversationId,
          });
        }

        try {
          const updated = ChatService.editMessage(conversationId, messageId, ws.user.id, newText);
          const recipientUserId = this.resolveRecipientUserId(conversationId, ws.user.id);
          this.broadcastConversationEvent(conversationId, recipientUserId, 'chat:message_edited', {
            conversationId,
            message: updated,
          });
        } catch (err: any) {
          this.sendEvent(ws, 'chat:error', {
            message: err?.message || 'Failed to edit message',
            code: err?.code || 'BAD_REQUEST',
            conversationId,
          });
        }
        break;
      }

      case 'chat:delete': {
        const conversationId = data.conversationId || payload.conversationId;
        const messageId = data.messageId || payload.messageId;

        if (!ws.user || !conversationId || !messageId) return;
        if (!this.verifyConversationAccess(ws.user, conversationId)) {
          return this.sendEvent(ws, 'chat:error', {
            message: 'You are not a participant in this conversation.',
            code: 'FORBIDDEN',
            conversationId,
          });
        }

        try {
          const deleted = ChatService.deleteMessage(conversationId, messageId, ws.user.id, ws.user.role);
          const recipientUserId = this.resolveRecipientUserId(conversationId, ws.user.id);
          this.broadcastConversationEvent(conversationId, recipientUserId, 'chat:message_deleted', {
            conversationId,
            messageId: deleted.id,
            deletedAt: deleted.deletedAt,
            message: deleted,
          });
        } catch (err: any) {
          this.sendEvent(ws, 'chat:error', {
            message: err?.message || 'Failed to delete message',
            code: err?.code || 'BAD_REQUEST',
            conversationId,
          });
        }
        break;
      }

      case 'chat:typing':
      case 'typing': {
        const conversationId = data.conversationId || payload.conversationId;
        const isTyping = data.isTyping !== undefined ? Boolean(data.isTyping) : Boolean(payload.isTyping);

        if (!ws.user || !conversationId) return;
        if (!this.verifyConversationAccess(ws.user, conversationId)) return;

        if (isTyping) {
          ws.typingRooms?.add(conversationId);
        } else {
          ws.typingRooms?.delete(conversationId);
        }

        this.broadcastToConversation(
          conversationId,
          'chat:typing',
          {
            conversationId,
            userId: ws.user.id,
            userName: ws.user.name,
            isTyping,
          },
          ws
        );
        break;
      }

      case 'chat:delivered': {
        const conversationId = data.conversationId || payload.conversationId;
        if (!ws.user || !conversationId) return;
        if (!this.verifyConversationAccess(ws.user, conversationId)) return;

        const deliveredAt = ChatService.markConversationDelivered(conversationId, ws.user.id);
        if (deliveredAt) {
          const partnerUserId = this.resolveRecipientUserId(conversationId, ws.user.id);
          this.broadcastConversationEvent(conversationId, partnerUserId, 'chat:delivered', {
            conversationId,
            userId: ws.user.id,
            deliveredAt,
          });
        }
        break;
      }

      case 'chat:read':
      case 'mark_read': {
        const conversationId = data.conversationId || payload.conversationId;
        if (!ws.user || !conversationId) return;
        if (!this.verifyConversationAccess(ws.user, conversationId)) return;

        const result = ChatService.markMessagesRead(conversationId, ws.user.id);
        const partnerUserId = this.resolveRecipientUserId(conversationId, ws.user.id);

        this.broadcastConversationEvent(conversationId, partnerUserId, 'chat:read', {
          conversationId,
          userId: ws.user.id,
          readAt: result.readAt,
        });
        break;
      }

      default: {
        this.sendEvent(ws, 'chat:unknown_event', {
          receivedType: eventType,
          message: 'Unrecognized event type',
        });
      }
    }
  }

  public static verifyConversationAccess(user: AuthenticatedWsUser, conversationId: string): boolean {
    if (user.role === 'admin') return true;

    const conv = Database.get<any>(
      'SELECT id, customer_id, farmer_id FROM conversations WHERE id = ?',
      [conversationId]
    );
    if (!conv) return false;

    const isCustomer = conv.customer_id === user.id;
    const isFarmerDirect = Boolean(user.farmerProfileId && conv.farmer_id === user.farmerProfileId);
    const isFarmerLinked =
      Database.get<any>('SELECT 1 FROM farmer_profiles WHERE id = ? AND user_id = ?', [
        conv.farmer_id,
        user.id,
      ]) != null;

    return Boolean(isCustomer || isFarmerDirect || isFarmerLinked);
  }

  public static broadcastToConversation(
    conversationId: string,
    eventType: string,
    payload: any,
    excludeWs?: ExtWebSocket
  ) {
    const room = this.rooms.get(conversationId);
    if (!room || room.size === 0) return;

    const messageData = JSON.stringify({
      type: eventType,
      event: eventType.startsWith('chat:') ? eventType.slice(5) : eventType,
      conversationId,
      data: payload,
      ...payload,
    });

    room.forEach((client) => {
      if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
        client.send(messageData);
      }
    });
  }

  public static sendToUser(userId: string, eventType: string, payload: any) {
    const sockets = this.userSockets.get(userId);
    if (!sockets || sockets.size === 0) return;

    sockets.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        this.sendEvent(client, eventType, payload);
      }
    });
  }

  public static sendToUserExcludingRoom(
    userId: string,
    conversationId: string,
    eventType: string,
    payload: any
  ) {
    const sockets = this.userSockets.get(userId);
    if (!sockets || sockets.size === 0) return;
    const room = this.rooms.get(conversationId);

    sockets.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && (!room || !room.has(client))) {
        this.sendEvent(client, eventType, payload);
      }
    });
  }

  public static sendEvent(ws: WebSocket, eventType: string, payload: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: eventType,
          event: eventType.startsWith('chat:') ? eventType.slice(5) : eventType,
          data: payload,
          ...payload,
        })
      );
    }
  }

  private static cleanupSocket(ws: ExtWebSocket) {
    if (ws.typingRooms && ws.typingRooms.size > 0 && ws.user) {
      ws.typingRooms.forEach((roomId) => {
        this.broadcastToConversation(
          roomId,
          'chat:typing',
          { conversationId: roomId, userId: ws.user!.id, userName: ws.user!.name, isTyping: false },
          ws
        );
      });
      ws.typingRooms.clear();
    }

    if (ws.rooms) {
      ws.rooms.forEach((roomId) => {
        const room = this.rooms.get(roomId);
        if (room) {
          room.delete(ws);
          if (room.size === 0) {
            this.rooms.delete(roomId);
          }
        }
      });
      ws.rooms.clear();
    }

    if (ws.user && this.userSockets.has(ws.user.id)) {
      const userSet = this.userSockets.get(ws.user.id);
      if (userSet) {
        userSet.delete(ws);
        if (userSet.size === 0) {
          this.userSockets.delete(ws.user.id);
          const now = new Date().toISOString();
          ChatService.updateUserLastSeen(ws.user.id, now);
          this.notifyPartnersPresence(ws.user.id, false, now);
        }
      }
    }
  }

  public static getConnectedClientsCount(): number {
    return this.wss ? this.wss.clients.size : 0;
  }

  public static isUserOnline(userId: string): boolean {
    const set = this.userSockets.get(userId);
    return !!(set && set.size > 0);
  }

  public static reset() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    this.rooms.clear();
    this.userSockets.clear();
    this.msgRateWindows.clear();
  }
}

export function initChatSocket(server: http.Server): WebSocketServer {
  return ChatSocketService.init(server);
}
