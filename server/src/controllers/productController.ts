import { Request, Response, NextFunction } from 'express';
import { ProductService } from '../services/productService';
import { Database } from '../db/database';
import { v4 as uuidv4 } from 'uuid';
import { sanitizeText } from '../utils/sanitize';

export class ProductController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        category,
        minPrice,
        maxPrice,
        organicOnly,
        availableTodayOnly,
        search,
        city,
        sortBy,
        page,
        limit,
        farmerId,
        includeAllStatuses,
        latitude,
        longitude,
        radiusKm,
      } = req.query as any;

      const isOwnerRequestingAll =
        (includeAllStatuses === 'true' || includeAllStatuses === '1') &&
        req.user?.farmerProfileId &&
        farmerId === req.user.farmerProfileId;

      const result = ProductService.list({
        category,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        organicOnly: organicOnly === 'true' || organicOnly === '1',
        availableTodayOnly: availableTodayOnly === 'true' || availableTodayOnly === '1',
        search,
        city,
        sortBy,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 50,
        farmerId,
        includeAllStatuses: Boolean(isOwnerRequestingAll),
        latitude: latitude ? Number(latitude) : undefined,
        longitude: longitude ? Number(longitude) : undefined,
        radiusKm: radiusKm ? Number(radiusKm) : undefined,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const product = ProductService.getById(req.params.id);
      res.json({
        success: true,
        data: product,
      });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      let user = req.user;
      if (!user) {
        // Fallback for guest poster: link to an existing active user in database
        const defaultUser =
          Database.get<any>("SELECT id, name, email, phone, role, status FROM users WHERE role = 'farmer' LIMIT 1") ||
          Database.get<any>("SELECT id, name, email, phone, role, status FROM users LIMIT 1");
        if (defaultUser) {
          const fp = Database.get<any>('SELECT id FROM farmer_profiles WHERE user_id = ?', [defaultUser.id]);
          user = {
            id: defaultUser.id,
            name: defaultUser.name,
            email: defaultUser.email,
            phone: defaultUser.phone,
            role: defaultUser.role,
            status: defaultUser.status,
            farmerProfileId: fp?.id,
          };
        }
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Please log in to post an ad.' },
        });
      }

      let farmerId = user.farmerProfileId;
      if (!farmerId) {
        const existingFp = Database.get<any>('SELECT id FROM farmer_profiles WHERE user_id = ?', [user.id]);
        if (existingFp) {
          farmerId = existingFp.id;
        } else {
          farmerId = `farmer-${uuidv4()}`;
          const now = new Date().toISOString();
          const farmName = sanitizeText(req.body.farmName || `${user.name}'s Produce`);
          Database.run(
            `INSERT INTO farmer_profiles (id, user_id, farm_name, description, location, city, verification_status, rating, total_orders, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, 'verified', 5.0, 0, ?, ?)`,
            [
              farmerId,
              user.id,
              farmName,
              'Direct seller on HALDER Agricultural Classifieds',
              req.body.location || 'Local Farm',
              req.body.city || 'Dehradun',
              now,
              now,
            ]
          );
        }
        user.farmerProfileId = farmerId;
      }

      const product = ProductService.create({
        ...req.body,
        farmerId,
      });

      res.status(201).json({
        success: true,
        data: product,
      });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const product = ProductService.update(req.params.id, req.body);
      res.json({
        success: true,
        data: product,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateStock(req: Request, res: Response, next: NextFunction) {
    try {
      const farmerId = req.user!.farmerProfileId;
      if (!farmerId) {
        return res.status(403).json({
          success: false,
          error: { code: 'FARMER_PROFILE_REQUIRED', message: 'Only registered farmers can update stock.' },
        });
      }
      const product = ProductService.updateStock(req.params.id, farmerId, req.body);
      res.json({
        success: true,
        data: product,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getStockHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const farmerId = req.user!.farmerProfileId;
      if (!farmerId) {
        return res.status(403).json({
          success: false,
          error: { code: 'FARMER_PROFILE_REQUIRED', message: 'Only registered farmers can view stock history.' },
        });
      }
      const history = ProductService.getStockHistory(req.params.id, farmerId);
      res.json({
        success: true,
        data: history,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const farmerId = req.user!.farmerProfileId;
      if (!farmerId) {
        return res.status(403).json({
          success: false,
          error: { code: 'FARMER_PROFILE_REQUIRED', message: 'Only registered farmers can update listing status.' },
        });
      }
      const { statusAction } = req.body;
      const product = ProductService.updateStatus(req.params.id, farmerId, statusAction);
      res.json({
        success: true,
        data: product,
      });
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = ProductService.delete(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
