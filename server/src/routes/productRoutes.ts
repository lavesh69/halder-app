import { Router } from 'express';
import { ProductController } from '../controllers/productController';
import { authenticateUser, optionalAuth } from '../middleware/auth';
import { requireFarmer } from '../middleware/rbac';
import { verifyProductOwnership } from '../middleware/idor';
import { searchLimiter } from '../middleware/rateLimiter';
import { validateBody } from '../middleware/validate';
import { z } from 'zod';

const router = Router();

const createProductSchema = z.object({
  categoryId: z.string(),
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.number().positive('Price must be greater than 0'),
  unit: z.enum(['kg', 'gram', 'litre', 'bunch', 'piece', 'packet', 'dozen', 'box']),
  availableQuantity: z.number().min(0, 'Quantity cannot be negative'),
  isOrganic: z.boolean().optional(),
  availableToday: z.boolean().optional(),
  location: z.string().min(2),
  city: z.string().optional(),
  image: z.string().url().or(z.string().min(5)),
});

router.get('/', searchLimiter, optionalAuth, ProductController.list);
router.get('/:id', ProductController.getById);
router.post('/', authenticateUser, requireFarmer, validateBody(createProductSchema), ProductController.create);
router.patch('/:id', authenticateUser, requireFarmer, verifyProductOwnership, ProductController.update);
router.delete('/:id', authenticateUser, requireFarmer, verifyProductOwnership, ProductController.delete);

export default router;
