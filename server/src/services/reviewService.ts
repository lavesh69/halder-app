import { Database } from '../db/database';
import { AppError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';
import { sanitizeText } from '../utils/sanitize';

export class ReviewService {
  static create(data: {
    orderId?: string;
    farmerId?: string;
    customerId: string;
    rating: number;
    review: string;
  }) {
    if (data.rating < 1 || data.rating > 5) {
      throw AppError.badRequest('Rating must be between 1 and 5 stars.');
    }

    let farmerId = data.farmerId;
    let orderId = data.orderId || null;

    if (orderId) {
      const order = Database.get<any>('SELECT * FROM orders WHERE id = ?', [orderId]);
      if (order) {
        farmerId = order.farmer_id;
      }
    }

    if (!farmerId) {
      throw AppError.badRequest('Farmer ID or Order ID required to submit review.');
    }

    const reviewId = `rev-${uuidv4()}`;
    const now = new Date().toISOString();

    Database.transaction(() => {
      Database.run(
        `INSERT INTO reviews (id, order_id, customer_id, farmer_id, rating, review, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          reviewId,
          orderId || `direct-deal-${uuidv4().slice(0, 8)}`,
          data.customerId,
          farmerId,
          data.rating,
          sanitizeText(data.review),
          now,
        ]
      );

      const reviews = Database.query<any>('SELECT rating FROM reviews WHERE farmer_id = ?', [farmerId]);
      if (reviews.length > 0) {
        const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        Database.run(
          'UPDATE farmer_profiles SET rating = ?, updated_at = ? WHERE id = ?',
          [Math.round(avg * 10) / 10, now, farmerId]
        );
      }
    });

    return Database.get<any>('SELECT * FROM reviews WHERE id = ?', [reviewId]) || { id: reviewId, rating: data.rating, review: data.review };
  }

  static getForFarmer(farmerId: string) {
    return Database.query<any>(
      `SELECT r.*, u.name as customer_name, u.profile_image as customer_avatar
       FROM reviews r
       JOIN users u ON r.customer_id = u.id
       WHERE r.farmer_id = ?
       ORDER BY r.created_at DESC`,
      [farmerId]
    );
  }
}
