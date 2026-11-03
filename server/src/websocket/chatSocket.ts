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
}

export class ChatSocketService {
  private static wss: WebSocketServer | null = null;
  // Map conversationId -> Set of ExtWebSockets
  private static rooms: Map<string, Set<ExtWebSocket>> = new Map();
  // Map userId -> Set of ExtWebSockets (for multi-device presence)
  private static userSockets: Map<string, Set<ExtWebSocket>> = new Map();

  static init(server: http.Server): WebSocketServer {
    if (this.wss) return this.wss;

    const wss = new WebSocketServer({ noServer: true });
    this.wss = wss;

    // Attach upgrade listener
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
      } catch (e) {
        socket.destroy();
      }
    });

    wss.on('connection', (ws: ExtWebSocket, req: http.IncomingMessage) => {
      ws.isAlive = true;
      ws.rooms = new Set<string>();

      // Heartbeat pong listener
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Attempt handshake authentication from URL query, Authorization header, or cookies
      this.authenticateConnection(ws, req);

      ws.on('message', async (data: RawData) => {
        try {
          const messageStr = data.toString('utf-8');
          const payload = JSON.parse(messageStr);
          await this.handleIncomingEvent(ws, payload);
        } catch (err: any) {
          this.sendEvent(ws, 'chat:error', {
            message: err.message || 'Invalid message format',
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

      // Send initial ready acknowledgment
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

    // 30-second heartbeat check to clean up dead connections
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

    wss.on('close', () => {
      clearInterval(interval);
      this.rooms.clear();
      this.userSockets.clear();
    });

    console.log('🌾 [ChatSocket] Live WebSocket server mounted on /ws');
    return wss;
  }

  /**
   * Parse token and authenticate WebSocket on initial connection.
   */
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
      // Allow unauthenticated connection to remain open, but require auth before joining rooms
    }
  }

  /**
   * Validate token and register user to socket.
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

      let farmerProfileId: string | undefined;
      if (user.role === 'farmer') {
        const fp = Database.get<any>('SELECT id FROM farmer_profiles WHERE user_id = ?', [user.id]);
        farmerProfileId = fp?.id;
      }

      ws.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        farmerProfileId,
      };

      // Register in userSockets map
      if (!this.userSockets.has(user.id)) {
        this.userSockets.set(user.id, new Set());
      }
      this.userSockets.get(user.id)!.add(ws);

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Handle incoming WebSocket client events.
   */
  private static async handleIncomingEvent(ws: ExtWebSocket, payload: any) {
    const eventType = payload.type || payload.event || payload.action;
    const data = payload.data || payload;

    switch (eventType) {
      case 'ping': {
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

        if (!conversationId) {
          return this.sendEvent(ws, 'chat:error', {
            message: 'conversationId is required to join room',
            code: 'BAD_REQUEST',
          });
        }

        // Zero-Trust IDOR Check
        const isAuthorized = this.verifyConversationAccess(ws.user, conversationId);
        if (!isAuthorized) {
          return this.sendEvent(ws, 'chat:error', {
            message: 'You are not a participant in this conversation.',
            code: 'FORBIDDEN',
            conversationId,
          });
        }

        // Join room
        if (!this.rooms.has(conversationId)) {
          this.rooms.set(conversationId, new Set());
        }
        this.rooms.get(conversationId)!.add(ws);
        ws.rooms?.add(conversationId);

        this.sendEvent(ws, 'chat:joined', {
          conversationId,
          success: true,
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
          this.sendEvent(ws, 'chat:left', { conversationId, success: true });
        }
        break;
      }

      case 'chat:send':
      case 'send_message':
      case 'message': {
        const conversationId = data.conversationId || payload.conversationId;
        const messageText = data.message || payload.message || data.text || payload.text;

        if (!ws.user) {
          return this.sendEvent(ws, 'chat:error', {
            message: 'Authentication required to send messages',
            code: 'UNAUTHORIZED',
            conversationId,
          });
        }

        if (!conversationId || !messageText) {
          return this.sendEvent(ws, 'chat:error', {
            message: 'conversationId and message are required',
            code: 'BAD_REQUEST',
          });
        }

        // Zero-Trust IDOR Check
        const isAuthorized = this.verifyConversationAccess(ws.user, conversationId);
        if (!isAuthorized) {
          return this.sendEvent(ws, 'chat:error', {
            message: 'You are not a participant in this conversation.',
            code: 'FORBIDDEN',
            conversationId,
          });
        }

        const senderRole = ws.user.role === 'farmer' ? 'farmer' : 'user';
        const msg = ChatService.sendMessage(conversationId, ws.user.id, senderRole, messageText);

        // Broadcast to all participants in the conversation room
        this.broadcastToConversation(conversationId, 'chat:message', msg);
        break;
      }

      case 'chat:typing':
      case 'typing': {
        const conversationId = data.conversationId || payload.conversationId;
        const isTyping = data.isTyping !== undefined ? data.isTyping : payload.isTyping;

        if (!ws.user || !conversationId) return;

        // Zero-Trust IDOR Check
        const isAuthorized = this.verifyConversationAccess(ws.user, conversationId);
        if (!isAuthorized) return;

        // Broadcast typing indicator to other room participants (exclude sender)
        this.broadcastToConversation(
          conversationId,
          'chat:typing',
          {
            conversationId,
            userId: ws.user.id,
            userName: ws.user.name,
            isTyping: !!isTyping,
          },
          ws
        );
        break;
      }

      case 'chat:read':
      case 'mark_read': {
        const conversationId = data.conversationId || payload.conversationId;

        if (!ws.user || !conversationId) return;

        // Zero-Trust IDOR Check
        const isAuthorized = this.verifyConversationAccess(ws.user, conversationId);
        if (!isAuthorized) return;

        const result = ChatService.markMessagesRead(conversationId, ws.user.id);

        // Broadcast read receipt to room
        this.broadcastToConversation(conversationId, 'chat:read', {
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

  /**
   * Zero-Trust check verifying user participates in SQLite conversation.
   */
  public static verifyConversationAccess(user: AuthenticatedWsUser, conversationId: string): boolean {
    if (user.role === 'admin') return true;

    const conv = Database.get<any>(
      'SELECT id, customer_id, farmer_id FROM conversations WHERE id = ?',
      [conversationId]
    );

    if (!conv) return false;

    const isCustomer = conv.customer_id === user.id;
    const isFarmer = user.farmerProfileId && conv.farmer_id === user.farmerProfileId;

    return !!(isCustomer || isFarmer);
  }

  /**
   * Broadcast an event to all connected sockets in a conversation room.
   */
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

  /**
   * Send typed event to a single WebSocket client.
   */
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

  /**
   * Clean up socket references on disconnect.
   */
  private static cleanupSocket(ws: ExtWebSocket) {
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
        }
      }
    }
  }

  /**
   * Return number of active WebSocket clients.
   */
  public static getConnectedClientsCount(): number {
    return this.wss ? this.wss.clients.size : 0;
  }

  /**
   * Check if a specific user has at least one active WebSocket connection.
   */
  public static isUserOnline(userId: string): boolean {
    const set = this.userSockets.get(userId);
    return !!(set && set.size > 0);
  }

  /**
   * Reset instance (for testing teardowns)
   */
  public static reset() {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    this.rooms.clear();
    this.userSockets.clear();
  }
}

export function initChatSocket(server: http.Server): WebSocketServer {
  return ChatSocketService.init(server);
}
