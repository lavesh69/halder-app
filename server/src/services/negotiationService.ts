import { Database } from '../db/database';
import { AppError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';
import { sanitizeText } from '../utils/sanitize';

export interface PriceSlab {
  id: string;
  productId: string;
  minQuantity: number;
  maxQuantity?: number;
  pricePerUnit: number;
}

export interface NegotiationMessageItem {
  id: string;
  negotiationId: string;
  senderId: string;
  senderName: string;
  senderRole: 'buyer' | 'farmer';
  action: 'offer' | 'counter' | 'accept' | 'reject' | 'withdraw';
  proposedPrice: number;
  quantity: number;
  message: string;
  createdAt: string;
}

export interface NegotiationThread {
  id: string;
  dealReferenceId: string;
  productId: string;
  productName: string;
  productImage: string;
  originalAskingPrice: number;
  currentPrice: number;
  quantity: number;
  unit: string;
  buyerId: string;
  buyerName: string;
  buyerPhone: string;
  farmerId: string;
  farmerName: string;
  farmName: string;
  farmerPhone: string;
  farmerAvatar: string;
  requiredDate?: string;
  deliveryPreference: string;
  status: 'pending' | 'countered' | 'accepted' | 'rejected' | 'withdrawn' | 'expired';
  finalAgreedPrice?: number;
  finalTotalValue?: number;
  agreedAt?: string;
  dealSummary?: any;
  messages: NegotiationMessageItem[];
  createdAt: string;
  updatedAt: string;
}

export class NegotiationService {
  private static generateDealReferenceId(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `DEAL-${code}`;
  }

  // --- Price Slabs Management ---
  static setPriceSlabs(productId: string, slabs: Array<{ minQuantity: number; maxQuantity?: number; pricePerUnit: number }>) {
    Database.transaction(() => {
      Database.run('DELETE FROM product_price_slabs WHERE product_id = ?', [productId]);
      for (const slab of slabs) {
        if (slab.minQuantity <= 0 || slab.pricePerUnit <= 0) continue;
        Database.run(
          'INSERT INTO product_price_slabs (id, product_id, min_quantity, max_quantity, price_per_unit, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          [
            `slab-${uuidv4()}`,
            productId,
            slab.minQuantity,
            slab.maxQuantity !== undefined ? slab.maxQuantity : null,
            slab.pricePerUnit,
            new Date().toISOString(),
          ]
        );
      }
    });
  }

  static getPriceSlabs(productId: string): PriceSlab[] {
    const rows = Database.query<any>(
      'SELECT * FROM product_price_slabs WHERE product_id = ? ORDER BY min_quantity ASC',
      [productId]
    );
    return rows.map((r) => ({
      id: r.id,
      productId: r.product_id,
      minQuantity: Number(r.min_quantity),
      maxQuantity: r.max_quantity ? Number(r.max_quantity) : undefined,
      pricePerUnit: Number(r.price_per_unit),
    }));
  }

  // --- Negotiation & Offer Workflow ---
  static createOffer(buyerId: string, data: {
    productId: string;
    proposedPrice: number;
    quantity: number;
    requiredDate?: string;
    deliveryPreference?: string;
    message?: string;
  }): NegotiationThread {
    const product = Database.get<any>(
      `SELECT p.*, f.id as farmer_profile_id, f.user_id as farmer_user_id, f.farm_name, u.name as farmer_name
       FROM products p
       JOIN farmer_profiles f ON p.farmer_id = f.id
       JOIN users u ON f.user_id = u.id
       WHERE p.id = ?`,
      [data.productId]
    );

    if (!product) throw AppError.notFound('Product listing not found');
    if (product.farmer_user_id === buyerId) {
      throw AppError.badRequest('You cannot submit an offer on your own listing.');
    }
    if (data.proposedPrice <= 0) {
      throw AppError.badRequest('Proposed price must be greater than zero.');
    }
    if (data.quantity <= 0) {
      throw AppError.badRequest('Quantity must be greater than zero.');
    }
    if (data.quantity > product.available_quantity) {
      throw AppError.badRequest(`Requested quantity exceeds available stock (${product.available_quantity} ${product.unit}).`);
    }

    const threadId = `neg-${uuidv4()}`;
    const dealRef = this.generateDealReferenceId();
    const now = new Date().toISOString();

    Database.transaction(() => {
      // Create negotiation thread
      Database.run(
        `INSERT INTO negotiation_threads (
          id, deal_reference_id, product_id, buyer_id, farmer_id,
          original_asking_price, current_price, quantity, unit,
          required_date, delivery_preference, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
        [
          threadId,
          dealRef,
          data.productId,
          buyerId,
          product.farmer_profile_id,
          product.price,
          data.proposedPrice,
          data.quantity,
          product.unit,
          data.requiredDate || null,
          data.deliveryPreference || 'pickup',
          now,
          now,
        ]
      );

      // Create initial message
      Database.run(
        `INSERT INTO negotiation_messages (
          id, negotiation_id, sender_id, sender_role, action,
          proposed_price, quantity, message, created_at
        ) VALUES (?, ?, ?, 'buyer', 'offer', ?, ?, ?, ?)`,
        [
          `msg-${uuidv4()}`,
          threadId,
          buyerId,
          data.proposedPrice,
          data.quantity,
          sanitizeText(data.message || `I would like to offer ₹${data.proposedPrice}/${product.unit} for ${data.quantity} ${product.unit}.`),
          now,
        ]
      );

      // Notify farmer
      const buyer = Database.get<any>('SELECT name FROM users WHERE id = ?', [buyerId]);
      Database.run(
        `INSERT INTO notifications (
          id, user_id, recipient_role, type, title, message, is_read, created_at
        ) VALUES (?, ?, 'farmer', 'offer', ?, ?, 0, ?)`,
        [
          `notif-${uuidv4().slice(0, 8)}`,
          product.farmer_user_id,
          `New Price Offer: ${dealRef}`,
          `Buyer ${buyer?.name || 'Customer'} offered ₹${data.proposedPrice}/${product.unit} for ${data.quantity} ${product.unit} of "${product.name}".`,
          now,
        ]
      );
    });

    return this.getNegotiationById(threadId, buyerId);
  }

  static getNegotiationById(id: string, currentUserId: string): NegotiationThread {
    const row = Database.get<any>(
      `SELECT n.*, p.name as product_name, p.image as product_image,
              bu.name as buyer_name, bu.phone as buyer_phone,
              fu.name as farmer_name, fu.phone as farmer_phone,
              f.farm_name, f.avatar as farmer_avatar, f.user_id as farmer_user_id
       FROM negotiation_threads n
       JOIN products p ON n.product_id = p.id
       JOIN users bu ON n.buyer_id = bu.id
       JOIN farmer_profiles f ON n.farmer_id = f.id
       JOIN users fu ON f.user_id = fu.id
       WHERE n.id = ?`,
      [id]
    );

    if (!row) throw AppError.notFound('Negotiation not found');

    if (row.buyer_id !== currentUserId && row.farmer_user_id !== currentUserId) {
      throw AppError.forbidden('Unauthorized access to negotiation');
    }

    const messages = Database.query<any>(
      `SELECT m.*, u.name as sender_name
       FROM negotiation_messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.negotiation_id = ?
       ORDER BY m.created_at ASC`,
      [id]
    );

    return {
      id: row.id,
      dealReferenceId: row.deal_reference_id,
      productId: row.product_id,
      productName: row.product_name,
      productImage: row.product_image,
      originalAskingPrice: Number(row.original_asking_price),
      currentPrice: Number(row.current_price),
      quantity: Number(row.quantity),
      unit: row.unit,
      buyerId: row.buyer_id,
      buyerName: row.buyer_name,
      buyerPhone: row.buyer_phone,
      farmerId: row.farmer_id,
      farmerName: row.farmer_name,
      farmName: row.farm_name,
      farmerPhone: row.farmer_phone,
      farmerAvatar: row.farmer_avatar || 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=200',
      requiredDate: row.required_date,
      deliveryPreference: row.delivery_preference,
      status: row.status,
      finalAgreedPrice: row.final_agreed_price ? Number(row.final_agreed_price) : undefined,
      finalTotalValue: row.final_total_value ? Number(row.final_total_value) : undefined,
      agreedAt: row.agreed_at,
      dealSummary: row.deal_summary_json ? JSON.parse(row.deal_summary_json) : undefined,
      messages: messages.map((m) => ({
        id: m.id,
        negotiationId: m.negotiation_id,
        senderId: m.sender_id,
        senderName: m.sender_name,
        senderRole: m.sender_role,
        action: m.action,
        proposedPrice: Number(m.proposed_price),
        quantity: Number(m.quantity),
        message: m.message,
        createdAt: m.created_at,
      })),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  static listUserNegotiations(userId: string): NegotiationThread[] {
    const farmer = Database.get<any>('SELECT id FROM farmer_profiles WHERE user_id = ?', [userId]);
    const farmerId = farmer?.id;

    let sql = `
      SELECT n.*, p.name as product_name, p.image as product_image,
             bu.name as buyer_name, bu.phone as buyer_phone,
             fu.name as farmer_name, fu.phone as farmer_phone,
             f.farm_name, f.avatar as farmer_avatar, f.user_id as farmer_user_id
      FROM negotiation_threads n
      JOIN products p ON n.product_id = p.id
      JOIN users bu ON n.buyer_id = bu.id
      JOIN farmer_profiles f ON n.farmer_id = f.id
      JOIN users fu ON f.user_id = fu.id
      WHERE n.buyer_id = ?
    `;
    const params: any[] = [userId];

    if (farmerId) {
      sql += ' OR n.farmer_id = ?';
      params.push(farmerId);
    }

    sql += ' ORDER BY n.updated_at DESC';

    const rows = Database.query<any>(sql, params);

    return rows.map((row) => ({
      id: row.id,
      dealReferenceId: row.deal_reference_id,
      productId: row.product_id,
      productName: row.product_name,
      productImage: row.product_image,
      originalAskingPrice: Number(row.original_asking_price),
      currentPrice: Number(row.current_price),
      quantity: Number(row.quantity),
      unit: row.unit,
      buyerId: row.buyer_id,
      buyerName: row.buyer_name,
      buyerPhone: row.buyer_phone,
      farmerId: row.farmer_id,
      farmerName: row.farmer_name,
      farmName: row.farm_name,
      farmerPhone: row.farmer_phone,
      farmerAvatar: row.farmer_avatar || 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=200',
      requiredDate: row.required_date,
      deliveryPreference: row.delivery_preference,
      status: row.status,
      finalAgreedPrice: row.final_agreed_price ? Number(row.final_agreed_price) : undefined,
      finalTotalValue: row.final_total_value ? Number(row.final_total_value) : undefined,
      agreedAt: row.agreed_at,
      dealSummary: row.deal_summary_json ? JSON.parse(row.deal_summary_json) : undefined,
      messages: [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  static counterOffer(negotiationId: string, senderUserId: string, data: {
    proposedPrice: number;
    quantity?: number;
    message?: string;
  }): NegotiationThread {
    const thread = Database.get<any>(
      `SELECT n.*, f.user_id as farmer_user_id
       FROM negotiation_threads n
       JOIN farmer_profiles f ON n.farmer_id = f.id
       WHERE n.id = ?`,
      [negotiationId]
    );

    if (!thread) throw AppError.notFound('Negotiation not found');
    if (thread.status === 'accepted' || thread.status === 'rejected' || thread.status === 'withdrawn') {
      throw AppError.badRequest(`This negotiation is already ${thread.status}.`);
    }

    const isBuyer = thread.buyer_id === senderUserId;
    const isFarmer = thread.farmer_user_id === senderUserId;

    if (!isBuyer && !isFarmer) {
      throw AppError.forbidden('Unauthorized access to negotiation');
    }

    if (data.proposedPrice <= 0) {
      throw AppError.badRequest('Proposed price must be greater than zero.');
    }

    const senderRole = isBuyer ? 'buyer' : 'farmer';
    const recipientUserId = isBuyer ? thread.farmer_user_id : thread.buyer_id;
    const now = new Date().toISOString();
    const newQty = data.quantity || thread.quantity;

    Database.transaction(() => {
      Database.run(
        `UPDATE negotiation_threads SET
          current_price = ?, quantity = ?, status = 'countered', updated_at = ?
         WHERE id = ?`,
        [data.proposedPrice, newQty, now, negotiationId]
      );

      Database.run(
        `INSERT INTO negotiation_messages (
          id, negotiation_id, sender_id, sender_role, action,
          proposed_price, quantity, message, created_at
        ) VALUES (?, ?, ?, ?, 'counter', ?, ?, ?, ?)`,
        [
          `msg-${uuidv4()}`,
          negotiationId,
          senderUserId,
          senderRole,
          data.proposedPrice,
          newQty,
          sanitizeText(data.message || `Counter-offer: ₹${data.proposedPrice}/${thread.unit}`),
          now,
        ]
      );

      // Notification
      const sender = Database.get<any>('SELECT name FROM users WHERE id = ?', [senderUserId]);
      Database.run(
        `INSERT INTO notifications (
          id, user_id, recipient_role, type, title, message, is_read, created_at
        ) VALUES (?, ?, ?, 'offer', ?, ?, 0, ?)`,
        [
          `notif-${uuidv4().slice(0, 8)}`,
          recipientUserId,
          isBuyer ? 'farmer' : 'customer',
          `Counter-Offer: ${thread.deal_reference_id}`,
          `${sender?.name || 'Party'} sent a counter-offer of ₹${data.proposedPrice}/${thread.unit}.`,
          now,
        ]
      );
    });

    return this.getNegotiationById(negotiationId, senderUserId);
  }

  static acceptOffer(negotiationId: string, currentUserId: string): NegotiationThread {
    const thread = Database.get<any>(
      `SELECT n.*, f.user_id as farmer_user_id, p.name as product_name, p.available_quantity,
              p.location, p.city, f.farm_name, bu.name as buyer_name, bu.phone as buyer_phone,
              fu.name as farmer_name, fu.phone as farmer_phone
       FROM negotiation_threads n
       JOIN farmer_profiles f ON n.farmer_id = f.id
       JOIN products p ON n.product_id = p.id
       JOIN users bu ON n.buyer_id = bu.id
       JOIN users fu ON f.user_id = fu.id
       WHERE n.id = ?`,
      [negotiationId]
    );

    if (!thread) throw AppError.notFound('Negotiation not found');
    if (thread.status === 'accepted') {
      throw AppError.badRequest('This offer has already been accepted.');
    }
    if (thread.status === 'rejected' || thread.status === 'withdrawn') {
      throw AppError.badRequest(`Cannot accept an offer that was ${thread.status}.`);
    }

    const isBuyer = thread.buyer_id === currentUserId;
    const isFarmer = thread.farmer_user_id === currentUserId;

    if (!isBuyer && !isFarmer) {
      throw AppError.forbidden('Unauthorized access to negotiation');
    }

    // Safety: Verify product has enough stock
    if (thread.available_quantity < thread.quantity) {
      throw AppError.badRequest(`Insufficient available stock (${thread.available_quantity} ${thread.unit} remaining).`);
    }

    const now = new Date().toISOString();
    const finalPrice = thread.current_price;
    const finalTotal = Math.round(finalPrice * thread.quantity * 100) / 100;
    const recipientUserId = isBuyer ? thread.farmer_user_id : thread.buyer_id;
    const senderRole = isBuyer ? 'buyer' : 'farmer';

    const dealSummary = {
      dealReferenceId: thread.deal_reference_id,
      productId: thread.product_id,
      productName: thread.product_name,
      farmer: {
        name: thread.farmer_name,
        farmName: thread.farm_name,
        phone: thread.farmer_phone,
        location: thread.location,
        city: thread.city,
      },
      buyer: {
        name: thread.buyer_name,
        phone: thread.buyer_phone,
      },
      quantity: thread.quantity,
      unit: thread.unit,
      agreedUnitPrice: finalPrice,
      estimatedTotalValue: finalTotal,
      deliveryArrangement: thread.delivery_preference,
      agreedAt: now,
      note: 'Direct farm transaction agreed by both parties. Payment and pickup/delivery to be handled independently as negotiated.',
    };

    Database.transaction(() => {
      Database.run(
        `UPDATE negotiation_threads SET
          status = 'accepted', final_agreed_price = ?, final_total_value = ?,
          agreed_at = ?, deal_summary_json = ?, updated_at = ?
         WHERE id = ?`,
        [finalPrice, finalTotal, now, JSON.stringify(dealSummary), now, negotiationId]
      );

      Database.run(
        `INSERT INTO negotiation_messages (
          id, negotiation_id, sender_id, sender_role, action,
          proposed_price, quantity, message, created_at
        ) VALUES (?, ?, ?, ?, 'accept', ?, ?, 'Terms accepted! Deal finalized.', ?)`,
        [
          `msg-${uuidv4()}`,
          negotiationId,
          currentUserId,
          senderRole,
          finalPrice,
          thread.quantity,
          now,
        ]
      );

      // Notification
      Database.run(
        `INSERT INTO notifications (
          id, user_id, recipient_role, type, title, message, is_read, created_at
        ) VALUES (?, ?, ?, 'offer', ?, ?, 0, ?)`,
        [
          `notif-${uuidv4().slice(0, 8)}`,
          recipientUserId,
          isBuyer ? 'farmer' : 'customer',
          `Deal Agreed: ${thread.deal_reference_id}! 🤝`,
          `Offer accepted for ${thread.quantity} ${thread.unit} of "${thread.product_name}" at ₹${finalPrice}/${thread.unit}. View Deal Summary.`,
          now,
        ]
      );
    });

    return this.getNegotiationById(negotiationId, currentUserId);
  }

  static rejectOffer(negotiationId: string, currentUserId: string): NegotiationThread {
    const thread = Database.get<any>(
      `SELECT n.*, f.user_id as farmer_user_id
       FROM negotiation_threads n
       JOIN farmer_profiles f ON n.farmer_id = f.id
       WHERE n.id = ?`,
      [negotiationId]
    );

    if (!thread) throw AppError.notFound('Negotiation not found');

    const isBuyer = thread.buyer_id === currentUserId;
    const isFarmer = thread.farmer_user_id === currentUserId;
    if (!isBuyer && !isFarmer) throw AppError.forbidden('Unauthorized');

    const now = new Date().toISOString();
    const senderRole = isBuyer ? 'buyer' : 'farmer';

    Database.transaction(() => {
      Database.run("UPDATE negotiation_threads SET status = 'rejected', updated_at = ? WHERE id = ?", [now, negotiationId]);
      Database.run(
        `INSERT INTO negotiation_messages (
          id, negotiation_id, sender_id, sender_role, action, proposed_price, quantity, message, created_at
        ) VALUES (?, ?, ?, ?, 'reject', ?, ?, 'Offer was declined.', ?)`,
        [`msg-${uuidv4()}`, negotiationId, currentUserId, senderRole, thread.current_price, thread.quantity, now]
      );
    });

    return this.getNegotiationById(negotiationId, currentUserId);
  }

  static withdrawOffer(negotiationId: string, currentUserId: string): NegotiationThread {
    const thread = Database.get<any>(
      `SELECT n.*, f.user_id as farmer_user_id
       FROM negotiation_threads n
       JOIN farmer_profiles f ON n.farmer_id = f.id
       WHERE n.id = ?`,
      [negotiationId]
    );

    if (!thread) throw AppError.notFound('Negotiation not found');
    const isBuyer = thread.buyer_id === currentUserId;
    const isFarmer = thread.farmer_user_id === currentUserId;
    if (!isBuyer && !isFarmer) throw AppError.forbidden('Unauthorized');

    const now = new Date().toISOString();
    const senderRole = isBuyer ? 'buyer' : 'farmer';

    Database.transaction(() => {
      Database.run("UPDATE negotiation_threads SET status = 'withdrawn', updated_at = ? WHERE id = ?", [now, negotiationId]);
      Database.run(
        `INSERT INTO negotiation_messages (
          id, negotiation_id, sender_id, sender_role, action, proposed_price, quantity, message, created_at
        ) VALUES (?, ?, ?, ?, 'withdraw', ?, ?, 'Offer withdrawn.', ?)`,
        [`msg-${uuidv4()}`, negotiationId, currentUserId, senderRole, thread.current_price, thread.quantity, now]
      );
    });

    return this.getNegotiationById(negotiationId, currentUserId);
  }
}
