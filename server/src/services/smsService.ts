import crypto from 'crypto';
import { env } from '../config/env';
import { Logger } from '../utils/logger';
import { AppError } from '../utils/errors';

interface OtpRecord {
  phone: string;
  otp: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
}

export class SmsService {
  // In-memory active OTP registry (keyed by clean 10-digit phone)
  private static otpStore = new Map<string, OtpRecord>();
  // Rate limiting counter (phone -> array of send timestamps in ms)
  private static rateLimitStore = new Map<string, number[]>();

  private static cleanPhone(phone: string): string {
    return phone.replace(/\D/g, '').slice(-10);
  }

  /**
   * 1. Generate & Dispatch 6-Digit OTP via SMS
   */
  static async sendOtp(rawPhone: string): Promise<{
    success: boolean;
    message: string;
    cooldownSeconds: number;
    devOtp?: string;
  }> {
    const phone = this.cleanPhone(rawPhone);
    if (phone.length !== 10) {
      throw AppError.badRequest('Please enter a valid 10-digit Indian mobile number.');
    }

    const now = Date.now();

    // Check 60-second resend cooldown
    const existing = this.otpStore.get(phone);
    if (existing && now - existing.lastSentAt < 60000) {
      const waitTime = Math.ceil((60000 - (now - existing.lastSentAt)) / 1000);
      throw AppError.tooManyRequests(`Please wait ${waitTime}s before requesting a new OTP.`);
    }

    // Check rate limit: max 5 requests per 15 minutes
    const timestamps = (this.rateLimitStore.get(phone) || []).filter((t) => now - t < 15 * 60 * 1000);
    if (timestamps.length >= 5) {
      throw AppError.tooManyRequests('Too many OTP attempts. Please try again after 15 minutes.');
    }
    timestamps.push(now);
    this.rateLimitStore.set(phone, timestamps);

    // Cryptographically secure 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = now + 5 * 60 * 1000; // 5 mins

    this.otpStore.set(phone, {
      phone,
      otp,
      expiresAt,
      attempts: 0,
      lastSentAt: now,
    });

    const smsMessage = `[HALDER] Your login OTP is ${otp}. Valid for 5 minutes. Do not share this code with anyone. (किसान और ग्राहक सीधी मंडी)`;

    // Dispatch SMS based on provider
    let dispatched = false;

    if (env.SMS_PROVIDER === 'fast2sms' && env.FAST2SMS_API_KEY) {
      try {
        const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
          method: 'POST',
          headers: {
            authorization: env.FAST2SMS_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            route: 'otp',
            variables_values: otp,
            numbers: phone,
          }),
        });
        const data = await response.json();
        if (data.return) {
          dispatched = true;
          Logger.info(`[SmsService] Fast2SMS OTP dispatched to +91${phone}`);
        }
      } catch (err: any) {
        Logger.error('[SmsService] Fast2SMS dispatch failed, falling back to console', err);
      }
    } else if (env.SMS_PROVIDER === 'twilio' && env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
      try {
        const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64');
        const params = new URLSearchParams({
          To: `+91${phone}`,
          From: env.TWILIO_PHONE_NUMBER || '',
          Body: smsMessage,
        });

        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
          }
        );
        if (response.ok) {
          dispatched = true;
          Logger.info(`[SmsService] Twilio OTP dispatched to +91${phone}`);
        }
      } catch (err: any) {
        Logger.error('[SmsService] Twilio dispatch failed, falling back to console', err);
      }
    }

    // Console Logging for Dev/Sandbox
    Logger.info(`=======================================================`);
    Logger.info(`📱 [HALDER SMS OTP] Mobile: +91 ${phone} | OTP: ${otp}`);
    Logger.info(`=======================================================`);

    return {
      success: true,
      message: dispatched
        ? `OTP sent successfully via SMS to +91 ${phone}`
        : `OTP sent! (Dev Mode: Check console for OTP ${otp})`,
      cooldownSeconds: 60,
      devOtp: env.NODE_ENV !== 'production' ? otp : undefined,
    };
  }

  /**
   * 2. Verify 6-Digit OTP
   */
  static verifyOtp(rawPhone: string, code: string): { success: boolean; message: string } {
    const phone = this.cleanPhone(rawPhone);
    const record = this.otpStore.get(phone);

    if (!record) {
      throw AppError.badRequest('No OTP was requested for this mobile number, or it has expired.');
    }

    const now = Date.now();
    if (now > record.expiresAt) {
      this.otpStore.delete(phone);
      throw AppError.badRequest('OTP has expired. Please request a new code.');
    }

    record.attempts += 1;
    if (record.attempts > 3) {
      this.otpStore.delete(phone);
      throw AppError.forbidden('Maximum OTP verification attempts exceeded. Please request a new OTP.', 'TOO_MANY_ATTEMPTS');
    }

    // In dev mode, allow master bypass 1234 or real dynamic OTP
    const isMasterDevCode = env.NODE_ENV !== 'production' && code === '1234';
    const isValid = record.otp === code.trim() || isMasterDevCode;

    if (!isValid) {
      throw AppError.unauthorized(`Invalid OTP entered. (${3 - record.attempts} attempts remaining)`);
    }

    // Valid: Clear record
    this.otpStore.delete(phone);
    return {
      success: true,
      message: 'Mobile number verified successfully.',
    };
  }
}
