import { Request, Response, NextFunction } from 'express';
import { ChatService } from '../services/chatService';
import { ChatSocketService } from '../websocket/chatSocket';
import { ChatAttachmentService } from '../services/chatAttachmentService';
import { AppError } from '../utils/errors';

export class ChatController {
  /**
   * POST /api/v1/chat/conversations
   * Create or retrieve existing conversation between authentic DB participants.
   */
  static async getOrCreate(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUserId = req.user!.id;
      const targetPartyId =
        req.body.farmerId || req.body.customerId || req.body.userId || req.body.partnerId;

      if (!targetPartyId) {
        return res.status(400).json({
          success: false,
          error: { message: 'Target participant (farmerId or customerId) is required.' },
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
   * List authenticated user's conversations with presence, mute status, and unread counts.
   */
  static async listConversations(req: Request, res: Response, next: NextFunction) {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const conversations = ChatService.getUserConversations(
        req.user!.id,
        req.user!.role,
        req.user!.farmerProfileId,
        {
          search,
          isUserOnline: (uid) => ChatSocketService.isUserOnline(uid),
        }
      );

      // Polling fallback also confirms delivery for incoming messages
      const deliveredGroups = ChatService.markAllDeliveredForUser(req.user!.id);
      for (const group of deliveredGroups) {
        ChatSocketService.broadcastConversationEvent(
          group.conversationId,
          group.senderId,
          'chat:delivered',
          {
            conversationId: group.conversationId,
            userId: req.user!.id,
            deliveredAt: group.deliveredAt,
            messageIds: group.messageIds,
          }
        );
      }

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
   * Paginated, incremental (`after`), or searchable (`q`) message history (IDOR protected).
   */
  static async getMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const before = typeof req.query.before === 'string' ? req.query.before : undefined;
      const after = typeof req.query.after === 'string' ? req.query.after : undefined;
      const search = typeof req.query.q === 'string' ? req.query.q : undefined;

      const result = ChatService.getMessages(req.params.id, { limit, before, after, search });

      if (!before && !search) {
        const deliveredAt = ChatService.markConversationDelivered(req.params.id, req.user!.id);
        if (deliveredAt) {
          const meta = ChatService.getConversationMeta(req.params.id);
          const partnerUserId = meta
            ? req.user!.id === meta.customer_id
              ? meta.farmer_user_id || meta.farmer_id
              : meta.customer_id
            : null;
          ChatSocketService.broadcastConversationEvent(
            req.params.id,
            partnerUserId,
            'chat:delivered',
            {
              conversationId: req.params.id,
              userId: req.user!.id,
              deliveredAt,
            }
          );
        }
      }

      res.json({
        success: true,
        data: result.messages,
        messages: result.messages,
        pagination: {
          hasMore: result.hasMore,
          nextCursor: result.nextCursor,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/chat/conversations/:id/messages
   * Send a persistent message via REST (with idempotency, replies, attachments & live WS broadcast).
   */
  static async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const senderRole = req.user!.role === 'farmer' ? 'farmer' : 'user';
      const meta = ChatService.getConversationMeta(req.params.id);
      const recipientUserId = meta
        ? req.user!.id === meta.customer_id
          ? meta.farmer_user_id || meta.farmer_id
          : meta.customer_id
        : null;
      const recipientOnline = Boolean(recipientUserId && ChatSocketService.isUserOnline(recipientUserId));

      const msg = ChatService.sendMessage(
        req.params.id,
        req.user!.id,
        senderRole,
        req.body.message || '',
        {
          clientMessageId: req.body.clientMessageId,
          replyToId: req.body.replyToId,
          attachmentIds: req.body.attachmentIds,
          recipientOnline,
        }
      );

      if (!msg.deduplicated) {
        ChatSocketService.broadcastConversationEvent(req.params.id, recipientUserId, 'chat:message', msg);

        if (recipientUserId && recipientUserId !== req.user!.id) {
          ChatSocketService.sendToUser(recipientUserId, 'chat:notification', {
            conversationId: req.params.id,
            message: msg,
          });
        }

        ChatService.dispatchChatNotification({
          conversationId: req.params.id,
          senderId: req.user!.id,
          senderName: req.user!.name,
          message: msg,
        });
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
   * PATCH /api/v1/chat/conversations/:id/messages/:messageId
   * Edit own message (strict sender verification + live WS broadcast).
   */
  static async editMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = ChatService.editMessage(
        req.params.id,
        req.params.messageId,
        req.user!.id,
        req.body.message
      );

      const meta = ChatService.getConversationMeta(req.params.id);
      const recipientUserId = meta
        ? req.user!.id === meta.customer_id
          ? meta.farmer_user_id || meta.farmer_id
          : meta.customer_id
        : null;

      ChatSocketService.broadcastConversationEvent(
        req.params.id,
        recipientUserId,
        'chat:message_edited',
        { conversationId: req.params.id, message: updated }
      );

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/chat/conversations/:id/messages/:messageId
   * Soft-delete own message (or admin) + live WS tombstone broadcast.
   */
  static async deleteMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const deleted = ChatService.deleteMessage(
        req.params.id,
        req.params.messageId,
        req.user!.id,
        req.user!.role
      );

      const meta = ChatService.getConversationMeta(req.params.id);
      const recipientUserId = meta
        ? req.user!.id === meta.customer_id
          ? meta.farmer_user_id || meta.farmer_id
          : meta.customer_id
        : null;

      ChatSocketService.broadcastConversationEvent(
        req.params.id,
        recipientUserId,
        'chat:message_deleted',
        {
          conversationId: req.params.id,
          messageId: deleted.id,
          deletedAt: deleted.deletedAt,
          message: deleted,
        }
      );

      res.json({ success: true, data: deleted });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/chat/conversations/:id/read or POST /api/v1/chat/conversations/:id/read
   */
  static async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const result = ChatService.markMessagesRead(req.params.id, req.user!.id);

      const meta = ChatService.getConversationMeta(req.params.id);
      const partnerUserId = meta
        ? req.user!.id === meta.customer_id
          ? meta.farmer_user_id || meta.farmer_id
          : meta.customer_id
        : null;

      ChatSocketService.broadcastConversationEvent(req.params.id, partnerUserId, 'chat:read', {
        conversationId: req.params.id,
        userId: req.user!.id,
        readAt: result.readAt,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/chat/conversations/:id/mute
   */
  static async setMuted(req: Request, res: Response, next: NextFunction) {
    try {
      const muted = Boolean(req.body.muted);
      const result = ChatService.setConversationMuted(req.params.id, req.user!.id, muted);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/chat/conversations/:id/attachments
   * Authenticated multipart file upload (Images, PDF, TXT, DOC, DOCX) stored privately.
   */
  static async uploadAttachment(req: Request, res: Response, next: NextFunction) {
    try {
      const file = req.file;
      if (!file) {
        throw AppError.badRequest('No file provided under form field "file".');
      }

      const attachment = await ChatAttachmentService.saveAttachment({
        conversationId: req.params.id,
        uploaderId: req.user!.id,
        file,
      });

      res.status(201).json({
        success: true,
        data: attachment,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/chat/conversations/:id/attachments/:attachmentId
   * Strictly authenticated & IDOR-verified attachment download.
   */
  static async downloadAttachment(req: Request, res: Response, next: NextFunction) {
    try {
      const { buffer, mimeType, filename, sizeBytes } = await ChatAttachmentService.getAttachmentContent({
        conversationId: req.params.id,
        attachmentId: req.params.attachmentId,
      });

      const isInlineSafe = mimeType.startsWith('image/') || mimeType === 'application/pdf';
      const safeName = filename.replace(/"/g, '_');

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Length', String(sizeBytes));
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.setHeader(
        'Content-Disposition',
        `${isInlineSafe ? 'inline' : 'attachment'}; filename="${safeName}"`
      );
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  }
}
