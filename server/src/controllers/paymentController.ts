import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/paymentService';
import { PhonePeService } from '../services/phonepeService';
import { PaytmService } from '../services/paytmService';
import { GPayService } from '../services/gpayService';

export class PaymentController {
  static async verifyPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { orderId, paymentMethod, transactionRef } = req.body;
      const result = PaymentService.recordOrderPayment(orderId, paymentMethod, transactionRef);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async getFarmerPayouts(req: Request, res: Response, next: NextFunction) {
    try {
      const farmerId = req.user?.farmerProfileId || (req.query.farmerId as string);
      if (!farmerId) {
        return res.status(400).json({ success: false, error: { message: 'Farmer ID required' } });
      }
      const summary = PaymentService.getFarmerPayoutSummary(farmerId);
      res.status(200).json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  }

  static async requestPayout(req: Request, res: Response, next: NextFunction) {
    try {
      const farmerId = req.user?.farmerProfileId || req.body.farmerId;
      const { amount, upiOrBank } = req.body;
      const result = PaymentService.requestFarmerPayout(farmerId, amount, upiOrBank);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async initiatePhonePe(req: Request, res: Response, next: NextFunction) {
    try {
      const { amount, orderId, customerMobile, redirectUrl } = req.body;
      const customerUserId = req.user?.id;
      const result = await PhonePeService.initiatePayment({
        amount,
        orderId,
        customerMobile,
        customerUserId,
        redirectUrl,
      });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async checkPhonePeStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { merchantTransactionId } = req.params;
      const result = await PhonePeService.checkPaymentStatus(merchantTransactionId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async handlePhonePeWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const xVerifyHeader = req.headers['x-verify'] as string | undefined;
      const result = await PhonePeService.handleWebhook(xVerifyHeader, req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  // Paytm Endpoints
  static async initiatePaytm(req: Request, res: Response, next: NextFunction) {
    try {
      const { amount, orderId, customerMobile } = req.body;
      const customerUserId = req.user?.id;
      const result = await PaytmService.initiateTransaction({
        amount,
        orderId,
        customerMobile,
        customerUserId,
      });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async checkPaytmStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { orderId } = req.params;
      const result = await PaytmService.checkStatus(orderId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async handlePaytmWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await PaytmService.handleWebhook(req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  // Google Pay Endpoints
  static initiateGPay(req: Request, res: Response, next: NextFunction) {
    try {
      const { amount, orderId, customerMobile, customerName, farmerUpiId, farmerName } = req.body;
      const result = GPayService.initiatePayment({
        amount,
        orderId,
        customerMobile,
        customerName,
        farmerUpiId,
        farmerName,
      });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static verifyGPay(req: Request, res: Response, next: NextFunction) {
    try {
      const { orderId, txnRef } = req.body;
      const result = GPayService.verifyPayment(orderId, txnRef);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}
