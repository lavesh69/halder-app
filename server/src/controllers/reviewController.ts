import { Request, Response, NextFunction } from 'express';
import { ReviewService } from '../services/reviewService';

export class ReviewController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const review = ReviewService.create({
        ...req.body,
        customerId: req.user!.id,
      });

      res.status(201).json({
        success: true,
        data: review,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getForFarmer(req: Request, res: Response, next: NextFunction) {
    try {
      const reviews = ReviewService.getForFarmer(req.params.farmerId);
      res.json({
        success: true,
        data: reviews,
      });
    } catch (err) {
      next(err);
    }
  }
}
