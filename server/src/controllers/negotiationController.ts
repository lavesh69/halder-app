import { Request, Response, NextFunction } from 'express';
import { NegotiationService } from '../services/negotiationService';

export class NegotiationController {
  static async createOffer(req: Request, res: Response, next: NextFunction) {
    try {
      const buyerId = req.user!.id;
      const negotiation = NegotiationService.createOffer(buyerId, req.body);
      res.status(201).json({ success: true, data: negotiation });
    } catch (err) {
      next(err);
    }
  }

  static async listUserNegotiations(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const negotiations = NegotiationService.listUserNegotiations(userId);
      res.json({ success: true, data: negotiations });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const negotiation = NegotiationService.getNegotiationById(req.params.id, userId);
      res.json({ success: true, data: negotiation });
    } catch (err) {
      next(err);
    }
  }

  static async counterOffer(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const updated = NegotiationService.counterOffer(req.params.id, userId, req.body);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  static async acceptOffer(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const accepted = NegotiationService.acceptOffer(req.params.id, userId);
      res.json({ success: true, data: accepted });
    } catch (err) {
      next(err);
    }
  }

  static async rejectOffer(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const rejected = NegotiationService.rejectOffer(req.params.id, userId);
      res.json({ success: true, data: rejected });
    } catch (err) {
      next(err);
    }
  }

  static async withdrawOffer(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const withdrawn = NegotiationService.withdrawOffer(req.params.id, userId);
      res.json({ success: true, data: withdrawn });
    } catch (err) {
      next(err);
    }
  }

  static async getDealSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const thread = NegotiationService.getNegotiationById(req.params.id, userId);
      if (!thread.dealSummary) {
        return res.status(400).json({
          success: false,
          error: { code: 'DEAL_NOT_FINALIZED', message: 'Deal summary is only available for accepted negotiations.' },
        });
      }
      res.json({ success: true, data: thread.dealSummary });
    } catch (err) {
      next(err);
    }
  }

  static async getPriceSlabs(req: Request, res: Response, next: NextFunction) {
    try {
      const slabs = NegotiationService.getPriceSlabs(req.params.productId);
      res.json({ success: true, data: slabs });
    } catch (err) {
      next(err);
    }
  }
}
