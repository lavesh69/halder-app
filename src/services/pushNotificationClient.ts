import { ApiClient } from '../api/client';

export class PushNotificationClient {
  private static TOKEN_STORAGE_KEY = 'halder_device_push_token';

  static isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  static getPermissionStatus(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  }

  static async requestPermissionAndRegister(): Promise<{ success: boolean; token?: string; error?: string }> {
    if (!this.isSupported()) {
      return { success: false, error: 'Web Notifications not supported on this browser/platform' };
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return { success: false, error: 'Notification permission was denied' };
      }

      // Generate or retrieve persistent unique client device token
      let deviceToken = localStorage.getItem(this.TOKEN_STORAGE_KEY);
      if (!deviceToken) {
        deviceToken = 'web-' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        localStorage.setItem(this.TOKEN_STORAGE_KEY, deviceToken);
      }

      // Register with HALDER backend
      const userAgent = navigator.userAgent;
      const deviceName = userAgent.includes('Android')
        ? 'Android Mobile'
        : userAgent.includes('iPhone')
        ? 'iOS Mobile'
        : 'Desktop Browser';

      const platform: 'web' | 'android' | 'ios' = userAgent.includes('Android')
        ? 'android'
        : userAgent.includes('iPhone')
        ? 'ios'
        : 'web';

      await ApiClient.registerDeviceToken(deviceToken, platform, deviceName);
      console.log('? Registered background push device token:', deviceToken);

      return { success: true, token: deviceToken };
    } catch (err: any) {
      console.error('Failed to register push notifications:', err);
      return { success: false, error: err.message || 'Push registration failed' };
    }
  }

  static showLocalNotification(title: string, options?: NotificationOptions) {
    if (this.getPermissionStatus() === 'granted') {
      try {
        new Notification(title, {
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          ...options,
        });
      } catch (e) {
        console.warn('Native notification display warning:', e);
      }
    }
  }
}
