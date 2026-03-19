import type { Response, NextFunction } from 'express';
import type { AuthRequest, UserRole } from '../types/index';
import { AppError } from '../middleware/errorHandler';
import * as usersService from '../services/users.service';

export async function listUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError(401, 'UNAUTHORIZED', '認証が必要です'));

    const { role } = req.query as { role?: string };
    const result = await usersService.listUsers(role as UserRole | undefined);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function createUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError(401, 'UNAUTHORIZED', '認証が必要です'));

    const result = await usersService.createUser(req.body as Parameters<typeof usersService.createUser>[0]);
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function getUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError(401, 'UNAUTHORIZED', '認証が必要です'));

    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) return next(new AppError(400, 'VALIDATION_ERROR', '無効なIDです'));

    const result = await usersService.getUser(userId);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError(401, 'UNAUTHORIZED', '認証が必要です'));

    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) return next(new AppError(400, 'VALIDATION_ERROR', '無効なIDです'));

    const result = await usersService.updateUser(userId, req.body as Parameters<typeof usersService.updateUser>[1]);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError(401, 'UNAUTHORIZED', '認証が必要です'));

    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) return next(new AppError(400, 'VALIDATION_ERROR', '無効なIDです'));

    await usersService.deleteUser(userId, req.user.userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
