import { Request, Response, NextFunction } from 'express';
import { AdminService } from '../services/adminService';

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
      const result = AdminService.toggleUserStatus(req.params.id, req.user!.id);
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
      const result = AdminService.verifyFarmer(req.params.id, status, req.user!.id);
      res.json({
        success: true,
        data: result,
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
      const result = KycService.adminReviewKYC(req.params.id, req.user!.id, decision, reason);
      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}
