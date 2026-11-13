import { Router } from 'express';
import { ProductController } from '../controllers/productController';
import { authenticateUser, optionalAuth } from '../middleware/auth';
import { requireFarmer } from '../middleware/rbac';
import { verifyProductOwnership } from '../middleware/idor';
import { searchLimiter } from '../middleware/rateLimiter';
import { validateBody } from '../middleware/validate';
import { z } from 'zod';

const router = Router();

const boolOrNum = z.union([z.boolean(), z.number().transform((n) => Boolean(n))]);

const createProductSchema = z.object({
  categoryId: z.string().optional(),
  category: z.string().optional(),
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.number().positive('Price must be greater than 0'),
  unit: z.enum(['kg', 'gram', 'litre', 'bunch', 'piece', 'packet', 'dozen', 'box', 'quintal', 'ton', 'bag', 'L']),
  availableQuantity: z.number().min(0, 'Quantity cannot be negative'),
  isOrganic: boolOrNum.optional(),
  availableToday: boolOrNum.optional(),
  location: z.string().min(2),
  city: z.string().optional(),
  image: z.string().min(5),
  images: z.array(z.string()).max(8).optional(),
  status: z.enum(['active', 'draft']).optional(),
  priceSlabs: z.array(z.object({
    minQuantity: z.number().positive(),
    maxQuantity: z.number().optional().nullable(),
    pricePerUnit: z.number().positive(),
  })).optional(),
}).passthrough();

router.get('/', searchLimiter, optionalAuth, ProductController.list);
router.get('/:id', ProductController.getById);
router.post('/', authenticateUser, requireFarmer, validateBody(createProductSchema), ProductController.create);
router.patch('/:id', authenticateUser, requireFarmer, verifyProductOwnership, ProductController.update);
router.patch('/:id/stock', authenticateUser, requireFarmer, verifyProductOwnership, ProductController.updateStock);
router.get('/:id/stock-history', authenticateUser, requireFarmer, verifyProductOwnership, ProductController.getStockHistory);
router.patch('/:id/status', authenticateUser, requireFarmer, verifyProductOwnership, ProductController.updateStatus);
router.delete('/:id', authenticateUser, requireFarmer, verifyProductOwnership, ProductController.delete);

export default router;
