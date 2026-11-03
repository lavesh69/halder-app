import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { Database } from '../db/database';

export function verifyProductOwnership(req: Request, res: Response, next: NextFunction) {
  const productId = req.params.id;
  const user = req.user;

  if (!user) return next(AppError.unauthorized());
  if (user.role === 'admin') return next();

  const product = Database.get<any>(
    'SELECT id, farmer_id FROM products WHERE id = ?',
    [productId]
  );

  if (!product) {
    return next(AppError.notFound('Product listing not found'));
  }

  if (product.farmer_id !== user.farmerProfileId) {
    return next(AppError.forbidden("You are not authorized to modify another farmer's product listing."));
  }

  next();
}

export function verifyOrderAccess(req: Request, res: Response, next: NextFunction) {
  const orderId = req.params.id;
  const user = req.user;

  if (!user) return next(AppError.unauthorized());
  if (user.role === 'admin') return next();

  const order = Database.get<any>(
    'SELECT id, customer_id, farmer_id FROM orders WHERE id = ?',
    [orderId]
  );

  if (!order) {
    return next(AppError.notFound('Order not found'));
  }

  const isBuyer = order.customer_id === user.id;
  const isSeller = order.farmer_id === user.farmerProfileId;

  if (!isBuyer && !isSeller) {
    return next(AppError.forbidden('You are not authorized to access this private order record.'));
  }

  next();
}

export function verifyConversationAccess(req: Request, res: Response, next: NextFunction) {
  const conversationId = req.params.id;
  const user = req.user;

  if (!user) return next(AppError.unauthorized());
  if (user.role === 'admin') return next();

  const conv = Database.get<any>(
    'SELECT id, customer_id, farmer_id FROM conversations WHERE id = ?',
    [conversationId]
  );

  if (!conv) {
    return next(AppError.notFound('Conversation not found'));
  }

  const isParticipant = conv.customer_id === user.id || conv.farmer_id === user.farmerProfileId;
  if (!isParticipant) {
    return next(AppError.forbidden('You are not a participant in this conversation.'));
  }

  next();
}
