import { Router } from 'express';
import { ChatController } from '../controllers/chatController';
import { authenticateUser } from '../middleware/auth';
import { verifyConversationAccess } from '../middleware/idor';
import { validateBody } from '../middleware/validate';
import { z } from 'zod';
import { chatLimiter } from '../middleware/rateLimiter';

const router = Router();

const createConvSchema = z.object({
  customerId: z.string().optional(),
  farmerId: z.string().optional(),
  productId: z.string().optional(),
});

const messageSchema = z.object({
  message: z.string().min(1).max(2000),
});

// List all conversations for the authenticated user
router.get('/conversations', authenticateUser, ChatController.listConversations);

// Create or retrieve conversation
router.post('/conversations', authenticateUser, validateBody(createConvSchema), ChatController.getOrCreate);

// Retrieve message history (Zero-Trust IDOR check)
router.get('/conversations/:id/messages', authenticateUser, verifyConversationAccess, ChatController.getMessages);

// Send message (Zero-Trust IDOR check + rate limiting + validation + WS broadcast)
router.post(
  '/conversations/:id/messages',
  authenticateUser,
  verifyConversationAccess,
  chatLimiter,
  validateBody(messageSchema),
  ChatController.sendMessage
);

// Mark messages as read (Zero-Trust IDOR check + WS broadcast) - support both PATCH and POST
router.patch('/conversations/:id/read', authenticateUser, verifyConversationAccess, ChatController.markAsRead);
router.post('/conversations/:id/read', authenticateUser, verifyConversationAccess, ChatController.markAsRead);

export default router;
