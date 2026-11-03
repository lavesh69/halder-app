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
          `UPDATE b2b_profiles SET business_name = ?, business_type = ?, gstin = ?, fssai_license = ?, updated_at = ? WHERE user_id = ?`,
          [business_name, business_type, gstin || '', fssai_license || '', now, userId]
        );
      } else {
        const id = 'b2b-' + Date.now();
        Database.run(
          `INSERT INTO b2b_profiles (id, user_id, business_name, business_type, gstin, fssai_license, verified, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
          [id, userId, business_name, business_type, gstin || '', fssai_license || '', now, now]
        );
      }

      const profile = Database.get('SELECT * FROM b2b_profiles WHERE user_id = ?', [userId]);
      res.json({ success: true, message: 'B2B Wholesale profile verified & saved', data: profile });
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
      const { status, farmer_counter_price, notes } = req.body;
      const now = new Date().toISOString();

      Database.run(
        `UPDATE wholesale_quotations SET
          status = COALESCE(?, status),
          farmer_counter_price = COALESCE(?, farmer_counter_price),
          notes = COALESCE(?, notes),
          updated_at = ?
         WHERE id = ?`,
        [status ?? null, farmer_counter_price ?? null, notes ?? null, now, id]
      );

      res.json({ success: true, message: `Quotation updated to ${status}` });
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

  // POST /api/v1/advanced/group-buys/:id/join
  static joinGroupBuy(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;
      const { quantity } = req.body;

      if (!quantity || Number(quantity) <= 0) {
        throw AppError.badRequest('Valid quantity is required');
      }

      const gb = Database.get<any>("SELECT * FROM group_buys WHERE id = ? AND status = 'active'", [id]);
      if (!gb) throw AppError.notFound('Active group buy not found');

      const qty = Number(quantity);
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

        // Update group buy progress
        Database.run(
          `UPDATE group_buys SET
            current_quantity = current_quantity + ?,
            current_buyers_count = (SELECT COUNT(DISTINCT user_id) FROM group_buy_participants WHERE group_buy_id = ?)
           WHERE id = ?`,
          [qty, id, id]
        );
      });

      const updated = Database.get('SELECT * FROM group_buys WHERE id = ?', [id]);
      res.json({ success: true, message: 'Successfully joined community group buy pool!', data: updated });
    } catch (err) {
      next(err);
    }
  }

  // --- SCHEDULED PROCUREMENTS ---
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

  // PATCH /api/v1/advanced/procurements/:id/status
  static updateProcurementStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
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
        { id: 'kisan_samridhi', name: 'Kisan Samridhi (Pro)', priceMonthly: 499, maxListings: 50, features: ['50 Active Listings', 'Top Placement on Customer Feed', 'B2B Wholesale Quotations', 'Dedicated Logistics Priority', 'Custom Farm Branding'] },
        { id: 'fpo_business', name: 'FPO / Cooperative Enterprise', priceMonthly: 999, maxListings: 200, features: ['Unlimited / 200 Listings', 'Multi-farmer aggregate packing', 'Custom Mandi Intelligence reports', 'Direct corporate procurement contracts'] }
      ];

      res.json({
        success: true,
        data: {
          currentSubscription: sub || { plan_id: 'free', plan_name: 'Free Kisan', status: 'active', max_listings: 10 },
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
      const { farmerId, planId } = req.body;
      if (!farmerId || !planId) {
        throw AppError.badRequest('farmerId and planId are required');
      }

      const planMap: Record<string, { name: string; price: number; maxListings: number }> = {
        free: { name: 'Free Kisan', price: 0, maxListings: 10 },
        kisan_mitra: { name: 'Kisan Mitra (Basic)', price: 199, maxListings: 25 },
        kisan_samridhi: { name: 'Kisan Samridhi (Pro)', price: 499, maxListings: 50 },
        fpo_business: { name: 'FPO / Cooperative Enterprise', price: 999, maxListings: 200 }
      };

      const selected = planMap[planId];
      if (!selected) throw AppError.badRequest('Invalid subscription planId');

      const id = 'sub-' + Date.now();
      const now = new Date().toISOString();
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      Database.transaction(() => {
        // Expire previous subscriptions
        Database.run("UPDATE farmer_subscriptions SET status = 'expired' WHERE farmer_id = ?", [farmerId]);

        // Insert new active subscription
        Database.run(
          `INSERT INTO farmer_subscriptions (
            id, farmer_id, plan_id, plan_name, price_monthly, max_listings,
            features_json, status, start_date, end_date, payment_reference, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, '{"active":true}', 'active', ?, ?, ?, ?)`,
          [id, farmerId, planId, selected.name, selected.price, selected.maxListings, now, endDate, 'UPI-SUB-' + Date.now(), now]
        );
      });

      res.status(201).json({
        success: true,
        message: `Plan upgraded to ${selected.name} successfully!`,
        plan: selected
      });
    } catch (err) {
      next(err);
    }
  }
}
