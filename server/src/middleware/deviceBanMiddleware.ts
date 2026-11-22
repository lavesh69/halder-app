import { Request, Response, NextFunction } from 'express';
import { DeviceBanService } from '../services/deviceBanService';

export function deviceBanMiddleware(req: Request, res: Response, next: NextFunction) {
  // Allow health checks and webhook callbacks
  if (req.path === '/health' || req.path === '/api/v1/health' || req.path.startsWith('/api/v1/payments/webhook')) {
    return next();
  }

  // Admin routes can inspect or lift bans, but prevent banned admins if any
  if (req.path.startsWith('/api/v1/admin/devices/unban')) {
    return next();
  }

  const deviceId = (req.headers['x-device-id'] as string) || null;
  const fingerprint = (req.headers['x-device-fingerprint'] as string) || null;
  const deviceModel = (req.headers['x-device-model'] as string) || null;

  // Check hardware blacklist
  const { banned, banInfo } = DeviceBanService.isDeviceBanned(deviceId, fingerprint);

  if (banned && banInfo) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'DEVICE_PERMANENTLY_BANNED',
        message: 'This device has been permanently suspended by HALDHAR Cyber-Security due to policy violations.',
        reason: banInfo.reason || 'Hardware blacklist enforced',
        deviceId: banInfo.device_id,
        bannedAt: banInfo.banned_at,
      },
    });
  }

  // Record device activity on authenticated requests
  if ((req as any).user?.id && (deviceId || fingerprint)) {
    try {
      DeviceBanService.recordDeviceActivity((req as any).user.id, deviceId || undefined, fingerprint || undefined, deviceModel || undefined);
    } catch {}
  }

  next();
}
