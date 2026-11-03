import { Database } from '../db/database';
import { AppError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';
import { sanitizeText } from '../utils/sanitize';

export class ReviewService {
  static create(data: {
    orderId: string;
    customerId: string;
    rating: number;
    review: string;
  }) {
    if (data.rating < 1 || data.rating > 5) {
      throw AppError.badRequest('Rating must be between 1 and 5 stars.');
    }

    const order = Database.get<any>('SELECT * FROM orders WHERE id = ?', [data.orderId]);
    if (!order) {
      throw AppError.notFound('Order not found');
    }

    if (order.customer_id !== data.customerId) {
      throw AppError.forbidden('You can only review orders that you have placed.');
    }

    if (order.order_status !== 'delivered') {
      throw AppError.badRequest(
        'You can only review an order after it has been delivered by the farmer.',
        'ORDER_NOT_DELIVERED'
      );
    }

    const existingReview = Database.get<any>('SELECT id FROM reviews WHERE order_id = ?', [data.orderId]);
    if (existingReview) {
      throw AppError.conflict('You have already submitted a review for this order.');
    }

    const reviewId = `rev-${uuidv4()}`;
    const now = new Date().toISOString();

    Database.transaction(() => {
      Database.run(
        `INSERT INTO reviews (id, order_id, customer_id, farmer_id, rating, review, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          reviewId,
          data.orderId,
          data.customerId,
          order.farmer_id,
          data.rating,
          sanitizeText(data.review),
          now,
        ]
      );

      const reviews = Database.query<any>('SELECT rating FROM reviews WHERE farmer_id = ?', [order.farmer_id]);
      const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

      Database.run(
        'UPDATE farmer_profiles SET rating = ?, updated_at = ? WHERE id = ?',
        [Number(avg.toFixed(1)), now, order.farmer_id]
      );
    });

    return Database.get<any>('SELECT * FROM reviews WHERE id = ?', [reviewId]);
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
