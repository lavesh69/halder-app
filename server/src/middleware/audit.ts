import { Database } from '../db/database';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../utils/logger';

export function logAuditEvent(
  actorId: string | null,
  actorRole: string | null,
  action: string,
  targetType: string,
  targetId: string | null,
  details?: Record<string, any>,
  ipAddress?: string
) {
  try {
    const id = `audit-${uuidv4()}`;
    Database.run(
      `INSERT INTO audit_logs (id, actor_id, actor_role, action, target_type, target_id, details, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        actorId,
        actorRole,
        action,
        targetType,
        targetId,
        details ? JSON.stringify(details) : null,
        ipAddress || '127.0.0.1',
        new Date().toISOString(),
      ]
    );
    Logger.info(`[Audit] ${action} on ${targetType}:${targetId} by ${actorRole || 'System'}`);
  } catch (err: any) {
    Logger.error('Failed to write audit log', err);
  }
}
