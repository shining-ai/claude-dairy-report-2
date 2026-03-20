import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/app';

export { request, app };

export const generateToken = (userId: number, role: 'sales' | 'manager', email: string) => {
  return jwt.sign(
    { userId, email, role },
    process.env.JWT_SECRET ?? 'test-secret',
    { expiresIn: '1h' },
  );
};

export const salesToken = generateToken(1, 'sales', 'yamada@example.com');
export const managerToken = generateToken(3, 'manager', 'sato@example.com');
export const otherSalesToken = generateToken(2, 'sales', 'suzuki@example.com');
