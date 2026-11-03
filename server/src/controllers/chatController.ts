import { Request, Response, NextFunction } from 'express';
import { ChatService } from '../services/chatService';
import { ChatSocketService } from '../websocket/chatSocket';

export class ChatController {
  /**
   * POST /api/v1/chat/conversations
   * Create or retrieve existing conversation between customer and farmer.
   */
  static async getOrCreate(req: Request, res: Response, next: NextFunction) {
    try {
      let customerId = req.body.customerId;
      let farmerId = req.body.farmerId;

      if (req.user!.role === 'customer') {
        customerId = req.user!.id;
      } else if (req.user!.role === 'farmer') {
        farmerId = req.user!.farmerProfileId!;
      }

      const conv = ChatService.getOrCreateConversation(customerId, farmerId, req.body.productId);
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
