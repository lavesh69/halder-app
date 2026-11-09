import { Router } from 'express';
import { NegotiationController } from '../controllers/negotiationController';
import { authenticateUser } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { z } from 'zod';

const router = Router();

const createOfferSchema = z.object({
  productId: z.string(),
  proposedPrice: z.number().positive(),
  quantity: z.number().positive(),
  requiredDate: z.string().optional(),
  deliveryPreference: z.string().optional(),
  message: z.string().optional(),
});

const counterOfferSchema = z.object({
  proposedPrice: z.number().positive(),
  quantity: z.number().positive().optional(),
  message: z.string().optional(),
});

router.post('/', authenticateUser, validateBody(createOfferSchema), NegotiationController.createOffer);
router.get('/', authenticateUser, NegotiationController.listUserNegotiations);
router.get('/:id', authenticateUser, NegotiationController.getById);
router.post('/:id/counter', authenticateUser, validateBody(counterOfferSchema), NegotiationController.counterOffer);
router.post('/:id/accept', authenticateUser, NegotiationController.acceptOffer);
router.post('/:id/reject', authenticateUser, NegotiationController.rejectOffer);
router.post('/:id/withdraw', authenticateUser, NegotiationController.withdrawOffer);
router.get('/:id/deal-summary', authenticateUser, NegotiationController.getDealSummary);
router.get('/slabs/:productId', NegotiationController.getPriceSlabs);

export default router;
