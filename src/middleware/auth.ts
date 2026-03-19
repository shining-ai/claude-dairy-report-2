import type { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthRequest, JwtPayload, UserRole } from '../types/index';
import { AppError } from './errorHandler';

const JWT_SECRET = process.env.JWT_SECRET ?? 'changeme';

export function authenticate(req: AuthRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError(401, 'UNAUTHORIZED', '認証が必要です'));
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    next(new AppError(401, 'UNAUTHORIZED', 'トークンが無効です'));
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError(401, 'UNAUTHORIZED', '認証が必要です'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'FORBIDDEN', '権限がありません'));
    }
    next();
  };
}
