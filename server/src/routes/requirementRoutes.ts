import { Router } from 'express';
import { RequirementController } from '../controllers/requirementController';
import { authenticateUser, optionalAuth } from '../middleware/auth';
import { requireFarmer } from '../middleware/rbac';
import { searchLimiter } from '../middleware/rateLimiter';
import { validateBody } from '../middleware/validate';
import { z } from 'zod';

const router = Router();

const createRequirementSchema = z.object({
  productName: z.string().min(2),
  categoryName: z.string().optional(),
  requiredQuantity: z.number().positive(),
  unit: z.string().optional(),
  targetPrice: z.number().nonnegative().optional(),
  isNegotiable: z.boolean().optional(),
  qualityGrade: z.string().optional(),
  requiredDate: z.string().min(2),
  location: z.string().min(2),
  city: z.string().optional(),
  state: z.string().optional(),
  village: z.string().optional(),
  postalCode: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  deliveryPreference: z.enum(['pickup', 'farmer_delivery', 'flexible']).optional(),
  instructions: z.string().optional(),
});

const quotationSchema = z.object({
  availableQuantity: z.number().positive(),
  proposedPrice: z.number().positive(),
  unit: z.string().optional(),
  harvestAvailabilityDate: z.string().optional(),
  deliveryMode: z.enum(['pickup', 'farmer_delivery']).optional(),
  message: z.string().optional(),
});

router.get('/', searchLimiter, optionalAuth, RequirementController.list);
router.get('/my', authenticateUser, RequirementController.listMy);
router.get('/:id', optionalAuth, RequirementController.getById);
router.post('/', authenticateUser, validateBody(createRequirementSchema), RequirementController.create);
router.patch('/:id/status', authenticateUser, RequirementController.updateStatus);
router.delete('/:id', authenticateUser, RequirementController.delete);

// Quotation sub-resources
router.post('/:id/quotations', authenticateUser, requireFarmer, validateBody(quotationSchema), RequirementController.submitQuotation);
router.get('/:id/quotations', authenticateUser, RequirementController.listQuotations);
router.patch('/quotations/:quoteId', authenticateUser, RequirementController.respondToQuotation);

export default router;
