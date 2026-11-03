import { Router } from 'express';
import { FarmerController } from '../controllers/farmerController';
import { authenticateUser, optionalAuth } from '../middleware/auth';
import { requireFarmer } from '../middleware/rbac';

const router = Router();

router.get('/me/profile', authenticateUser, requireFarmer, FarmerController.getPrivateProfile);
router.patch('/me/profile', authenticateUser, requireFarmer, FarmerController.updateProfile);
router.post('/me/avatar', authenticateUser, requireFarmer, FarmerController.updateAvatar);
router.get('/:id/public', optionalAuth, FarmerController.getPublicProfile);

router.get('/', optionalAuth, FarmerController.list);
router.get('/:id', optionalAuth, FarmerController.getProfile);
router.patch('/:id', authenticateUser, requireFarmer, FarmerController.update);
router.get('/:id/earnings', authenticateUser, FarmerController.getEarnings);
router.put('/:id/payout-settings', authenticateUser, requireFarmer, FarmerController.updatePayoutSettings);
router.post('/:id/withdraw', authenticateUser, requireFarmer, FarmerController.requestWithdrawal);
router.post('/:id/kyc', authenticateUser, requireFarmer, FarmerController.submitKYC);
router.get('/:id/kyc', authenticateUser, requireFarmer, FarmerController.getKYC);
router.post('/:id/payout', authenticateUser, FarmerController.recordPayout);

export default router;
