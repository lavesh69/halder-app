import { Router } from 'express';
import { MandiController } from '../controllers/mandiController';
import { authenticateUser } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();

// Publicly available mandi intelligence & benchmarks
router.get('/prices', MandiController.getPrices);
router.get('/analytics', MandiController.getAnalytics);
router.get('/demand', MandiController.getDemandIndicators);
router.get('/export', MandiController.exportCsv);
router.post('/estimate', MandiController.calculateRevenueEstimate);

// Admin-only entry for official APMC verified data
router.post('/prices', authenticateUser, requireRole('admin'), MandiController.addPriceRecord);

export default router;
