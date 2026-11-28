import { Request, Response, NextFunction } from 'express';
import { RequirementService } from '../services/requirementService';
import { getParam } from '../utils/http';

export class RequirementController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const buyerId = req.user!.id;
      const reqDoc = RequirementService.createRequirement(buyerId, req.body);
      res.status(201).json({ success: true, data: reqDoc });
    } catch (err) {
      next(err);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { category, city, search, status, maxDistanceKm, latitude, longitude, limit } = req.query as any;
      const requirements = RequirementService.listRequirements({
        category,
        city,
        search,
        status,
        maxDistanceKm: maxDistanceKm ? Number(maxDistanceKm) : undefined,
        userLat: latitude ? Number(latitude) : undefined,
        userLng: longitude ? Number(longitude) : undefined,
        limit: limit ? Number(limit) : 50,
      });
      res.json({ success: true, data: requirements });
    } catch (err) {
      next(err);
    }
  }

  static async listMy(req: Request, res: Response, next: NextFunction) {
    try {
      const buyerId = req.user!.id;
      const requirements = RequirementService.listRequirements({ buyerId });
      res.json({ success: true, data: requirements });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { latitude, longitude } = req.query as any;
      const requirement = RequirementService.getRequirementById(
        getParam(req, 'id'),
        latitude ? Number(latitude) : undefined,
        longitude ? Number(longitude) : undefined
      );
      res.json({ success: true, data: requirement });
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const buyerId = req.user!.id;
      const { status } = req.body;
      const updated = RequirementService.updateRequirementStatus(getParam(req, 'id'), buyerId, status);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const buyerId = req.user!.id;
      const result = RequirementService.deleteRequirement(getParam(req, 'id'), buyerId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async submitQuotation(req: Request, res: Response, next: NextFunction) {
    try {
      const farmerUserId = req.user!.id;
      const quote = RequirementService.submitQuotation(farmerUserId, getParam(req, 'id'), req.body);
      res.status(201).json({ success: true, data: quote });
    } catch (err) {
      next(err);
    }
  }

  static async listQuotations(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUserId = req.user!.id;
      const quotes = RequirementService.listQuotationsForRequirement(getParam(req, 'id'), currentUserId);
      res.json({ success: true, data: quotes });
    } catch (err) {
      next(err);
    }
  }

  static async listMyQuotations(req: Request, res: Response, next: NextFunction) {
    try {
      const quotes = RequirementService.listMyQuotations(req.user!.id);
      res.json({ success: true, data: quotes });
    } catch (err) {
      next(err);
    }
  }

  static async respondToQuotation(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUserId = req.user!.id;
      const { action, counterPrice } = req.body;
      const result = RequirementService.respondToQuotation(getParam(req, 'quoteId'), currentUserId, action, counterPrice);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
