import type { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  // Prisma unique constraint violation
  if (err.constructor.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as Error & { code: string };
    if (prismaErr.code === 'P2002') {
      res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: '既に同じデータが存在します',
        },
      });
      return;
    }
    if (prismaErr.code === 'P2025') {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'リソースが見つかりません',
        },
      });
      return;
    }
  }

  console.error(err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'サーバーエラーが発生しました',
    },
  });
}
