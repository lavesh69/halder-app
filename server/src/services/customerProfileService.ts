import { Database } from '../db/database';
import { AppError } from '../utils/errors';
import { sanitizeText } from '../utils/sanitize';
import { logAuditEvent } from '../middleware/audit';
import { v4 as uuidv4 } from 'uuid';

export interface CustomerProfileUpdateInput {
  name?: string;
  phone?: string;
  bio?: string;
  dateOfBirth?: string;
  gender?: string;
}

export class CustomerProfileService {
  static getProfile(customerId: string) {
    const user = Database.get<any>(
      `SELECT id, halder_id, name, email, phone, role, profile_image, status, created_at, updated_at 
       FROM users WHERE id = ?`,
      [customerId]
    );

    if (!user) {
      throw AppError.notFound('Customer not found');
    }

    // Ensure customer_profiles record exists
    let profile = Database.get<any>(
      'SELECT * FROM customer_profiles WHERE user_id = ?',
      [customerId]
    );

    if (!profile) {
      const profId = `cust-prof-${uuidv4()}`;
      const now = new Date().toISOString();
      Database.run(
        `INSERT INTO customer_profiles (id, user_id, bio, avatar, created_at, updated_at)
         VALUES (?, ?, '', '', ?, ?)`,
        [profId, customerId, now, now]
      );
      profile = Database.get<any>('SELECT * FROM customer_profiles WHERE user_id = ?', [customerId]);
    }

    // Default address & address count
    let defaultAddress = null;
    if (profile.default_address_id) {
      defaultAddress = Database.get<any>(
        'SELECT * FROM customer_addresses WHERE id = ? AND customer_id = ?',
        [profile.default_address_id, customerId]
      );
    }

    if (!defaultAddress) {
      defaultAddress = Database.get<any>(
        'SELECT * FROM customer_addresses WHERE customer_id = ? ORDER BY is_default DESC, created_at DESC LIMIT 1',
        [customerId]
      );
    }

    const totalAddresses = Database.get<any>(
      'SELECT COUNT(*) as cnt FROM customer_addresses WHERE customer_id = ?',
      [customerId]
    )?.cnt || 0;

    // Real order statistics
    const orderStats = Database.get<any>(
      `SELECT 
        COUNT(*) as totalOrders,
        SUM(CASE WHEN order_status IN ('placed', 'accepted', 'preparing', 'ready', 'out_for_delivery') THEN 1 ELSE 0 END) as activeOrders,
        SUM(CASE WHEN order_status = 'delivered' THEN 1 ELSE 0 END) as deliveredOrders,
        COALESCE(SUM(total_amount), 0) as totalSpend
       FROM orders WHERE customer_id = ?`,
      [customerId]
    ) || { totalOrders: 0, activeOrders: 0, deliveredOrders: 0, totalSpend: 0 };

    // Saved favorites count
    const favoritesCount = Database.get<any>(
      'SELECT COUNT(*) as cnt FROM favorites WHERE user_id = ?',
      [customerId]
    )?.cnt || 0;

    // Google OAuth connection status
    const isGoogleConnected = Boolean(
      Database.get<any>(
        "SELECT 1 FROM auth_identities WHERE user_id = ? AND provider = 'google'",
        [customerId]
      )
    );

    // Parse notification preferences safely
    let notificationPrefs = {
      orders: true,
      delivery: true,
      payments: true,
      promos: false,
      chat: true,
    };

    if (profile.notification_preferences) {
      try {
        notificationPrefs = {
          ...notificationPrefs,
          ...JSON.parse(profile.notification_preferences),
        };
      } catch {}
    }

    return {
      id: user.id,
      halderId: user.halder_id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      avatar: user.profile_image || profile.avatar || '',
      bio: profile.bio || '',
      dateOfBirth: profile.date_of_birth || null,
      gender: profile.gender || null,
      createdAt: user.created_at,
      defaultAddress,
      totalAddresses,
      orderStats: {
        total: orderStats.totalOrders || 0,
        active: orderStats.activeOrders || 0,
        delivered: orderStats.deliveredOrders || 0,
        totalSpend: Number((orderStats.totalSpend || 0).toFixed(2)),
      },
      favoritesCount,
      isGoogleConnected,
      notificationPreferences: notificationPrefs,
    };
  }

