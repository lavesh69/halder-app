import { Router } from 'express';
import { AdminController } from '../controllers/adminController';
import { authenticateUser } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';
import { killSwitch } from '../config/killSwitch';
import { Database } from '../db/database';
import { z } from 'zod';

const router = Router();

const verifyFarmerSchema = z.object({
  status: z.enum(['verified', 'rejected']),
});

const categorySchema = z.object({
  name: z.string().min(2),
  emoji: z.string().optional(),
  image: z.string().optional(),
});

router.use(authenticateUser, requireAdmin);

router.get('/overview', AdminController.getKPIs);
router.get('/users', AdminController.listUsers);
router.patch('/users/:id/toggle-status', AdminController.toggleUserStatus);
router.patch('/farmers/:id/verify', validateBody(verifyFarmerSchema), AdminController.verifyFarmer);
router.get('/kyc/pending', AdminController.listPendingKYC);
router.patch('/farmers/:id/kyc', AdminController.reviewKYC);
router.post('/categories', validateBody(categorySchema), AdminController.addCategory);
router.get('/audit-logs', AdminController.listAuditLogs);

// Emergency Kill Switch Management (AI App Security Checklist - Point 9)
router.get('/kill-switch', (req, res) => {
  res.json({ success: true, data: killSwitch.getAllStates() });
});

const handleKillSwitchToggle = (req: any, res: any) => {
  const { feature, enabled } = req.body;
  if (!feature || typeof enabled !== 'boolean') {
    return res.status(400).json({ success: false, error: 'Feature name and boolean enabled flag required' });
  }
  killSwitch.setFeatureState(feature as any, enabled);

  // Log audit event for governance
  try {
    const adminId = req.user?.id || 'admin';
    const auditId = 'audit-' + Date.now();
    const now = new Date().toISOString();
    Database.run(
      `INSERT INTO audit_logs (id, actor_id, actor_role, action, target_type, target_id, details, created_at)
       VALUES (?, ?, 'admin', 'KILL_SWITCH_TOGGLED', 'kill_switch', ?, ?, ?)`,
      [auditId, adminId, feature, JSON.stringify({ enabled }), now]
    );
  } catch (err: any) {
    console.warn('[AdminRoutes] Could not write audit log for kill switch:', err.message);
  }

  res.json({ success: true, data: killSwitch.getAllStates() });
};

router.patch('/kill-switch', handleKillSwitchToggle);
router.post('/kill-switch', handleKillSwitchToggle);
router.post('/kill-switch/toggle', handleKillSwitchToggle);

export default router;
