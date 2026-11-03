import { Router } from 'express';
import { ReportController } from '../controllers/reportController';
import { authenticateUser } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';

const router = Router();

// Any authenticated user can submit a report
router.post('/', authenticateUser, ReportController.create);

// Admin-only endpoints for reviewing and updating reports
router.get('/', authenticateUser, requireAdmin, ReportController.listAdmin);
router.patch('/:id/status', authenticateUser, requireAdmin, ReportController.updateStatus);

export default router;
