import { env } from '../config/env';

export class Logger {
  static info(message: string, meta?: any) {
    console.log(JSON.stringify({ level: 'INFO', timestamp: new Date().toISOString(), message, meta: Logger.sanitizeMeta(meta) }));
  }

  static warn(message: string, meta?: any) {
    console.warn(JSON.stringify({ level: 'WARN', timestamp: new Date().toISOString(), message, meta: Logger.sanitizeMeta(meta) }));
  }

  static error(message: string, error?: any) {
    console.error(JSON.stringify({
      level: 'ERROR',
      timestamp: new Date().toISOString(),
      message,
      error: error instanceof Error ? { message: error.message, stack: env.NODE_ENV === 'development' ? error.stack : undefined } : error,
    }));
  }

  private static sanitizeMeta(meta: any): any {
    if (!meta || typeof meta !== 'object') return meta;
    const sanitized = { ...meta };
    const sensitiveKeys = ['password', 'password_hash', 'token', 'jwt', 'secret', 'otp'];
    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
        sanitized[key] = '***REDACTED***';
      }
    }
    return sanitized;
  }
}
