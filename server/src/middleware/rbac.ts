import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

export function requireRole(...allowedRoles: ('customer' | 'farmer' | 'admin')[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        AppError.forbidden(
          `Access restricted to [${allowedRoles.join(', ')}]. Current role: ${req.user.role}`,
          'INSUFFICIENT_ROLE_PERMISSIONS'
        )
      );
    }

    next();
  };
}

export const requireCustomer = requireRole('customer', 'admin');
export const requireFarmer = requireRole('farmer', 'admin');
export const requireAdmin = requireRole('admin');
