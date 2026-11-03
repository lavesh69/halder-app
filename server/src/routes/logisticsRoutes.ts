import { Router } from 'express';
import { LogisticsController } from '../controllers/logisticsController';
import { authenticateUser } from '../middleware/auth';

const router = Router();

router.use(authenticateUser);

router.get('/partners', LogisticsController.getPartners);
router.post('/partners', LogisticsController.registerPartner);
router.patch('/partners/:id/status', LogisticsController.updateStatus);
router.post('/partners/:id/telemetry', LogisticsController.updateTelemetry);
router.get('/analytics', LogisticsController.getAnalytics);

router.get('/tasks', LogisticsController.getTasks);
router.get('/tasks/order/:orderId', LogisticsController.getTaskByOrderId);
router.patch('/tasks/:taskId/assign', LogisticsController.assignPartner);
router.patch('/tasks/:taskId/status', LogisticsController.updateTaskStatus);
router.post('/tasks/:taskId/verify-otp', LogisticsController.verifyDeliveryOtp);

export default router;
