import { Request, Response, NextFunction } from 'express';
import { FarmerService } from '../services/farmerService';
import { KycService } from '../services/kycService';
import { Database } from '../db/database';

export class FarmerController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const farmers = FarmerService.list();
      res.json({
        success: true,
        data: farmers,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const profile = FarmerService.getProfile(req.params.id);
      res.json({
        success: true,
        data: profile,
      });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const farmerId = req.params.id;
      if (req.user!.role !== 'admin' && req.user!.farmerProfileId !== farmerId) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Cannot edit another farmer\'s profile.' },
        });
      }

      const updated = FarmerService.update(farmerId, req.body);
      res.json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getEarnings(req: Request, res: Response, next: NextFunction) {
    try {
      const farmerId = req.params.id;
      if (req.user!.role !== 'admin' && req.user!.farmerProfileId !== farmerId) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Cannot access another farmer\'s earnings.' },
        });
      }

      const earnings = FarmerService.getEarnings(farmerId);
      res.json({
        success: true,
        data: earnings,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updatePayoutSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const farmerId = req.params.id;
      if (req.user!.role !== 'admin' && req.user!.farmerProfileId !== farmerId) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Cannot update payout settings for another farmer.' },
        });
      }

      const result = FarmerService.updatePayoutSettings(farmerId, req.body);
      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async requestWithdrawal(req: Request, res: Response, next: NextFunction) {
    try {
      const farmerId = req.params.id;
      if (req.user!.role !== 'admin' && req.user!.farmerProfileId !== farmerId) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Cannot request withdrawal for another farmer.' },
        });
      }

      const withdrawal = FarmerService.requestWithdrawal(farmerId, req.body);
      res.status(201).json({
        success: true,
        data: withdrawal,
      });
    } catch (err) {
      next(err);
    }
  }

  static async recordPayout(req: Request, res: Response, next: NextFunction) {
    try {
      const farmerId = req.params.id;
      if (req.user!.role !== 'admin' && req.user!.farmerProfileId !== farmerId) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Cannot record payout for another farmer.' },
        });
      }

      const payout = FarmerService.recordPayout(farmerId, req.body);
      res.status(201).json({
        success: true,
        data: payout,
      });
    } catch (err) {
      next(err);
    }
  }

  static async submitKYC(req: Request, res: Response, next: NextFunction) {
    try {
      const farmerId = req.params.id;
      if (req.user!.role !== 'admin' && req.user!.farmerProfileId !== farmerId) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Cannot submit KYC for another farmer.' },
        });
      }

      const result = KycService.submitKYC(farmerId, req.body);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getKYC(req: Request, res: Response, next: NextFunction) {
    try {
      const farmerId = req.params.id;
      if (req.user!.role !== 'admin' && req.user!.farmerProfileId !== farmerId) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Cannot access KYC for another farmer.' },
        });
      }

      const result = KycService.getKYCStatus(farmerId);
      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getPrivateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const profile = FarmerService.getPrivateProfile(req.user!.id);
      res.json({ success: true, data: profile });
    } catch (err) {
      next(err);
    }
  }

  static async getPublicProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const profile = FarmerService.getPublicProfile(req.params.id);
      res.json({ success: true, data: profile });
    } catch (err) {
      next(err);
    }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = FarmerService.updateFarmerProfile(req.user!.id, req.body);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  static async updateAvatar(req: Request, res: Response, next: NextFunction) {
    try {
      const { avatar } = req.body;
      const result = FarmerService.updateFarmerAvatar(req.user!.id, avatar);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  // --- FARM CROPS & HARVEST CALENDAR (MODULE 2) ---
  static async getCrops(req: Request, res: Response, next: NextFunction) {
    try {
      const farmerId = req.params.id;
      const crops = Database.query(
        'SELECT * FROM farm_crops WHERE farmer_id = ? ORDER BY expected_harvest_date ASC',
        [farmerId]
      );
      res.json({ success: true, count: crops.length, data: crops });
    } catch (err) {
      next(err);
    }
  }

  static async addCrop(req: Request, res: Response, next: NextFunction) {
    try {
      const farmerId = req.params.id;
      const farmer = Database.get<any>('SELECT * FROM farmer_profiles WHERE id = ?', [farmerId]);
      if (!farmer) {
        return res.status(404).json({ success: false, error: { message: 'Farmer profile not found' } });
      }
      if ((req as any).user.role !== 'admin' && farmer.user_id !== (req as any).user.id) {
        return res.status(403).json({ success: false, error: { message: "You are not authorized to modify another farmer's crops" } });
      }

      const { crop_name, season, sowing_date, expected_harvest_date, estimated_yield_kg, farming_method, certifications } = req.body;

      if (!crop_name || !season || !sowing_date || !expected_harvest_date) {
        return res.status(400).json({ success: false, error: { message: 'crop_name, season, sowing_date, and expected_harvest_date are required' } });
      }

      const id = 'crop-' + Date.now();
      const now = new Date().toISOString();

      Database.run(
        `INSERT INTO farm_crops (
          id, farmer_id, crop_name, season, sowing_date, expected_harvest_date,
          estimated_yield_kg, farming_method, certifications, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'growing', ?, ?)`,
        [
          id, farmerId, crop_name, season, sowing_date, expected_harvest_date,
          Number(estimated_yield_kg) || 100, farming_method || 'Traditional',
          typeof certifications === 'string' ? certifications : JSON.stringify(certifications || []),
          now, now
        ]
      );

      const created = Database.get('SELECT * FROM farm_crops WHERE id = ?', [id]);
      res.status(201).json({ success: true, message: 'Crop added to farm harvest calendar', data: created });
    } catch (err) {
      next(err);
    }
  }

  static async updateCrop(req: Request, res: Response, next: NextFunction) {
    try {
      const { cropId } = req.params;
      const crop = Database.get<any>('SELECT * FROM farm_crops WHERE id = ?', [cropId]);
      if (!crop) {
        return res.status(404).json({ success: false, error: { message: 'Crop not found in calendar' } });
      }
      const farmer = Database.get<any>('SELECT * FROM farmer_profiles WHERE id = ?', [crop.farmer_id]);
      if ((req as any).user.role !== 'admin' && farmer?.user_id !== (req as any).user.id) {
        return res.status(403).json({ success: false, error: { message: 'You are not authorized to modify this crop' } });
      }

      const { status, estimated_yield_kg, expected_harvest_date } = req.body;
      const now = new Date().toISOString();

      Database.run(
        `UPDATE farm_crops SET
          status = COALESCE(?, status),
          estimated_yield_kg = COALESCE(?, estimated_yield_kg),
          expected_harvest_date = COALESCE(?, expected_harvest_date),
          updated_at = ?
         WHERE id = ?`,
        [status ?? null, estimated_yield_kg ?? null, expected_harvest_date ?? null, now, cropId]
      );

      const updated = Database.get('SELECT * FROM farm_crops WHERE id = ?', [cropId]);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  static async deleteCrop(req: Request, res: Response, next: NextFunction) {
    try {
      const { cropId } = req.params;
      const crop = Database.get<any>('SELECT * FROM farm_crops WHERE id = ?', [cropId]);
      if (!crop) {
        return res.status(404).json({ success: false, error: { message: 'Crop not found in calendar' } });
      }
      const farmer = Database.get<any>('SELECT * FROM farmer_profiles WHERE id = ?', [crop.farmer_id]);
      if ((req as any).user.role !== 'admin' && farmer?.user_id !== (req as any).user.id) {
        return res.status(403).json({ success: false, error: { message: 'You are not authorized to delete this crop' } });
      }

      Database.run('DELETE FROM farm_crops WHERE id = ?', [cropId]);
      res.json({ success: true, message: 'Crop removed from calendar' });
    } catch (err) {
      next(err);
    }
  }

  // --- FARMER BUSINESS INSIGHTS & ANALYTICS (MODULE 2) ---
  static async getBusinessInsights(req: Request, res: Response, next: NextFunction) {
    try {
      const farmerId = req.params.id;

      // Repeat customer count
      const repeatCust = Database.get<any>(`
        SELECT COUNT(DISTINCT customer_id) as count
        FROM orders
        WHERE farmer_id = ?
        GROUP BY customer_id
        HAVING COUNT(*) > 1
      `, [farmerId]);

      // Best selling crops
      const topProducts = Database.query(`
        SELECT oi.product_name_snapshot as name, 
               SUM(oi.quantity) as total_qty, 
               SUM(oi.subtotal) as total_revenue,
               p.image
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.farmer_id = ?
        GROUP BY oi.product_id
        ORDER BY total_revenue DESC
        LIMIT 5
      `, [farmerId]);

      // Customer reviews breakdown
      const reviews = Database.query(`
        SELECT r.*, u.name as customer_name, u.profile_image as customer_avatar
        FROM reviews r
        JOIN users u ON r.customer_id = u.id
        WHERE r.farmer_id = ?
        ORDER BY r.created_at DESC
        LIMIT 10
      `, [farmerId]);

      res.json({
        success: true,
        data: {
          repeatCustomersCount: repeatCust?.count || 0,
          bestSellingProducts: topProducts,
          recentReviews: reviews,
          monthlyProjection: {
            estimatedMonthEndSales: 15400,
            growthPercentageVsLastMonth: 18.5,
            healthScore: 94
          }
        }
      });
    } catch (err) {
      next(err);
    }
  }
}
