import { Router } from 'express';
import { ChatController } from '../controllers/chatController';
import { authenticateUser } from '../middleware/auth';
import { verifyConversationAccess } from '../middleware/idor';
import { validateBody } from '../middleware/validate';
import { z } from 'zod';
import { chatLimiter, uploadLimiter } from '../middleware/rateLimiter';
import { chatAttachmentUpload } from '../middleware/upload';

const router = Router();

const createConvSchema = z.object({
  customerId: z.string().optional(),
  farmerId: z.string().optional(),
  userId: z.string().optional(),
  partnerId: z.string().optional(),
  productId: z.string().optional(),
});

const sendMessageSchema = z
  .object({
    message: z.string().max(2000).optional().default(''),
    clientMessageId: z.string().min(1).max(120).optional(),
    replyToId: z.string().min(1).max(120).optional(),
    attachmentIds: z.array(z.string().min(1).max(120)).max(5).optional(),
  })
  .refine(
    (data) => Boolean(data.message?.trim()) || (Array.isArray(data.attachmentIds) && data.attachmentIds.length > 0),
    { message: 'Message text or at least one attachment is required', path: ['message'] }
  );

const editMessageSchema = z.object({
  message: z.string().min(1).max(2000),
});

const muteSchema = z.object({
  muted: z.boolean(),
});

// List all conversations for the authenticated user
router.get('/conversations', authenticateUser, ChatController.listConversations);

// Create or retrieve conversation
router.post('/conversations', authenticateUser, validateBody(createConvSchema), ChatController.getOrCreate);

// Mute / unmute conversation notifications
router.patch(
  '/conversations/:id/mute',
  authenticateUser,
  verifyConversationAccess,
  validateBody(muteSchema),
  ChatController.setMuted
);

// Retrieve message history (paginated / incremental / search, IDOR protected)
router.get('/conversations/:id/messages', authenticateUser, verifyConversationAccess, ChatController.getMessages);

// Send message (Zero-Trust IDOR + rate limiting + validation + WS broadcast)
router.post(
  '/conversations/:id/messages',
  authenticateUser,
  verifyConversationAccess,
  chatLimiter,
  validateBody(sendMessageSchema),
  ChatController.sendMessage
);

// Edit own message
router.patch(
  '/conversations/:id/messages/:messageId',
  authenticateUser,
  verifyConversationAccess,
  chatLimiter,
  validateBody(editMessageSchema),
  ChatController.editMessage
);

// Delete own message
router.delete(
  '/conversations/:id/messages/:messageId',
  authenticateUser,
  verifyConversationAccess,
  ChatController.deleteMessage
);

// Mark messages as read - support both PATCH and POST
router.patch('/conversations/:id/read', authenticateUser, verifyConversationAccess, ChatController.markAsRead);
router.post('/conversations/:id/read', authenticateUser, verifyConversationAccess, ChatController.markAsRead);

// Authenticated attachment upload & download
router.post(
  '/conversations/:id/attachments',
  authenticateUser,
  verifyConversationAccess,
  uploadLimiter,
  chatAttachmentUpload.single('file'),
  ChatController.uploadAttachment
);

router.get(
  '/conversations/:id/attachments/:attachmentId',
  authenticateUser,
  verifyConversationAccess,
  ChatController.downloadAttachment
);

export default router;
