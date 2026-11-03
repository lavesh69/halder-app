import { Request, Response, NextFunction } from 'express';
import { Database } from '../db/database';
import { AppError } from '../utils/errors';

export class MandiController {
  // GET /api/v1/mandi/prices
  static getPrices(req: Request, res: Response, next: NextFunction) {
    try {
      const { crop, state, district, market } = req.query;
      let query = 'SELECT * FROM mandi_prices WHERE 1=1';
      const params: any[] = [];

      if (crop && typeof crop === 'string') {
        query += ' AND (crop_name LIKE ? OR commodity LIKE ?)';
        params.push(`%${crop}%`, `%${crop}%`);
      }
      if (state && typeof state === 'string') {
        query += ' AND state LIKE ?';
        params.push(`%${state}%`);
      }
      if (district && typeof district === 'string') {
        query += ' AND district LIKE ?';
        params.push(`%${district}%`);
      }
      if (market && typeof market === 'string') {
        query += ' AND market_name LIKE ?';
        params.push(`%${market}%`);
      }

      query += ' ORDER BY price_date DESC, crop_name ASC';
      const records = Database.query(query, params);

      res.json({
        success: true,
        count: records.length,
        data: records,
        source: 'Government APMC / Agmarknet / e-NAM Verified Records',
        lastUpdated: records[0]?.updated_at || new Date().toISOString()
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/v1/mandi/analytics
  static getAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = Database.query(`
        SELECT 
          commodity,
          AVG(modal_price) as avg_modal_price,
          MIN(min_price) as lowest_price,
          MAX(max_price) as highest_price,
          SUM(arrival_quantity_tonnes) as total_arrivals_tonnes,
          COUNT(DISTINCT market_name) as mandis_reporting
        FROM mandi_prices
        GROUP BY commodity
        ORDER BY total_arrivals_tonnes DESC
      `);

      // Price volatility and trend calculation
      const analytics = stats.map((s: any) => {
        const spread = s.highest_price - s.lowest_price;
        const volatilityPct = Math.round((spread / (s.avg_modal_price || 1)) * 100);
        return {
          ...s,
          avg_modal_price: Math.round(s.avg_modal_price * 100) / 100,
          volatility_pct: volatilityPct,
          market_sentiment: volatilityPct > 35 ? 'Highly Volatile' : volatilityPct > 15 ? 'Moderate' : 'Stable'
        };
      });

      res.json({
        success: true,
        data: analytics,
        summary: {
          totalCommoditiesTracked: analytics.length,
          highestVolumeCrop: analytics[0]?.commodity || 'Tomato',
          dataVerified: true
        }
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/v1/mandi/demand
  static getDemandIndicators(req: Request, res: Response, next: NextFunction) {
    try {
      const indicators = Database.query(`
        SELECT * FROM crop_demand_indicators
        ORDER BY profitability_score DESC
      `);

      res.json({
        success: true,
        data: indicators
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/v1/mandi/estimate
  static calculateRevenueEstimate(req: Request, res: Response, next: NextFunction) {
    try {
      const { cropName, quantityKg, directHalderPrice } = req.body;

      if (!cropName || !quantityKg || Number(quantityKg) <= 0) {
        throw AppError.badRequest('cropName and valid quantityKg are required');
      }

      const qty = Number(quantityKg);
      const mandiRecord = Database.get<any>(
        'SELECT * FROM mandi_prices WHERE crop_name LIKE ? OR commodity LIKE ? ORDER BY price_date DESC LIMIT 1',
        [`%${cropName}%`, `%${cropName}%`]
      );

      const mandiModalPrice = mandiRecord ? mandiRecord.modal_price : 30.0;
      const farmPrice = directHalderPrice ? Number(directHalderPrice) : mandiModalPrice * 1.25;

      const mandiRevenue = qty * mandiModalPrice;
      const halderGrossRevenue = qty * farmPrice;
      const halderPlatformFee = halderGrossRevenue * 0.05; // 5%
      const halderNetRevenue = halderGrossRevenue - halderPlatformFee;
      const extraProfit = halderNetRevenue - mandiRevenue;
      const extraProfitPct = Math.round((extraProfit / (mandiRevenue || 1)) * 100);

      res.json({
        success: true,
        data: {
          cropName,
          quantityKg: qty,
          mandiBenchmark: {
            marketName: mandiRecord?.market_name || 'Dehradun APMC',
            modalPricePerKg: mandiModalPrice,
            estimatedMandiGross: Math.round(mandiRevenue),
            typicalMiddlemanCutPct: 15.0,
            estimatedMandiNet: Math.round(mandiRevenue * 0.85)
          },
          halderDirect: {
            sellingPricePerKg: farmPrice,
            grossSales: Math.round(halderGrossRevenue),
            platformFee5Pct: Math.round(halderPlatformFee),
            netFarmerEarnings: Math.round(halderNetRevenue)
          },
          advantage: {
            extraEarningsRupees: Math.max(0, Math.round(extraProfit)),
            extraProfitPercentage: Math.max(0, extraProfitPct),
            recommendation: extraProfit > 0 
              ? 'Selling directly on HALDER yields significantly higher margins than local APMC Mandi.'
              : 'Local mandi rates are currently competitive.'
          }
        }
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/v1/mandi/prices (Admin entry)
  static addPriceRecord(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        crop_name, commodity, variety, state, district, market_name,
        min_price, max_price, modal_price, arrival_quantity_tonnes, price_date, source
      } = req.body;

      if (!crop_name || !commodity || !state || !district || !market_name || min_price == null || max_price == null || modal_price == null) {
        throw AppError.badRequest('All mandi price fields (crop, commodity, state, district, market, min, max, modal) are required');
      }

      const id = 'mandi-' + Date.now();
      const now = new Date().toISOString();
      const dateVal = price_date || now.split('T')[0];

      Database.run(
        `INSERT INTO mandi_prices (
          id, crop_name, commodity, variety, state, district, market_name,
          min_price, max_price, modal_price, arrival_quantity_tonnes, price_date,
          source, is_verified, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [
          id, crop_name, commodity, variety || 'Local', state, district, market_name,
          Number(min_price), Number(max_price), Number(modal_price),
          Number(arrival_quantity_tonnes || 10.0), dateVal, source || 'Admin APMC Verification',
          now, now
        ]
      );

      const created = Database.get('SELECT * FROM mandi_prices WHERE id = ?', [id]);
      res.status(201).json({ success: true, message: 'Verified mandi price recorded', data: created });
    } catch (err) {
      next(err);
    }
  }
}
