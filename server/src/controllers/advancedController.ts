import { Request, Response, NextFunction } from 'express';
import { Database } from '../db/database';
import { AppError } from '../utils/errors';

export class AdvancedController {
  // --- B2B MARKETPLACE ---
  // GET /api/v1/advanced/b2b/profile
  static getB2bProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const profile = Database.get('SELECT * FROM b2b_profiles WHERE user_id = ?', [userId]);
      res.json({ success: true, data: profile || null });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/v1/advanced/b2b/profile
  static saveB2bProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { business_name, business_type, gstin, fssai_license } = req.body;

      if (!business_name || !business_type) {
        throw AppError.badRequest('business_name and business_type are required');
      }

      const existing = Database.get<any>('SELECT id FROM b2b_profiles WHERE user_id = ?', [userId]);
      const now = new Date().toISOString();

      if (existing) {
        Database.run(
          `UPDATE b2b_profiles SET business_name = ?, business_type = ?, gstin = ?, fssai_license = ?, verified = 0, status = 'pending', updated_at = ? WHERE user_id = ?`,
          [business_name, business_type, gstin || '', fssai_license || '', now, userId]
        );
      } else {
        const id = 'b2b-' + Date.now();
        Database.run(
          `INSERT INTO b2b_profiles (id, user_id, business_name, business_type, gstin, fssai_license, verified, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 0, 'pending', ?, ?)`,
          [id, userId, business_name, business_type, gstin || '', fssai_license || '', now, now]
        );
      }

