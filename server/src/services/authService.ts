import { Database } from '../db/database';
import { CryptoUtil } from '../utils/crypto';
import { AppError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';
import { sanitizeText } from '../utils/sanitize';
import { IdentityService } from './identityService';
import { logAuditEvent } from '../middleware/audit';

export class AuthService {
  static async register(data: {
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
    const cleanPhone = data.phone.trim();

    const existingEmail = Database.get('SELECT id FROM users WHERE LOWER(email) = ?', [cleanEmail]);
    if (existingEmail) {
      throw AppError.conflict('An account with this email address already exists.', 'EMAIL_ALREADY_EXISTS');
    }

    const existingPhone = Database.get('SELECT id FROM users WHERE phone = ?', [cleanPhone]);
    if (existingPhone) {
      throw AppError.conflict('An account with this phone number already exists.', 'PHONE_ALREADY_EXISTS');
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
        `INSERT INTO users (id, halder_id, name, email, phone, password_hash, role, profile_image, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
        [
          userId,
          halderId,
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
      'SELECT id, halder_id, name, email, phone, role, profile_image, status, created_at FROM users WHERE id = ?',
      [userId]
    );

    const farmerProfile = farmerProfileId
      ? Database.get<any>('SELECT * FROM farmer_profiles WHERE id = ?', [farmerProfileId])
      : null;

    return { user, farmerProfile, token };
  }

  static async login(emailOrPhone: string, password?: string, requestedRole?: 'customer' | 'farmer' | 'admin') {
    const cleanInput = emailOrPhone.trim().toLowerCase();
    const user = Database.get<any>(
      'SELECT * FROM users WHERE LOWER(email) = ? OR phone = ?',
      [cleanInput, emailOrPhone.trim()]
    );

    if (!user) {
      if (password) {
        throw AppError.unauthorized('Invalid email or password.', 'INVALID_CREDENTIALS');
      }
      return AuthService.register({
        name: cleanInput.includes('@') ? cleanInput.split('@')[0] : `User ${cleanInput.slice(-4)}`,
        email: cleanInput.includes('@') ? cleanInput : `user_${Date.now()}@halder.com`,
        phone: cleanInput.includes('@') ? `+91 ${Math.floor(1000000000 + Math.random() * 9000000000)}` : cleanInput,
        role: requestedRole === 'farmer' ? 'farmer' : 'customer',
      });
    }

    if (user.status === 'suspended') {
      throw AppError.forbidden('Your account is currently suspended. Please contact admin.', 'ACCOUNT_SUSPENDED');
    }

    // RBAC Security Check: Admin accounts strictly require password verification
    if (user.role === 'admin') {
      if (!password) {
        throw AppError.unauthorized('Administrator password required.', 'ADMIN_PASSWORD_REQUIRED');
      }
      const isMatch = await CryptoUtil.comparePassword(password, user.password_hash);
      if (!isMatch) {
        throw AppError.unauthorized('Invalid admin credentials entered.', 'INVALID_CREDENTIALS');
      }
    } else if (password && user.password_hash) {
      const isMatch = await CryptoUtil.comparePassword(password, user.password_hash);
      if (!isMatch) {
        throw AppError.unauthorized('Invalid password entered. Please check your credentials.', 'INVALID_CREDENTIALS');
      }
    }

    const token = CryptoUtil.generateToken({
      userId: user.id,
      role: user.role,
      email: user.email,
    });

    const { password_hash, ...safeUser } = user;

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
      'SELECT id, halder_id, name, email, phone, role, profile_image, status, created_at FROM users WHERE id = ?',
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
}
