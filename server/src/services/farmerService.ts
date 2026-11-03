import { v4 as uuidv4 } from 'uuid';
import { Database } from '../db/database';
import { AppError } from '../utils/errors';
import { sanitizeText } from '../utils/sanitize';

export class FarmerService {
  static getProfile(farmerId: string) {
    const farmer = Database.get<any>(
      `SELECT f.*, u.name, u.phone, u.email
       FROM farmer_profiles f
       JOIN users u ON f.user_id = u.id
       WHERE f.id = ?`,
      [farmerId]
    );

    if (!farmer) {
      throw AppError.notFound('Farmer profile not found');
    }

    const activeListings = Database.query<any>(
      `SELECT p.*, c.name as category_name
       FROM products p
       JOIN categories c ON p.category_id = c.id
       WHERE p.farmer_id = ? AND p.status = 'active'`,
      [farmerId]
    );

    const reviews = Database.query<any>(
      `SELECT r.*, u.name as customer_name
       FROM reviews r
       JOIN users u ON r.customer_id = u.id
       WHERE r.farmer_id = ?
       ORDER BY r.created_at DESC`,
      [farmerId]
    );

    return {
      ...farmer,
      listings: activeListings,
      reviews,
    };
  }

  static list() {
    return Database.query<any>(
      `SELECT f.id, f.user_id, f.farm_name, f.description, f.location, f.city,
              f.rating, f.total_orders, f.total_listings_count, f.response_rate,
              f.joined_year, f.avatar, f.cover_image, f.verification_status,
              u.name, u.phone
       FROM farmer_profiles f
       JOIN users u ON f.user_id = u.id
       WHERE u.status = 'active'
       ORDER BY f.rating DESC`
    );
  }

  static update(farmerId: string, updates: Record<string, any>) {
    const existing = Database.get<any>('SELECT * FROM farmer_profiles WHERE id = ?', [farmerId]);
    if (!existing) {
      throw AppError.notFound('Farmer profile not found');
    }

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.farmName) {
      fields.push('farm_name = ?');
      values.push(sanitizeText(updates.farmName));
    }
    if (updates.description) {
      fields.push('description = ?');
      values.push(sanitizeText(updates.description));
    }
    if (updates.location) {
      fields.push('location = ?');
      values.push(sanitizeText(updates.location));
    }
    if (updates.city) {
      fields.push('city = ?');
      values.push(sanitizeText(updates.city));
    }
    if (updates.avatar) {
      fields.push('avatar = ?');
      values.push(updates.avatar);
    }

    if (fields.length === 0) return existing;

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(farmerId);

