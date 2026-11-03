import { Database } from '../db/database';
import { AppError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';

export class FavoriteService {
  static list(userId: string) {
    return Database.query<any>(
      `SELECT p.*, f.id as favorite_id, f.created_at as favorited_at,
              u.name as farmer_name, fp.farm_name, c.name as category_name
       FROM favorites f
       JOIN products p ON f.product_id = p.id
       JOIN farmer_profiles fp ON p.farmer_id = fp.id
       JOIN users u ON fp.user_id = u.id
       JOIN categories c ON p.category_id = c.id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC`,
      [userId]
    );
  }

  static add(userId: string, productId: string) {
    const product = Database.get<any>('SELECT id FROM products WHERE id = ?', [productId]);
    if (!product) throw AppError.notFound('Product not found');

    const existing = Database.get<any>(
      'SELECT id FROM favorites WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    );
    if (existing) {
      return { id: existing.id, user_id: userId, product_id: productId, message: 'Already in favorites' };
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    Database.run(
      'INSERT INTO favorites (id, user_id, product_id, created_at) VALUES (?, ?, ?, ?)',
      [id, userId, productId, now]
    );

    return { id, user_id: userId, product_id: productId, created_at: now };
  }

  static remove(userId: string, productId: string) {
    Database.run(
      'DELETE FROM favorites WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    );
    return { success: true, removedProductId: productId };
  }

  static check(userId: string, productId: string): boolean {
    const fav = Database.get<any>(
      'SELECT 1 FROM favorites WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    );
    return !!fav;
  }
}
