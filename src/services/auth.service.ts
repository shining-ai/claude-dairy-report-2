import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import type { JwtPayload, UserRole } from '../types/index';
import { AppError } from '../middleware/errorHandler';

const JWT_SECRET = process.env.JWT_SECRET ?? 'changeme';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '24h';

export interface LoginResult {
  token: string;
  user: {
    user_id: number;
    name: string;
    email: string;
    role: UserRole;
    department: string | null;
  };
}

export async function login(email: string, password: string): Promise<LoginResult> {
  if (!email || !password) {
    throw new AppError(400, 'VALIDATION_ERROR', 'メールアドレスとパスワードは必須です');
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'メールアドレスまたはパスワードが正しくありません');
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'メールアドレスまたはパスワードが正しくありません');
  }

  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role as UserRole,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);

  return {
    token,
    user: {
      user_id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as UserRole,
      department: user.department,
    },
  };
}

export async function getMe(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'ユーザーが見つかりません');
  }

  return {
    user_id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as UserRole,
    department: user.department,
  };
}
