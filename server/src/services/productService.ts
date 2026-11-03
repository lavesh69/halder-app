import { Database } from '../db/database';
import { AppError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';
import { sanitizeText } from '../utils/sanitize';

export function calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export function getTransitEstimate(distanceKm: number) {
  if (distanceKm <= 15) {
    return {
      band: 'hyperlocal',
      timeText: 'Within 45-60 mins',
      mode: 'farmer_direct',
      modeName: 'Kisan Direct Delivery (किसान द्वारा सीधी आपूर्ति)',
      deliveryFee: 25,
    };
  } else if (distanceKm <= 50) {
    return {
      band: 'district',
      timeText: 'Within 2-4 hours (Farm Dispatch)',
      mode: 'farmer_direct',
      modeName: 'Kisan Direct Delivery (किसान द्वारा सीधी आपूर्ति)',
      deliveryFee: 40,
    };
  } else if (distanceKm <= 150) {
    return {
      band: 'state_corridor',
      timeText: 'Same-day evening (Farm Vehicle)',
      mode: 'farmer_direct',
      modeName: 'Kisan Direct Delivery (किसान द्वारा सीधी आपूर्ति)',
      deliveryFee: 80,
    };
  } else {
    return {
      band: 'regional_mandi',
      timeText: 'Next-morning farm crate dispatch',
      mode: 'farmer_direct',
      modeName: 'Kisan Direct Delivery (किसान द्वारा सीधी आपूर्ति)',
      deliveryFee: 150,
    };
  }
}

export class ProductService {
  static list(params: {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    organicOnly?: boolean;
    availableTodayOnly?: boolean;
    search?: string;
    city?: string;
    sortBy?: 'nearest' | 'price_low' | 'price_high' | 'recent';
    page?: number;
    limit?: number;
    farmerId?: string;
    latitude?: number;
    longitude?: number;
    radiusKm?: number;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const offset = (page - 1) * limit;
    const radius = Math.min(300, Math.max(1, params.radiusKm !== undefined ? params.radiusKm : 300));

    let sql = `
      SELECT p.*,
             c.name as category_name,
             c.emoji as category_emoji,
             f.farm_name,
             f.rating as farmer_rating,
             f.verification_status,
             u.name as farmer_name,
             f.avatar as farmer_avatar
      FROM products p
      JOIN categories c ON p.category_id = c.id
      JOIN farmer_profiles f ON p.farmer_id = f.id
      JOIN users u ON f.user_id = u.id
      WHERE p.status = 'active' AND p.moderation_status = 'approved'
    `;
    const sqlParams: any[] = [];

    if (params.category && params.category !== 'All') {
      sql += ' AND (c.name = ? OR c.slug = ?)';
      sqlParams.push(params.category, params.category.toLowerCase());
    }

    if (params.minPrice !== undefined) {
      sql += ' AND p.price >= ?';
      sqlParams.push(params.minPrice);
    }

    if (params.maxPrice !== undefined) {
      sql += ' AND p.price <= ?';
      sqlParams.push(params.maxPrice);
    }

    if (params.organicOnly) {
      sql += ' AND p.is_organic = 1';
    }

    if (params.availableTodayOnly) {
      sql += ' AND p.available_today = 1';
    }

    if (params.farmerId) {
      sql += ' AND p.farmer_id = ?';
      sqlParams.push(params.farmerId);
    }

    if (params.city) {
      sql += ' AND LOWER(p.city) = LOWER(?)';
      sqlParams.push(params.city);
    }

    if (params.search) {
      sql += ' AND (p.name LIKE ? OR p.description LIKE ? OR f.farm_name LIKE ? OR u.name LIKE ?)';
      const term = `%${params.search}%`;
      sqlParams.push(term, term, term, term);
    }

    // High-performance Bounding Box pre-filtering in SQL for latitude/longitude
    const hasGeo = params.latitude !== undefined && params.longitude !== undefined;
    if (hasGeo) {
      const latDelta = radius / 111.0;
      const cosLat = Math.cos((params.latitude! * Math.PI) / 180);
      const lonDelta = radius / (111.0 * (Math.abs(cosLat) > 0.001 ? cosLat : 1));
      sql += ' AND p.latitude BETWEEN ? AND ? AND p.longitude BETWEEN ? AND ?';
      sqlParams.push(params.latitude! - latDelta, params.latitude! + latDelta);
      sqlParams.push(params.longitude! - lonDelta, params.longitude! + lonDelta);
    }

    switch (params.sortBy) {
      case 'price_low':
        sql += ' ORDER BY p.price ASC';
        break;
      case 'price_high':
        sql += ' ORDER BY p.price DESC';
        break;
      case 'recent':
        sql += ' ORDER BY p.created_at DESC';
        break;
      default:
        sql += ' ORDER BY p.created_at DESC';
    }

    // If geo filtering is active, we fetch candidates and apply exact spherical Haversine distance
    if (hasGeo) {
      const candidates = Database.query<any>(sql, sqlParams);
      const withDistance = candidates
        .map((p) => {
          const dist = calculateHaversineDistanceKm(
            params.latitude!,
            params.longitude!,
            p.latitude || 30.3165,
            p.longitude || 78.0322
          );
          const transit = getTransitEstimate(dist);
          return {
            ...p,
            distance_km: dist,
            transit_estimate: transit,
            delivery_mode: transit.mode,
            delivery_mode_name: transit.modeName,
          };
        })
        .filter((p) => p.distance_km <= radius);

      if (params.sortBy === 'nearest') {
        withDistance.sort((a, b) => a.distance_km - b.distance_km);
      }

      const paginated = withDistance.slice(offset, offset + limit);
      return {
        products: paginated,
        total: withDistance.length,
        page,
        limit,
        radiusKm: radius,
        appliedGeo: {
          latitude: params.latitude,
          longitude: params.longitude,
          radiusKm: radius,
        },
      };
    }

    // Standard non-geo query with pagination
    sql += ' LIMIT ? OFFSET ?';
    sqlParams.push(limit, offset);

    const products = Database.query<any>(sql, sqlParams).map((p) => {
      const defaultDist = 4.5;
      const transit = getTransitEstimate(defaultDist);
      return {
        ...p,
        distance_km: defaultDist,
        transit_estimate: transit,
        delivery_mode: transit.mode,
        delivery_mode_name: transit.modeName,
      };
    });

    return {
      products,
      page,
      limit,
    };
  }


  static getById(id: string) {
    const product = Database.get<any>(
      `SELECT p.*,
              c.name as category_name,
              c.emoji as category_emoji,
              f.farm_name,
              f.rating as farmer_rating,
              f.verification_status,
              f.location as farm_location,
              f.total_orders as farmer_total_orders,
              f.response_rate as farmer_response_rate,
              u.name as farmer_name,
              u.phone as farmer_phone,
              f.avatar as farmer_avatar
       FROM products p
       JOIN categories c ON p.category_id = c.id
       JOIN farmer_profiles f ON p.farmer_id = f.id
       JOIN users u ON f.user_id = u.id
       WHERE p.id = ?`,
      [id]
    );

    if (!product) {
      throw AppError.notFound('Product listing not found');
    }

    Database.run('UPDATE products SET views_count = views_count + 1 WHERE id = ?', [id]);
    return product;
  }

  static create(data: {
    farmerId: string;
    categoryId: string;
    name: string;
    description?: string;
    price: number;
    unit: string;
    availableQuantity: number;
    isOrganic?: boolean;
    availableToday?: boolean;
    harvestDate?: string;
    freshnessTag?: string;
    location: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    image: string;
  }) {
    if (data.price <= 0) {
      throw AppError.badRequest('Product price must be greater than zero.');
    }
    if (data.availableQuantity < 0) {
      throw AppError.badRequest('Available quantity cannot be negative.');
    }

    const category = Database.get<any>('SELECT id FROM categories WHERE id = ? OR name = ?', [
      data.categoryId,
      data.categoryId,
    ]);

    const actualCategoryId = category ? category.id : 'cat-veg';
    const id = `prod-${uuidv4()}`;
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const now = new Date().toISOString();

    Database.run(
      `INSERT INTO products (
        id, farmer_id, category_id, name, slug, description, price, unit,
        available_quantity, is_organic, available_today, harvest_date,
        freshness_tag, location, city, latitude, longitude, image,
        status, moderation_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 'approved', ?, ?)`,
      [
        id,
        data.farmerId,
        actualCategoryId,
        sanitizeText(data.name),
        slug,
        sanitizeText(data.description || ''),
        data.price,
        data.unit,
        data.availableQuantity,
        data.isOrganic ? 1 : 0,
        data.availableToday !== false ? 1 : 0,
        data.harvestDate || 'Harvested today at 5:30 AM',
        data.freshnessTag || 'Crisp Morning Harvest',
        sanitizeText(data.location),
        data.city || 'Dehradun',
        data.latitude || 30.3165,
        data.longitude || 78.0322,
        data.image,
        now,
        now,
      ]
    );

    Database.run(
      'UPDATE farmer_profiles SET total_listings_count = total_listings_count + 1 WHERE id = ?',
      [data.farmerId]
    );

    return ProductService.getById(id);
  }

  static update(id: string, updates: Record<string, any>) {
    const existing = Database.get<any>('SELECT * FROM products WHERE id = ?', [id]);
    if (!existing) {
      throw AppError.notFound('Product listing not found');
    }

    if (updates.price !== undefined && updates.price <= 0) {
      throw AppError.badRequest('Price must be greater than zero.');
    }
    if (updates.availableQuantity !== undefined && updates.availableQuantity < 0) {
      throw AppError.badRequest('Available quantity cannot be negative.');
    }

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(sanitizeText(updates.name));
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(sanitizeText(updates.description));
    }
    if (updates.price !== undefined) {
      fields.push('price = ?');
      values.push(updates.price);
    }
    if (updates.unit !== undefined) {
      fields.push('unit = ?');
      values.push(updates.unit);
    }
    if (updates.availableQuantity !== undefined) {
      fields.push('available_quantity = ?');
      values.push(updates.availableQuantity);
    }
    if (updates.isOrganic !== undefined) {
      fields.push('is_organic = ?');
      values.push(updates.isOrganic ? 1 : 0);
    }
    if (updates.availableToday !== undefined) {
      fields.push('available_today = ?');
      values.push(updates.availableToday ? 1 : 0);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.moderationStatus !== undefined || updates.moderation_status !== undefined) {
      fields.push('moderation_status = ?');
      values.push(updates.moderationStatus || updates.moderation_status);
    }
    if (updates.wholesalePrice !== undefined || updates.wholesale_price !== undefined) {
      fields.push('wholesale_price = ?');
      values.push(updates.wholesalePrice ?? updates.wholesale_price);
    }
    if (updates.moq !== undefined) {
      fields.push('moq = ?');
      values.push(updates.moq);
    }
    if (updates.stockAlertThreshold !== undefined || updates.stock_alert_threshold !== undefined) {
      fields.push('stock_alert_threshold = ?');
      values.push(updates.stockAlertThreshold ?? updates.stock_alert_threshold);
    }
    if (updates.image !== undefined) {
      fields.push('image = ?');
      values.push(updates.image);
    }

    if (fields.length === 0) return existing;

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());

    values.push(id);
    Database.run(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, values);

    return ProductService.getById(id);
  }

  static delete(id: string) {
    const existing = Database.get<any>('SELECT * FROM products WHERE id = ?', [id]);
    if (!existing) {
      throw AppError.notFound('Product listing not found');
    }

    Database.run("UPDATE products SET status = 'unavailable', moderation_status = 'flagged' WHERE id = ?", [id]);
    return { success: true, message: 'Product listing removed from marketplace' };
  }
}
