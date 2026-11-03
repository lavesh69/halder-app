import { Router } from 'express';
import authRoutes from './authRoutes';
import productRoutes from './productRoutes';
import orderRoutes from './orderRoutes';
import cartRoutes from './cartRoutes';
import farmerRoutes from './farmerRoutes';
import reviewRoutes from './reviewRoutes';
import chatRoutes from './chatRoutes';
import notificationRoutes from './notificationRoutes';
import adminRoutes from './adminRoutes';
import uploadRoutes from './uploadRoutes';
import paymentRoutes from './paymentRoutes';
import { weatherRouter } from './weatherRoutes';
import favoriteRoutes from './favoriteRoutes';
import reportRoutes from './reportRoutes';
import customerRoutes from './customerRoutes';
import { Database } from '../db/database';
import { IdentityService } from '../services/identityService';

const apiRouter = Router();

// Health Check
apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
  });
});

apiRouter.get('/ready', (req, res) => {
  try {
    const dbCheck = Database.get<any>('SELECT 1 as healthy');
    if (dbCheck && dbCheck.healthy === 1) {
      return res.json({ status: 'ready', database: 'connected' });
    }
    throw new Error('Database ping failed');
  } catch (err: any) {
    res.status(503).json({ status: 'unhealthy', error: err.message });
  }
});

apiRouter.get('/metrics', (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    status: 'ok',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    memory: {
      rssMb: Math.round((mem.rss / (1024 * 1024)) * 100) / 100,
      heapUsedMb: Math.round((mem.heapUsed / (1024 * 1024)) * 100) / 100,
      heapTotalMb: Math.round((mem.heapTotal / (1024 * 1024)) * 100) / 100,
      externalMb: Math.round((mem.external / (1024 * 1024)) * 100) / 100,
    },
    nodeVersion: process.version,
    platform: process.platform,
  });
});

apiRouter.get('/categories', (req, res) => {
  const categories = Database.query('SELECT * FROM categories WHERE active = 1 ORDER BY name ASC');
  res.json({ success: true, data: categories });
});

// Public identity lookup by HALDER ID (HAL-CUS-XXXXXXXX / HAL-FRM-XXXXXXXX)
apiRouter.get('/identity/:halderId', (req, res, next) => {
  try {
    const user = IdentityService.lookupByHalderId(req.params.halderId);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

apiRouter.use('/auth', authRoutes);
apiRouter.use('/products', productRoutes);
apiRouter.use('/orders', orderRoutes);
apiRouter.use('/cart', cartRoutes);
apiRouter.use('/farmers', farmerRoutes);
apiRouter.use('/reviews', reviewRoutes);
apiRouter.use('/chat', chatRoutes);
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/upload', uploadRoutes);
apiRouter.use('/uploads', uploadRoutes);
apiRouter.use('/payments', paymentRoutes);
apiRouter.use('/weather', weatherRouter);
apiRouter.use('/favorites', favoriteRoutes);
apiRouter.use('/reports', reportRoutes);
apiRouter.use('/customers', customerRoutes);

export default apiRouter;
