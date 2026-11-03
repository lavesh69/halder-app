import { Request, Response, NextFunction } from 'express';
import { ProductService } from '../services/productService';

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
        latitude,
        longitude,
        radiusKm,
      } = req.query as any;

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
      const farmerId = req.user!.farmerProfileId;
      if (!farmerId) {
        return res.status(403).json({
          success: false,
          error: { code: 'FARMER_PROFILE_REQUIRED', message: 'Only registered farmers can create produce listings.' },
        });
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

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = ProductService.delete(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
