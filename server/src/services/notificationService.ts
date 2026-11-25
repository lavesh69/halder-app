import { Database } from '../db/database';
import { v4 as uuidv4 } from 'uuid';
import { PushNotificationService } from './pushNotificationService';
import { CustomerProfileService } from './customerProfileService';

export interface CreateNotificationInput {
  userId: string;
  recipientRole: 'customer' | 'farmer' | 'admin';
  type: 'order' | 'verification' | 'chat' | 'system' | 'offer' | 'alert' | 'stock';
  title: string;
  message: string;
  conversationId?: string;
  messageId?: string;
  sourceKey?: string;
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
    try {
      // Respect user notification preferences for chat notifications
      if (input.type === 'chat') {
        const prefs = CustomerProfileService.getSettings(input.userId);
        if (prefs.chat === false) {
          return { skipped: true, reason: 'chat_notifications_disabled' };
        }
      }

      // Deduplicate identical source events (e.g. WS + REST fallback retries)
      if (input.sourceKey) {
        const existing = Database.get<any>(
          'SELECT * FROM notifications WHERE user_id = ? AND source_key = ?',
          [input.userId, input.sourceKey]
        );
        if (existing) {
          return { ...existing, deduplicated: true };
        }
      }

      const id = `notif-${uuidv4()}`;
      const now = new Date().toISOString();

      Database.run(
        `INSERT INTO notifications (id, user_id, recipient_role, type, title, message, conversation_id, message_id, source_key, is_read, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        [
          id,
          input.userId,
          input.recipientRole,
          input.type,
          input.title,
          input.message,
          input.conversationId || null,
          input.messageId || null,
          input.sourceKey || null,
          now,
        ]
      );

      // Trigger background device push notification safely without ever failing the caller
      Promise.resolve(
        PushNotificationService.sendPushToUser(input.userId, {
          title: input.title,
          body: input.message,
          data: {
            ...(input.data || {}),
            type: input.type,
            conversationId: input.conversationId,
            messageId: input.messageId,
          },
        })
      ).catch((err) => {
        console.warn('[Push Notification] Push trigger warning:', err);
      });

      return {
        id,
        ...input,
        conversation_id: input.conversationId || null,
        message_id: input.messageId || null,
        is_read: 0,
        created_at: now,
      };
    } catch (err: any) {
      console.warn('[NotificationService] createAndPush warning:', err?.message || err);
      return null;
    }
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
