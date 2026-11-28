import { Request, Response, NextFunction } from 'express';
import { FavoriteService } from '../services/favoriteService';
import { getParam } from '../utils/http';

export class FavoriteController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const favorites = FavoriteService.list(req.user!.id);
      res.json({ success: true, data: favorites });
    } catch (err) {
      next(err);
    }
  }

  static async add(req: Request, res: Response, next: NextFunction) {
    try {
      const result = FavoriteService.add(req.user!.id, getParam(req, 'productId'));
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const result = FavoriteService.remove(req.user!.id, getParam(req, 'productId'));
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}
