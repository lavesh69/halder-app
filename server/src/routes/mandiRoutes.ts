import { Router } from 'express';
import { MandiController } from '../controllers/mandiController';
import { authenticateUser } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();

// Decommissioned Mandi Rates feature (removed from app)
router.all('/prices', (_req, res) => {
  res.status(410).json({ error: 'Live APMC Mandi rates feature has been decommissioned.' });
});

router.get('/analytics', MandiController.getAnalytics);
router.get('/demand', MandiController.getDemandIndicators);
router.get('/export', MandiController.exportCsv);
router.post('/estimate', MandiController.calculateRevenueEstimate);

export default router;
