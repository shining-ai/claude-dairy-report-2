import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../types/index';
import { AppError } from '../middleware/errorHandler';
import * as customersService from '../services/customers.service';

export async function listCustomers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError(401, 'UNAUTHORIZED', '認証が必要です'));

    const query = req.query as Record<string, string>;
    const result = await customersService.listCustomers({
      q: query.q,
      page: query.page ? parseInt(query.page, 10) : undefined,
      per_page: query.per_page ? parseInt(query.per_page, 10) : undefined,
    });
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function createCustomer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError(401, 'UNAUTHORIZED', '認証が必要です'));

    const result = await customersService.createCustomer(req.body as Parameters<typeof customersService.createCustomer>[0]);
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function getCustomer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError(401, 'UNAUTHORIZED', '認証が必要です'));

    const customerId = parseInt(req.params.id, 10);
    if (isNaN(customerId)) return next(new AppError(400, 'VALIDATION_ERROR', '無効なIDです'));

    const result = await customersService.getCustomer(customerId);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function updateCustomer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError(401, 'UNAUTHORIZED', '認証が必要です'));

    const customerId = parseInt(req.params.id, 10);
    if (isNaN(customerId)) return next(new AppError(400, 'VALIDATION_ERROR', '無効なIDです'));

    const result = await customersService.updateCustomer(customerId, req.body as Parameters<typeof customersService.updateCustomer>[1]);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function deleteCustomer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError(401, 'UNAUTHORIZED', '認証が必要です'));

    const customerId = parseInt(req.params.id, 10);
    if (isNaN(customerId)) return next(new AppError(400, 'VALIDATION_ERROR', '無効なIDです'));

    await customersService.deleteCustomer(customerId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
