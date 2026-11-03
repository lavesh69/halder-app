import { Router } from 'express';
import { OrderController } from '../controllers/orderController';
import { authenticateUser } from '../middleware/auth';
import { verifyOrderAccess } from '../middleware/idor';
import { validateBody } from '../middleware/validate';
import { z } from 'zod';

import { orderLimiter } from '../middleware/rateLimiter';

const router = Router();

const createOrderSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().positive(),
    })
  ).min(1),
  deliveryAddress: z.string().min(5),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  customerPhone: z.string().min(10),
  paymentMethod: z.enum(['upi', 'cod', 'card', 'wallet', 'phonepe', 'gpay', 'paytm']),
  farmerTip: z.number().min(0).optional(),
  deliveryMode: z.enum(['farmer_direct']).optional(),
  deliveryDistanceKm: z.number().min(0).max(300).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['placed', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'rejected', 'cancelled']),
});

router.get('/', authenticateUser, OrderController.list);
router.post('/', authenticateUser, orderLimiter, validateBody(createOrderSchema), OrderController.create);
router.get('/:id', authenticateUser, verifyOrderAccess, OrderController.getById);
router.patch('/:id/status', authenticateUser, verifyOrderAccess, validateBody(updateStatusSchema), OrderController.updateStatus);

export default router;
