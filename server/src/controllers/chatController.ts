import { Request, Response, NextFunction } from 'express';
import { ChatService } from '../services/chatService';
import { ChatSocketService } from '../websocket/chatSocket';
import { Database } from '../db/database';
import { NotificationService } from '../services/notificationService';

export class ChatController {
  /**
   * POST /api/v1/chat/conversations
   * Create or retrieve existing conversation between customer and farmer.
   */
  static async getOrCreate(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUserId = req.user!.id;
      const targetPartyId = req.body.farmerId || req.body.customerId || req.body.userId || req.body.partnerId;

      if (!targetPartyId) {
        return res.status(400).json({
          success: false,
          error: { message: 'Target participant (farmerId or customerId) is required.' },
        });
      }

      if (targetPartyId === currentUserId || (req.user!.farmerProfileId && targetPartyId === req.user!.farmerProfileId)) {
        return res.status(400).json({
          success: false,
          error: { message: 'You cannot start a conversation with yourself.' },
        });
      }

      const conv = ChatService.getOrCreateConversation(currentUserId, targetPartyId, req.body.productId);
      res.json({
        success: true,
        data: conv,
        ...conv,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/chat/conversations
   * List all conversations for the authenticated user with other party info, last message, and unread count.
   */
  static async listConversations(req: Request, res: Response, next: NextFunction) {
    try {
      const conversations = ChatService.getUserConversations(
        req.user!.id,
        req.user!.role,
        req.user!.farmerProfileId
      );
      res.json({
        success: true,
        data: conversations,
        conversations,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/chat/conversations/:id/messages
   * Retrieve message history for a conversation (IDOR protected).
   */
  static async getMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const messages = ChatService.getMessages(req.params.id);
      res.json({
        success: true,
        data: messages,
        messages,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/chat/conversations/:id/messages
   * Send a message in a conversation, save to SQLite, and broadcast via WebSocket to room.
   */
  static async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const senderRole = req.user!.role === 'farmer' ? 'farmer' : 'user';
      const msg = ChatService.sendMessage(
        req.params.id,
        req.user!.id,
        senderRole,
        req.body.message
      );

      // Broadcast live to all connected WebSocket clients in the conversation room
      ChatSocketService.broadcastToConversation(req.params.id, 'chat:message', msg);

      // Notify the recipient in-app and via push notification
      try {
        const conv = Database.get<any>('SELECT customer_id, farmer_id FROM conversations WHERE id = ?', [req.params.id]);
        if (conv) {
          const fp = Database.get<any>('SELECT user_id FROM farmer_profiles WHERE id = ?', [conv.farmer_id]);
          const recipientUserId = req.user!.id === conv.customer_id ? fp?.user_id : conv.customer_id;
          if (recipientUserId && recipientUserId !== req.user!.id) {
            ChatSocketService.sendToUser(recipientUserId, 'chat:message', msg);
            ChatSocketService.sendToUser(recipientUserId, 'chat:notification', {
              conversationId: req.params.id,
              message: msg,
            });

            const recipientUser = Database.get<any>('SELECT role FROM users WHERE id = ?', [recipientUserId]);
            NotificationService.createAndPush({
              userId: recipientUserId,
              recipientRole: recipientUser?.role || 'customer',
              type: 'chat',
              title: `New message from ${req.user!.name}`,
              message: req.body.message.slice(0, 120),
            });
          }
        }
      } catch (notifErr: any) {
        console.warn('[Chat] Notification dispatch warning:', notifErr.message);
      }

      res.status(201).json({
        success: true,
        data: msg,
        message: msg,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/chat/conversations/:id/read or POST /api/v1/chat/conversations/:id/read
   * Mark all unread messages in the conversation as read and broadcast read event.
   */
  static async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const result = ChatService.markMessagesRead(req.params.id, req.user!.id);

      // Broadcast read receipt event to WebSocket room
      ChatSocketService.broadcastToConversation(req.params.id, 'chat:read', {
        conversationId: req.params.id,
        userId: req.user!.id,
        readAt: result.readAt,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
