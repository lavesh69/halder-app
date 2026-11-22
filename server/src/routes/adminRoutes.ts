import { Router } from 'express';
import { AdminController } from '../controllers/adminController';
import { authenticateUser } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';
import { killSwitch } from '../config/killSwitch';
import { Database, getDatabase } from '../db/database';
import { getSupabaseStatus, syncFromSupabaseIfNeeded } from '../db/supabaseSync';
import { getTursoStatus } from '../db/turso';
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

// Device Ban Security Management
router.post('/devices/ban', AdminController.banDevice);
router.get('/devices/banned', AdminController.listBannedDevices);
router.post('/devices/unban/:id', AdminController.unbanDevice);
router.post('/purge-test-accounts', AdminController.purgeTestAccounts);

// Real-Time Cloud Persistence & Sync Status
router.get('/sync-status', async (req, res, next) => {
  try {
    const status = getSupabaseStatus();
    res.json({
      success: true,
      data: {
        ...status,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Live Backend Database Inspector (reads fresh rows from Supabase/SQLite; strips sensitive hashes)
router.get('/db-snapshot', async (req, res, next) => {
  try {
    await syncFromSupabaseIfNeeded(getDatabase(), true);

    const safeQuery = (sql: string) => {
      try {
        return Database.query(sql);
      } catch {
        return [];
      }
    };
    const safeCount = (table: string) => {
      try {
        const row = Database.get<any>(`SELECT COUNT(*) as c FROM "${table}"`);
        return Number(row?.c ?? 0);
      } catch {
        return 0;
      }
    };

    const tables: Record<string, any[]> = {
      users: safeQuery(
        `SELECT id, halder_id, name, email, phone, role, status, created_at, updated_at
         FROM users ORDER BY created_at DESC LIMIT 100`
      ),
      products: safeQuery(
        `SELECT id, farmer_id, category_id, name, price, unit, available_quantity, city, location, status, moderation_status, views_count, created_at
         FROM products ORDER BY created_at DESC LIMIT 100`
      ),
      farmer_profiles: safeQuery(
        `SELECT id, user_id, farm_name, location, city, verification_status, rating, total_listings_count, created_at
         FROM farmer_profiles ORDER BY created_at DESC LIMIT 100`
      ),
      categories: safeQuery(
        `SELECT id, name, slug, emoji, active, created_at FROM categories ORDER BY name ASC LIMIT 100`
      ),
      messages: safeQuery(
        `SELECT id, conversation_id, sender_id, sender_role, message, read_at, created_at
         FROM messages ORDER BY created_at DESC LIMIT 100`
      ),
      conversations: safeQuery(
        `SELECT id, customer_id, farmer_id, product_id, created_at, updated_at
         FROM conversations ORDER BY updated_at DESC LIMIT 100`
      ),
      favorites: safeQuery(
        `SELECT id, user_id, product_id, created_at FROM favorites ORDER BY created_at DESC LIMIT 100`
      ),
      reports: safeQuery(
        `SELECT id, reporter_id, product_id, reason, status, priority, created_at
         FROM reports ORDER BY created_at DESC LIMIT 100`
      ),
      saved_searches: safeQuery(
        `SELECT id, user_id, search_name, product_query, category_name, city, created_at
         FROM saved_searches ORDER BY created_at DESC LIMIT 100`
      ),
      notifications: safeQuery(
        `SELECT id, user_id, recipient_role, type, title, message, is_read, created_at
         FROM notifications ORDER BY created_at DESC LIMIT 100`
      ),
      audit_logs: safeQuery(
        `SELECT id, actor_id, actor_role, action, target_type, target_id, details, created_at
         FROM audit_logs ORDER BY created_at DESC LIMIT 100`
      ),
      platform_settings: safeQuery(
        `SELECT key, value, description, updated_at FROM platform_settings ORDER BY key ASC LIMIT 100`
      ),
    };

    const counts: Record<string, number> = {};
    for (const key of Object.keys(tables)) {
      counts[key] = safeCount(key);
    }

    const supabase = getSupabaseStatus();
    const turso = getTursoStatus();
    const mode = supabase.enabled ? supabase.mode : turso.enabled ? turso.mode : 'local-sqlite';

    res.json({
      success: true,
      data: {
        database: {
          mode,
          supabase,
          turso,
          fetchedAt: new Date().toISOString(),
        },
        counts,
        tables,
      },
    });
  } catch (err) {
    next(err);
  }
});

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
