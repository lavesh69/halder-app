import { Database } from '../db/database';
import { AppError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';
import { sanitizeText } from '../utils/sanitize';
import { logAuditEvent } from '../middleware/audit';

const CATEGORY_CACHE_TTL_MS = 30000;
let cachedActiveCategories: any[] | null = null;
let categoriesExpiresAt = 0;

const PUBLIC_SETTING_KEYS = [
  'platformCommissionRate',
  'freeDeliveryThreshold',
  'standardDeliveryFee',
  'helplinePhone',
  'supportEmail',
  'emergencyAlert',
] as const;

export class AdminService {
  static getCachedActiveCategories() {
    const now = Date.now();
    if (cachedActiveCategories && now < categoriesExpiresAt) {
      return cachedActiveCategories;
    }
    const categories = Database.query('SELECT * FROM categories WHERE active = 1 ORDER BY name ASC');
    cachedActiveCategories = categories;
    categoriesExpiresAt = now + CATEGORY_CACHE_TTL_MS;
    return categories;
  }

  static invalidateCategoryCache() {
    cachedActiveCategories = null;
    categoriesExpiresAt = 0;
  }

  static listAllCategories() {
    return Database.query('SELECT * FROM categories ORDER BY name ASC');
  }

  static getPublicPlatformSettings() {
    const placeholders = PUBLIC_SETTING_KEYS.map(() => '?').join(', ');
    const rows = Database.query<{ key: string; value: string }>(
      `SELECT key, value FROM platform_settings WHERE key IN (${placeholders})`,
      [...PUBLIC_SETTING_KEYS]
    );
    const result: Record<string, string | number> = {};
    for (const row of rows) {
      if (
        row.key === 'platformCommissionRate' ||
        row.key === 'freeDeliveryThreshold' ||
        row.key === 'standardDeliveryFee'
      ) {
        const num = Number(row.value);
        if (!Number.isNaN(num)) {
          result[row.key] = num;
        }
      } else {
        result[row.key] = row.value;
      }
    }
    return result;
  }

  static getOverviewKPIs() {
    const totalUsers = Database.get<any>('SELECT COUNT(*) as count FROM users')?.count || 0;
    const activeFarmers = Database.get<any>("SELECT COUNT(*) as count FROM farmer_profiles WHERE verification_status = 'verified'")?.count || 0;
    const pendingFarmers = Database.get<any>("SELECT COUNT(*) as count FROM farmer_profiles WHERE verification_status = 'pending'")?.count || 0;
    const activeListings = Database.get<any>("SELECT COUNT(*) as count FROM products WHERE status = 'active'")?.count || 0;
    const totalOrders = Database.get<any>('SELECT COUNT(*) as count FROM orders')?.count || 0;
    const gmv = Database.get<any>('SELECT SUM(total_amount) as total FROM orders')?.total || 0;

    return {
      totalUsers,
      activeFarmers,
      pendingFarmers,
      activeListings,
      totalOrders,
      grossGMV: Number((gmv || 0).toFixed(2)),
    };
  }

  static listUsers(search?: string) {
    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      return Database.query<any>(
        `SELECT id, halder_id, name, email, phone, role, status, created_at
         FROM users
         WHERE LOWER(halder_id) LIKE ? OR LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR phone LIKE ?
         ORDER BY created_at DESC`,
        [q, q, q, q]
      );
    }
    return Database.query<any>('SELECT id, halder_id, name, email, phone, role, status, created_at FROM users ORDER BY created_at DESC');
  }

  static toggleUserStatus(userId: string, adminId: string) {
    const user = Database.get<any>('SELECT id, status, role FROM users WHERE id = ?', [userId]);
    if (!user) throw AppError.notFound('User not found');
    if (user.role === 'admin') throw AppError.forbidden('Superadmin account status cannot be altered.');

    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    Database.run('UPDATE users SET status = ?, updated_at = ? WHERE id = ?', [
      newStatus,
      new Date().toISOString(),
      userId,
    ]);

    logAuditEvent(adminId, 'admin', `USER_${newStatus.toUpperCase()}`, 'users', userId, { previousStatus: user.status, newStatus });
    return { id: userId, status: newStatus };
  }

  static verifyFarmer(farmerId: string, status: 'verified' | 'rejected', adminId: string) {
    const farmer = Database.get<any>('SELECT * FROM farmer_profiles WHERE id = ?', [farmerId]);
    if (!farmer) throw AppError.notFound('Farmer not found');

    Database.run('UPDATE farmer_profiles SET verification_status = ?, updated_at = ? WHERE id = ?', [
      status,
      new Date().toISOString(),
      farmerId,
    ]);

    logAuditEvent(adminId, 'admin', `FARMER_VERIFICATION_${status.toUpperCase()}`, 'farmer_profiles', farmerId, { status });
    return { id: farmerId, verificationStatus: status };
  }

  static addCategory(name: string, emoji = '🌱', image = '') {
    const slugBase = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'category';
    const existingSlug = Database.get<any>('SELECT id FROM categories WHERE slug = ?', [slugBase]);
    const slug = existingSlug ? `${slugBase}-${Date.now().toString().slice(-4)}` : slugBase;
    const id = `cat-${uuidv4()}`;
    const now = new Date().toISOString();

    Database.run(
      'INSERT INTO categories (id, name, slug, emoji, image, active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)',
      [
        id,
        sanitizeText(name),
        slug,
        emoji || '🌱',
        image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=80',
        now,
      ]
    );

    this.invalidateCategoryCache();
    return Database.get<any>('SELECT * FROM categories WHERE id = ?', [id]);
  }

  static toggleCategoryActive(categoryId: string, adminId: string) {
    const category = Database.get<any>('SELECT * FROM categories WHERE id = ?', [categoryId]);
    if (!category) throw AppError.notFound('Category not found');

    const newActive = category.active ? 0 : 1;
    Database.run('UPDATE categories SET active = ? WHERE id = ?', [newActive, categoryId]);
    this.invalidateCategoryCache();

    logAuditEvent(adminId, 'admin', newActive ? 'CATEGORY_ACTIVATED' : 'CATEGORY_HIDDEN', 'categories', categoryId, {
      name: category.name,
      active: Boolean(newActive),
    });

    return Database.get<any>('SELECT * FROM categories WHERE id = ?', [categoryId]);
  }

  static deleteCategory(categoryId: string, adminId: string) {
    const category = Database.get<any>('SELECT * FROM categories WHERE id = ?', [categoryId]);
    if (!category) throw AppError.notFound('Category not found');

    Database.run('DELETE FROM categories WHERE id = ?', [categoryId]);
    this.invalidateCategoryCache();

    logAuditEvent(adminId, 'admin', 'CATEGORY_DELETED', 'categories', categoryId, { name: category.name });
    return { id: categoryId, deleted: true };
  }

  static listAuditLogs() {
    return Database.query<any>('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100');
  }

  static purgeTestAccounts() {
    Database.run(`DELETE FROM banned_devices WHERE device_id LIKE 'test-%'`);

    const testPatterns = [
      'Ramesh Negi %',
      'Rohit Verma %',
      'Storage Test Farmer%',
      'Live Kisan Test%',
      '%test%@test.com',
      '%test_chat%',
      '%farmer_test_%',
      'buyer_test_%',
      'Ramesh Singh%',
      'Kishore Singh%',
      'Suresh Chandra%',
      'Vikas Rawat%',
      'Balwant Singh Negi%',
    ];

    let totalDeleted = 0;
    for (const pattern of testPatterns) {
      Database.run(
        `DELETE FROM farmer_profiles WHERE user_id IN (SELECT id FROM users WHERE (name LIKE ? OR email LIKE ?) AND id NOT IN ('user-admin-1', 'user-cust-1', 'user-farm-1', 'user-farm-2', 'user-farm-3', 'user-del-1'))`,
        [pattern, pattern]
      );
      const res = Database.run(
        `DELETE FROM users WHERE (name LIKE ? OR email LIKE ?) AND id NOT IN ('user-admin-1', 'user-cust-1', 'user-farm-1', 'user-farm-2', 'user-farm-3', 'user-del-1')`,
        [pattern, pattern]
      );
      totalDeleted += Number(res.changes);
    }

    const res2 = Database.run(
      `DELETE FROM users WHERE (email LIKE '%1795%' OR email LIKE 'ramesh_%@gmail.com' OR email LIKE '%@test.com') AND id NOT IN ('user-admin-1', 'user-cust-1', 'user-farm-1', 'user-farm-2', 'user-farm-3', 'user-del-1')`
    );
    totalDeleted += Number(res2.changes);

    return { purgedCount: totalDeleted };
  }
}
