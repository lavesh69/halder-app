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
router.get('/:id/kyc', authenticateUser, FarmerController.getKYC);
router.post('/:id/payout', authenticateUser, FarmerController.recordPayout);

// Crop Calendar & Farm Management (Module 2)
router.patch('/crops/:cropId', authenticateUser, requireFarmer, FarmerController.updateCrop);
router.put('/crops/:cropId', authenticateUser, requireFarmer, FarmerController.updateCrop);
router.delete('/crops/:cropId', authenticateUser, requireFarmer, FarmerController.deleteCrop);
router.get('/:id/crops', optionalAuth, FarmerController.getCrops);
router.post('/:id/crops', authenticateUser, requireFarmer, FarmerController.addCrop);
router.patch('/:id/crops/:cropId', authenticateUser, requireFarmer, FarmerController.updateCrop);
router.put('/:id/crops/:cropId', authenticateUser, requireFarmer, FarmerController.updateCrop);
router.delete('/:id/crops/:cropId', authenticateUser, requireFarmer, FarmerController.deleteCrop);

// Business Insights (Module 2)
router.get('/:id/business-insights', authenticateUser, FarmerController.getBusinessInsights);

export default router;
