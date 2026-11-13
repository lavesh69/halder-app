import { Database } from '../db/database';
import { AppError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';
import { sanitizeText } from '../utils/sanitize';
import { calculateHaversineDistanceKm } from './productService';
import { SmartAlertService } from './smartAlertService';

export interface BuyerRequirement {
  id: string;
  requirementNumber: string;
  buyerId: string;
  buyerName: string;
  buyerPhone: string;
  productName: string;
  categoryId?: string;
  categoryName: string;
  requiredQuantity: number;
  unit: string;
  targetPrice?: number;
  isNegotiable: boolean;
  qualityGrade: string;
  requiredDate: string;
  location: string;
  city: string;
  state: string;
  village: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  deliveryPreference: 'pickup' | 'farmer_delivery' | 'flexible';
  instructions: string;
  status: 'draft' | 'active' | 'receiving_offers' | 'negotiating' | 'offer_accepted' | 'fulfilled' | 'closed' | 'expired';
  quotationsCount: number;
  distanceKm?: number;
  createdAt: string;
  updatedAt: string;
}

export interface RequirementQuotation {
  id: string;
  quotationNumber: string;
  requirementId: string;
  farmerId: string;
  farmerName: string;
  farmName: string;
  farmerPhone: string;
  farmerAvatar: string;
  farmerRating: number;
  isVerified: boolean;
  availableQuantity: number;
  proposedPrice: number;
  unit: string;
  harvestAvailabilityDate?: string;
  deliveryMode: 'pickup' | 'farmer_delivery';
  message: string;
  status: 'submitted' | 'countered' | 'accepted' | 'rejected' | 'withdrawn';
  counterPrice?: number;
  createdAt: string;
  updatedAt: string;
}

export class RequirementService {
  private static generateRequirementNumber(): string {
    const year = new Date().getFullYear();
    const count = Database.get<{ count: number }>('SELECT COUNT(*) as count FROM buyer_requirements');
    const seq = (count?.count || 0) + 1;
    return `REQ-${year}-${String(seq).padStart(4, '0')}`;
  }

  private static generateQuotationNumber(): string {
    const year = new Date().getFullYear();
    const count = Database.get<{ count: number }>('SELECT COUNT(*) as count FROM requirement_quotations');
    const seq = (count?.count || 0) + 1;
    return `QUO-${year}-${String(seq).padStart(4, '0')}`;
  }

  static createRequirement(buyerId: string, data: {
    productName: string;
    categoryName?: string;
    requiredQuantity: number;
    unit?: string;
    targetPrice?: number;
    isNegotiable?: boolean;
    qualityGrade?: string;
    requiredDate: string;
    location: string;
    city?: string;
    state?: string;
    village?: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
    deliveryPreference?: 'pickup' | 'farmer_delivery' | 'flexible';
    instructions?: string;
  }): BuyerRequirement {
    if (!data.productName || data.productName.trim().length === 0) {
      throw AppError.badRequest('Product name is required.');
    }
    if (!data.requiredQuantity || data.requiredQuantity <= 0) {
      throw AppError.badRequest('Required quantity must be greater than zero.');
    }
    if (!data.requiredDate) {
      throw AppError.badRequest('Required delivery/harvest date is required.');
    }

    const id = `req-${uuidv4()}`;
    const reqNumber = this.generateRequirementNumber();
    const now = new Date().toISOString();

    Database.run(
      `INSERT INTO buyer_requirements (
        id, requirement_number, buyer_id, product_name, category_name,
        required_quantity, unit, target_price, is_negotiable,
        quality_grade, required_date, location, city, state, village,
        postal_code, latitude, longitude, delivery_preference,
        instructions, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
      [
        id,
        reqNumber,
        buyerId,
        sanitizeText(data.productName),
        data.categoryName || 'Vegetables',
        data.requiredQuantity,
        data.unit || 'kg',
        data.targetPrice !== undefined ? data.targetPrice : null,
        data.isNegotiable !== false ? 1 : 0,
        data.qualityGrade || 'Grade A',
        data.requiredDate,
        sanitizeText(data.location),
        data.city || 'Dehradun',
        data.state || 'Uttarakhand',
        sanitizeText(data.village || ''),
        data.postalCode || '248001',
        data.latitude || 30.3165,
        data.longitude || 78.0322,
        data.deliveryPreference || 'flexible',
        sanitizeText(data.instructions || ''),
        now,
        now,
      ]
    );

    // Trigger smart matching to alert nearby farmers
    try {
      SmartAlertService.matchRequirementAgainstNearbyFarmers(id);
    } catch (e: any) {
      console.warn('Smart matching alert error:', e.message);
    }

    return this.getRequirementById(id);
  }

  static getRequirementById(id: string, userLat?: number, userLng?: number): BuyerRequirement {
    const row = Database.get<any>(
      `SELECT r.*, u.name as buyer_name, u.phone as buyer_phone,
              (SELECT COUNT(*) FROM requirement_quotations q WHERE q.requirement_id = r.id) as quotations_count
       FROM buyer_requirements r
       JOIN users u ON r.buyer_id = u.id
       WHERE r.id = ?`,
      [id]
    );

    if (!row) throw AppError.notFound('Buyer requirement not found');

    let distanceKm: number | undefined;
    if (userLat !== undefined && userLng !== undefined && row.latitude && row.longitude) {
      distanceKm = calculateHaversineDistanceKm(userLat, userLng, row.latitude, row.longitude);
    }

    return {
      id: row.id,
      requirementNumber: row.requirement_number,
      buyerId: row.buyer_id,
      buyerName: row.buyer_name,
      buyerPhone: row.buyer_phone,
      productName: row.product_name,
      categoryId: row.category_id,
      categoryName: row.category_name,
      requiredQuantity: Number(row.required_quantity),
      unit: row.unit,
      targetPrice: row.target_price !== null ? Number(row.target_price) : undefined,
      isNegotiable: Boolean(row.is_negotiable),
      qualityGrade: row.quality_grade,
      requiredDate: row.required_date,
      location: row.location,
      city: row.city,
      state: row.state,
      village: row.village,
      postalCode: row.postal_code,
      latitude: Number(row.latitude) || 30.3165,
      longitude: Number(row.longitude) || 78.0322,
      deliveryPreference: row.delivery_preference,
      instructions: row.instructions,
      status: row.status,
      quotationsCount: Number(row.quotations_count) || 0,
      distanceKm,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  static listRequirements(params: {
    category?: string;
    city?: string;
    search?: string;
    status?: string;
    buyerId?: string;
    userLat?: number;
    userLng?: number;
    maxDistanceKm?: number;
    limit?: number;
  }): BuyerRequirement[] {
    let sql = `
      SELECT r.*, u.name as buyer_name, u.phone as buyer_phone,
             (SELECT COUNT(*) FROM requirement_quotations q WHERE q.requirement_id = r.id) as quotations_count
      FROM buyer_requirements r
      JOIN users u ON r.buyer_id = u.id
      WHERE 1=1
    `;
    const sqlParams: any[] = [];

    if (params.buyerId) {
      sql += ' AND r.buyer_id = ?';
      sqlParams.push(params.buyerId);
    } else {
      // By default show active or negotiating requirements to other buyers/farmers
      if (params.status) {
        sql += ' AND r.status = ?';
        sqlParams.push(params.status);
      } else {
        sql += " AND r.status IN ('active', 'receiving_offers', 'negotiating')";
      }
    }

    if (params.category && params.category !== 'All') {
      sql += ' AND r.category_name = ?';
      sqlParams.push(params.category);
    }

    if (params.city && params.city !== 'All India' && params.city !== 'All') {
      sql += ' AND (r.city = ? OR r.location LIKE ?)';
      sqlParams.push(params.city, `%${params.city}%`);
    }

    if (params.search && params.search.trim().length > 0) {
      sql += ' AND (r.product_name LIKE ? OR r.instructions LIKE ?)';
      sqlParams.push(`%${params.search}%`, `%${params.search}%`);
    }

    sql += ' ORDER BY r.created_at DESC LIMIT ?';
    sqlParams.push(params.limit || 50);

    const rows = Database.query<any>(sql, sqlParams);

    const results: BuyerRequirement[] = rows.map((row) => {
      let distanceKm: number | undefined;
      if (params.userLat !== undefined && params.userLng !== undefined && row.latitude && row.longitude) {
        distanceKm = calculateHaversineDistanceKm(params.userLat, params.userLng, row.latitude, row.longitude);
      }

      return {
        id: row.id,
        requirementNumber: row.requirement_number,
        buyerId: row.buyer_id,
        buyerName: row.buyer_name,
        buyerPhone: row.buyer_phone,
        productName: row.product_name,
        categoryId: row.category_id,
        categoryName: row.category_name,
        requiredQuantity: Number(row.required_quantity),
        unit: row.unit,
        targetPrice: row.target_price !== null ? Number(row.target_price) : undefined,
        isNegotiable: Boolean(row.is_negotiable),
        qualityGrade: row.quality_grade,
        requiredDate: row.required_date,
        location: row.location,
        city: row.city,
        state: row.state,
        village: row.village,
        postalCode: row.postal_code,
        latitude: Number(row.latitude) || 30.3165,
        longitude: Number(row.longitude) || 78.0322,
        deliveryPreference: row.delivery_preference,
        instructions: row.instructions,
        status: row.status,
        quotationsCount: Number(row.quotations_count) || 0,
        distanceKm,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    });

    if (params.maxDistanceKm && params.userLat && params.userLng) {
      return results.filter((r) => r.distanceKm === undefined || r.distanceKm <= params.maxDistanceKm!);
    }

    return results;
  }

  static updateRequirementStatus(
    id: string,
    buyerId: string,
    status: 'draft' | 'active' | 'receiving_offers' | 'negotiating' | 'offer_accepted' | 'fulfilled' | 'closed'
  ) {
    const req = Database.get<any>('SELECT * FROM buyer_requirements WHERE id = ?', [id]);
    if (!req) throw AppError.notFound('Buyer requirement not found');
    if (req.buyer_id !== buyerId) throw AppError.forbidden('Unauthorized access to buyer requirement');

    Database.run(
      'UPDATE buyer_requirements SET status = ?, updated_at = ? WHERE id = ?',
      [status, new Date().toISOString(), id]
    );

    return this.getRequirementById(id);
  }

  static deleteRequirement(id: string, buyerId: string) {
    const req = Database.get<any>('SELECT * FROM buyer_requirements WHERE id = ?', [id]);
    if (!req) throw AppError.notFound('Buyer requirement not found');
    if (req.buyer_id !== buyerId) throw AppError.forbidden('Unauthorized access to buyer requirement');

    Database.run('DELETE FROM buyer_requirements WHERE id = ?', [id]);
    return { success: true, message: 'Requirement deleted' };
  }

  /**
   * Farmer submits a quotation for a requirement
   */
  static submitQuotation(farmerUserId: string, requirementId: string, data: {
    availableQuantity: number;
    proposedPrice: number;
    unit?: string;
    harvestAvailabilityDate?: string;
    deliveryMode?: 'pickup' | 'farmer_delivery';
    message?: string;
  }): RequirementQuotation {
    const farmer = Database.get<any>('SELECT id FROM farmer_profiles WHERE user_id = ?', [farmerUserId]);
    if (!farmer) throw AppError.forbidden('Only registered farmers can submit quotations');

    const req = Database.get<any>('SELECT * FROM buyer_requirements WHERE id = ?', [requirementId]);
    if (!req) throw AppError.notFound('Buyer requirement not found');
    if (req.status === 'closed' || req.status === 'fulfilled') {
      throw AppError.badRequest('This requirement is no longer accepting quotations.');
    }

    if (!data.proposedPrice || data.proposedPrice <= 0) {
      throw AppError.badRequest('Proposed price must be greater than zero.');
    }
    if (!data.availableQuantity || data.availableQuantity <= 0) {
      throw AppError.badRequest('Available quantity must be greater than zero.');
    }

    // Check if farmer already submitted a quotation
    const existing = Database.get<any>(
      'SELECT id FROM requirement_quotations WHERE requirement_id = ? AND farmer_id = ?',
      [requirementId, farmer.id]
    );

    const now = new Date().toISOString();

    if (existing) {
      Database.run(
        `UPDATE requirement_quotations SET
          available_quantity = ?, proposed_price = ?, unit = ?,
          harvest_availability_date = ?, delivery_mode = ?,
          message = ?, status = 'submitted', updated_at = ?
         WHERE id = ?`,
        [
          data.availableQuantity,
          data.proposedPrice,
          data.unit || req.unit,
          data.harvestAvailabilityDate || null,
          data.deliveryMode || 'pickup',
          sanitizeText(data.message || ''),
          now,
          existing.id,
        ]
      );
      return this.getQuotationById(existing.id);
    }

    const quoteId = `quo-${uuidv4()}`;
    const quoteNumber = this.generateQuotationNumber();

    Database.run(
      `INSERT INTO requirement_quotations (
        id, quotation_number, requirement_id, farmer_id, available_quantity,
        proposed_price, unit, harvest_availability_date, delivery_mode,
        message, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', ?, ?)`,
      [
        quoteId,
        quoteNumber,
        requirementId,
        farmer.id,
        data.availableQuantity,
        data.proposedPrice,
        data.unit || req.unit,
        data.harvestAvailabilityDate || null,
        data.deliveryMode || 'pickup',
        sanitizeText(data.message || ''),
        now,
        now,
      ]
    );

    // Update requirement status to receiving_offers if active
    if (req.status === 'active') {
      Database.run("UPDATE buyer_requirements SET status = 'receiving_offers', updated_at = ? WHERE id = ?", [
        now,
        requirementId,
      ]);
    }

    // Notify buyer
    const farmerUser = Database.get<any>('SELECT name FROM users WHERE id = ?', [farmerUserId]);
    Database.run(
      `INSERT INTO notifications (
        id, user_id, recipient_role, type, title, message, is_read, created_at
      ) VALUES (?, ?, 'customer', 'quotation', ?, ?, 0, ?)`,
      [
        `notif-${uuidv4().slice(0, 8)}`,
        req.buyer_id,
        `New Quotation Received: ${req.product_name}`,
        `Farmer ${farmerUser?.name || 'Kisan'} submitted a quotation of ₹${data.proposedPrice}/${data.unit || req.unit} for your requirement (${quoteNumber}).`,
        now,
      ]
    );

    return this.getQuotationById(quoteId);
  }

  static getQuotationById(id: string): RequirementQuotation {
    const row = Database.get<any>(
      `SELECT q.*, f.farm_name, f.avatar, f.rating, f.verification_status,
              u.name as farmer_name, u.phone as farmer_phone
       FROM requirement_quotations q
       JOIN farmer_profiles f ON q.farmer_id = f.id
       JOIN users u ON f.user_id = u.id
       WHERE q.id = ?`,
      [id]
    );

    if (!row) throw AppError.notFound('Quotation not found');

    return {
      id: row.id,
      quotationNumber: row.quotation_number,
      requirementId: row.requirement_id,
      farmerId: row.farmer_id,
      farmerName: row.farmer_name,
      farmName: row.farm_name,
      farmerPhone: row.farmer_phone,
      farmerAvatar: row.avatar || 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=200',
      farmerRating: Number(row.rating) || 4.8,
      isVerified: row.verification_status === 'verified',
      availableQuantity: Number(row.available_quantity),
      proposedPrice: Number(row.proposed_price),
      unit: row.unit,
      harvestAvailabilityDate: row.harvest_availability_date,
      deliveryMode: row.delivery_mode,
      message: row.message,
      status: row.status,
      counterPrice: row.counter_price ? Number(row.counter_price) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  static listQuotationsForRequirement(requirementId: string, currentUserId: string): RequirementQuotation[] {
    const req = Database.get<any>('SELECT * FROM buyer_requirements WHERE id = ?', [requirementId]);
    if (!req) throw AppError.notFound('Requirement not found');

    const farmerProfile = Database.get<any>('SELECT id FROM farmer_profiles WHERE user_id = ?', [currentUserId]);

    // Authorized if buyer or if farmer querying their own
    let sql = `
      SELECT q.*, f.farm_name, f.avatar, f.rating, f.verification_status,
             u.name as farmer_name, u.phone as farmer_phone
      FROM requirement_quotations q
      JOIN farmer_profiles f ON q.farmer_id = f.id
      JOIN users u ON f.user_id = u.id
      WHERE q.requirement_id = ?
    `;
    const sqlParams: any[] = [requirementId];

    if (req.buyer_id !== currentUserId) {
      if (!farmerProfile) {
        throw AppError.forbidden('Unauthorized access to quotations');
      }
      sql += ' AND q.farmer_id = ?';
      sqlParams.push(farmerProfile.id);
    }

    sql += ' ORDER BY q.proposed_price ASC';
    const rows = Database.query<any>(sql, sqlParams);

    return rows.map((row) => ({
      id: row.id,
      quotationNumber: row.quotation_number,
      requirementId: row.requirement_id,
      farmerId: row.farmer_id,
      farmerName: row.farmer_name,
      farmName: row.farm_name,
      farmerPhone: row.farmer_phone,
      farmerAvatar: row.avatar || 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=200',
      farmerRating: Number(row.rating) || 4.8,
      isVerified: row.verification_status === 'verified',
      availableQuantity: Number(row.available_quantity),
      proposedPrice: Number(row.proposed_price),
      unit: row.unit,
      harvestAvailabilityDate: row.harvest_availability_date,
      deliveryMode: row.delivery_mode,
      message: row.message,
      status: row.status,
      counterPrice: row.counter_price ? Number(row.counter_price) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  /**
   * Buyer responds to quotation (accept, reject, counter) or Farmer withdraws
   */
  static respondToQuotation(
    quotationId: string,
    userId: string,
    action: 'accept' | 'reject' | 'counter' | 'withdraw',
    counterPrice?: number
  ) {
    const quote = Database.get<any>(
      `SELECT q.*, r.buyer_id, f.user_id as farmer_user_id
       FROM requirement_quotations q
       JOIN buyer_requirements r ON q.requirement_id = r.id
       JOIN farmer_profiles f ON q.farmer_id = f.id
       WHERE q.id = ?`,
      [quotationId]
    );

    if (!quote) throw AppError.notFound('Quotation not found');

    const now = new Date().toISOString();

    if (action === 'withdraw') {
      if (quote.farmer_user_id !== userId) {
        throw AppError.forbidden('Only the submitting farmer can withdraw this quotation');
      }
      Database.run("UPDATE requirement_quotations SET status = 'withdrawn', updated_at = ? WHERE id = ?", [now, quotationId]);
      return { success: true, status: 'withdrawn' };
    }

    // Buyer actions
    if (quote.buyer_id !== userId) {
      throw AppError.forbidden('Only the buyer can accept, reject, or counter this quotation');
    }

    if (action === 'accept') {
      Database.transaction(() => {
        Database.run("UPDATE requirement_quotations SET status = 'accepted', updated_at = ? WHERE id = ?", [now, quotationId]);
        Database.run("UPDATE buyer_requirements SET status = 'offer_accepted', updated_at = ? WHERE id = ?", [now, quote.requirement_id]);

        // Notify farmer
        Database.run(
          `INSERT INTO notifications (
            id, user_id, recipient_role, type, title, message, is_read, created_at
          ) VALUES (?, ?, 'farmer', 'offer', ?, ?, 0, ?)`,
          [
            `notif-${uuidv4().slice(0, 8)}`,
            quote.farmer_user_id,
            'Quotation Accepted! 🎉',
            `Your quotation of ₹${quote.proposed_price}/${quote.unit} was accepted by the buyer! Tap to coordinate delivery or pickup.`,
            now,
          ]
        );
      });
      return { success: true, status: 'accepted' };
    }

    if (action === 'reject') {
      Database.run("UPDATE requirement_quotations SET status = 'rejected', updated_at = ? WHERE id = ?", [now, quotationId]);
      return { success: true, status: 'rejected' };
    }

    if (action === 'counter') {
      if (!counterPrice || counterPrice <= 0) {
        throw AppError.badRequest('Valid counter price is required.');
      }
      Database.transaction(() => {
        Database.run(
          "UPDATE requirement_quotations SET status = 'countered', counter_price = ?, updated_at = ? WHERE id = ?",
          [counterPrice, now, quotationId]
        );
        Database.run("UPDATE buyer_requirements SET status = 'negotiating', updated_at = ? WHERE id = ?", [now, quote.requirement_id]);

        // Notify farmer
        Database.run(
          `INSERT INTO notifications (
            id, user_id, recipient_role, type, title, message, is_read, created_at
          ) VALUES (?, ?, 'farmer', 'offer', ?, ?, 0, ?)`,
          [
            `notif-${uuidv4().slice(0, 8)}`,
            quote.farmer_user_id,
            'Counter-Offer on Quotation',
            `The buyer proposed a counter-price of ₹${counterPrice}/${quote.unit} on your quotation. Tap to review.`,
            now,
          ]
        );
      });
      return { success: true, status: 'countered', counterPrice };
    }

    throw AppError.badRequest('Invalid action');
  }

  static listMyQuotations(farmerUserId: string) {
    const farmer = Database.get<any>('SELECT id FROM farmer_profiles WHERE user_id = ?', [farmerUserId]);
    if (!farmer) return [];

    const rows = Database.query<any>(
      `SELECT q.*, r.product_name, r.requirement_number, r.required_quantity, r.unit as req_unit,
              r.location as req_location, r.status as req_status, u.name as buyer_name, u.phone as buyer_phone
       FROM requirement_quotations q
       JOIN buyer_requirements r ON q.requirement_id = r.id
       JOIN users u ON r.buyer_id = u.id
       WHERE q.farmer_id = ?
       ORDER BY q.created_at DESC LIMIT 50`,
      [farmer.id]
    );

    return rows.map((row) => ({
      id: row.id,
      quotationNumber: row.quotation_number,
      requirementId: row.requirement_id,
      requirementNumber: row.requirement_number,
      productName: row.product_name,
      buyerName: row.buyer_name,
      buyerPhone: row.buyer_phone,
      reqLocation: row.req_location,
      reqStatus: row.req_status,
      availableQuantity: Number(row.available_quantity),
      proposedPrice: Number(row.proposed_price),
      unit: row.unit,
      harvestAvailabilityDate: row.harvest_availability_date,
      deliveryMode: row.delivery_mode,
      message: row.message,
      status: row.status,
      counterPrice: row.counter_price ? Number(row.counter_price) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }
}
