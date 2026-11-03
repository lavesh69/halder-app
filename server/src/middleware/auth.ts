import { Request, Response, NextFunction } from 'express';
import { CryptoUtil, TokenPayload } from '../utils/crypto';
import { AppError } from '../utils/errors';
import { Database } from '../db/database';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'farmer' | 'admin';
  status: 'active' | 'suspended';
  farmerProfileId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function authenticateUser(req: Request, res: Response, next: NextFunction) {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.halder_token) {
    token = req.cookies.halder_token;
  }

  if (!token) {
    return next(AppError.unauthorized('Authentication token is required. Please login.'));
  }

  try {
    const payload = CryptoUtil.verifyToken(token);

    const user = Database.get<any>(
      'SELECT id, name, email, phone, role, status FROM users WHERE id = ?',
      [payload.userId]
    );

    if (!user) {
      return next(AppError.unauthorized('User account no longer exists.'));
    }

    if (user.status === 'suspended') {
      return next(AppError.forbidden('Your account has been suspended. Please contact administrator.', 'ACCOUNT_SUSPENDED'));
    }

    let farmerProfileId: string | undefined;
    if (user.role === 'farmer') {
      const farmerProfile = Database.get<any>(
        'SELECT id FROM farmer_profiles WHERE user_id = ?',
        [user.id]
      );
      farmerProfileId = farmerProfile?.id;
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      farmerProfileId,
    };

    next();
  } catch (err: any) {
    return next(AppError.unauthorized('Invalid or expired authentication token.'));
  }
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  let token: string | undefined;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.halder_token) {
    token = req.cookies.halder_token;
  }

  if (!token) return next();

  try {
    const payload = CryptoUtil.verifyToken(token);
    const user = Database.get<any>(
      'SELECT id, name, email, phone, role, status FROM users WHERE id = ?',
      [payload.userId]
    );
    if (user && user.status === 'active') {
      let farmerProfileId: string | undefined;
      if (user.role === 'farmer') {
        const fp = Database.get<any>('SELECT id FROM farmer_profiles WHERE user_id = ?', [user.id]);
        farmerProfileId = fp?.id;
      }
      req.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        farmerProfileId,
      };
    }
  } catch {}
  next();
}
