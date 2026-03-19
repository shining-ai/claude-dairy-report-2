import type { Request } from 'express';

export type UserRole = 'sales' | 'manager';
export type ReportStatus = 'draft' | 'submitted' | 'reviewed';

export interface JwtPayload {
  userId: number;
  email: string;
  role: UserRole;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}
