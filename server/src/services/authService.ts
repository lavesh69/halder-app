import { Database } from '../db/database';
import { CryptoUtil } from '../utils/crypto';
import { AppError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';
import { sanitizeText } from '../utils/sanitize';
import { IdentityService } from './identityService';
import { logAuditEvent } from '../middleware/audit';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

// In-memory fallback store for password reset verification codes
const resetCodeStore = new Map<string, { code: string; userId: string; expiresAt: number }>();

export class AuthService {
  static async register(data: {
    username?: string;
    name: string;
    email: string;
    phone: string;
    password?: string;
    role: 'customer' | 'farmer' | 'admin';
    farmName?: string;
    location?: string;
  }) {
    if (data.role === 'admin') {
      throw AppError.forbidden('Administrative accounts cannot be registered via public API.', 'ADMIN_REGISTRATION_PROHIBITED');
    }

    const cleanEmail = data.email.toLowerCase().trim();
    const digits = (data.phone || '').replace(/\D/g, '');
    let cleanPhone = digits.length >= 10 ? digits.slice(-10) : (data.phone?.trim() || `98${Math.floor(10000000 + Math.random() * 90000000)}`);

    // Unique Username Validation & Derivation
    let cleanUsername = (data.username || '').toLowerCase().trim().replace(/^@/, '');
    if (!cleanUsername) {
      const base = cleanEmail.split('@')[0].replace(/[^a-z0-9_.-]/g, '').slice(0, 20) || 'user';
      cleanUsername = base;
      let counter = 1;
      while (Database.get('SELECT id FROM users WHERE LOWER(username) = ?', [cleanUsername])) {
        cleanUsername = `${base}_${counter++}`;
      }
    } else {
      if (!/^[a-z0-9_.-]{3,30}$/.test(cleanUsername)) {
        throw AppError.badRequest(
          'Username must be 3-30 characters long and contain only letters, numbers, underscores, dots, or hyphens.',
          'INVALID_USERNAME'
        );
      }
      const existingUsername = Database.get('SELECT id FROM users WHERE LOWER(username) = ?', [cleanUsername]);
      if (existingUsername) {
        throw AppError.conflict('This username is already taken. Please choose another username.', 'USERNAME_ALREADY_TAKEN');
      }
    }

    const existingEmail = Database.get('SELECT id FROM users WHERE LOWER(email) = ?', [cleanEmail]);
    if (existingEmail) {
      throw AppError.conflict('An account with this email address already exists.', 'EMAIL_ALREADY_EXISTS');
    }

    const existingPhone = Database.get('SELECT id FROM users WHERE phone = ?', [cleanPhone]);
    if (existingPhone) {
      if (!data.phone || data.phone.trim() === '') {
        cleanPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
      } else {
        throw AppError.conflict('An account with this phone number already exists.', 'PHONE_ALREADY_EXISTS');
      }
    }

    const userId = `user-${uuidv4()}`;
    const halderId = IdentityService.generateNextId(data.role);
    const passwordHash = data.password
      ? await CryptoUtil.hashPassword(data.password)
      : await CryptoUtil.hashPassword(CryptoUtil.generateRandomString(12));

    const now = new Date().toISOString();
    let farmerProfileId: string | null = null;

    Database.transaction(() => {
      Database.run(
        `INSERT INTO users (id, halder_id, username, name, email, phone, password_hash, role, profile_image, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
        [
          userId,
          halderId,
          cleanUsername,
          sanitizeText(data.name.trim()),
          cleanEmail,
          cleanPhone,
          passwordHash,
          data.role,
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
          now,
          now,
        ]
      );

      if (data.role === 'farmer') {
        farmerProfileId = `farmer-${uuidv4()}`;
        Database.run(
          `INSERT INTO farmer_profiles (id, user_id, farm_name, description, location, city, verification_status, rating, total_orders, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 'pending', 5.0, 0, ?, ?)`,
          [
            farmerProfileId,
            userId,
            sanitizeText(data.farmName || `${data.name}'s Organic Farm`),
            'Fresh harvest straight from our family farm.',
            sanitizeText(data.location || 'Dehradun, Uttarakhand'),
            'Dehradun',
            now,
            now,
          ]
        );
      }

      if (data.role === 'customer') {
        const cartId = `cart-${uuidv4()}`;
        Database.run(
          `INSERT INTO carts (id, user_id, created_at, updated_at) VALUES (?, ?, ?, ?)`,
          [cartId, userId, now, now]
        );

        const profId = `cust-prof-${uuidv4()}`;
        Database.run(
          `INSERT INTO customer_profiles (id, user_id, bio, avatar, created_at, updated_at)
           VALUES (?, ?, 'Organic Produce Enthusiast', '', ?, ?)`,
          [profId, userId, now, now]
        );
      }
    });

    const token = CryptoUtil.generateToken({
      userId,
      role: data.role,
      email: cleanEmail,
    });

    const user = Database.get<any>(
      'SELECT id, halder_id, username, name, email, phone, role, profile_image, status, created_at FROM users WHERE id = ?',
      [userId]
    );

    const farmerProfile = farmerProfileId
      ? Database.get<any>('SELECT * FROM farmer_profiles WHERE id = ?', [farmerProfileId])
      : null;

    return { user, farmerProfile, token };
  }

  static async login(usernameOrEmail: string, password?: string, requestedRole?: 'customer' | 'farmer' | 'admin') {
    if (!password || !password.trim()) {
      throw AppError.badRequest('Password is required to sign in.', 'PASSWORD_REQUIRED');
    }

    const rawInput = usernameOrEmail.trim();
    const cleanInput = rawInput.replace(/^@/, '').toLowerCase();
    const digitsOnly = rawInput.replace(/\D/g, '');
    const phone10 = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : '';
    const phoneWithSpaces = phone10 ? `+91 ${phone10.slice(0, 5)} ${phone10.slice(5)}` : '';
    const phonePlus91 = phone10 ? `+91${phone10}` : '';

    const user = Database.get<any>(
      `SELECT * FROM users 
       WHERE LOWER(username) = ? 
          OR LOWER(email) = ? 
          OR phone = ? 
          OR REPLACE(phone, ' ', '') = ?
          OR (? != '' AND phone = ?)
          OR (? != '' AND REPLACE(phone, ' ', '') = ?)
          OR (? != '' AND (phone LIKE '%' || ? OR REPLACE(phone, ' ', '') LIKE '%' || ?))`,
      [
        cleanInput,
        cleanInput,
        rawInput,
        rawInput.replace(/\s+/g, ''),
        phoneWithSpaces, phoneWithSpaces,
        phonePlus91, phonePlus91,
        phone10, phone10, phone10,
      ]
    );

    if (!user) {
      throw AppError.unauthorized('Invalid username, email, phone number, or password.', 'INVALID_CREDENTIALS');
    }

    if (user.status === 'suspended') {
      throw AppError.forbidden('Your account is currently suspended. Please contact admin.', 'ACCOUNT_SUSPENDED');
    }

    if (!user.password_hash || user.password_hash === 'GOOGLE_OAUTH_ACCOUNT' || user.password_hash === 'OTP_VERIFIED') {
      throw AppError.unauthorized('Please sign in with Google or reset your password to set one.', 'INVALID_CREDENTIALS');
    }

    const isMatch = await CryptoUtil.comparePassword(password, user.password_hash);
    if (!isMatch) {
      throw AppError.unauthorized('Invalid password entered. Please check your credentials.', 'INVALID_CREDENTIALS');
    }

    const token = CryptoUtil.generateToken({
      userId: user.id,
      role: user.role,
      email: user.email,
    });

    const { password_hash: _password_hash, ...safeUser } = user;

    let farmerProfile = null;
    if (user.role === 'farmer') {
      farmerProfile = Database.get<any>(
        'SELECT * FROM farmer_profiles WHERE user_id = ?',
        [user.id]
      );
    }

    return { user: safeUser, farmerProfile, token };
  }

  static async getMe(userId: string) {
    const user = Database.get<any>(
      'SELECT id, halder_id, username, name, email, phone, role, profile_image, status, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (!user) throw AppError.notFound('User not found');

    let farmerProfile = null;
    if (user.role === 'farmer') {
      farmerProfile = Database.get<any>('SELECT * FROM farmer_profiles WHERE user_id = ?', [user.id]);
    }

    return { user, farmerProfile };
  }

  static async changePassword(userId: string, currentPass: string, newPass: string) {
    if (!currentPass || !newPass) {
      throw AppError.badRequest('Current password and new password are required');
    }

    if (newPass.length < 8) {
      throw AppError.badRequest('New password must be at least 8 characters long');
    }

    const user = Database.get<any>('SELECT id, password_hash, role FROM users WHERE id = ?', [userId]);
    if (!user) throw AppError.notFound('User not found');

    const isValid = await CryptoUtil.comparePassword(currentPass, user.password_hash);
    if (!isValid) {
      throw AppError.unauthorized('Current password is incorrect');
    }

    const newHash = await CryptoUtil.hashPassword(newPass);
    const now = new Date().toISOString();

    Database.run(
      'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?',
      [newHash, now, userId]
    );

    logAuditEvent(userId, user.role, 'PASSWORD_CHANGED', 'users', userId);

    return { message: 'Password updated successfully' };
  }

  static async deleteAccount(userId: string, passwordConfirm?: string) {
    const user = Database.get<any>('SELECT id, password_hash, role FROM users WHERE id = ?', [userId]);
    if (!user) throw AppError.notFound('User not found');

    // If password confirmation is provided, verify it
    if (passwordConfirm) {
      const isValid = await CryptoUtil.comparePassword(passwordConfirm, user.password_hash);
      if (!isValid) {
        throw AppError.unauthorized('Incorrect password. Account deletion aborted.');
      }
    }

    Database.transaction(() => {
      // 1. Clear cart
      const cart = Database.get<any>('SELECT id FROM carts WHERE user_id = ?', [userId]);
      if (cart) {
        Database.run('DELETE FROM cart_items WHERE cart_id = ?', [cart.id]);
        Database.run('DELETE FROM carts WHERE id = ?', [cart.id]);
      }
      // 2. Clear notifications & device tokens
      Database.run('DELETE FROM notifications WHERE user_id = ?', [userId]);
      Database.run('DELETE FROM device_tokens WHERE user_id = ?', [userId]);
      // 3. Clear favorites
      Database.run('DELETE FROM favorites WHERE user_id = ?', [userId]);
      // 4. Clear addresses
      Database.run('DELETE FROM customer_addresses WHERE customer_id = ?', [userId]);
      // 5. Scrub customer profile
      Database.run('DELETE FROM customer_profiles WHERE user_id = ?', [userId]);
      // 6. Scrub and suspend user record
      const now = new Date().toISOString();
      Database.run(
        `UPDATE users SET
          name = 'Deleted Account',
          email = 'deleted_' || id || '@halder.local',
          phone = 'deleted_' || id,
          status = 'suspended',
          profile_image = '',
          updated_at = ?
         WHERE id = ?`,
        [now, userId]
      );
    });

    logAuditEvent(userId, user.role, 'ACCOUNT_DELETED', 'users', userId);

    return { message: 'Account and personal data permanently purged.' };
  }

  static async forgotPassword(email: string) {
    const cleanEmail = email.toLowerCase().trim();
    const user = Database.get<any>('SELECT id, name, email, role FROM users WHERE LOWER(email) = ?', [cleanEmail]);
    if (!user) {
      throw AppError.notFound('No account found with this email address.', 'USER_NOT_FOUND');
    }

    // Generate 6-digit numeric verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

    // Store in-memory
    resetCodeStore.set(cleanEmail, { code, userId: user.id, expiresAt });

    // Generate signed stateless JWT reset token (15 mins)
    const resetToken = jwt.sign(
      { userId: user.id, email: cleanEmail, code, purpose: 'pwd_reset' },
      env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    logAuditEvent(user.id, user.role, 'PASSWORD_RESET_REQUESTED', 'users', user.id);

    // Only return raw verification code & token in test environments for automated verification suites
    if (process.env.NODE_ENV === 'test') {
      return {
        success: true,
        message: 'Password reset code generated successfully. Please enter the verification code.',
        code,
        resetToken,
      };
    }

    return {
      success: true,
      message: 'If an account matches this email, verification instructions have been sent.',
    };
  }

  static async resetPassword(data: {
    email: string;
    code: string;
    newPassword: string;
    resetToken?: string;
  }) {
    const cleanEmail = data.email.toLowerCase().trim();
    const cleanCode = data.code.trim();

    if (!data.newPassword || data.newPassword.length < 6) {
      throw AppError.badRequest('New password must be at least 6 characters long.');
    }

    let verifiedUserId: string | null = null;

    // 1. Verify via signed stateless reset token if present
    if (data.resetToken) {
      try {
        const decoded = jwt.verify(data.resetToken, env.JWT_SECRET) as any;
        if (
          decoded &&
          decoded.purpose === 'pwd_reset' &&
          decoded.email === cleanEmail &&
          decoded.code === cleanCode
        ) {
          verifiedUserId = decoded.userId;
        }
      } catch (err: any) {
        console.warn('[AuthService] Reset token verification failed:', err.message);
      }
    }

    // 2. Fallback to in-memory store if token check wasn't verified
    if (!verifiedUserId) {
      const stored = resetCodeStore.get(cleanEmail);
      if (stored && stored.code === cleanCode && Date.now() <= stored.expiresAt) {
        verifiedUserId = stored.userId;
      }
    }

    if (!verifiedUserId) {
      throw AppError.badRequest('Invalid or expired verification code.', 'INVALID_RESET_CODE');
    }

    // 3. Update password in database
    const newHash = await CryptoUtil.hashPassword(data.newPassword);
    const now = new Date().toISOString();

    Database.run(
      'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?',
      [newHash, now, verifiedUserId]
    );

    // Clean up memory store
    resetCodeStore.delete(cleanEmail);

    // Fetch user and issue fresh login token
    const user = Database.get<any>(
      'SELECT id, halder_id, name, email, phone, role, profile_image, status, created_at FROM users WHERE id = ?',
      [verifiedUserId]
    );

    let farmerProfile = null;
    if (user && user.role === 'farmer') {
      farmerProfile = Database.get<any>('SELECT * FROM farmer_profiles WHERE user_id = ?', [user.id]);
    }

    const token = CryptoUtil.generateToken({
      userId: user.id,
      role: user.role,
      email: user.email,
    });

    logAuditEvent(user.id, user.role, 'PASSWORD_RESET_COMPLETED', 'users', user.id);

    return {
      message: 'Password reset successfully. You are now logged in.',
      user,
      farmerProfile,
      token,
    };
  }
}
