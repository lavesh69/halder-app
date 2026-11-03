import { Database } from '../db/database';
import { AppError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';
import { sanitizeText } from '../utils/sanitize';
import { logAuditEvent } from '../middleware/audit';

export class AdminService {
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
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
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

    return Database.get<any>('SELECT * FROM categories WHERE id = ?', [id]);
  }

  static listAuditLogs() {
    return Database.query<any>('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100');
  }
}
