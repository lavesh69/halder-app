import { Router } from 'express';
import { PaymentController } from '../controllers/paymentController';
import { authenticateUser, optionalAuth } from '../middleware/auth';
import { requireFarmer } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';
import { z } from 'zod';

export const paymentRoutes = Router();

// Legacy/Mock Verify
paymentRoutes.post(
  '/verify',
  authenticateUser,
  validateBody(
    z.object({
      orderId: z.string(),
      paymentMethod: z.enum(['upi', 'cod', 'card', 'wallet', 'phonepe', 'gpay', 'paytm']),
      transactionRef: z.string().optional(),
    })
  ),
  PaymentController.verifyPayment
);

// PhonePe PG: Initiate Payment
paymentRoutes.post(
  '/phonepe/initiate',
  optionalAuth,
  validateBody(
    z.object({
      amount: z.number().positive(),
      orderId: z.string().optional(),
      customerMobile: z.string().optional(),
      redirectUrl: z.string().optional(),
    })
  ),
  PaymentController.initiatePhonePe
);

// PhonePe PG: Query Status
paymentRoutes.get(
  '/phonepe/status/:merchantTransactionId',
  optionalAuth,
  PaymentController.checkPhonePeStatus
);

// PhonePe PG: Webhook Callback
paymentRoutes.post(
  '/phonepe/webhook',
  PaymentController.handlePhonePeWebhook
);

// Paytm PG: Initiate Transaction
paymentRoutes.post(
  '/paytm/initiate',
  optionalAuth,
  validateBody(
    z.object({
      amount: z.number().positive(),
      orderId: z.string().optional(),
      customerMobile: z.string().optional(),
    })
  ),
  PaymentController.initiatePaytm
);

// Paytm PG: Query Status
paymentRoutes.get(
  '/paytm/status/:orderId',
  optionalAuth,
  PaymentController.checkPaytmStatus
);

// Paytm PG: Webhook Callback
paymentRoutes.post(
  '/paytm/webhook',
  PaymentController.handlePaytmWebhook
);

// Google Pay: Initiate Payment
paymentRoutes.post(
  '/gpay/initiate',
  optionalAuth,
  validateBody(
    z.object({
      amount: z.number().positive(),
      orderId: z.string().optional(),
      customerMobile: z.string().optional(),
      customerName: z.string().optional(),
      farmerUpiId: z.string().optional(),
      farmerName: z.string().optional(),
    })
  ),
  PaymentController.initiateGPay
);

// Google Pay: Verify Payment
paymentRoutes.post(
  '/gpay/verify',
  optionalAuth,
  validateBody(
    z.object({
      orderId: z.string(),
      txnRef: z.string().optional(),
    })
  ),
  PaymentController.verifyGPay
);

// Farmer Payouts Summary
paymentRoutes.get(
  '/payouts',
  authenticateUser,
  requireFarmer,
  PaymentController.getFarmerPayouts
);

// Farmer Request Payout
paymentRoutes.post(
  '/request-payout',
  authenticateUser,
  requireFarmer,
  validateBody(
    z.object({
      amount: z.number().positive(),
      upiOrBank: z.string(),
    })
  ),
  PaymentController.requestPayout
);

export default paymentRoutes;
