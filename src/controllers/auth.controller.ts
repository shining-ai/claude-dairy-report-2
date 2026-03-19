import type { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../types/index';
import { AppError } from '../middleware/errorHandler';
import * as authService from '../services/auth.service';

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    const result = await authService.login(email ?? '', password ?? '');
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export function logout(_req: Request, res: Response, _next: NextFunction): void {
  res.status(204).send();
}

export async function me(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      return next(new AppError(401, 'UNAUTHORIZED', '認証が必要です'));
    }
    const user = await authService.getMe(req.user.userId);
    res.status(200).json({ data: user });
  } catch (err) {
    next(err);
  }
}
