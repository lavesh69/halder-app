import { Database } from '../db/database';
import { v4 as uuidv4 } from 'uuid';
import { PushNotificationService } from './pushNotificationService';

export interface CreateNotificationInput {
  userId: string;
  recipientRole: 'customer' | 'farmer' | 'admin';
  type: 'order' | 'verification' | 'chat' | 'system';
  title: string;
  message: string;
  data?: any;
}

export class NotificationService {
  static getForUser(userId: string) {
    return Database.query<any>(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [userId]
    );
  }

  static createAndPush(input: CreateNotificationInput) {
    const id = `notif-${uuidv4()}`;
    const now = new Date().toISOString();

    Database.run(
      `INSERT INTO notifications (id, user_id, recipient_role, type, title, message, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
      [id, input.userId, input.recipientRole, input.type, input.title, input.message, now]
    );

    // Trigger background device push notification asynchronously
    try {
      PushNotificationService.sendPushToUser(input.userId, {
        title: input.title,
        body: input.message,
        data: input.data,
      });
    } catch (err) {
      console.warn('[Push Notification] Push trigger warning:', err);
    }

    return { id, ...input, is_read: 0, created_at: now };
  }

  static markAsRead(id: string, userId: string) {
    Database.run('UPDATE notifications SET is_read = 1, read_at = ? WHERE id = ? AND user_id = ?', [
      new Date().toISOString(),
      id,
      userId,
    ]);
    return { success: true };
  }

  static markAllAsRead(userId: string) {
    Database.run('UPDATE notifications SET is_read = 1, read_at = ? WHERE user_id = ?', [
      new Date().toISOString(),
      userId,
    ]);
    return { success: true };
  }

  static delete(id: string, userId: string) {
    Database.run('DELETE FROM notifications WHERE id = ? AND user_id = ?', [id, userId]);
    return { success: true };
  }
}
