import { Router } from 'express';
import { MapController } from '../controllers/mapController';
import { optionalAuth } from '../middleware/auth';
import { searchLimiter } from '../middleware/rateLimiter';

const router = Router();

router.get('/nearby-farmers', searchLimiter, optionalAuth, MapController.getNearbyFarmers);

export default router;
