import { Router } from 'express';
import { ReportController } from '../controllers/reportController';
import { authenticateUser } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';

const router = Router();

// User-facing endpoints for support & grievances
router.post('/', authenticateUser, ReportController.create);
router.get('/my', authenticateUser, ReportController.listMy);

// Admin-only endpoints for reviewing, filtering and resolving grievances
router.get('/', authenticateUser, requireAdmin, ReportController.listAdmin);
router.get('/admin', authenticateUser, requireAdmin, ReportController.listAdmin);
router.patch('/:id/status', authenticateUser, requireAdmin, ReportController.updateStatus);

export default router;
