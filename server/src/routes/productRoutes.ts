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
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  price: z.coerce.number().positive('Price must be greater than 0'),
  unit: z.string().default('kg'),
  availableQuantity: z.coerce.number().min(0, 'Quantity cannot be negative'),
  isOrganic: boolOrNum.optional(),
  availableToday: boolOrNum.optional(),
  location: z.string().optional().default('Dehradun, Uttarakhand'),
  city: z.string().optional(),
  image: z.string().optional().default('https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80'),
  images: z.array(z.string()).max(8).optional(),
  status: z.enum(['active', 'draft']).optional().default('active'),
  priceSlabs: z.array(z.object({
    minQuantity: z.coerce.number().positive(),
    maxQuantity: z.coerce.number().optional().nullable(),
    pricePerUnit: z.coerce.number().positive(),
  })).optional(),
}).passthrough();

router.get('/', searchLimiter, optionalAuth, ProductController.list);
router.get('/:id', ProductController.getById);
router.post('/', optionalAuth, validateBody(createProductSchema), ProductController.create);
router.patch('/:id', authenticateUser, verifyProductOwnership, ProductController.update);
router.patch('/:id/stock', authenticateUser, verifyProductOwnership, ProductController.updateStock);
router.get('/:id/stock-history', authenticateUser, verifyProductOwnership, ProductController.getStockHistory);
router.patch('/:id/status', authenticateUser, verifyProductOwnership, ProductController.updateStatus);
router.delete('/:id', authenticateUser, verifyProductOwnership, ProductController.delete);

export default router;
