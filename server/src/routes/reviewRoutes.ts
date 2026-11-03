import { Router } from 'express';
import { ReviewController } from '../controllers/reviewController';
import { authenticateUser } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { z } from 'zod';

import { reviewLimiter } from '../middleware/rateLimiter';

const router = Router();

const reviewSchema = z.object({
  orderId: z.string(),
  rating: z.number().min(1).max(5),
  review: z.string().min(3).max(1000),
});

router.post('/', authenticateUser, reviewLimiter, validateBody(reviewSchema), ReviewController.create);
router.get('/farmer/:farmerId', ReviewController.getForFarmer);

export default router;
