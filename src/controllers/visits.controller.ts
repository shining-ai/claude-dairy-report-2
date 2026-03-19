import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../types/index';
import { AppError } from '../middleware/errorHandler';
import { prisma } from '../lib/prisma';

async function getOwnDraftReport(reportId: number, userId: number) {
  const report = await prisma.dailyReport.findUnique({ where: { id: reportId } });
  if (!report) {
    throw new AppError(404, 'NOT_FOUND', '日報が見つかりません');
  }
  if (report.userId !== userId) {
    throw new AppError(403, 'FORBIDDEN', '権限がありません');
  }
  if (report.status !== 'draft') {
    throw new AppError(403, 'FORBIDDEN', 'draft状態の日報のみ操作できます');
  }
  return report;
}

export async function addVisit(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError(401, 'UNAUTHORIZED', '認証が必要です'));

    const reportId = parseInt(req.params.id, 10);
    if (isNaN(reportId)) return next(new AppError(400, 'VALIDATION_ERROR', '無効なIDです'));

    await getOwnDraftReport(reportId, req.user.userId);

    const { customer_id, visit_content, sort_order } = req.body as {
      customer_id?: number;
      visit_content?: string;
      sort_order?: number;
    };

    if (!customer_id) return next(new AppError(400, 'VALIDATION_ERROR', '顧客IDは必須です'));
    if (!visit_content) return next(new AppError(400, 'VALIDATION_ERROR', '訪問内容は必須です'));

    const visit = await prisma.visitRecord.create({
      data: {
        reportId,
        customerId: customer_id,
        visitContent: visit_content,
        sortOrder: sort_order ?? 1,
      },
      include: {
        customer: { select: { id: true, companyName: true, contactName: true } },
      },
    });

    res.status(201).json({
      data: {
        visit_id: visit.id,
        customer: {
          customer_id: visit.customer.id,
          company_name: visit.customer.companyName,
          contact_name: visit.customer.contactName,
        },
        visit_content: visit.visitContent,
        sort_order: visit.sortOrder,
        created_at: visit.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateVisit(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError(401, 'UNAUTHORIZED', '認証が必要です'));

    const reportId = parseInt(req.params.id, 10);
    const visitId = parseInt(req.params.visit_id, 10);
    if (isNaN(reportId) || isNaN(visitId)) {
      return next(new AppError(400, 'VALIDATION_ERROR', '無効なIDです'));
    }

    await getOwnDraftReport(reportId, req.user.userId);

    const existingVisit = await prisma.visitRecord.findFirst({
      where: { id: visitId, reportId },
    });
    if (!existingVisit) {
      return next(new AppError(404, 'NOT_FOUND', '訪問記録が見つかりません'));
    }

    const { customer_id, visit_content, sort_order } = req.body as {
      customer_id?: number;
      visit_content?: string;
      sort_order?: number;
    };

    const visit = await prisma.visitRecord.update({
      where: { id: visitId },
      data: {
        ...(customer_id !== undefined ? { customerId: customer_id } : {}),
        ...(visit_content !== undefined ? { visitContent: visit_content } : {}),
        ...(sort_order !== undefined ? { sortOrder: sort_order } : {}),
      },
      include: {
        customer: { select: { id: true, companyName: true, contactName: true } },
      },
    });

    res.status(200).json({
      data: {
        visit_id: visit.id,
        customer: {
          customer_id: visit.customer.id,
          company_name: visit.customer.companyName,
          contact_name: visit.customer.contactName,
        },
        visit_content: visit.visitContent,
        sort_order: visit.sortOrder,
        updated_at: visit.updatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteVisit(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError(401, 'UNAUTHORIZED', '認証が必要です'));

    const reportId = parseInt(req.params.id, 10);
    const visitId = parseInt(req.params.visit_id, 10);
    if (isNaN(reportId) || isNaN(visitId)) {
      return next(new AppError(400, 'VALIDATION_ERROR', '無効なIDです'));
    }

    await getOwnDraftReport(reportId, req.user.userId);

    const existingVisit = await prisma.visitRecord.findFirst({
      where: { id: visitId, reportId },
    });
    if (!existingVisit) {
      return next(new AppError(404, 'NOT_FOUND', '訪問記録が見つかりません'));
    }

    const visitCount = await prisma.visitRecord.count({ where: { reportId } });
    if (visitCount <= 1) {
      return next(new AppError(400, 'MINIMUM_VISIT_REQUIRED', '訪問記録は最低1件必要です'));
    }

    await prisma.visitRecord.delete({ where: { id: visitId } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function reorderVisits(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError(401, 'UNAUTHORIZED', '認証が必要です'));

    const reportId = parseInt(req.params.id, 10);
    if (isNaN(reportId)) return next(new AppError(400, 'VALIDATION_ERROR', '無効なIDです'));

    await getOwnDraftReport(reportId, req.user.userId);

    const { visits } = req.body as { visits?: Array<{ visit_id: number; sort_order: number }> };
    if (!visits || !Array.isArray(visits)) {
      return next(new AppError(400, 'VALIDATION_ERROR', 'visitsは配列で指定してください'));
    }

    await prisma.$transaction(
      visits.map((v) =>
        prisma.visitRecord.updateMany({
          where: { id: v.visit_id, reportId },
          data: { sortOrder: v.sort_order },
        }),
      ),
    );

    res.status(200).json({
      data: {
        visits: visits.map((v) => ({
          visit_id: v.visit_id,
          sort_order: v.sort_order,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}
