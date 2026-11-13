import { Router } from 'express';
import { FarmerController } from '../controllers/farmerController';
import { authenticateUser, optionalAuth } from '../middleware/auth';
import { requireFarmer, requireAdmin } from '../middleware/rbac';
import { verifyFarmerOwnership } from '../middleware/idor';

const router = Router();

router.get('/me/profile', authenticateUser, requireFarmer, FarmerController.getPrivateProfile);
router.patch('/me/profile', authenticateUser, requireFarmer, FarmerController.updateProfile);
router.post('/me/avatar', authenticateUser, requireFarmer, FarmerController.updateAvatar);
router.get('/:id/public', optionalAuth, FarmerController.getPublicProfile);

router.get('/', optionalAuth, FarmerController.list);
router.get('/:id', optionalAuth, FarmerController.getProfile);
router.patch('/:id', authenticateUser, requireFarmer, verifyFarmerOwnership, FarmerController.update);
router.get('/:id/earnings', authenticateUser, requireFarmer, verifyFarmerOwnership, FarmerController.getEarnings);
router.put('/:id/payout-settings', authenticateUser, requireFarmer, verifyFarmerOwnership, FarmerController.updatePayoutSettings);
router.post('/:id/withdraw', authenticateUser, requireFarmer, verifyFarmerOwnership, FarmerController.requestWithdrawal);
router.post('/:id/kyc', authenticateUser, requireFarmer, verifyFarmerOwnership, FarmerController.submitKYC);
router.get('/:id/kyc', authenticateUser, requireFarmer, verifyFarmerOwnership, FarmerController.getKYC);
router.post('/:id/payout', authenticateUser, requireAdmin, FarmerController.recordPayout);

// Crop Calendar & Farm Management (Module 2)
router.patch('/crops/:cropId', authenticateUser, requireFarmer, FarmerController.updateCrop);
router.put('/crops/:cropId', authenticateUser, requireFarmer, FarmerController.updateCrop);
router.delete('/crops/:cropId', authenticateUser, requireFarmer, FarmerController.deleteCrop);
router.get('/:id/crops', optionalAuth, FarmerController.getCrops);
router.post('/:id/crops', authenticateUser, requireFarmer, verifyFarmerOwnership, FarmerController.addCrop);
router.patch('/:id/crops/:cropId', authenticateUser, requireFarmer, verifyFarmerOwnership, FarmerController.updateCrop);
router.put('/:id/crops/:cropId', authenticateUser, requireFarmer, verifyFarmerOwnership, FarmerController.updateCrop);
router.delete('/:id/crops/:cropId', authenticateUser, requireFarmer, verifyFarmerOwnership, FarmerController.deleteCrop);

// Business Insights (Module 2)
router.get('/:id/business-insights', authenticateUser, requireFarmer, verifyFarmerOwnership, FarmerController.getBusinessInsights);

export default router;
