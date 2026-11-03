import { Request, Response, NextFunction } from 'express';
import { ReportService } from '../services/reportService';

export class ReportController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const report = ReportService.create(req.user!.id, req.body);
      res.status(201).json({ success: true, message: 'Support ticket/grievance submitted successfully', data: report });
    } catch (err) {
      next(err);
    }
  }

  static async listMy(req: Request, res: Response, next: NextFunction) {
    try {
      const reports = ReportService.listMy(req.user!.id);
      res.json({ success: true, count: reports.length, data: reports });
    } catch (err) {
      next(err);
    }
  }

  static async listAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const category = typeof req.query.category === 'string' ? req.query.category : undefined;
      const priority = typeof req.query.priority === 'string' ? req.query.priority : undefined;
      const reports = ReportService.listAll({ status, category, priority });
      res.json({ success: true, count: reports.length, data: reports });
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const result = ReportService.updateStatus(req.params.id, req.body, req.user!.id);
      res.json({ success: true, message: 'Grievance ticket status updated', data: result });
    } catch (err) {
      next(err);
    }
  }
}
