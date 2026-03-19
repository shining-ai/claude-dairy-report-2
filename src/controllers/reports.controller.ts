import type { Response, NextFunction } from 'express';
import type { AuthRequest, ReportStatus } from '../types/index';
import { AppError } from '../middleware/errorHandler';
import * as reportsService from '../services/reports.service';

export async function listReports(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError(401, 'UNAUTHORIZED', '認証が必要です'));

    const query = req.query as Record<string, string>;
    const result = await reportsService.listReports(req.user.userId, req.user.role, {
      date_from: query.date_from,
      date_to: query.date_to,
      user_id: query.user_id ? parseInt(query.user_id, 10) : undefined,
      status: query.status as ReportStatus | undefined,
      page: query.page ? parseInt(query.page, 10) : undefined,
      per_page: query.per_page ? parseInt(query.per_page, 10) : undefined,
    });
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function createReport(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError(401, 'UNAUTHORIZED', '認証が必要です'));
    if (req.user.role !== 'sales') return next(new AppError(403, 'FORBIDDEN', '権限がありません'));

    const result = await reportsService.createReport(req.user.userId, req.body as Parameters<typeof reportsService.createReport>[1]);
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function getReport(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError(401, 'UNAUTHORIZED', '認証が必要です'));

    const reportId = parseInt(req.params.id, 10);
    if (isNaN(reportId)) return next(new AppError(400, 'VALIDATION_ERROR', '無効なIDです'));

    const result = await reportsService.getReport(reportId, req.user.userId, req.user.role);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function updateReport(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError(401, 'UNAUTHORIZED', '認証が必要です'));

    const reportId = parseInt(req.params.id, 10);
    if (isNaN(reportId)) return next(new AppError(400, 'VALIDATION_ERROR', '無効なIDです'));

    const { problem, plan } = req.body as { problem?: string; plan?: string };
    const result = await reportsService.updateReport(reportId, req.user.userId, { problem, plan });
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function submitReport(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError(401, 'UNAUTHORIZED', '認証が必要です'));

    const reportId = parseInt(req.params.id, 10);
    if (isNaN(reportId)) return next(new AppError(400, 'VALIDATION_ERROR', '無効なIDです'));

    const result = await reportsService.submitReport(reportId, req.user.userId);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function reviewReport(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError(401, 'UNAUTHORIZED', '認証が必要です'));

    const reportId = parseInt(req.params.id, 10);
    if (isNaN(reportId)) return next(new AppError(400, 'VALIDATION_ERROR', '無効なIDです'));

    const result = await reportsService.reviewReport(reportId);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}
