import { Router } from 'express';
import { NotificationController } from '../controllers/notificationController';
import { authenticateUser } from '../middleware/auth';

const router = Router();

router.get('/', authenticateUser, NotificationController.list);
router.patch('/:id/read', authenticateUser, NotificationController.markRead);
router.post('/mark-all-read', authenticateUser, NotificationController.markAllRead);
router.post('/device-token', authenticateUser, NotificationController.registerDeviceToken);
router.post('/test-push', authenticateUser, NotificationController.sendTestPush);

export default router;
