import { Database } from '../db/database';
import { calculateHaversineDistanceKm } from './productService';

export interface NearbyFarmerResult {
  id: string;
  userId: string;
  farmName: string;
  farmerName: string;
  avatar: string;
  phone: string;
  location: string;
  city: string;
  latitude: number;
  longitude: number;
  rating: number;
  verificationStatus: string;
  distanceKm: number;
  activeProductsCount: number;
  topProducts: Array<{
    id: string;
    name: string;
    price: number;
    unit: string;
    image: string;
    category: string;
  }>;
}

export class GeoService {
  /**
   * Discovers farmers within a given radius in kilometers
   */
  static getNearbyFarmers(params: {
    latitude: number;
    longitude: number;
    radiusKm?: number;
    category?: string;
    verifiedOnly?: boolean;
    availableTodayOnly?: boolean;
    limit?: number;
  }): NearbyFarmerResult[] {
    const radius = Math.min(300, Math.max(1, params.radiusKm || 25));
    const limit = Math.min(100, Math.max(1, params.limit || 50));

    // Fetch active farmer profiles
    let sql = `
      SELECT f.id, f.user_id, f.farm_name, f.location, f.city,
             f.latitude, f.longitude, f.rating, f.verification_status,
             f.avatar, u.name as farmer_name, u.phone as farmer_phone
      FROM farmer_profiles f
      JOIN users u ON f.user_id = u.id
      WHERE u.status = 'active'
    `;
    const sqlParams: any[] = [];

    if (params.verifiedOnly) {
      sql += ` AND f.verification_status = 'verified'`;
    }

    const rows = Database.query<any>(sql, sqlParams);

    const results: NearbyFarmerResult[] = [];

    for (const row of rows) {
      const lat = Number(row.latitude) || 30.3165;
      const lng = Number(row.longitude) || 78.0322;
      const distance = calculateHaversineDistanceKm(params.latitude, params.longitude, lat, lng);

      if (distance <= radius) {
        // Query top active products for this farmer
        let prodSql = `
          SELECT p.id, p.name, p.price, p.unit, p.image, c.name as category
          FROM products p
          JOIN categories c ON p.category_id = c.id
          WHERE p.farmer_id = ? AND p.status = 'active' AND p.moderation_status = 'approved'
        `;
        const prodParams: any[] = [row.id];

        if (params.category && params.category !== 'All') {
          prodSql += ` AND (c.name = ? OR c.slug = ?)`;
          prodParams.push(params.category, params.category.toLowerCase());
        }

        if (params.availableTodayOnly) {
          prodSql += ` AND p.available_today = 1`;
        }

        prodSql += ` ORDER BY p.views_count DESC LIMIT 5`;

        const products = Database.query<any>(prodSql, prodParams);

        if (params.category && params.category !== 'All' && products.length === 0) {
          // If filtering by category and farmer has no matching products, skip
          continue;
        }

        const countRow = Database.get<{ count: number }>(
          `SELECT COUNT(*) as count FROM products WHERE farmer_id = ? AND status = 'active'`,
          [row.id]
        );

        results.push({
          id: row.id,
          userId: row.user_id,
          farmName: row.farm_name,
          farmerName: row.farmer_name,
          avatar: row.avatar || 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=200',
          phone: row.farmer_phone,
          location: row.location,
          city: row.city,
          latitude: lat,
          longitude: lng,
          rating: Number(row.rating) || 4.8,
          verificationStatus: row.verification_status,
          distanceKm: distance,
          activeProductsCount: countRow?.count || 0,
          topProducts: products.map((p) => ({
            id: p.id,
            name: p.name,
            price: Number(p.price),
            unit: p.unit,
            image: p.image,
            category: p.category,
          })),
        });
      }
    }

    // Sort by nearest distance
    results.sort((a, b) => a.distanceKm - b.distanceKm);
    return results.slice(0, limit);
  }
}
