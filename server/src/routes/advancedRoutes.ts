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

// Group Buying (Module 8 & 9)
router.get('/group-buys', AdvancedController.getGroupBuys);
router.get('/group-buys/my', AdvancedController.getMyGroupBuys);
router.post('/group-buys', AdvancedController.createGroupBuy);
router.post('/group-buys/:id/join', AdvancedController.joinGroupBuy);
router.post('/group-buys/:id/leave', AdvancedController.leaveGroupBuy);

// Scheduled Procurements & Produce Subscriptions (Module 10 & 11)
router.get('/procurements', AdvancedController.getProcurements);
router.post('/procurements', AdvancedController.createProcurement);
router.put('/procurements/:id', AdvancedController.updateProcurement);
router.patch('/procurements/:id/status', AdvancedController.updateProcurementStatus);
router.post('/procurements/:id/skip', AdvancedController.skipNextDelivery);
router.post('/procurements/:id/execute', AdvancedController.executeProcurement);

// Farmer Subscription Tiers
router.get('/subscriptions/:farmerId', AdvancedController.getSubscription);
router.post('/subscriptions', AdvancedController.upgradeSubscription);

export default router;
