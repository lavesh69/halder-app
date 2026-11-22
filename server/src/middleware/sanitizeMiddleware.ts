import { Request, Response, NextFunction } from 'express';
import { sanitizeText } from '../utils/sanitize';

const SENSITIVE_KEYS = new Set([
  'password',
  'currentpassword',
  'newpassword',
  'idtoken',
  'refreshtoken',
  'accesstoken',
  'authorization',
  'token',
]);

function sanitizeRecursive(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeRecursive(item));
  }

  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey)) {
      clean[key] = value; // Preserve raw credentials & tokens
    } else if (typeof value === 'string') {
      if (value.startsWith('data:image/') || value.length > 50000) {
        clean[key] = value; // Preserve base64 images / binary payloads
      } else {
        clean[key] = sanitizeText(value);
      }
    } else if (typeof value === 'object' && value !== null) {
      clean[key] = sanitizeRecursive(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

/**
 * Global defensive input sanitization middleware:
 * Neutralizes XSS, null bytes, HTML tags, and malicious script vectors from incoming bodies.
 */
export function sanitizeRequestInputs(req: Request, _res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeRecursive(req.body);
  }
  next();
}
