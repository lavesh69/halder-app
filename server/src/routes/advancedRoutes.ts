import { Router } from 'express';
import { AdvancedController } from '../controllers/advancedController';
import { authenticateUser } from '../middleware/auth';

const router = Router();

router.use(authenticateUser);

// B2B Wholesale
router.get('/b2b/profile', AdvancedController.getB2bProfile);
router.post('/b2b/profile', AdvancedController.saveB2bProfile);
router.get('/b2b/quotations', AdvancedController.getQuotations);
router.post('/b2b/quotations', AdvancedController.requestQuotation);
router.patch('/b2b/quotations/:id', AdvancedController.updateQuotationStatus);

// Group Buying
router.get('/group-buys', AdvancedController.getGroupBuys);
router.post('/group-buys/:id/join', AdvancedController.joinGroupBuy);

// Scheduled Procurements
router.get('/procurements', AdvancedController.getProcurements);
router.post('/procurements', AdvancedController.createProcurement);
router.patch('/procurements/:id/status', AdvancedController.updateProcurementStatus);

// Subscriptions
router.get('/subscriptions/:farmerId', AdvancedController.getSubscription);
router.post('/subscriptions', AdvancedController.upgradeSubscription);

export default router;
