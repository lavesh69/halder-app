import { Request, Response, NextFunction } from 'express';
import { AdminService } from '../services/adminService';
import { DeviceBanService } from '../services/deviceBanService';
import { getParam } from '../utils/http';

export class AdminController {
  static async getKPIs(req: Request, res: Response, next: NextFunction) {
    try {
      const kpis = AdminService.getOverviewKPIs();
      res.json({
        success: true,
        data: kpis,
      });
    } catch (err) {
      next(err);
    }
  }

  static async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const users = AdminService.listUsers(search);
      res.json({
        success: true,
        data: users,
      });
    } catch (err) {
      next(err);
    }
  }

  static async toggleUserStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const result = AdminService.toggleUserStatus(getParam(req, 'id'), req.user!.id);
      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async verifyFarmer(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = req.body;
      const result = AdminService.verifyFarmer(getParam(req, 'id'), status, req.user!.id);
      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async listCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = AdminService.listAllCategories();
      res.json({
        success: true,
        data: categories,
      });
    } catch (err) {
      next(err);
    }
  }

  static async addCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, emoji, image } = req.body;
      const cat = AdminService.addCategory(name, emoji, image);
      res.status(201).json({
        success: true,
        data: cat,
      });
    } catch (err) {
      next(err);
    }
  }

  static async toggleCategoryActive(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const cat = AdminService.toggleCategoryActive(id, req.user!.id);
      res.json({
        success: true,
        data: cat,
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = AdminService.deleteCategory(id, req.user!.id);
      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async listAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const logs = AdminService.listAuditLogs();
      res.json({
        success: true,
        data: logs,
      });
    } catch (err) {
      next(err);
    }
  }

  static async listPendingKYC(req: Request, res: Response, next: NextFunction) {
    try {
      const { KycService } = await import('../services/kycService');
      const pending = KycService.getPendingKYCList();
      res.json({
        success: true,
        data: pending,
      });
    } catch (err) {
      next(err);
    }
  }

  static async reviewKYC(req: Request, res: Response, next: NextFunction) {
    try {
      const { KycService } = await import('../services/kycService');
      const { decision, reason } = req.body;
      const result = KycService.adminReviewKYC(getParam(req, 'id'), req.user!.id, decision, reason);
      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async banDevice(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, deviceId, fingerprint, reason, notes } = req.body;
      const result = DeviceBanService.banDevice({
        userId,
        deviceId,
        fingerprint,
        reason: reason || 'Violation of HALDHAR Marketplace Rules',
        bannedBy: req.user?.name || 'Administrator',
        notes,
      });
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async listBannedDevices(req: Request, res: Response, next: NextFunction) {
    try {
      const list = DeviceBanService.listBannedDevices();
      res.json({ success: true, data: list });
    } catch (err) {
      next(err);
    }
  }

  static async unbanDevice(req: Request, res: Response, next: NextFunction) {
    try {
      const result = DeviceBanService.unbanDevice(getParam(req, 'id'));
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async purgeTestAccounts(req: Request, res: Response, next: NextFunction) {
    try {
      const result = AdminService.purgeTestAccounts();
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}
