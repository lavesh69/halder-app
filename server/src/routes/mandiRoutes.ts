import { Router } from 'express';
import { MandiController } from '../controllers/mandiController';
import { authenticateUser } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';

const router = Router();

router.get('/prices', MandiController.getPrices);
router.post('/prices', authenticateUser, requireAdmin, MandiController.addPriceRecord);

router.get('/analytics', MandiController.getAnalytics);
router.get('/demand', MandiController.getDemandIndicators);
router.get('/export', MandiController.exportCsv);
router.post('/estimate', MandiController.calculateRevenueEstimate);

export default router;