    Database.run(`UPDATE farmer_profiles SET ${fields.join(', ')} WHERE id = ?`, values);
    return FarmerService.getProfile(farmerId);
  }

  static getEarnings(farmerId: string) {
    const farmer = Database.get<any>(
      `SELECT id, farm_name, bank_account_name, bank_account_number, bank_ifsc, bank_name, upi_id
       FROM farmer_profiles WHERE id = ?`,
      [farmerId]
    );

    if (!farmer) {
      throw AppError.notFound('Farmer profile not found');
    }

    const orders = Database.query<any>(
      `SELECT id, order_number, total_amount, subtotal, delivery_fee, farmer_tip, order_status, payment_status, payment_method, created_at
       FROM orders
       WHERE farmer_id = ? AND order_status = 'delivered'
       ORDER BY created_at DESC`,
      [farmerId]
    );

    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    let todayEarnings = 0;
    let todayOrdersCount = 0;
    let weekEarnings = 0;
    let weekOrdersCount = 0;
    let monthEarnings = 0;
    let monthOrdersCount = 0;
    let totalGrossEarnings = 0;
    let totalTipsReceived = 0;
    let totalDeliveryFeeEarned = 0;

    // 7-day bucket for chart
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyMap: Record<string, { label: string; value: number; orders: number; date: string }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * oneDayMs);
      const dateKey = d.toISOString().split('T')[0];
      const dayName = days[d.getDay()];
      weeklyMap[dateKey] = { label: dayName, value: 0, orders: 0, date: dateKey };
    }

    const todayDateStr = new Date().toISOString().split('T')[0];

    for (const o of orders) {
      const orderDate = new Date(o.created_at);
      const orderDateStr = orderDate.toISOString().split('T')[0];
      const orderAgeMs = now - orderDate.getTime();
      const amount = Number((o.total_amount || (o.subtotal + (o.delivery_fee || 0) + (o.farmer_tip || 0))).toFixed(2));
      const tip = Number((o.farmer_tip || 0).toFixed(2));
      const delivFee = Number((o.delivery_fee || 0).toFixed(2));

      totalGrossEarnings += amount;
      totalTipsReceived += tip;
      totalDeliveryFeeEarned += delivFee;

      if (orderDateStr === todayDateStr) {
        todayEarnings += amount;
        todayOrdersCount++;
      }
      if (orderAgeMs <= 7 * oneDayMs) {
        weekEarnings += amount;
        weekOrdersCount++;
      }
      if (orderAgeMs <= 30 * oneDayMs) {
        monthEarnings += amount;
        monthOrdersCount++;
      }

      if (weeklyMap[orderDateStr]) {
        weeklyMap[orderDateStr].value += amount;
        weeklyMap[orderDateStr].orders += 1;
      }
    }

    const weeklyBreakdown = Object.values(weeklyMap);

    const payoutLedger = Database.query<any>(
      `SELECT * FROM payout_records WHERE farmer_id = ? ORDER BY created_at DESC`,
      [farmerId]
    );

    const totalWithdrawn = payoutLedger
      .filter((p) => p.status === 'processed')
      .reduce((sum, p) => sum + (p.net_amount || p.gross_amount), 0);

    const availableBalance = Math.max(0, Number((totalGrossEarnings - totalWithdrawn).toFixed(2)));

    return {
      todayEarnings: Number(todayEarnings.toFixed(2)),
      todayOrdersCount,
      weekEarnings: Number(weekEarnings.toFixed(2)),
      weekOrdersCount,
      monthEarnings: Number(monthEarnings.toFixed(2)),
      monthOrdersCount,
      lifetimeEarnings: Number(totalGrossEarnings.toFixed(2)),
      grossEarnings: Number(totalGrossEarnings.toFixed(2)),
      totalDeliveredCount: orders.length,
      deliveredOrdersCount: orders.length,
      totalTipsReceived: Number(totalTipsReceived.toFixed(2)),
      totalDeliveryFeeEarned: Number(totalDeliveryFeeEarned.toFixed(2)),
      platformCommission: 0,
      availableBalance,
      totalWithdrawn: Number(totalWithdrawn.toFixed(2)),
      weeklyBreakdown,
      bankDetails: {
        bankAccountName: farmer.bank_account_name || '',
        bankAccountNumber: farmer.bank_account_number || '',
        bankIfsc: farmer.bank_ifsc || '',
        bankName: farmer.bank_name || '',
        upiId: farmer.upi_id || '',
        isConfigured: Boolean(farmer.upi_id || (farmer.bank_account_number && farmer.bank_ifsc)),
      },
      orders: orders.slice(0, 20),
      payoutLedger,
    };
  }

  static updatePayoutSettings(farmerId: string, data: {
    bankAccountName?: string;
    bankAccountNumber?: string;
    bankIfsc?: string;
    bankName?: string;
    upiId?: string;
  }) {
    const existing = Database.get<any>('SELECT id FROM farmer_profiles WHERE id = ?', [farmerId]);
    if (!existing) {
      throw AppError.notFound('Farmer profile not found');
    }

    if (data.bankIfsc && data.bankIfsc.trim() && !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(data.bankIfsc.trim())) {
      throw AppError.badRequest('Invalid IFSC format (e.g. SBIN0001234)');
    }

    if (data.upiId && data.upiId.trim() && !/^[\w.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(data.upiId.trim())) {
      throw AppError.badRequest('Invalid UPI ID format (e.g. farmer@sbi or 9876543210@paytm)');
    }

    Database.run(
      `UPDATE farmer_profiles
       SET bank_account_name = ?,
           bank_account_number = ?,
           bank_ifsc = ?,
           bank_name = ?,
           upi_id = ?,
           updated_at = ?
       WHERE id = ?`,
      [
        data.bankAccountName ? sanitizeText(data.bankAccountName.trim()) : '',
        data.bankAccountNumber ? data.bankAccountNumber.trim() : '',
        data.bankIfsc ? data.bankIfsc.trim().toUpperCase() : '',
        data.bankName ? sanitizeText(data.bankName.trim()) : '',
        data.upiId ? data.upiId.trim().toLowerCase() : '',
        new Date().toISOString(),
        farmerId,
      ]
    );

    return {
      success: true,
      bankAccountName: data.bankAccountName || '',
      bankAccountNumber: data.bankAccountNumber || '',
      bankIfsc: data.bankIfsc ? data.bankIfsc.toUpperCase() : '',
      bankName: data.bankName || '',
      upiId: data.upiId || '',
      isConfigured: Boolean(data.upiId || (data.bankAccountNumber && data.bankIfsc)),
    };
  }

  static requestWithdrawal(farmerId: string, input: { amount: number; method?: 'upi' | 'bank_transfer'; note?: string }) {
    if (!input.amount || input.amount <= 0) {
      throw AppError.badRequest('Withdrawal amount must be greater than 0.');
    }

    const earnings = this.getEarnings(farmerId);
    if (input.amount > earnings.availableBalance) {
      throw AppError.badRequest(`Insufficient balance. Available: ₹${earnings.availableBalance}, Requested: ₹${input.amount}`);
    }

    if (!earnings.bankDetails.isConfigured) {
      throw AppError.badRequest('Please configure your Bank Account or UPI ID before requesting a payout.');
    }

    const id = `pay-${uuidv4()}`;
    const now = new Date().toISOString();
    const ref = `SETTLE-HLD-${Math.floor(100000 + Math.random() * 900000)}`;
    const method = input.method || (earnings.bankDetails.upiId ? 'upi' : 'bank_transfer');

    Database.run(
      `INSERT INTO payout_records (
        id, farmer_id, order_id, gross_amount, platform_fee, net_amount,
        status, payout_method, payout_reference, created_at, processed_at
      ) VALUES (?, ?, NULL, ?, 0, ?, 'processed', ?, ?, ?, ?)`,
      [
        id,
        farmerId,
        input.amount,
        input.amount,
        method,
        ref,
        now,
        now,
      ]
    );

    try {
      const farmerProfile = Database.get<any>('SELECT user_id FROM farmer_profiles WHERE id = ?', [farmerId]);
      if (farmerProfile) {
        const { NotificationService } = require('./notificationService');
        NotificationService.createAndPush({
          userId: farmerProfile.user_id,
          recipientRole: 'farmer',
          type: 'system',
          title: '💰 Withdrawal Credited (निकासी सफल)',
          message: `₹${input.amount} has been successfully settled via ${method.toUpperCase()} (${ref}).`,
          data: { payoutId: id, amount: input.amount, reference: ref },
        });
      }
    } catch {}

    return {
      id,
      farmerId,
      amount: input.amount,
      status: 'processed',
      payoutMethod: method,
      reference: ref,
      createdAt: now,
      availableBalance: Number((earnings.availableBalance - input.amount).toFixed(2)),
    };
  }

  static recordPayout(farmerId: string, data: { orderId?: string; grossAmount: number; platformFee: number; netAmount: number; method?: string; reference?: string }) {
    const id = `pay-${uuidv4()}`;
    const now = new Date().toISOString();

    Database.run(
      `INSERT INTO payout_records (id, farmer_id, order_id, gross_amount, platform_fee, net_amount, status, payout_method, payout_reference, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'processed', ?, ?, ?)`,
      [id, farmerId, data.orderId || null, data.grossAmount, data.platformFee, data.netAmount, data.method || 'upi', data.reference || 'direct_upi_settled', now]
    );

    return { id, farmer_id: farmerId, ...data, created_at: now };
  }

  static getPrivateProfile(farmerUserId: string) {
    const user = Database.get<any>(
      `SELECT id, halder_id, name, email, phone, role, profile_image, status, created_at 
       FROM users WHERE id = ?`,
      [farmerUserId]
    );
    if (!user) throw AppError.notFound('Farmer user not found');

    const profile = Database.get<any>(
      'SELECT * FROM farmer_profiles WHERE user_id = ?',
      [farmerUserId]
    );
    if (!profile) throw AppError.notFound('Farmer profile not found');

    return {
      userId: user.id,
      farmerProfileId: profile.id,
      halderId: user.halder_id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      farmName: profile.farm_name,
      description: profile.description,
      location: profile.location,
      city: profile.city,
      latitude: profile.latitude,
      longitude: profile.longitude,
      verificationStatus: profile.verification_status,
      rating: profile.rating,
      totalOrders: profile.total_orders,
      joinedYear: profile.joined_year,
      avatar: user.profile_image || profile.avatar || '',
      coverImage: profile.cover_image || '',
      specialtyCrops: profile.specialty_crops ? JSON.parse(profile.specialty_crops) : [],
      farmSizeAcres: profile.farm_size_acres || 5.0,
      organicCertificationBody: profile.organic_certification_body || 'NPOP Certified Organic',
      waterSource: profile.water_source || 'Natural Rainwater & Deep Aquifer',
      experienceYears: profile.experience_years || 10,
      bankDetails: {
        bankAccountName: profile.bank_account_name || '',
        bankAccountNumber: profile.bank_account_number || '',
        bankIfsc: profile.bank_ifsc || '',
        bankName: profile.bank_name || '',
        upiId: profile.upi_id || '',
        isConfigured: Boolean(profile.upi_id || (profile.bank_account_number && profile.bank_ifsc)),
      },
      kyc: {
        documentType: profile.kyc_document_type || null,
        documentNumber: profile.kyc_document_number ? `••••••••${profile.kyc_document_number.slice(-4)}` : null,
        submittedAt: profile.kyc_submitted_at || null,
        reviewedAt: profile.kyc_reviewed_at || null,
        rejectionReason: profile.kyc_rejection_reason || null,
      },
    };
  }

  static getPublicProfile(farmerProfileId: string) {
    const profile = Database.get<any>(
      `SELECT fp.*, u.name as user_name, u.halder_id as public_halder_id, u.profile_image as user_avatar
       FROM farmer_profiles fp
       JOIN users u ON fp.user_id = u.id
       WHERE fp.id = ?`,
      [farmerProfileId]
    );

    if (!profile) throw AppError.notFound('Farmer profile not found');

    const products = Database.query<any>(
      `SELECT p.*, c.name as category_name, c.emoji as category_emoji
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.farmer_id = ? AND p.status = 'active'
       ORDER BY p.created_at DESC LIMIT 20`,
      [farmerProfileId]
    );

    const reviews = Database.query<any>(
      `SELECT r.id, r.rating, r.review, r.created_at, u.name as customer_name
       FROM reviews r
       JOIN users u ON r.customer_id = u.id
       WHERE r.farmer_id = ?
       ORDER BY r.created_at DESC LIMIT 10`,
      [farmerProfileId]
    );

    // Strictly sanitize and exclude bank accounts, IFSC, UPI ID, KYC documents, and private contact
    return {
      id: profile.id,
      name: profile.user_name,
      halderId: profile.public_halder_id,
      farmName: profile.farm_name,
      description: profile.description,
      location: profile.location,
      city: profile.city,
      verificationStatus: profile.verification_status,
      rating: profile.rating,
      totalOrders: profile.total_orders,
      joinedYear: profile.joined_year,
      avatar: profile.avatar || profile.user_avatar || '',
      coverImage: profile.cover_image || '',
      specialtyCrops: profile.specialty_crops ? JSON.parse(profile.specialty_crops) : [],
      farmSizeAcres: profile.farm_size_acres || 5.0,
      organicCertificationBody: profile.organic_certification_body || 'NPOP Certified Organic',
      waterSource: profile.water_source || 'Natural Rainwater & Deep Aquifer',
      experienceYears: profile.experience_years || 10,
      products,
      reviews,
    };
  }

  static updateFarmerProfile(farmerUserId: string, input: {
    farmName?: string;
    description?: string;
    location?: string;
    city?: string;
    specialtyCrops?: string[];
    farmSizeAcres?: number;
    waterSource?: string;
    experienceYears?: number;
  }) {
    const profile = Database.get<any>(
      'SELECT id FROM farmer_profiles WHERE user_id = ?',
      [farmerUserId]
    );
    if (!profile) throw AppError.notFound('Farmer profile not found');

    const now = new Date().toISOString();

    Database.run(
      `UPDATE farmer_profiles SET
        farm_name = COALESCE(?, farm_name),
        description = COALESCE(?, description),
        location = COALESCE(?, location),
        city = COALESCE(?, city),
        specialty_crops = COALESCE(?, specialty_crops),
        farm_size_acres = COALESCE(?, farm_size_acres),
        water_source = COALESCE(?, water_source),
        experience_years = COALESCE(?, experience_years),
        updated_at = ?
       WHERE user_id = ?`,
      [
        input.farmName !== undefined ? sanitizeText(input.farmName.trim()) : null,
        input.description !== undefined ? sanitizeText(input.description.trim()) : null,
        input.location !== undefined ? sanitizeText(input.location.trim()) : null,
        input.city !== undefined ? sanitizeText(input.city.trim()) : null,
        input.specialtyCrops !== undefined ? JSON.stringify(input.specialtyCrops) : null,
        input.farmSizeAcres !== undefined ? Number(input.farmSizeAcres) : null,
        input.waterSource !== undefined ? sanitizeText(input.waterSource.trim()) : null,
        input.experienceYears !== undefined ? Number(input.experienceYears) : null,
        now,
        farmerUserId,
      ]
    );

    return this.getPrivateProfile(farmerUserId);
  }

  static updateFarmerAvatar(farmerUserId: string, base64Data: string) {
    if (!base64Data || typeof base64Data !== 'string') {
      throw AppError.badRequest('Avatar image data is required');
    }

    if (base64Data.length > 7_000_000) {
      throw AppError.badRequest('Avatar image size exceeds the 5MB maximum limit.');
    }

    const isDataUrl = base64Data.startsWith('data:image/');
    const isHttpUrl = base64Data.startsWith('http://') || base64Data.startsWith('https://');

    if (!isDataUrl && !isHttpUrl) {
      throw AppError.badRequest('Invalid image format. Supported formats: JPEG, PNG, WebP.');
    }

    const now = new Date().toISOString();

    Database.transaction(() => {
      Database.run(
        'UPDATE users SET profile_image = ?, updated_at = ? WHERE id = ?',
        [base64Data, now, farmerUserId]
      );
      Database.run(
        'UPDATE farmer_profiles SET avatar = ?, updated_at = ? WHERE user_id = ?',
        [base64Data, now, farmerUserId]
      );
    });

    return { success: true, avatar: base64Data };
  }
}

