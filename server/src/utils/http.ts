import type { Request } from 'express';

/** Safely extract a single string route parameter under Express v5 typings. */
export function getParam(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? (val[0] ?? '') : (val ?? '');
}
