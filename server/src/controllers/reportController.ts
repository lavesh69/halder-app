import { Request, Response, NextFunction } from 'express';
import { ReportService } from '../services/reportService';

export class ReportController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const report = ReportService.create(req.user!.id, req.body);
      res.status(201).json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }

  static async listAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const reports = ReportService.listAll(status);
      res.json({ success: true, data: reports });
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const result = ReportService.updateStatus(req.params.id, req.body.status);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}
