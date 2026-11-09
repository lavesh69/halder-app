import { Router } from 'express';
import { SmartAlertController } from '../controllers/smartAlertController';
import { authenticateUser } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { z } from 'zod';

const router = Router();

const savedSearchSchema = z.object({
  searchName: z.string().min(2),
  productQuery: z.string().optional(),
  categoryName: z.string().optional(),
  city: z.string().optional(),
  maxDistanceKm: z.number().positive().optional(),
  minPrice: z.number().nonnegative().optional(),
  maxPrice: z.number().positive().optional(),
  notificationFrequency: z.enum(['instant', 'daily']).optional(),
});

router.post('/saved-searches', authenticateUser, validateBody(savedSearchSchema), SmartAlertController.createSavedSearch);
router.get('/saved-searches', authenticateUser, SmartAlertController.listSavedSearches);
router.delete('/saved-searches/:id', authenticateUser, SmartAlertController.deleteSavedSearch);
router.patch('/saved-searches/:id/toggle', authenticateUser, SmartAlertController.toggleSavedSearch);

export default router;
