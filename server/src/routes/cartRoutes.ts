import { Router } from 'express';
import { CartController } from '../controllers/cartController';
import { authenticateUser } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { z } from 'zod';

const router = Router();

const cartItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().positive(),
});

router.get('/', authenticateUser, CartController.getCart);
router.post('/items', authenticateUser, validateBody(cartItemSchema), CartController.addItem);
router.patch('/items', authenticateUser, validateBody(cartItemSchema), CartController.updateQuantity);
router.delete('/items/:productId', authenticateUser, CartController.removeItem);
router.delete('/clear', authenticateUser, CartController.clear);

export default router;
