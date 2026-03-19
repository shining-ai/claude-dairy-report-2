import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import type { UserRole } from '../types/index';
import { AppError } from '../middleware/errorHandler';

interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  department?: string;
}

interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  department?: string;
}

function formatUserFull(u: {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    user_id: u.id,
    name: u.name,
    email: u.email,
    role: u.role as UserRole,
    department: u.department,
    created_at: u.createdAt,
    updated_at: u.updatedAt,
  };
}

export async function listUsers(role?: UserRole) {
  const users = await prisma.user.findMany({
    where: role ? { role } : undefined,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
    },
    orderBy: { id: 'asc' },
  });

  return {
    users: users.map((u) => ({
      user_id: u.id,
      name: u.name,
      email: u.email,
      role: u.role as UserRole,
      department: u.department,
    })),
  };
}

export async function createUser(input: CreateUserInput) {
  if (!input.name) throw new AppError(400, 'VALIDATION_ERROR', '名前は必須です');
  if (!input.email) throw new AppError(400, 'VALIDATION_ERROR', 'メールアドレスは必須です');
  if (!input.password) throw new AppError(400, 'VALIDATION_ERROR', 'パスワードは必須です');
  if (input.password.length < 8) {
    throw new AppError(400, 'VALIDATION_ERROR', 'パスワードは8文字以上必要です');
  }
  if (!input.role || !['sales', 'manager'].includes(input.role)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'ロールはsalesまたはmanagerを指定してください');
  }

  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AppError(409, 'EMAIL_ALREADY_EXISTS', 'このメールアドレスは既に使用されています');
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
      department: input.department,
    },
  });

  return {
    user_id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as UserRole,
    department: user.department,
    created_at: user.createdAt,
  };
}

export async function getUser(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'NOT_FOUND', 'ユーザーが見つかりません');
  return formatUserFull(user);
}

export async function updateUser(userId: number, input: UpdateUserInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'NOT_FOUND', 'ユーザーが見つかりません');

  // email 変更時の重複チェック
  if (input.email && input.email !== user.email) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new AppError(409, 'EMAIL_ALREADY_EXISTS', 'このメールアドレスは既に使用されています');
    }
  }

  let passwordHash: string | undefined;
  if (input.password && input.password.length > 0) {
    passwordHash = await bcrypt.hash(input.password, 10);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(passwordHash !== undefined ? { passwordHash } : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.department !== undefined ? { department: input.department } : {}),
    },
  });

  return {
    user_id: updated.id,
    name: updated.name,
    email: updated.email,
    role: updated.role as UserRole,
    department: updated.department,
    updated_at: updated.updatedAt,
  };
}

export async function deleteUser(userId: number, requestUserId: number) {
  if (userId === requestUserId) {
    throw new AppError(400, 'CANNOT_DELETE_SELF', '自分自身を削除することはできません');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'NOT_FOUND', 'ユーザーが見つかりません');

  await prisma.user.delete({ where: { id: userId } });
}
