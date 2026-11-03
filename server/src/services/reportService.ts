import { Database } from '../db/database';
import { AppError } from '../utils/errors';
import { sanitizeText } from '../utils/sanitize';
import { logAuditEvent } from '../middleware/audit';
import { NotificationService } from './notificationService';

export interface CreateReportInput {
  orderId?: string;
  productId?: string;
  reportedUserId?: string;
  category?: 'general' | 'quality_issue' | 'delivery_delay' | 'damaged_goods' | 'billing_dispute' | 'middleman_complaint';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  reason: string;
  description?: string;
  evidenceUrl?: string;
}

export class ReportService {
  static create(reporterId: string, data: CreateReportInput) {
    if (!data.reason || !data.reason.trim()) {
      throw AppError.badRequest('Reason is required to submit a support report/grievance');
    }

    // Optional order verification
    if (data.orderId) {
      const order = Database.get<any>('SELECT id, customer_id, farmer_id FROM orders WHERE id = ?', [data.orderId]);
      if (!order) {
        throw AppError.notFound('Associated order not found');
      }
    }

    const id = 'ticket-' + Date.now();
    const now = new Date().toISOString();
    const cleanReason = sanitizeText(data.reason);
    const cleanDesc = data.description ? sanitizeText(data.description) : null;
    const cleanCategory = data.category || 'general';
    const cleanPriority = data.priority || 'medium';
    const cleanEvidence = data.evidenceUrl ? sanitizeText(data.evidenceUrl) : '';

    Database.run(
      `INSERT INTO reports (
        id, reporter_id, order_id, product_id, reported_user_id,
        category, priority, reason, description, evidence_url, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)`,
      [
        id, reporterId, data.orderId || null, data.productId || null, data.reportedUserId || null,
        cleanCategory, cleanPriority, cleanReason, cleanDesc, cleanEvidence, now
      ]
    );

    logAuditEvent(reporterId, 'customer', 'GRIEVANCE_SUBMITTED', 'reports', id, {
      category: cleanCategory,
      priority: cleanPriority,
      orderId: data.orderId,
    });

    return {
      id,
      reporter_id: reporterId,
      order_id: data.orderId,
      product_id: data.productId,
      reported_user_id: data.reportedUserId,
      category: cleanCategory,
      priority: cleanPriority,
      reason: cleanReason,
      status: 'open',
      created_at: now,
    };
  }

  static listMy(userId: string) {
    return Database.query<any>(
      `SELECT r.*, 
              o.order_number, o.total_amount,
              p.name as product_name,
              ru.name as reported_user_name
       FROM reports r
       LEFT JOIN orders o ON r.order_id = o.id
       LEFT JOIN products p ON r.product_id = p.id
       LEFT JOIN users ru ON r.reported_user_id = ru.id
       WHERE r.reporter_id = ?
       ORDER BY r.created_at DESC`,
      [userId]
    );
  }

  static listAll(params: { status?: string; category?: string; priority?: string } = {}) {
    let sql = `SELECT r.*, 
                      u.name as reporter_name, u.email as reporter_email, u.phone as reporter_phone,
                      o.order_number, o.total_amount,
                      p.name as product_name, 
                      ru.name as reported_user_name,
                      adm.name as assigned_admin_name
               FROM reports r
               JOIN users u ON r.reporter_id = u.id
               LEFT JOIN orders o ON r.order_id = o.id
               LEFT JOIN products p ON r.product_id = p.id
               LEFT JOIN users ru ON r.reported_user_id = ru.id
               LEFT JOIN users adm ON r.assigned_admin_id = adm.id
               WHERE 1=1`;
    const sqlParams: any[] = [];

    if (params.status) {
      sql += ' AND r.status = ?';
      sqlParams.push(params.status);
    }
    if (params.category) {
      sql += ' AND r.category = ?';
      sqlParams.push(params.category);
    }
    if (params.priority) {
      sql += ' AND r.priority = ?';
      sqlParams.push(params.priority);
    }

    sql += ' ORDER BY r.created_at DESC';
    return Database.query<any>(sql, sqlParams);
  }

  static updateStatus(
    reportId: string,
    updates: {
      status?: 'open' | 'investigating' | 'resolved' | 'dismissed';
      resolutionNotes?: string;
      resolutionReason?: string;
      assignedAdminId?: string;
    },
    adminId: string
  ) {
    const report = Database.get<any>('SELECT * FROM reports WHERE id = ?', [reportId]);
    if (!report) throw AppError.notFound('Report / grievance not found');

    const now = new Date().toISOString();
    const newStatus = updates.status || report.status;
    const resolvedAt = (newStatus === 'resolved' || newStatus === 'dismissed') ? now : report.resolved_at;
    const rawNotes = updates.resolutionNotes ?? (updates as any).resolution_notes;
    const rawReason = updates.resolutionReason ?? (updates as any).resolution_reason;
    const rawAssigned = updates.assignedAdminId ?? (updates as any).assigned_admin_id;
    const resolutionNotes = rawNotes !== undefined ? sanitizeText(rawNotes) : (report.resolution_notes || '');
    const resolutionReason = rawReason !== undefined ? sanitizeText(rawReason) : (report.resolution_reason || '');
    const assignedAdminId = rawAssigned !== undefined ? rawAssigned : report.assigned_admin_id;

    Database.run(
      `UPDATE reports SET
        status = ?,
        resolved_at = ?,
        resolution_notes = ?,
        resolution_reason = ?,
        assigned_admin_id = ?
       WHERE id = ?`,
      [newStatus, resolvedAt, resolutionNotes, resolutionReason, assignedAdminId, reportId]
    );

    logAuditEvent(adminId, 'admin', `GRIEVANCE_${newStatus.toUpperCase()}`, 'reports', reportId, {
      previousStatus: report.status,
      newStatus,
      resolutionReason,
    });

    // Notify the reporting customer/farmer of the resolution update
    try {
      NotificationService.create({
        userId: report.reporter_id,
        role: 'customer',
        type: 'order',
        title: `Grievance Ticket #${reportId.slice(-6).toUpperCase()} ${newStatus === 'resolved' ? 'Resolved' : 'Updated'}`,
        message: resolutionReason 
          ? `Status: ${newStatus.toUpperCase()}. Resolution: ${resolutionReason}`
          : `Your support grievance status was updated to ${newStatus}.`,
      });
    } catch {}

    return Database.get<any>('SELECT * FROM reports WHERE id = ?', [reportId]);
  }
}
