import { Router } from 'express';
import { FinanceController } from '../controllers/financeController';
import { authenticateUser } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();

router.use(authenticateUser);

router.get('/dashboard', FinanceController.getDashboard);
router.get('/farmer-earnings/:farmerId', FinanceController.getFarmerEarnings);
router.post('/withdraw', FinanceController.requestWithdrawal);
router.get('/transactions', FinanceController.getTransactions);
router.get('/settings', FinanceController.getSettings);
router.put('/settings', requireRole('admin'), FinanceController.updateSettings);
router.get('/export', FinanceController.exportCsv);

export default router;
