import { Database } from '../db/database';
import { AppError } from '../utils/errors';
import { sanitizeText } from '../utils/sanitize';
import { NotificationService } from './notificationService';
import { logAuditEvent } from '../middleware/audit';

export type KycDocumentType = 'aadhaar' | 'kisan_credit_card' | 'land_record' | 'farmer_id';

export class KycService {
  static submitKYC(farmerId: string, data: {
    documentType: string;
    documentNumber: string;
    documentUrl: string;
  }) {
    const existing = Database.get<any>('SELECT id, user_id, verification_status FROM farmer_profiles WHERE id = ?', [farmerId]);
    if (!existing) {
      throw AppError.notFound('Farmer profile not found');
    }

    if (!data.documentType || !['aadhaar', 'kisan_credit_card', 'land_record', 'farmer_id'].includes(data.documentType)) {
      throw AppError.badRequest('Invalid document type. Allowed: aadhaar, kisan_credit_card, land_record, farmer_id');
    }

    if (!data.documentNumber || data.documentNumber.trim().length < 4) {
      throw AppError.badRequest('Valid document identifier/number required (min 4 characters)');
    }

    if (!data.documentUrl || !data.documentUrl.trim()) {
      throw AppError.badRequest('Document proof image/URL is required');
    }

    const now = new Date().toISOString();
    const cleanDocNum = data.documentNumber.trim();
    const cleanDocUrl = data.documentUrl.trim();

    Database.run(
      `UPDATE farmer_profiles
       SET kyc_document_type = ?,
           kyc_document_number = ?,
           kyc_document_url = ?,
           kyc_submitted_at = ?,
           kyc_rejection_reason = '',
           verification_status = 'pending',
           updated_at = ?
       WHERE id = ?`,
      [data.documentType, cleanDocNum, cleanDocUrl, now, now, farmerId]
    );

    // Notify Admins
    try {
      const admins = Database.query<any>("SELECT id FROM users WHERE role = 'admin'");
      for (const admin of admins) {
        NotificationService.createAndPush({
          userId: admin.id,
          recipientRole: 'admin',
          type: 'verification',
          title: '📄 New Farmer KYC Submitted',
          message: `Farmer has submitted ${data.documentType.toUpperCase()} for verification.`,
          data: { farmerId, documentType: data.documentType },
        });
      }
    } catch {}

    return {
      success: true,
      farmerId,
      verificationStatus: 'pending',
      kycDocumentType: data.documentType,
      kycDocumentNumber: cleanDocNum,
      kycSubmittedAt: now,
    };
  }

  static getKYCStatus(farmerId: string) {
    const farmer = Database.get<any>(
      `SELECT id, user_id, farm_name, verification_status,
              kyc_document_type, kyc_document_number, kyc_document_url,
              kyc_submitted_at, kyc_reviewed_at, kyc_rejection_reason
       FROM farmer_profiles WHERE id = ?`,
      [farmerId]
    );

    if (!farmer) {
      throw AppError.notFound('Farmer profile not found');
    }

    return {
      farmerId: farmer.id,
      farmName: farmer.farm_name,
      verificationStatus: farmer.verification_status,
      documentType: farmer.kyc_document_type || null,
      documentNumber: farmer.kyc_document_number ? (
        farmer.kyc_document_number.length > 4
          ? `••••••••${farmer.kyc_document_number.slice(-4)}`
          : farmer.kyc_document_number
      ) : null,
      rawDocumentNumber: farmer.kyc_document_number || null,
      documentUrl: farmer.kyc_document_url || null,
      submittedAt: farmer.kyc_submitted_at || null,
      reviewedAt: farmer.kyc_reviewed_at || null,
      rejectionReason: farmer.kyc_rejection_reason || null,
    };
  }

  static getPendingKYCList() {
    return Database.query<any>(
      `SELECT f.id, f.user_id, f.farm_name, f.location, f.city, f.verification_status,
              f.kyc_document_type, f.kyc_document_number, f.kyc_document_url,
              f.kyc_submitted_at, u.name as farmer_name, u.phone as farmer_phone, u.email as farmer_email, u.halder_id
       FROM farmer_profiles f
       JOIN users u ON f.user_id = u.id
       WHERE f.verification_status = 'pending' AND f.kyc_submitted_at IS NOT NULL
       ORDER BY f.kyc_submitted_at DESC`
    );
  }

  static adminReviewKYC(farmerId: string, adminId: string, decision: 'verified' | 'rejected', reason?: string) {
    const farmer = Database.get<any>(
      'SELECT id, user_id, farm_name, verification_status FROM farmer_profiles WHERE id = ?',
      [farmerId]
    );

    if (!farmer) {
      throw AppError.notFound('Farmer profile not found');
    }

    if (!['verified', 'rejected'].includes(decision)) {
      throw AppError.badRequest("Decision must be 'verified' or 'rejected'");
    }

    if (decision === 'rejected' && (!reason || !reason.trim())) {
      throw AppError.badRequest('Rejection reason is required when rejecting KYC');
    }

    const now = new Date().toISOString();
    const cleanReason = reason ? sanitizeText(reason.trim()) : '';

    Database.run(
      `UPDATE farmer_profiles
       SET verification_status = ?,
           kyc_reviewed_at = ?,
           kyc_rejection_reason = ?,
           updated_at = ?
       WHERE id = ?`,
      [decision, now, cleanReason, now, farmerId]
    );

    logAuditEvent(adminId, 'admin', `FARMER_KYC_${decision.toUpperCase()}`, 'farmer_profiles', farmerId, {
      decision,
      reason: cleanReason,
    });

    // Notify Farmer
    const notifTitle = decision === 'verified'
      ? '🎉 Kisan KYC Verified! (खाता सत्यापित)'
      : '⚠️ KYC Verification Needs Attention (केवाईसी अस्वीकृत)';

    const notifMsg = decision === 'verified'
      ? 'Congratulations! Your farm KYC has been verified. The Green Verified badge is now active on your store.'
      : `Your KYC could not be approved. Reason: "${cleanReason}". Please re-submit valid documents.`;

    NotificationService.createAndPush({
      userId: farmer.user_id,
      recipientRole: 'farmer',
      type: 'verification',
      title: notifTitle,
      message: notifMsg,
      data: { farmerId, decision, reason: cleanReason },
    });

    return {
      success: true,
      farmerId,
      verificationStatus: decision,
      reviewedAt: now,
      rejectionReason: cleanReason,
    };
  }
}
