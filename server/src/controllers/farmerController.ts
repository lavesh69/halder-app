import { Request, Response, NextFunction } from 'express';
import { FarmerService } from '../services/farmerService';
import { KycService } from '../services/kycService';

export class FarmerController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const farmers = FarmerService.list();
      res.json({
        success: true,
        data: farmers,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const profile = FarmerService.getProfile(req.params.id);
      res.json({
        success: true,
        data: profile,
      });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const farmerId = req.params.id;
      if (req.user!.role !== 'admin' && req.user!.farmerProfileId !== farmerId) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Cannot edit another farmer\'s profile.' },
        });
      }

      const updated = FarmerService.update(farmerId, req.body);
      res.json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getEarnings(req: Request, res: Response, next: NextFunction) {
    try {
      const farmerId = req.params.id;
      if (req.user!.role !== 'admin' && req.user!.farmerProfileId !== farmerId) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Cannot access another farmer\'s earnings.' },
        });
      }

      const earnings = FarmerService.getEarnings(farmerId);
      res.json({
        success: true,
        data: earnings,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updatePayoutSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const farmerId = req.params.id;
      if (req.user!.role !== 'admin' && req.user!.farmerProfileId !== farmerId) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Cannot update payout settings for another farmer.' },
        });
      }

      const result = FarmerService.updatePayoutSettings(farmerId, req.body);
      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async requestWithdrawal(req: Request, res: Response, next: NextFunction) {
    try {
      const farmerId = req.params.id;
      if (req.user!.role !== 'admin' && req.user!.farmerProfileId !== farmerId) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Cannot request withdrawal for another farmer.' },
        });
      }

      const withdrawal = FarmerService.requestWithdrawal(farmerId, req.body);
      res.status(201).json({
        success: true,
        data: withdrawal,
      });
    } catch (err) {
      next(err);
    }
  }

  static async recordPayout(req: Request, res: Response, next: NextFunction) {
    try {
      const farmerId = req.params.id;
      if (req.user!.role !== 'admin' && req.user!.farmerProfileId !== farmerId) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Cannot record payout for another farmer.' },
        });
      }

      const payout = FarmerService.recordPayout(farmerId, req.body);
      res.status(201).json({
        success: true,
        data: payout,
      });
    } catch (err) {
      next(err);
    }
  }

  static async submitKYC(req: Request, res: Response, next: NextFunction) {
    try {
      const farmerId = req.params.id;
      if (req.user!.role !== 'admin' && req.user!.farmerProfileId !== farmerId) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Cannot submit KYC for another farmer.' },
        });
      }

      const result = KycService.submitKYC(farmerId, req.body);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getKYC(req: Request, res: Response, next: NextFunction) {
    try {
      const farmerId = req.params.id;
      if (req.user!.role !== 'admin' && req.user!.farmerProfileId !== farmerId) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Cannot access KYC for another farmer.' },
        });
      }

      const result = KycService.getKYCStatus(farmerId);
      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getPrivateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const profile = FarmerService.getPrivateProfile(req.user!.id);
      res.json({ success: true, data: profile });
    } catch (err) {
      next(err);
    }
  }

  static async getPublicProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const profile = FarmerService.getPublicProfile(req.params.id);
      res.json({ success: true, data: profile });
    } catch (err) {
      next(err);
    }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = FarmerService.updateFarmerProfile(req.user!.id, req.body);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  static async updateAvatar(req: Request, res: Response, next: NextFunction) {
    try {
      const { avatar } = req.body;
      const result = FarmerService.updateFarmerAvatar(req.user!.id, avatar);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}