  static updateProfile(customerId: string, input: CustomerProfileUpdateInput) {
    const user = Database.get<any>('SELECT * FROM users WHERE id = ?', [customerId]);
    if (!user) throw AppError.notFound('Customer not found');

    if (input.phone && input.phone.trim()) {
      const phoneConflict = Database.get<any>(
        'SELECT id FROM users WHERE phone = ? AND id != ?',
        [input.phone.trim(), customerId]
      );
      if (phoneConflict) {
        throw AppError.badRequest('This phone number is already registered with another HALDER account.');
      }
    }

    const now = new Date().toISOString();

    Database.transaction(() => {
      // 1. Update users table (name, phone)
      if (input.name !== undefined || input.phone !== undefined) {
        Database.run(
          `UPDATE users SET
            name = COALESCE(?, name),
            phone = COALESCE(?, phone),
            updated_at = ?
           WHERE id = ?`,
          [
            input.name !== undefined ? sanitizeText(input.name.trim()) : null,
            input.phone !== undefined ? sanitizeText(input.phone.trim()) : null,
            now,
            customerId,
          ]
        );
      }

      // 2. Ensure customer_profiles exists and update (bio, date_of_birth, gender)
      let profile = Database.get<any>('SELECT id FROM customer_profiles WHERE user_id = ?', [customerId]);
      if (!profile) {
        Database.run(
          `INSERT INTO customer_profiles (id, user_id, bio, avatar, date_of_birth, gender, created_at, updated_at)
           VALUES (?, ?, ?, '', ?, ?, ?, ?)`,
          [
            `cust-prof-${uuidv4()}`,
            customerId,
            input.bio !== undefined ? sanitizeText(input.bio.trim()) : '',
            input.dateOfBirth || null,
            input.gender || null,
            now,
            now,
          ]
        );
      } else {
        Database.run(
          `UPDATE customer_profiles SET
            bio = COALESCE(?, bio),
            date_of_birth = COALESCE(?, date_of_birth),
            gender = COALESCE(?, gender),
            updated_at = ?
           WHERE user_id = ?`,
          [
            input.bio !== undefined ? sanitizeText(input.bio.trim()) : null,
            input.dateOfBirth !== undefined ? input.dateOfBirth : null,
            input.gender !== undefined ? input.gender : null,
            now,
            customerId,
          ]
        );
      }
    });

    logAuditEvent(customerId, user.role, 'CUSTOMER_PROFILE_UPDATED', 'customer_profiles', customerId, {
      name: input.name,
      phone: input.phone,
    });

    return this.getProfile(customerId);
  }

  static updateAvatar(customerId: string, base64Data: string) {
    if (!base64Data || typeof base64Data !== 'string') {
      throw AppError.badRequest('Avatar image data is required');
    }

    // Validate size (max 5MB roughly 6.8 million base64 characters)
    if (base64Data.length > 7_000_000) {
      throw AppError.badRequest('Avatar image size exceeds the 5MB maximum limit.');
    }

    // Validate format (Data URL or HTTP URL)
    const isDataUrl = base64Data.startsWith('data:image/');
    const isHttpUrl = base64Data.startsWith('http://') || base64Data.startsWith('https://');

    if (!isDataUrl && !isHttpUrl) {
      throw AppError.badRequest('Invalid image format. Supported formats: JPEG, PNG, WebP.');
    }

    const now = new Date().toISOString();

    Database.transaction(() => {
      Database.run(
        'UPDATE users SET profile_image = ?, updated_at = ? WHERE id = ?',
        [base64Data, now, customerId]
      );
      Database.run(
        'UPDATE customer_profiles SET avatar = ?, updated_at = ? WHERE user_id = ?',
        [base64Data, now, customerId]
      );
    });

    logAuditEvent(customerId, 'customer', 'CUSTOMER_AVATAR_UPDATED', 'users', customerId);
    return { success: true, avatar: base64Data };
  }

  static removeAvatar(customerId: string) {
    const now = new Date().toISOString();
    Database.transaction(() => {
      Database.run(
        'UPDATE users SET profile_image = "", updated_at = ? WHERE id = ?',
        [now, customerId]
      );
      Database.run(
        'UPDATE customer_profiles SET avatar = "", updated_at = ? WHERE user_id = ?',
        [now, customerId]
      );
    });

    logAuditEvent(customerId, 'customer', 'CUSTOMER_AVATAR_REMOVED', 'users', customerId);
    return { success: true, avatar: '' };
  }

  static getSettings(customerId: string) {
    const profile = Database.get<any>(
      'SELECT notification_preferences FROM customer_profiles WHERE user_id = ?',
      [customerId]
    );

    let prefs = {
      orders: true,
      delivery: true,
      payments: true,
      promos: false,
      chat: true,
    };

    if (profile?.notification_preferences) {
      try {
        prefs = { ...prefs, ...JSON.parse(profile.notification_preferences) };
      } catch {}
    }

    return prefs;
  }

  static updateSettings(customerId: string, settings: Record<string, boolean>) {
    const current = this.getSettings(customerId);
    const merged = { ...current, ...settings };
    const jsonStr = JSON.stringify(merged);
    const now = new Date().toISOString();

    Database.run(
      'UPDATE customer_profiles SET notification_preferences = ?, updated_at = ? WHERE user_id = ?',
      [jsonStr, now, customerId]
    );

    return merged;
  }
}
