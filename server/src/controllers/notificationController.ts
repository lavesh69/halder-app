import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notificationService';

export class NotificationController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const notifs = NotificationService.getForUser(req.user!.id);
      res.json({
        success: true,
        data: notifs,
      });
    } catch (err) {
      next(err);
    }
  }

  static async markRead(req: Request, res: Response, next: NextFunction) {
    try {
      const result = NotificationService.markAsRead(req.params.id, req.user!.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async markAllRead(req: Request, res: Response, next: NextFunction) {
    try {
      const result = NotificationService.markAllAsRead(req.user!.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = NotificationService.delete(req.params.id, req.user!.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async registerDeviceToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, platform, deviceName } = req.body;
      const { PushNotificationService } = await import('../services/pushNotificationService');
      const result = PushNotificationService.registerDeviceToken(req.user!.id, {
        token,
        platform,
        deviceName,
      });
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async sendTestPush(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, message } = req.body;
      const notif = NotificationService.createAndPush({
        userId: req.user!.id,
        recipientRole: req.user!.role as any,
        type: 'system',
        title: title || '🔔 HALDER Test Notification',
        message: message || 'Your device is successfully connected to background push notifications.',
        data: { timestamp: new Date().toISOString() },
      });

      res.json({
        success: true,
        data: notif,
      });
    } catch (err) {
      next(err);
    }
  }
}
