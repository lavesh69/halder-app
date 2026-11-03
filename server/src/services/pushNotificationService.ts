import { Database } from '../db/database';
import { v4 as uuidv4 } from 'uuid';

export class PushNotificationService {
  static registerDeviceToken(userId: string, data: {
    token: string;
    platform: 'web' | 'android' | 'ios';
    deviceName?: string;
  }) {
    if (!data.token || !data.token.trim()) {
      throw new Error('Device push token is required');
    }

    const now = new Date().toISOString();
    const existing = Database.get<any>('SELECT id FROM device_tokens WHERE token = ?', [data.token.trim()]);

    if (existing) {
      Database.run(
        `UPDATE device_tokens
         SET user_id = ?, platform = ?, device_name = ?, active = 1, updated_at = ?
         WHERE id = ?`,
        [userId, data.platform || 'web', data.deviceName || 'Browser/Phone', now, existing.id]
      );
      return { success: true, tokenId: existing.id, status: 'updated' };
    }

    const id = `tok-${uuidv4()}`;
    Database.run(
      `INSERT INTO device_tokens (id, user_id, token, platform, device_name, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
      [id, userId, data.token.trim(), data.platform || 'web', data.deviceName || 'Browser/Phone', now, now]
    );

    return { success: true, tokenId: id, status: 'registered' };
  }

  static unregisterDeviceToken(token: string) {
    Database.run('UPDATE device_tokens SET active = 0 WHERE token = ?', [token.trim()]);
    return { success: true };
  }

  static getActiveTokensForUser(userId: string) {
    return Database.query<any>(
      'SELECT token, platform, device_name FROM device_tokens WHERE user_id = ? AND active = 1',
      [userId]
    );
  }

  static async sendPushToUser(userId: string, payload: {
    title: string;
    body: string;
    icon?: string;
    data?: any;
  }) {
    const tokens = this.getActiveTokensForUser(userId);
    if (tokens.length === 0) {
      return { delivered: 0, recipientCount: 0, reason: 'No active device tokens' };
    }

    const pushPayload = {
      notification: {
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/favicon.ico',
      },
      data: payload.data || {},
    };

    console.log(`[PushNotificationService] Dispatched push to user ${userId} (${tokens.length} devices):`, {
      title: payload.title,
      body: payload.body,
      deviceTokens: tokens.map((t) => `${t.platform}:${t.token.slice(0, 15)}...`),
    });

    return {
      delivered: tokens.length,
      recipientCount: tokens.length,
      payload: pushPayload,
    };
  }

  static async sendPushToRole(role: 'customer' | 'farmer' | 'admin', payload: {
    title: string;
    body: string;
    icon?: string;
    data?: any;
  }) {
    const users = Database.query<any>('SELECT id FROM users WHERE role = ? AND status = "active"', [role]);
    let totalDelivered = 0;

    for (const u of users) {
      const res = await this.sendPushToUser(u.id, payload);
      totalDelivered += res.delivered;
    }

    return { delivered: totalDelivered, userCount: users.length };
  }
}
