import { Request, Response, NextFunction } from 'express';
import { CartService } from '../services/cartService';

export class CartController {
  static async getCart(req: Request, res: Response, next: NextFunction) {
    try {
      const cart = CartService.getCart(req.user!.id);
      res.json({
        success: true,
        data: cart,
      });
    } catch (err) {
      next(err);
    }
  }

  static async addItem(req: Request, res: Response, next: NextFunction) {
    try {
      const { productId, quantity } = req.body;
      const cart = CartService.addItem(req.user!.id, productId, Number(quantity));
      res.json({
        success: true,
        data: cart,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateQuantity(req: Request, res: Response, next: NextFunction) {
    try {
      const { productId, quantity } = req.body;
      const cart = CartService.updateQuantity(req.user!.id, productId, Number(quantity));
      res.json({
        success: true,
        data: cart,
      });
    } catch (err) {
      next(err);
    }
  }

  static async removeItem(req: Request, res: Response, next: NextFunction) {
    try {
      const cart = CartService.removeItem(req.user!.id, req.params.productId);
      res.json({
        success: true,
        data: cart,
      });
    } catch (err) {
      next(err);
    }
  }

  static async clear(req: Request, res: Response, next: NextFunction) {
    try {
      const result = CartService.clear(req.user!.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
