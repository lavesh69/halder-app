import crypto from 'crypto';
import { Database } from '../db/database';
import { AppError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';

export class PaymentService {
  /**
   * Record order payment & calculate marketplace split (90% farmer, 10% platform)
   * IDEMPOTENT: Prevents duplicate webhook / payment replay attacks
   */
  static recordOrderPayment(orderId: string, paymentMethod: string, transactionRef?: string) {
    const order = Database.get<any>('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) {
      throw AppError.notFound('Order record not found for payment verification');
    }

    // Idempotency check: If already paid or already logged in payout ledger, return existing state
    const existingPayout = Database.get<any>('SELECT * FROM payout_records WHERE order_id = ?', [orderId]);
    if (existingPayout || order.payment_status === 'paid') {
      return {
        success: true,
        orderId,
        orderNumber: order.order_number,
        amount: order.total_amount,
        grossAmount: existingPayout ? existingPayout.gross_amount : order.total_amount,
        platformFee: existingPayout ? existingPayout.platform_fee : 0,
        netFarmerAmount: existingPayout ? existingPayout.net_amount : order.total_amount,
        paymentStatus: 'paid',
        transactionId: existingPayout?.payout_reference || 'TX_IDEMPOTENT_REPLAY',
        verifiedAt: existingPayout?.created_at || order.updated_at,
        isIdempotentReplay: true,
      };
    }

    const txId = transactionRef || `PAY-${uuidv4().slice(0, 8).toUpperCase()}`;
    const now = new Date().toISOString();

    const grossAmount = order.total_amount;
    const platformFee = Math.round(grossAmount * 0.1 * 100) / 100; // 10% Platform fee
    const netFarmerAmount = Math.round((grossAmount - platformFee) * 100) / 100; // 90% Farmer earnings

    Database.transaction(() => {
      // 1. Update order status
      Database.run(
        "UPDATE orders SET payment_status = 'paid', updated_at = ? WHERE id = ?",
        [now, orderId]
      );

      // 2. Record payout ledger
      const payoutId = `payout-${uuidv4()}`;
      Database.run(
        `INSERT INTO payout_records (id, farmer_id, order_id, gross_amount, platform_fee, net_amount, status, payout_method, payout_reference, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', 'upi', ?, ?)`,
        [payoutId, order.farmer_id, orderId, grossAmount, platformFee, netFarmerAmount, txId, now]
      );

      // 3. Update farmer stats
      Database.run(
        'UPDATE farmer_profiles SET total_orders = total_orders + 1, updated_at = ? WHERE id = ?',
        [now, order.farmer_id]
      );
    });

    return {
      success: true,
      orderId,
      orderNumber: order.order_number,
      amount: order.total_amount,
      grossAmount,
      platformFee,
      netFarmerAmount,
      paymentStatus: 'paid',
      transactionId: txId,
      verifiedAt: now,
    };
  }

  /**
   * Get Farmer Payouts Summary
   */
  static getFarmerPayoutSummary(farmerId: string) {
    const payouts = Database.query<any>(
      'SELECT * FROM payout_records WHERE farmer_id = ? ORDER BY created_at DESC',
      [farmerId]
    );

    const pending = payouts
      .filter((p) => p.status === 'pending')
      .reduce((sum, p) => sum + p.net_amount, 0);

    const processed = payouts
      .filter((p) => p.status === 'processed')
      .reduce((sum, p) => sum + p.net_amount, 0);

    const totalGross = payouts.reduce((sum, p) => sum + p.gross_amount, 0);

    return {
      farmerId,
      totalEarnings: Math.round(pending + processed),
      availableBalance: Math.round(pending),
      processedBalance: Math.round(processed),
      totalGrossSales: Math.round(totalGross),
      history: payouts,
    };
  }

  /**
   * Request Payout Withdrawal
   */
  static requestFarmerPayout(farmerId: string, amount: number, upiOrBank: string) {
    const summary = this.getFarmerPayoutSummary(farmerId);
    if (amount > summary.availableBalance || amount <= 0) {
      throw AppError.badRequest('Requested amount exceeds available balance.');
    }

    const now = new Date().toISOString();
    const ref = `IMPS-${uuidv4().slice(0, 8).toUpperCase()}`;

    Database.run(
      "UPDATE payout_records SET status = 'processed', processed_at = ?, payout_reference = ? WHERE farmer_id = ? AND status = 'pending'",
      [now, ref, farmerId]
    );

    return {
      success: true,
      amount,
      upiOrBank,
      transferReference: ref,
      processedAt: now,
      status: 'processed',
    };
  }
}
