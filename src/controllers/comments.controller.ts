import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../types/index';
import { AppError } from '../middleware/errorHandler';
import { prisma } from '../lib/prisma';

export async function listComments(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError(401, 'UNAUTHORIZED', '認証が必要です'));

    const reportId = parseInt(req.params.id, 10);
    if (isNaN(reportId)) return next(new AppError(400, 'VALIDATION_ERROR', '無効なIDです'));

    const report = await prisma.dailyReport.findUnique({ where: { id: reportId } });
    if (!report) return next(new AppError(404, 'NOT_FOUND', '日報が見つかりません'));

    // sales は自分の日報のみ閲覧可
    if (req.user.role === 'sales' && report.userId !== req.user.userId) {
      return next(new AppError(403, 'FORBIDDEN', '権限がありません'));
    }

    const comments = await prisma.comment.findMany({
      where: { reportId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });

    res.status(200).json({
      data: {
        comments: comments.map((c) => ({
          comment_id: c.id,
          user: { user_id: c.user.id, name: c.user.name },
          comment_text: c.commentText,
          created_at: c.createdAt,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function addComment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError(401, 'UNAUTHORIZED', '認証が必要です'));

    const reportId = parseInt(req.params.id, 10);
    if (isNaN(reportId)) return next(new AppError(400, 'VALIDATION_ERROR', '無効なIDです'));

    const report = await prisma.dailyReport.findUnique({ where: { id: reportId } });
    if (!report) return next(new AppError(404, 'NOT_FOUND', '日報が見つかりません'));

    const { comment_text } = req.body as { comment_text?: string };
    if (!comment_text) return next(new AppError(400, 'VALIDATION_ERROR', 'コメント内容は必須です'));

    const comment = await prisma.comment.create({
      data: {
        reportId,
        userId: req.user.userId,
        commentText: comment_text,
      },
      include: { user: { select: { id: true, name: true } } },
    });

    res.status(201).json({
      data: {
        comment_id: comment.id,
        user: { user_id: comment.user.id, name: comment.user.name },
        comment_text: comment.commentText,
        created_at: comment.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteComment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError(401, 'UNAUTHORIZED', '認証が必要です'));

    const reportId = parseInt(req.params.id, 10);
    const commentId = parseInt(req.params.comment_id, 10);
    if (isNaN(reportId) || isNaN(commentId)) {
      return next(new AppError(400, 'VALIDATION_ERROR', '無効なIDです'));
    }

    const comment = await prisma.comment.findFirst({
      where: { id: commentId, reportId },
    });
    if (!comment) return next(new AppError(404, 'NOT_FOUND', 'コメントが見つかりません'));

    if (comment.userId !== req.user.userId) {
      return next(new AppError(403, 'FORBIDDEN', '自分のコメントのみ削除できます'));
    }

    await prisma.comment.delete({ where: { id: commentId } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
