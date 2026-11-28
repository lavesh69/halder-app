import { Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/orderService';
import { getParam } from '../utils/http';

export class OrderController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const customerId = req.user!.id;
      const orders = OrderService.create({
        ...req.body,
        customerId,
      });

      res.status(201).json({
        success: true,
        data: orders,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const order = OrderService.getById(getParam(req, 'id'));
      res.json({
        success: true,
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const orders = OrderService.list({
        userId: user.id,
        role: user.role,
        farmerProfileId: user.farmerProfileId,
        status: req.query.status as string,
      });

      res.json({
        success: true,
        data: orders,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const order = OrderService.updateStatus(
        getParam(req, 'id'),
        req.body.status,
        req.user!.role
      );

      res.json({
        success: true,
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }
}
