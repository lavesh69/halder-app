import { Database } from '../db/database';
import { AppError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';

export interface BanDeviceParams {
  userId?: string;
  deviceId?: string;
  fingerprint?: string;
  reason: string;
  bannedBy?: string;
  deviceModel?: string;
  ipAddress?: string;
  notes?: string;
}

export class DeviceBanService {
  /**
   * Initializes the banned_devices table if not present.
   */
  static initTable() {
    try {
      Database.run(`
        CREATE TABLE IF NOT EXISTS banned_devices (
          id TEXT PRIMARY KEY,
          device_id TEXT NOT NULL,
          fingerprint_hash TEXT,
          user_id TEXT,
          user_name TEXT,
          user_phone TEXT,
          device_model TEXT DEFAULT 'Unknown Device',
          ip_address TEXT DEFAULT '',
          reason TEXT NOT NULL,
          banned_by TEXT NOT NULL DEFAULT 'admin',
          banned_at TEXT NOT NULL,
          is_active INTEGER NOT NULL DEFAULT 1,
          notes TEXT DEFAULT ''
        );
      `);
      Database.run(`CREATE INDEX IF NOT EXISTS idx_banned_devices_id ON banned_devices(device_id);`);
      Database.run(`CREATE INDEX IF NOT EXISTS idx_banned_devices_fp ON banned_devices(fingerprint_hash);`);
      Database.run(`CREATE INDEX IF NOT EXISTS idx_banned_devices_user ON banned_devices(user_id);`);

      // Ensure last_device columns exist on users
      const db = Database.getDB();
      const userCols = (db.prepare(`PRAGMA table_info(users)`).all() as any[]).map((c) => c.name);
      if (!userCols.includes('last_device_id')) {
        db.exec(`ALTER TABLE users ADD COLUMN last_device_id TEXT DEFAULT ''`);
      }
      if (!userCols.includes('last_device_fingerprint')) {
        db.exec(`ALTER TABLE users ADD COLUMN last_device_fingerprint TEXT DEFAULT ''`);
      }
      if (!userCols.includes('last_device_model')) {
        db.exec(`ALTER TABLE users ADD COLUMN last_device_model TEXT DEFAULT ''`);
      }
    } catch (e: any) {
      console.warn('[DeviceBanService] Table init notice:', e.message);
    }
  }

  /**
   * Fast check if a device is permanently banned.
   */
  static isDeviceBanned(deviceId?: string | null, fingerprintHash?: string | null): { banned: boolean; banInfo?: any } {
    if (!deviceId && !fingerprintHash) {
      return { banned: false };
    }

    this.initTable();

    // 1. Direct hardware Device ID match
    if (deviceId) {
      const match = Database.get<any>(
        `SELECT * FROM banned_devices WHERE device_id = ? AND is_active = 1 LIMIT 1`,
        [deviceId]
      );
      if (match) {
        return { banned: true, banInfo: match };
      }
    }

    // 2. Hardware Canvas/WebGL Fingerprint match
    if (fingerprintHash && fingerprintHash !== 'server-env') {
      const match = Database.get<any>(
        `SELECT * FROM banned_devices WHERE fingerprint_hash = ? AND is_active = 1 LIMIT 1`,
        [fingerprintHash]
      );
      if (match) {
        return { banned: true, banInfo: match };
      }
    }

    return { banned: false };
  }

  /**
   * Bans a device permanently by user ID or direct hardware identifier.
   */
  static banDevice(params: BanDeviceParams) {
    this.initTable();

    const {
      userId,
      reason,
      bannedBy = 'security_admin',
      notes = '',
    } = params;

    let targetDeviceId = params.deviceId;
    let targetFp = params.fingerprint;
    let targetModel = params.deviceModel || 'Unknown Device';
    let targetIp = params.ipAddress || '';
    let targetUserName = '';
    let targetUserPhone = '';

    // If userId provided, lookup their stored device and profile details
    if (userId) {
      const user = Database.get<any>(
        `SELECT id, name, phone, email, last_device_id, last_device_fingerprint, last_device_model FROM users WHERE id = ?`,
        [userId]
      );

      if (user) {
        targetUserName = user.name || '';
        targetUserPhone = user.phone || '';
        if (!targetDeviceId && user.last_device_id) {
          targetDeviceId = user.last_device_id;
        }
        if (!targetFp && user.last_device_fingerprint) {
          targetFp = user.last_device_fingerprint;
        }
        if (user.last_device_model) {
          targetModel = user.last_device_model;
        }

        // Suspend the user account as well
        Database.run(
          `UPDATE users SET status = 'suspended', updated_at = ? WHERE id = ?`,
          [new Date().toISOString(), userId]
        );
      }
    }

    if (!targetDeviceId && !targetFp) {
      throw AppError.badRequest('Cannot ban device: No hardware device ID or fingerprint provided or found for this user.');
    }

    const banId = `ban-${uuidv4()}`;
    const now = new Date().toISOString();

    // Insert or update active ban
    Database.run(
      `INSERT OR REPLACE INTO banned_devices 
       (id, device_id, fingerprint_hash, user_id, user_name, user_phone, device_model, ip_address, reason, banned_by, banned_at, is_active, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [
        banId,
        targetDeviceId || `fp-${targetFp}`,
        targetFp || null,
        userId || null,
        targetUserName,
        targetUserPhone,
        targetModel,
        targetIp,
        reason,
        bannedBy,
        now,
        notes,
      ]
    );

    return {
      success: true,
      banId,
      deviceId: targetDeviceId || `fp-${targetFp}`,
      fingerprint: targetFp,
      bannedAt: now,
      reason,
    };
  }

  /**
   * Revokes a device ban (Unban).
   */
  static unbanDevice(banIdOrDeviceId: string) {
    this.initTable();

    const record = Database.get<any>(
      `SELECT * FROM banned_devices WHERE id = ? OR device_id = ?`,
      [banIdOrDeviceId, banIdOrDeviceId]
    );

    if (!record) {
      throw AppError.notFound('Banned device record not found.');
    }

    Database.run(
      `UPDATE banned_devices SET is_active = 0 WHERE id = ?`,
      [record.id]
    );

    // If linked to a user, restore user status if suspended
    if (record.user_id) {
      Database.run(
        `UPDATE users SET status = 'active', updated_at = ? WHERE id = ? AND status = 'suspended'`,
        [new Date().toISOString(), record.user_id]
      );
    }

    return { success: true, message: `Device ${record.device_id} unbanned successfully.` };
  }

  /**
   * Lists all permanently banned devices.
   */
  static listBannedDevices() {
    this.initTable();
    return Database.query<any>(
      `SELECT * FROM banned_devices WHERE is_active = 1 ORDER BY banned_at DESC`
    );
  }

  /**
   * Records device information on authentication / request.
   */
  static recordDeviceActivity(userId: string, deviceId?: string, fingerprint?: string, model?: string) {
    if (!userId || (!deviceId && !fingerprint)) return;

    try {
      this.initTable();
      const updates: string[] = ['updated_at = ?'];
      const values: any[] = [new Date().toISOString()];

      if (deviceId) {
        updates.push('last_device_id = ?');
        values.push(deviceId);
      }
      if (fingerprint) {
        updates.push('last_device_fingerprint = ?');
        values.push(fingerprint);
      }
      if (model) {
        updates.push('last_device_model = ?');
        values.push(model);
      }

      values.push(userId);
      Database.run(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    } catch {}
  }
}