      const profile = Database.get('SELECT * FROM b2b_profiles WHERE user_id = ?', [userId]);
      res.json({ success: true, message: 'B2B Wholesale profile submitted and pending verification', data: profile });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/v1/advanced/b2b/profiles (Admin only)
  static listB2bProfiles(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = req.query;
      let query = `
        SELECT bp.*, u.name as user_name, u.email as user_email, u.phone as user_phone
        FROM b2b_profiles bp
        JOIN users u ON bp.user_id = u.id
      `;
      const params: any[] = [];
      if (status) {
        query += ' WHERE bp.status = ?';
        params.push(status);
      }
      query += ' ORDER BY bp.created_at DESC';
      const profiles = Database.query(query, params);
      res.json({ success: true, count: profiles.length, data: profiles });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/v1/advanced/b2b/profiles/:id/verify (Admin only)
  static verifyB2bProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const adminId = (req as any).user.id;
      const { action, rejection_reason, credit_limit } = req.body;

      if (!action || !['approve', 'reject'].includes(action)) {
        throw AppError.badRequest("Action must be either 'approve' or 'reject'");
      }

      const profile = Database.get<any>('SELECT * FROM b2b_profiles WHERE id = ?', [id]);
      if (!profile) throw AppError.notFound('B2B profile not found');

      const now = new Date().toISOString();
      const auditLogId = 'audit-' + Date.now();

      if (action === 'approve') {
        const newCreditLimit = credit_limit ? Number(credit_limit) : (profile.credit_limit || 50000.0);
        Database.run(
          `UPDATE b2b_profiles SET
            verified = 1,
            status = 'verified',
            verified_by = ?,
            verified_at = ?,
            rejection_reason = '',
            credit_limit = ?,
            updated_at = ?
           WHERE id = ?`,
          [adminId, now, newCreditLimit, now, id]
        );

        Database.run(
          `INSERT INTO audit_logs (id, actor_id, actor_role, action, target_type, target_id, details, created_at)
           VALUES (?, ?, 'admin', 'B2B_PROFILE_VERIFIED', 'b2b_profile', ?, ?, ?)`,
          [
            auditLogId,
            adminId,
            id,
            JSON.stringify({ business_name: profile.business_name, action: 'approve', credit_limit: newCreditLimit }),
            now
          ]
        );

        const updated = Database.get('SELECT * FROM b2b_profiles WHERE id = ?', [id]);
        return res.json({ success: true, message: 'B2B wholesale profile verified and approved', data: updated });
      } else {
        const reason = rejection_reason || 'B2B wholesale documentation failed verification standards';
        Database.run(
          `UPDATE b2b_profiles SET
            verified = 0,
            status = 'rejected',
            verified_by = ?,
            verified_at = ?,
            rejection_reason = ?,
            updated_at = ?
           WHERE id = ?`,
          [adminId, now, reason, now, id]
        );

        Database.run(
          `INSERT INTO audit_logs (id, actor_id, actor_role, action, target_type, target_id, details, created_at)
           VALUES (?, ?, 'admin', 'B2B_PROFILE_REJECTED', 'b2b_profile', ?, ?, ?)`,
          [
            auditLogId,
            adminId,
            id,
            JSON.stringify({ business_name: profile.business_name, action: 'reject', reason }),
            now
          ]
        );

        const updated = Database.get('SELECT * FROM b2b_profiles WHERE id = ?', [id]);
        return res.json({ success: true, message: 'B2B wholesale profile rejected', data: updated });
      }
    } catch (err) {
      next(err);
    }
  }

  // GET /api/v1/advanced/b2b/quotations
  static getQuotations(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const role = (req as any).user.role;

      let query = `
        SELECT wq.*, 
               p.name as product_name, p.price as retail_price, p.wholesale_price, p.image as product_image,
               fp.farm_name, u_buyer.name as buyer_name, u_buyer.phone as buyer_phone
        FROM wholesale_quotations wq
        JOIN products p ON wq.product_id = p.id
        JOIN farmer_profiles fp ON wq.farmer_id = fp.id
        JOIN users u_buyer ON wq.buyer_id = u_buyer.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (role === 'farmer') {
        const farmerProfile = Database.get<any>('SELECT id FROM farmer_profiles WHERE user_id = ?', [userId]);
        if (farmerProfile) {
          query += ' AND wq.farmer_id = ?';
          params.push(farmerProfile.id);
        }
      } else if (role !== 'admin') {
        query += ' AND wq.buyer_id = ?';
        params.push(userId);
      }

      query += ' ORDER BY wq.created_at DESC';
      const quotations = Database.query(query, params);
      res.json({ success: true, count: quotations.length, data: quotations });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/v1/advanced/b2b/quotations
  static requestQuotation(req: Request, res: Response, next: NextFunction) {
    try {
      const buyerId = (req as any).user.id;
      const { product_id, requested_quantity, unit, offered_price_per_unit, notes } = req.body;

      if (!product_id || !requested_quantity || !offered_price_per_unit) {
        throw AppError.badRequest('product_id, requested_quantity, and offered_price_per_unit are required');
      }

      const product = Database.get<any>('SELECT * FROM products WHERE id = ?', [product_id]);
      if (!product) throw AppError.notFound('Product not found');

      const id = 'quote-' + Date.now();
      const quoteNum = 'QT-' + Math.floor(100000 + Math.random() * 900000);
      const now = new Date().toISOString();

      Database.run(
        `INSERT INTO wholesale_quotations (
          id, quotation_number, buyer_id, farmer_id, product_id,
          requested_quantity, unit, offered_price_per_unit, status, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
        [
          id, quoteNum, buyerId, product.farmer_id, product_id,
          Number(requested_quantity), unit || product.unit || 'kg',
          Number(offered_price_per_unit), notes || '', now, now
        ]
      );

      const created = Database.get('SELECT * FROM wholesale_quotations WHERE id = ?', [id]);
      res.status(201).json({ success: true, message: 'Wholesale quotation submitted to farmer', data: created });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/v1/advanced/b2b/quotations/:id
  static updateQuotationStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const quotation = Database.get<any>('SELECT * FROM wholesale_quotations WHERE id = ?', [id]);
      if (!quotation) throw AppError.notFound('Wholesale quotation not found');

      const userId = (req as any).user.id;
      const role = (req as any).user.role;
      const isBuyer = quotation.buyer_id === userId;
      const farmerProfile = Database.get<any>('SELECT id FROM farmer_profiles WHERE user_id = ? AND id = ?', [userId, quotation.farmer_id]);
      const isFarmer = !!farmerProfile;

      if (!isBuyer && !isFarmer && role !== 'admin') {
        throw AppError.forbidden('You are not authorized to modify this wholesale quotation');
      }

      const { status, farmer_counter_price, notes } = req.body;
      if (!status) {
        throw AppError.badRequest('status is required');
      }

      // Check current state machine
      const current = quotation.status;
      const target = status;

      const allowedStatuses = ['pending', 'countered', 'counter_offered', 'accepted', 'rejected', 'ordered', 'expired'];
      if (!allowedStatuses.includes(target)) {
        throw AppError.badRequest(`Invalid quotation status '${target}'. Allowed: ${allowedStatuses.join(', ')}`);
      }

      // Enforce state machine transitions:
      // Terminal states: 'rejected', 'expired', 'ordered'
      if (['rejected', 'expired', 'ordered'].includes(current)) {
        throw AppError.badRequest(`Quotation is in terminal state '${current}' and cannot be modified`);
      }

      // If current is 'accepted', only transition allowed is to 'ordered'
      if (current === 'accepted' && target !== 'ordered') {
        throw AppError.badRequest(`Quotation is already 'accepted' and can only transition to 'ordered'`);
      }

      // If current is 'pending':
      if (current === 'pending') {
        if (!['countered', 'counter_offered', 'accepted', 'rejected', 'expired'].includes(target)) {
          throw AppError.badRequest(`Invalid transition from 'pending' to '${target}'`);
        }
      }

      // If current is 'countered' or 'counter_offered':
      if (['countered', 'counter_offered'].includes(current)) {
        if (!['countered', 'counter_offered', 'accepted', 'rejected', 'expired', 'ordered'].includes(target)) {
          throw AppError.badRequest(`Invalid transition from '${current}' to '${target}'`);
        }
      }

      // If counter offered, validate counter price
      if (['countered', 'counter_offered'].includes(target) && farmer_counter_price != null) {
        if (Number(farmer_counter_price) <= 0) {
          throw AppError.badRequest('farmer_counter_price must be greater than zero');
        }
      }

      const now = new Date().toISOString();

      Database.run(
        `UPDATE wholesale_quotations SET
          status = ?,
          farmer_counter_price = COALESCE(?, farmer_counter_price),
          notes = COALESCE(?, notes),
          updated_at = ?
         WHERE id = ?`,
        [target, farmer_counter_price ?? null, notes ?? null, now, id]
      );

      const updated = Database.get('SELECT * FROM wholesale_quotations WHERE id = ?', [id]);
      res.json({ success: true, message: `Quotation updated to ${target}`, data: updated });
    } catch (err) {
      next(err);
    }
  }

  // --- GROUP BUYING ---
  // GET /api/v1/advanced/group-buys
  static getGroupBuys(req: Request, res: Response, next: NextFunction) {
    try {
      const groupBuys = Database.query(`
        SELECT gb.*, p.name as product_name, p.image as product_image, fp.farm_name
        FROM group_buys gb
        JOIN products p ON gb.product_id = p.id
        JOIN farmer_profiles fp ON gb.farmer_id = fp.id
        WHERE gb.status = 'active'
        ORDER BY gb.created_at DESC
      `);

      res.json({ success: true, count: groupBuys.length, data: groupBuys });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/v1/advanced/group-buys/my
  static getMyGroupBuys(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const myDeals = Database.query(`
        SELECT gb.*, p.name as product_name, p.image as product_image, fp.farm_name,
               gbp.quantity as user_committed_quantity, gbp.subtotal as user_committed_subtotal
        FROM group_buys gb
        JOIN products p ON gb.product_id = p.id
        JOIN farmer_profiles fp ON gb.farmer_id = fp.id
        JOIN group_buy_participants gbp ON gb.id = gbp.group_buy_id
        WHERE gbp.user_id = ? OR gb.creator_id = ?
        ORDER BY gb.created_at DESC
      `, [userId, userId]);

      res.json({ success: true, count: myDeals.length, data: myDeals });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/v1/advanced/group-buys (Open a new group buy pool)
  static createGroupBuy(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { product_id, title, target_quantity, discounted_price, group_price, min_buyers_count, duration_hours } = req.body;
      const effectiveDiscPrice = discounted_price ?? group_price;

      if (!product_id || !title || !target_quantity || !effectiveDiscPrice) {
        throw AppError.badRequest('product_id, title, target_quantity, and discounted_price are required');
      }

      const product = Database.get<any>('SELECT * FROM products WHERE id = ?', [product_id]);
      if (!product) throw AppError.notFound('Product not found');

      const targetQty = Number(target_quantity);
      const discPrice = Number(effectiveDiscPrice);

      if (isNaN(targetQty) || targetQty <= 0 || isNaN(discPrice) || discPrice <= 0) {
        throw AppError.badRequest('Target quantity and discounted price must be numbers greater than zero');
      }

      const retailPrice = product.price;
      const discountPercent = Math.max(0, Math.round(((retailPrice - discPrice) / retailPrice) * 100));

      const id = 'gb-' + Date.now();
      const now = new Date();
      const hours = Number(duration_hours || 48);
      const deadline = new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();

      Database.run(
        `INSERT INTO group_buys (
          id, creator_id, product_id, farmer_id, title, target_quantity, current_quantity,
          unit, retail_price, discounted_price, discount_percent, min_buyers_count,
          current_buyers_count, deadline, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, 0, ?, 'active', ?)`,
        [
          id, userId, product_id, product.farmer_id, title, targetQty,
          product.unit || 'kg', retailPrice, discPrice, discountPercent,
          Number(min_buyers_count || 3), deadline, now.toISOString()
        ]
      );

      const created = Database.get('SELECT * FROM group_buys WHERE id = ?', [id]);
      res.status(201).json({ success: true, message: 'Community group buy pool opened', data: created });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/v1/advanced/group-buys/:id/join
  static joinGroupBuy(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;
      const { quantity } = req.body;

      if (!quantity || Number(quantity) <= 0) {
        throw AppError.badRequest('Valid quantity greater than zero is required');
      }

      const gb = Database.get<any>("SELECT * FROM group_buys WHERE id = ?", [id]);
      if (!gb) throw AppError.notFound('Group buy pool not found');

      if (gb.status !== 'active') {
        throw AppError.badRequest(`Cannot join group buy with status '${gb.status}'`);
      }

      // Check deadline
      if (new Date(gb.deadline).getTime() < Date.now()) {
        Database.run("UPDATE group_buys SET status = 'expired' WHERE id = ?", [id]);
        throw AppError.badRequest('This group buy pool has expired');
      }

      const qty = Number(quantity);
      const remainingCapacity = gb.target_quantity - gb.current_quantity;

      if (remainingCapacity <= 0) {
        throw AppError.badRequest('This group buy pool has already reached its target capacity');
      }

      if (qty > remainingCapacity) {
        throw AppError.badRequest(`Requested quantity (${qty} ${gb.unit}) exceeds remaining capacity (${remainingCapacity} ${gb.unit})`);
      }

      const subtotal = qty * gb.discounted_price;
      const now = new Date().toISOString();

      Database.transaction(() => {
        // Record participant
        const partId = 'gbp-' + Date.now();
        Database.run(
          `INSERT INTO group_buy_participants (id, group_buy_id, user_id, quantity, subtotal, created_at)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(group_buy_id, user_id) DO UPDATE SET 
             quantity = quantity + excluded.quantity,
             subtotal = subtotal + excluded.subtotal`,
          [partId, id, userId, qty, subtotal, now]
        );

        // Update group buy progress & complete if target met
        const newTotalQty = gb.current_quantity + qty;
        const newStatus = newTotalQty >= gb.target_quantity ? 'completed' : 'active';

        Database.run(
          `UPDATE group_buys SET
            current_quantity = current_quantity + ?,
            current_buyers_count = (SELECT COUNT(DISTINCT user_id) FROM group_buy_participants WHERE group_buy_id = ?),
            status = ?
           WHERE id = ?`,
          [qty, id, newStatus, id]
        );
      });

      const updated = Database.get('SELECT * FROM group_buys WHERE id = ?', [id]);
      res.json({ success: true, message: 'Successfully joined community group buy pool!', data: updated });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/v1/advanced/group-buys/:id/leave
  static leaveGroupBuy(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;

      const gb = Database.get<any>('SELECT * FROM group_buys WHERE id = ?', [id]);
      if (!gb) throw AppError.notFound('Group buy pool not found');
      if (gb.status === 'completed') {
        throw AppError.badRequest('Cannot leave a completed group buy pool');
      }
      if (gb.status !== 'active') {
        throw AppError.badRequest('Cannot leave an inactive group buy pool');
      }

      const participant = Database.get<any>('SELECT * FROM group_buy_participants WHERE group_buy_id = ? AND user_id = ?', [id, userId]);
      if (!participant) throw AppError.notFound('You have not joined this group buy pool');

      Database.transaction(() => {
        Database.run('DELETE FROM group_buy_participants WHERE group_buy_id = ? AND user_id = ?', [id, userId]);
        Database.run(
          `UPDATE group_buys SET
            current_quantity = MAX(0, current_quantity - ?),
            current_buyers_count = (SELECT COUNT(DISTINCT user_id) FROM group_buy_participants WHERE group_buy_id = ?)
           WHERE id = ?`,
          [participant.quantity, id, id]
        );
      });

      res.json({ success: true, message: 'Successfully left group buy pool' });
    } catch (err) {
      next(err);
    }
  }

  // --- SCHEDULED PROCUREMENTS & PRODUCE SUBSCRIPTIONS ---
  // GET /api/v1/advanced/procurements
  static getProcurements(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const procurements = Database.query(`
        SELECT sp.*, p.name as product_name, p.price as unit_price, p.image as product_image, fp.farm_name
        FROM scheduled_procurements sp
        JOIN products p ON sp.product_id = p.id
        JOIN farmer_profiles fp ON sp.farmer_id = fp.id
        WHERE sp.user_id = ?
        ORDER BY sp.created_at DESC
      `, [userId]);

      res.json({ success: true, count: procurements.length, data: procurements });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/v1/advanced/procurements
  static createProcurement(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { product_id, quantity, unit, frequency, delivery_time_slot, delivery_address } = req.body;

      if (!product_id || !quantity || !frequency || !delivery_address) {
        throw AppError.badRequest('product_id, quantity, frequency, and delivery_address are required');
      }

      const product = Database.get<any>('SELECT * FROM products WHERE id = ?', [product_id]);
      if (!product) throw AppError.notFound('Product not found');

      const id = 'sp-' + Date.now();
      const now = new Date().toISOString();
      const nextDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      Database.run(
        `INSERT INTO scheduled_procurements (
          id, user_id, product_id, farmer_id, quantity, unit,
          frequency, delivery_time_slot, delivery_address, next_delivery_date, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
        [
          id, userId, product_id, product.farmer_id, Number(quantity),
          unit || product.unit || 'kg', frequency, delivery_time_slot || 'Morning (06:00 - 08:30 AM)',
          delivery_address, nextDate, now, now
        ]
      );

      const created = Database.get('SELECT * FROM scheduled_procurements WHERE id = ?', [id]);
      res.status(201).json({ success: true, message: 'Recurring farm delivery scheduled', data: created });
    } catch (err) {
      next(err);
    }
  }

  // PUT /api/v1/advanced/procurements/:id (Edit scheduled parameters)
  static updateProcurement(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;
      const role = (req as any).user.role;

      const procurement = Database.get<any>('SELECT * FROM scheduled_procurements WHERE id = ?', [id]);
      if (!procurement) throw AppError.notFound('Procurement schedule not found');
      if (procurement.user_id !== userId && role !== 'admin') {
        throw AppError.forbidden('Unauthorized access to procurement schedule');
      }

      const { quantity, delivery_time_slot, delivery_address, frequency } = req.body;
      let normalizedFreq = frequency ? String(frequency).toLowerCase().replace('-', '') : null;
      if (normalizedFreq && !['daily', 'alternate_days', 'weekly', 'biweekly', 'monthly'].includes(normalizedFreq)) {
        throw AppError.badRequest("Invalid delivery frequency. Allowed: 'daily', 'alternate_days', 'weekly', 'biweekly', 'monthly'");
      }
      const now = new Date().toISOString();

      Database.run(
        `UPDATE scheduled_procurements SET
          quantity = COALESCE(?, quantity),
          delivery_time_slot = COALESCE(?, delivery_time_slot),
          delivery_address = COALESCE(?, delivery_address),
          frequency = COALESCE(?, frequency),
          updated_at = ?
         WHERE id = ?`,
        [quantity ? Number(quantity) : null, delivery_time_slot ?? null, delivery_address ?? null, normalizedFreq ?? null, now, id]
      );

      const updated = Database.get('SELECT * FROM scheduled_procurements WHERE id = ?', [id]);
      res.json({ success: true, message: 'Procurement schedule updated', data: updated });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/v1/advanced/procurements/:id/status (Pause / Resume / Cancel)
  static updateProcurementStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;
      const role = (req as any).user.role;

      const procurement = Database.get<any>('SELECT * FROM scheduled_procurements WHERE id = ?', [id]);
      if (!procurement) throw AppError.notFound('Procurement schedule not found');
      if (procurement.user_id !== userId && role !== 'admin') {
        throw AppError.forbidden('Unauthorized access to procurement schedule');
      }

      const { status } = req.body;
      const now = new Date().toISOString();

      Database.run(
        'UPDATE scheduled_procurements SET status = ?, updated_at = ? WHERE id = ?',
        [status, now, id]
      );

      res.json({ success: true, message: `Scheduled procurement marked as ${status}` });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/v1/advanced/procurements/:id/skip (Skip next delivery)
  static skipNextDelivery(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;
      const role = (req as any).user.role;

      const procurement = Database.get<any>('SELECT * FROM scheduled_procurements WHERE id = ?', [id]);
      if (!procurement) throw AppError.notFound('Procurement schedule not found');
      if (procurement.user_id !== userId && role !== 'admin') {
        throw AppError.forbidden('Unauthorized access to procurement schedule');
      }

      const currentDate = new Date(procurement.next_delivery_date || Date.now());
      const daysToAdd = procurement.frequency === 'daily' ? 1 
        : procurement.frequency === 'alternate_days' ? 2 
        : procurement.frequency === 'weekly' ? 7 
        : procurement.frequency === 'biweekly' ? 14 
        : 30;

      currentDate.setDate(currentDate.getDate() + daysToAdd);
      const newNextDate = currentDate.toISOString().split('T')[0];
      const now = new Date().toISOString();

      Database.run(
        'UPDATE scheduled_procurements SET next_delivery_date = ?, updated_at = ? WHERE id = ?',
        [newNextDate, now, id]
      );

      res.json({
        success: true,
        message: `Next delivery skipped. Rescheduled to ${newNextDate}`,
        data: {
          id,
          next_delivery_date: newNextDate,
        },
        nextDeliveryDate: newNextDate
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/v1/advanced/procurements/:id/execute (Trigger order for scheduled delivery)
  static executeProcurement(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const procurement = Database.get<any>('SELECT * FROM scheduled_procurements WHERE id = ?', [id]);
      if (!procurement) throw AppError.notFound('Procurement schedule not found');
      if (procurement.status !== 'active') throw AppError.badRequest('Cannot execute a paused or cancelled schedule');

      const today = new Date().toISOString().split('T')[0];
      if (procurement.last_executed_at && procurement.last_executed_at.startsWith(today)) {
        return res.json({
          success: true,
          message: 'Already executed for today',
          data: { order_id: null },
          order_id: null
        });
      }

      const product = Database.get<any>('SELECT * FROM products WHERE id = ?', [procurement.product_id]);
      if (!product || product.available_quantity < procurement.quantity) {
        throw AppError.badRequest('Product currently out of stock for scheduled dispatch');
      }

      // Fetch authentic customer details
      const customer = Database.get<any>('SELECT name, phone FROM users WHERE id = ?', [procurement.user_id]) || {
        name: 'Subscribed Customer',
        phone: '+91 9800000000'
      };

      // Fetch authentic farmer details
      const farmer = Database.get<any>(`
        SELECT fp.farm_name, u.name as farmer_name, u.phone as farmer_phone
        FROM farmer_profiles fp
        JOIN users u ON fp.user_id = u.id
        WHERE fp.id = ?
      `, [procurement.farmer_id]) || {
        farm_name: 'Farm Direct',
        farmer_name: 'Kisan Direct',
        farmer_phone: '+91 9800000000'
      };

      const orderId = 'order-' + Date.now();
      const orderNum = `#HD-SCH-${Math.floor(10000 + Math.random() * 90000)}`;
      const now = new Date().toISOString();
      const total = Number((product.price * procurement.quantity).toFixed(2));

      Database.transaction(() => {
        Database.run(
          `INSERT INTO orders (
            id, order_number, customer_id, farmer_id, total_amount, subtotal,
            delivery_fee, farmer_tip, delivery_address, customer_phone, customer_name,
            farmer_name, farm_name, farmer_phone, payment_method, payment_status,
            order_status, delivery_mode, notes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, 'cod', 'pending', 'placed', 'farmer_direct', 'Automated recurring farm subscription execution', ?, ?)`,
          [
            orderId,
            orderNum,
            procurement.user_id,
            procurement.farmer_id,
            total,
            total,
            procurement.delivery_address,
            customer.phone || '+91 9800000000',
            customer.name || 'Subscribed Customer',
            farmer.farmer_name || 'Kisan Direct',
            farmer.farm_name || 'Farm Direct',
            farmer.farmer_phone || '+91 9800000000',
            now,
            now
          ]
        );

        // Advance next date accurately based on frequency
        const nextD = new Date();
        const days = procurement.frequency === 'daily' ? 1 
          : procurement.frequency === 'alternate_days' ? 2 
          : procurement.frequency === 'weekly' ? 7 
          : procurement.frequency === 'biweekly' ? 14 
          : 30;
        nextD.setDate(nextD.getDate() + days);

        Database.run(
          'UPDATE scheduled_procurements SET last_executed_at = ?, next_delivery_date = ?, updated_at = ? WHERE id = ?',
          [now, nextD.toISOString().split('T')[0], now, id]
        );
      });

      res.json({
        success: true,
        message: 'Scheduled delivery executed and order placed successfully',
        data: {
          order_id: orderId,
          order_number: orderNum,
        },
        order_id: orderId,
        order_number: orderNum
      });
    } catch (err) {
      next(err);
    }
  }

  // --- FARMER SUBSCRIPTION PLANS ---
  // GET /api/v1/advanced/subscriptions/:farmerId
  static getSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const { farmerId } = req.params;
      const sub = Database.get<any>(
        "SELECT * FROM farmer_subscriptions WHERE farmer_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1",
        [farmerId]
      );

      const plans = [
        { id: 'free', name: 'Free Kisan', priceMonthly: 0, maxListings: 10, features: ['10 Active Produce Listings', 'Local Consumer Chat', 'Standard Mandi Bhav'] },
        { id: 'kisan_mitra', name: 'Kisan Mitra (Basic)', priceMonthly: 199, maxListings: 25, features: ['25 Active Listings', 'SMS & WhatsApp Order Alerts', 'Direct Wholesale B2B', 'Zero Commission Boost'] },
        { id: 'samridhi', name: 'Samridhi (Professional)', priceMonthly: 499, maxListings: 100, features: ['100 Active Listings', 'Cold Storage Logistics Booking', 'Custom Farm Storefront', 'Dedicated Account Manager'] },
        { id: 'fpo_enterprise', name: 'FPO / Cooperative Pro', priceMonthly: 1499, maxListings: 500, features: ['500 Active Listings', 'Multi-Farmer Aggregation', 'Direct Institution B2B Contracts', 'Export Quality Labeling'] }
      ];

      res.json({
        success: true,
        data: {
          currentSubscription: sub || { plan_tier: 'free', status: 'active', auto_renew: 1 },
          availablePlans: plans
        }
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/v1/advanced/subscriptions
  static upgradeSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const { farmer_id, plan_tier } = req.body;
      if (!farmer_id || !plan_tier) {
        throw AppError.badRequest('farmer_id and plan_tier are required');
      }

      const id = 'sub-' + Date.now();
      const now = new Date();
      const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      Database.transaction(() => {
        Database.run("UPDATE farmer_subscriptions SET status = 'cancelled' WHERE farmer_id = ?", [farmer_id]);
        Database.run(
          `INSERT INTO farmer_subscriptions (
            id, farmer_id, plan_tier, billing_cycle, start_date, next_billing_date, auto_renew, status, created_at, updated_at
          ) VALUES (?, ?, ?, 'monthly', ?, ?, 1, 'active', ?, ?)`,
          [id, farmer_id, plan_tier, now.toISOString().split('T')[0], nextMonth, now.toISOString(), now.toISOString()]
        );
      });

      const updated = Database.get('SELECT * FROM farmer_subscriptions WHERE id = ?', [id]);
      res.json({ success: true, message: `Upgraded to ${plan_tier} plan!`, data: updated });
    } catch (err) {
      next(err);
    }
  }
}
