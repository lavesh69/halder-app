import { Database } from '../db/database';
import { AppError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';
import { sanitizeText } from '../utils/sanitize';
import { SmartAlertService } from './smartAlertService';

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

    // Fetch multi-images
    const images = Database.query<any>(
      'SELECT image_url FROM product_images WHERE product_id = ? ORDER BY sort_order ASC',
      [id]
    );
    product.images = images.length > 0 ? images.map((i) => i.image_url) : [product.image];

    // Fetch price slabs
    const slabs = Database.query<any>(
      'SELECT min_quantity, max_quantity, price_per_unit FROM product_price_slabs WHERE product_id = ? ORDER BY min_quantity ASC',
      [id]
    );
    product.price_slabs = slabs.map((s) => ({
      minQuantity: Number(s.min_quantity),
      maxQuantity: s.max_quantity ? Number(s.max_quantity) : undefined,
      pricePerUnit: Number(s.price_per_unit),
    }));

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
    totalQuantity?: number;
    minOrderQuantity?: number;
    isNegotiable?: boolean;
    productGrade?: string;
    qualityDescription?: string;
    organicCertificationBody?: string;
    storageInfo?: string;
    packagingInfo?: string;
    village?: string;
    district?: string;
    state?: string;
    postalCode?: string;
    pickupAvailable?: boolean;
    farmerDeliveryAvailable?: boolean;
    isOrganic?: boolean;
    availableToday?: boolean;
    harvestDate?: string;
    freshnessTag?: string;
    location: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    image: string;
    images?: string[];
    priceSlabs?: Array<{ minQuantity: number; maxQuantity?: number; pricePerUnit: number }>;
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
    const totalQty = data.totalQuantity !== undefined ? data.totalQuantity : data.availableQuantity;

    Database.transaction(() => {
      Database.run(
        `INSERT INTO products (
          id, farmer_id, category_id, name, slug, description, price, unit,
          available_quantity, total_quantity, min_order_quantity, is_negotiable,
          product_grade, quality_description, organic_certification_body,
          storage_info, packaging_info, village, district, state, postal_code,
          pickup_available, farmer_delivery_available,
          is_organic, available_today, harvest_date,
          freshness_tag, location, city, latitude, longitude, image,
          status, moderation_status, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          'active', 'approved', ?, ?
        )`,
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
          totalQty,
          data.minOrderQuantity || 1,
          data.isNegotiable !== false ? 1 : 0,
          data.productGrade || 'Grade A',
          sanitizeText(data.qualityDescription || ''),
          sanitizeText(data.organicCertificationBody || ''),
          sanitizeText(data.storageInfo || ''),
          sanitizeText(data.packagingInfo || ''),
          sanitizeText(data.village || ''),
          sanitizeText(data.district || ''),
          data.state || 'Uttarakhand',
          data.postalCode || '248001',
          data.pickupAvailable !== false ? 1 : 0,
          data.farmerDeliveryAvailable !== false ? 1 : 0,
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

      // Save multiple images (up to 8)
      const imagesToSave = data.images && data.images.length > 0 ? data.images.slice(0, 8) : [data.image];
      imagesToSave.forEach((imgUrl, idx) => {
        Database.run(
          'INSERT INTO product_images (id, product_id, image_url, sort_order, created_at) VALUES (?, ?, ?, ?, ?)',
          [`img-${uuidv4().slice(0, 8)}`, id, imgUrl, idx, now]
        );
      });

      // Save price slabs if configured
      if (data.priceSlabs && Array.isArray(data.priceSlabs)) {
        for (const slab of data.priceSlabs) {
          if (slab.minQuantity > 0 && slab.pricePerUnit > 0) {
            Database.run(
              'INSERT INTO product_price_slabs (id, product_id, min_quantity, max_quantity, price_per_unit, created_at) VALUES (?, ?, ?, ?, ?, ?)',
              [`slab-${uuidv4().slice(0, 8)}`, id, slab.minQuantity, slab.maxQuantity || null, slab.pricePerUnit, now]
            );
          }
        }
      }

      // Initial inventory log entry
      Database.run(
        `INSERT INTO inventory_audit_log (
          id, product_id, farmer_id, change_type, previous_quantity, change_amount, new_quantity, reason, created_at
        ) VALUES (?, ?, ?, 'restock', 0, ?, ?, 'Initial listing stock published', ?)`,
        [`inv-${uuidv4().slice(0, 8)}`, id, data.farmerId, data.availableQuantity, data.availableQuantity, now]
      );

      Database.run(
        'UPDATE farmer_profiles SET total_listings_count = total_listings_count + 1 WHERE id = ?',
        [data.farmerId]
      );
    });

    // Trigger Smart Alerts matching engine
    try {
      SmartAlertService.matchListingAgainstSavedSearches(id);
    } catch (e: any) {
      console.warn('Smart alert matching notice:', e.message);
    }

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
    const availableQty = updates.availableQuantity !== undefined ? updates.availableQuantity : updates.available_quantity;
    if (availableQty !== undefined && availableQty < 0) {
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
    if (availableQty !== undefined) {
      fields.push('available_quantity = ?');
      values.push(availableQty);
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
    if (updates.isNegotiable !== undefined || updates.is_negotiable !== undefined) {
      fields.push('is_negotiable = ?');
      values.push(updates.isNegotiable ?? updates.is_negotiable ? 1 : 0);
    }
    if (updates.productGrade !== undefined || updates.product_grade !== undefined) {
      fields.push('product_grade = ?');
      values.push(updates.productGrade || updates.product_grade);
    }
    if (updates.qualityDescription !== undefined || updates.quality_description !== undefined) {
      fields.push('quality_description = ?');
      values.push(sanitizeText(updates.qualityDescription || updates.quality_description));
    }
    if (updates.storageInfo !== undefined || updates.storage_info !== undefined) {
      fields.push('storage_info = ?');
      values.push(sanitizeText(updates.storageInfo || updates.storage_info));
    }
    if (updates.packagingInfo !== undefined || updates.packaging_info !== undefined) {
      fields.push('packaging_info = ?');
      values.push(sanitizeText(updates.packagingInfo || updates.packaging_info));
    }
    if (updates.pickupAvailable !== undefined || updates.pickup_available !== undefined) {
      fields.push('pickup_available = ?');
      values.push(updates.pickupAvailable ?? updates.pickup_available ? 1 : 0);
    }
    if (updates.farmerDeliveryAvailable !== undefined || updates.farmer_delivery_available !== undefined) {
      fields.push('farmer_delivery_available = ?');
      values.push(updates.farmerDeliveryAvailable ?? updates.farmer_delivery_available ? 1 : 0);
    }
    if (updates.harvestDate !== undefined || updates.harvest_date !== undefined) {
      fields.push('harvest_date = ?');
      values.push(updates.harvestDate || updates.harvest_date);
    }
    if (updates.image !== undefined) {
      fields.push('image = ?');
      values.push(updates.image);
    }

    if (fields.length > 0) {
      fields.push('updated_at = ?');
      values.push(new Date().toISOString());

      values.push(id);
      Database.run(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, values);
    }

    // Update images if provided
    if (updates.images && Array.isArray(updates.images)) {
      Database.run('DELETE FROM product_images WHERE product_id = ?', [id]);
      updates.images.slice(0, 8).forEach((imgUrl: string, idx: number) => {
        Database.run(
          'INSERT INTO product_images (id, product_id, image_url, sort_order, created_at) VALUES (?, ?, ?, ?, ?)',
          [`img-${uuidv4().slice(0, 8)}`, id, imgUrl, idx, new Date().toISOString()]
        );
      });
    }

    // Update price slabs if provided
    if (updates.priceSlabs && Array.isArray(updates.priceSlabs)) {
      Database.run('DELETE FROM product_price_slabs WHERE product_id = ?', [id]);
      for (const slab of updates.priceSlabs) {
        if (slab.minQuantity > 0 && slab.pricePerUnit > 0) {
          Database.run(
            'INSERT INTO product_price_slabs (id, product_id, min_quantity, max_quantity, price_per_unit, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            [`slab-${uuidv4().slice(0, 8)}`, id, slab.minQuantity, slab.maxQuantity || null, slab.pricePerUnit, new Date().toISOString()]
          );
        }
      }
    }

    return ProductService.getById(id);
  }

  /**
   * Real-Time Stock Management (Module 2)
   */
  static updateStock(productId: string, farmerId: string, data: {
    action: 'increase' | 'reduce' | 'set' | 'mark_sold_out' | 'restore';
    amount?: number;
    newQuantity?: number;
    reason?: string;
    harvestDate?: string;
  }) {
    const product = Database.get<any>('SELECT * FROM products WHERE id = ?', [productId]);
    if (!product) throw AppError.notFound('Product not found');
    if (product.farmer_id !== farmerId) throw AppError.forbidden('Unauthorized access to product inventory');

    const previousQty = Number(product.available_quantity);
    let finalQty = previousQty;
    let changeAmount = 0;
    let changeType: 'restock' | 'sale' | 'adjustment' | 'sold_out' = 'adjustment';

    if (data.action === 'increase') {
      const amt = Number(data.amount) || 0;
      if (amt <= 0) throw AppError.badRequest('Increase amount must be greater than zero.');
      changeAmount = amt;
      finalQty = previousQty + amt;
      changeType = 'restock';
    } else if (data.action === 'reduce') {
      const amt = Number(data.amount) || 0;
      if (amt <= 0) throw AppError.badRequest('Reduction amount must be greater than zero.');
      if (amt > previousQty) throw AppError.badRequest(`Cannot reduce more than remaining stock (${previousQty} ${product.unit}).`);
      changeAmount = -amt;
      finalQty = previousQty - amt;
      changeType = 'sale';
    } else if (data.action === 'set') {
      const target = Number(data.newQuantity);
      if (isNaN(target) || target < 0) throw AppError.badRequest('Quantity cannot be negative.');
      changeAmount = target - previousQty;
      finalQty = target;
      changeType = changeAmount >= 0 ? 'restock' : 'adjustment';
    } else if (data.action === 'mark_sold_out') {
      changeAmount = -previousQty;
      finalQty = 0;
      changeType = 'sold_out';
    } else if (data.action === 'restore') {
      const amt = Number(data.amount) || Number(data.newQuantity) || 10;
      if (amt <= 0) throw AppError.badRequest('Restoration amount must be greater than zero.');
      changeAmount = amt;
      finalQty = amt;
      changeType = 'restock';
    }

    // Auto-calculate stock status
    let stockStatus = 'available';
    if (finalQty <= 0) {
      stockStatus = 'out_of_stock';
    } else if (finalQty <= (product.stock_alert_threshold || 5)) {
      stockStatus = 'limited_stock';
    }

    const now = new Date().toISOString();

    Database.transaction(() => {
      Database.run(
        `UPDATE products SET
          available_quantity = ?,
          stock_status = ?,
          status = ?,
          harvest_date = COALESCE(?, harvest_date),
          updated_at = ?
         WHERE id = ?`,
        [
          finalQty,
          stockStatus,
          finalQty > 0 ? 'active' : 'unavailable',
          data.harvestDate || null,
          now,
          productId,
        ]
      );

      Database.run(
        `INSERT INTO inventory_audit_log (
          id, product_id, farmer_id, change_type, previous_quantity, change_amount, new_quantity, reason, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `inv-${uuidv4().slice(0, 8)}`,
          productId,
          farmerId,
          changeType,
          previousQty,
          changeAmount,
          finalQty,
          sanitizeText(data.reason || `Stock action: ${data.action}`),
          now,
        ]
      );
    });

    return ProductService.getById(productId);
  }

  static getStockHistory(productId: string, farmerId: string) {
    const product = Database.get<any>('SELECT farmer_id FROM products WHERE id = ?', [productId]);
    if (!product) throw AppError.notFound('Product not found');
    if (product.farmer_id !== farmerId) throw AppError.forbidden('Unauthorized access to product inventory');

    return Database.query<any>(
      'SELECT * FROM inventory_audit_log WHERE product_id = ? ORDER BY created_at DESC LIMIT 50',
      [productId]
    );
  }

  /**
   * Ad Lifecycle Controls (Module 1: Pause, Resume, Mark Sold, Renew)
   */
  static updateStatus(productId: string, farmerId: string, statusAction: 'pause' | 'resume' | 'mark_sold' | 'renew') {
    const product = Database.get<any>('SELECT * FROM products WHERE id = ?', [productId]);
    if (!product) throw AppError.notFound('Product not found');
    if (product.farmer_id !== farmerId) throw AppError.forbidden('Unauthorized');

    const now = new Date().toISOString();

    if (statusAction === 'pause') {
      Database.run("UPDATE products SET status = 'paused', updated_at = ? WHERE id = ?", [now, productId]);
    } else if (statusAction === 'resume') {
      Database.run("UPDATE products SET status = 'active', updated_at = ? WHERE id = ?", [now, productId]);
    } else if (statusAction === 'mark_sold') {
      Database.run("UPDATE products SET status = 'sold', available_quantity = 0, stock_status = 'out_of_stock', updated_at = ? WHERE id = ?", [now, productId]);
    } else if (statusAction === 'renew') {
      // Renew listing with fresh harvest timestamp
      Database.run(
        "UPDATE products SET status = 'active', harvest_date = 'Freshly reconfirmed today', updated_at = ? WHERE id = ?",
        [now, productId]
      );
    }

    return ProductService.getById(productId);
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
