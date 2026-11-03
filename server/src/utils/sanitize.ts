/**
 * Deep text and input sanitization (AI App Security Checklist - Point 4)
 * Strips scripts, event handlers, pseudo-protocols, and dangerous HTML entities
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') return '';

  return text
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove script tags and contents
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove iframe, object, embed tags and contents
    .replace(/<(iframe|object|embed|applet)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '')
    // Remove all remaining HTML tags
    .replace(/<[^>]+>/g, '')
    // Neutralize dangerous JavaScript/Data pseudo-protocols
    .replace(/(?:javascript|data|vbscript):/gi, '')
    // Neutralize inline event handlers like onerror=, onload=, onclick=
    .replace(/on\w+\s*=/gi, '')
    // Trim extra surrounding spaces
    .trim();
}

/**
 * Sanitizes object fields recursively
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;

  const result: any = Array.isArray(obj) ? [] : {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = sanitizeText(value);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeObject(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

