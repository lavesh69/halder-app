import { Request, Response, NextFunction } from 'express';
import { SmartAlertService } from '../services/smartAlertService';

export class SmartAlertController {
  static async createSavedSearch(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const search = SmartAlertService.createSavedSearch(userId, req.body);
      res.status(201).json({ success: true, data: search });
    } catch (err) {
      next(err);
    }
  }

  static async listSavedSearches(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const searches = SmartAlertService.listSavedSearches(userId);
      res.json({ success: true, data: searches });
    } catch (err) {
      next(err);
    }
  }

  static async deleteSavedSearch(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const result = SmartAlertService.deleteSavedSearch(req.params.id, userId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async toggleSavedSearch(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const result = SmartAlertService.toggleSavedSearch(req.params.id, userId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
