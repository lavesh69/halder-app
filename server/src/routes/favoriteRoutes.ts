import { Router } from 'express';
import { FavoriteController } from '../controllers/favoriteController';
import { authenticateUser } from '../middleware/auth';

const router = Router();

router.use(authenticateUser);

router.get('/', FavoriteController.list);
router.post('/:productId', FavoriteController.add);
router.delete('/:productId', FavoriteController.remove);

export default router;
