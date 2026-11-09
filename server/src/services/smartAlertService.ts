import { Database } from '../db/database';
import { AppError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';
import { calculateHaversineDistanceKm } from './productService';

export interface SavedSearch {
  id: string;
  userId: string;
  searchName: string;
  productQuery: string;
  categoryName: string;
  city: string;
  maxDistanceKm: number;
  minPrice: number;
  maxPrice: number;
  isActive: boolean;
  notificationFrequency: 'instant' | 'daily';
  lastMatchedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export class SmartAlertService {
  /**
   * Create a new saved search / buyer alert criteria
   */
  static createSavedSearch(userId: string, data: {
    searchName: string;
    productQuery?: string;
    categoryName?: string;
    city?: string;
    maxDistanceKm?: number;
    minPrice?: number;
    maxPrice?: number;
    notificationFrequency?: 'instant' | 'daily';
  }): SavedSearch {
    if (!data.searchName || data.searchName.trim().length === 0) {
      throw AppError.badRequest('Search name is required.');
    }

    const id = `srch-${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();

    Database.run(
      `INSERT INTO saved_searches (
        id, user_id, search_name, product_query, category_name, city,
        max_distance_km, min_price, max_price, is_active,
        notification_frequency, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      [
        id,
        userId,
        data.searchName.trim(),
        (data.productQuery || '').trim(),
        data.categoryName || 'All',
        data.city || 'All',
        data.maxDistanceKm || 50,
        data.minPrice || 0,
        data.maxPrice || 100000,
        data.notificationFrequency || 'instant',
        now,
        now,
      ]
    );

    return this.getSavedSearchById(id);
  }

  static getSavedSearchById(id: string): SavedSearch {
    const row = Database.get<any>('SELECT * FROM saved_searches WHERE id = ?', [id]);
    if (!row) throw AppError.notFound('Saved search not found');
    return {
      id: row.id,
      userId: row.user_id,
      searchName: row.search_name,
      productQuery: row.product_query,
      categoryName: row.category_name,
      city: row.city,
      maxDistanceKm: row.max_distance_km,
      minPrice: row.min_price,
      maxPrice: row.max_price,
      isActive: Boolean(row.is_active),
      notificationFrequency: row.notification_frequency,
      lastMatchedAt: row.last_matched_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  static listSavedSearches(userId: string): SavedSearch[] {
    const rows = Database.query<any>(
      'SELECT * FROM saved_searches WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      searchName: row.search_name,
      productQuery: row.product_query,
      categoryName: row.category_name,
      city: row.city,
      maxDistanceKm: row.max_distance_km,
      minPrice: row.min_price,
      maxPrice: row.max_price,
      isActive: Boolean(row.is_active),
      notificationFrequency: row.notification_frequency,
      lastMatchedAt: row.last_matched_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  static deleteSavedSearch(id: string, userId: string) {
    const search = Database.get<any>('SELECT * FROM saved_searches WHERE id = ?', [id]);
    if (!search) throw AppError.notFound('Saved search not found');
    if (search.user_id !== userId) throw AppError.forbidden('Unauthorized access to saved search');

    Database.run('DELETE FROM saved_searches WHERE id = ?', [id]);
    return { success: true, message: 'Saved search deleted' };
  }

  static toggleSavedSearch(id: string, userId: string) {
    const search = Database.get<any>('SELECT * FROM saved_searches WHERE id = ?', [id]);
    if (!search) throw AppError.notFound('Saved search not found');
    if (search.user_id !== userId) throw AppError.forbidden('Unauthorized access to saved search');

    const nextState = search.is_active ? 0 : 1;
    Database.run('UPDATE saved_searches SET is_active = ?, updated_at = ? WHERE id = ?', [
      nextState,
      new Date().toISOString(),
      id,
    ]);
    return { success: true, isActive: Boolean(nextState) };
  }

  /**
   * Matches a newly published product or price update against active saved searches
   */
  static matchListingAgainstSavedSearches(productId: string) {
    const product = Database.get<any>(
      `SELECT p.*, c.name as category_name, f.user_id as farmer_user_id, f.farm_name
       FROM products p
       JOIN categories c ON p.category_id = c.id
       JOIN farmer_profiles f ON p.farmer_id = f.id
       WHERE p.id = ?`,
      [productId]
    );

    if (!product) return;

    const searches = Database.query<any>(
      `SELECT * FROM saved_searches WHERE is_active = 1 AND user_id != ?`,
      [product.farmer_user_id]
    );

    const now = new Date().toISOString();

    for (const s of searches) {
      // 1. Category check
      if (s.category_name !== 'All' && s.category_name.toLowerCase() !== product.category_name.toLowerCase()) {
        continue;
      }

      // 2. Query text check
      if (s.product_query && s.product_query.trim().length > 0) {
        const query = s.product_query.toLowerCase().trim();
        const pName = product.name.toLowerCase();
        const pDesc = (product.description || '').toLowerCase();
        if (!pName.includes(query) && !pDesc.includes(query)) {
          continue;
        }
      }

      // 3. Price range check
      if (product.price < s.min_price || product.price > s.max_price) {
        continue;
      }

      // 4. City / Distance check
      if (s.city !== 'All' && product.city && s.city.toLowerCase() !== product.city.toLowerCase()) {
        // Fallback to coordinates distance if lat/lng are available
        if (product.latitude && product.longitude) {
          const defaultCityLat = 30.3165;
          const defaultCityLng = 78.0322;
          const dist = calculateHaversineDistanceKm(defaultCityLat, defaultCityLng, product.latitude, product.longitude);
          if (dist > s.max_distance_km) {
            continue;
          }
        }
      }

      // 5. Deduplication check: Avoid notifying same user about same product within 24 hours
      const existingNotif = Database.get<any>(
        `SELECT id FROM notifications 
         WHERE user_id = ? AND title LIKE ? AND created_at > datetime('now', '-1 day')`,
        [s.user_id, `%${product.name}%`]
      );

      if (existingNotif) {
        continue;
      }

      // Insert smart alert notification
      const notifId = `notif-${uuidv4().slice(0, 8)}`;
      Database.run(
        `INSERT INTO notifications (
          id, user_id, recipient_role, type, title, message, is_read, created_at
        ) VALUES (?, ?, 'customer', 'alert', ?, ?, 0, ?)`,
        [
          notifId,
          s.user_id,
          `Fresh Listing Alert: ${product.name}`,
          `New produce matching your alert "${s.search_name}" was posted: ${product.name} at ₹${product.price}/${product.unit} by ${product.farm_name}.`,
          now,
        ]
      );

      // Update last_matched_at on saved search
      Database.run('UPDATE saved_searches SET last_matched_at = ? WHERE id = ?', [now, s.id]);
    }
  }

  /**
   * Matches a new buyer requirement against nearby farmers
   */
  static matchRequirementAgainstNearbyFarmers(requirementId: string) {
    const req = Database.get<any>('SELECT * FROM buyer_requirements WHERE id = ?', [requirementId]);
    if (!req) return;

    // Find nearby farmers (within 50 km)
    const farmers = Database.query<any>(
      `SELECT f.id, f.user_id, f.farm_name, f.latitude, f.longitude
       FROM farmer_profiles f
       JOIN users u ON f.user_id = u.id
       WHERE u.status = 'active' AND f.user_id != ?`,
      [req.buyer_id]
    );

    const now = new Date().toISOString();

    for (const f of farmers) {
      const lat = f.latitude || 30.3165;
      const lng = f.longitude || 78.0322;
      const dist = calculateHaversineDistanceKm(req.latitude || 30.3165, req.longitude || 78.0322, lat, lng);

      if (dist <= 60) {
        const notifId = `notif-${uuidv4().slice(0, 8)}`;
        Database.run(
          `INSERT INTO notifications (
            id, user_id, recipient_role, type, title, message, is_read, created_at
          ) VALUES (?, ?, 'farmer', 'requirement', ?, ?, 0, ?)`,
          [
            notifId,
            f.user_id,
            `New Buyer Demand: ${req.product_name} (${req.required_quantity} ${req.unit})`,
            `A buyer in ${req.location} (${Math.round(dist)} km away) is looking for ${req.required_quantity} ${req.unit} of ${req.product_name}. Target: ₹${req.target_price || 'Open'}. Submit your quotation!`,
            now,
          ]
        );
      }
    }
  }
}
