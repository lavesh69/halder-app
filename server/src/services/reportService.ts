import { Database } from '../db/database';
import { AppError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';
import { sanitizeText } from '../utils/sanitize';

export class ReportService {
  static create(reporterId: string, data: {
    productId?: string;
    reportedUserId?: string;
    reason: string;
    description?: string;
  }) {
    if (!data.reason || !data.reason.trim()) {
      throw AppError.badRequest('Reason is required to submit a report');
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    const cleanReason = sanitizeText(data.reason);
    const cleanDesc = data.description ? sanitizeText(data.description) : null;

    Database.run(
      `INSERT INTO reports (id, reporter_id, product_id, reported_user_id, reason, description, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'open', ?)`,
      [id, reporterId, data.productId || null, data.reportedUserId || null, cleanReason, cleanDesc, now]
    );

    return {
      id,
      reporter_id: reporterId,
      product_id: data.productId,
      reported_user_id: data.reportedUserId,
      reason: cleanReason,
      status: 'open',
      created_at: now,
    };
  }

  static listAll(status?: string) {
    let sql = `SELECT r.*, u.name as reporter_name, u.email as reporter_email,
                      p.name as product_name, ru.name as reported_user_name
               FROM reports r
               JOIN users u ON r.reporter_id = u.id
               LEFT JOIN products p ON r.product_id = p.id
               LEFT JOIN users ru ON r.reported_user_id = ru.id`;
    const params: any[] = [];
    if (status) {
      sql += ' WHERE r.status = ?';
      params.push(status);
    }
    sql += ' ORDER BY r.created_at DESC';

    return Database.query<any>(sql, params);
  }

  static updateStatus(reportId: string, newStatus: 'open' | 'investigating' | 'resolved' | 'dismissed') {
    const report = Database.get<any>('SELECT * FROM reports WHERE id = ?', [reportId]);
    if (!report) throw AppError.notFound('Report not found');

    const now = new Date().toISOString();
    const resolvedAt = (newStatus === 'resolved' || newStatus === 'dismissed') ? now : null;

    Database.run(
      'UPDATE reports SET status = ?, resolved_at = ? WHERE id = ?',
      [newStatus, resolvedAt, reportId]
    );

    return { id: reportId, status: newStatus, resolved_at: resolvedAt };
  }
}
