import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { GoogleAuthService } from '../services/googleAuthService';
import { SmsService } from '../services/smsService';
import { Database } from '../db/database';
import { CryptoUtil } from '../utils/crypto';
import { IdentityService } from '../services/identityService';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.register(req.body);
      res.cookie('halder_token', result.token, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { emailOrPhone, password, role } = req.body;
      const result = await AuthService.login(emailOrPhone, password, role);

      res.cookie('halder_token', result.token, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async googleLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { idToken, role } = req.body;
      const result = await GoogleAuthService.authenticateWithGoogle({ idToken, role });

      res.cookie('halder_token', result.token, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(result.isNewUser ? 201 : 200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async logout(req: Request, res: Response) {
    res.clearCookie('halder_token');
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  }

  static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const data = await AuthService.getMe(userId);
      res.json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  static async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { currentPassword, newPassword } = req.body;
      const result = await AuthService.changePassword(userId, currentPassword, newPassword);
      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteMe(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { password } = req.body || {};
      const result = await AuthService.deleteAccount(userId, password);
      res.clearCookie('halder_token');
      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  // -------------------------------------------------------------
  // Dynamic Real SMS OTP Flow
  // -------------------------------------------------------------
  static async sendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone } = req.body;
      const result = await SmsService.sendOtp(phone);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, otp, role = 'customer', name = 'HALDER Member' } = req.body;
      const verifyResult = SmsService.verifyOtp(phone, otp);

      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      let user = Database.get<any>(
        'SELECT id, halder_id, name, email, phone, role, profile_image, status FROM users WHERE phone = ?',
        [cleanPhone]
      );

      let isNewUser = false;
      let farmerProfile = null;

      if (!user) {
        // Automatically create account on first phone verification
        isNewUser = true;
        const newUserId = `user-${uuidv4()}`;
        const halderId = IdentityService.generateNextId(role);
        const placeholderEmail = `phone_${cleanPhone}@halder.in`;
        const now = new Date().toISOString();

        Database.transaction(() => {
          Database.run(
            `INSERT INTO users (id, halder_id, name, email, phone, password_hash, role, profile_image, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, 'OTP_VERIFIED', ?, 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80', 'active', ?, ?)`,
            [newUserId, halderId, name, placeholderEmail, cleanPhone, role, now, now]
          );

          if (role === 'farmer') {
            const fProfId = `farmer-${uuidv4()}`;
            Database.run(
              `INSERT INTO farmer_profiles (id, user_id, farm_name, village, taluk, district, state, pin_code, total_acreage, created_at, updated_at)
               VALUES (?, ?, ?, 'Rampur', 'Dehradun', 'Dehradun', 'Uttarakhand', '248001', 5.0, ?, ?)`,
              [fProfId, newUserId, `${name}'s Organic Farm`, now, now]
            );
          } else {
            const addrId = `addr-${uuidv4()}`;
            Database.run(
              `INSERT INTO customer_profiles (id, user_id, bio, created_at, updated_at)
               VALUES (?, ?, 'HALDER Direct Member', ?, ?)`,
              [`cust-${uuidv4()}`, newUserId, now, now]
            );
            Database.run(
              `INSERT INTO customer_addresses (id, customer_id, label, name, phone, house_building, street_locality, city, state, postal_code, is_default, created_at, updated_at)
               VALUES (?, ?, 'Home', ?, ?, 'Flat / House', 'Main Market', 'Dehradun', 'Uttarakhand', '248001', 1, ?, ?)`,
              [addrId, newUserId, name, cleanPhone, now, now]
            );
            Database.run(
              `UPDATE customer_profiles SET default_address_id = ? WHERE user_id = ?`,
              [addrId, newUserId]
            );
          }
        });

        user = Database.get<any>(
          'SELECT id, halder_id, name, email, phone, role, profile_image, status FROM users WHERE id = ?',
          [newUserId]
        );
      }

      if (user.role === 'farmer') {
        farmerProfile = Database.get<any>('SELECT * FROM farmer_profiles WHERE user_id = ?', [user.id]);
      }

      const token = CryptoUtil.generateToken({
        userId: user.id,
        role: user.role,
        email: user.email,
      });

      res.cookie('halder_token', token, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(isNewUser ? 201 : 200).json({
        success: true,
        message: verifyResult.message,
        data: {
          user,
          farmerProfile,
          token,
          isNewUser,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
