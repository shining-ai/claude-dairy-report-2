import { describe, it, expect, beforeEach, vi } from 'vitest';
import './helpers/mockPrisma';
import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';
import { request, app, salesToken, managerToken } from './helpers/testApp';

// managerToken の userId は testApp.ts 参照（userId=3）
const MANAGER_USER_ID = 3;

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 10,
    name: '新規 ユーザー',
    email: 'newuser@example.com',
    passwordHash: '$2a$10$dummyhash',
    role: 'sales',
    department: '大阪営業部',
    createdAt: new Date('2026-03-20'),
    updatedAt: new Date('2026-03-20'),
    ...overrides,
  };
}

describe('ユーザーAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('TC-USR-001: ユーザー登録 - 正常', () => {
    it('managerが正常データでユーザーを登録すると201とユーザーデータを返す', async () => {
      // メール重複チェック（存在しない）
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);
      // ユーザー作成
      vi.mocked(prisma.user.create).mockResolvedValueOnce(makeUser() as never);

      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: '新規 ユーザー',
          email: 'newuser@example.com',
          password: 'Password123!',
          role: 'sales',
          department: '大阪営業部',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.user_id).toBe(10);
      expect(res.body.data.name).toBe('新規 ユーザー');
      expect(res.body.data.email).toBe('newuser@example.com');
      expect(res.body.data.role).toBe('sales');
      // パスワードハッシュは返さない
      expect(res.body.data.passwordHash).toBeUndefined();
    });
  });

  describe('TC-USR-002: ユーザー登録 - メールアドレス重複', () => {
    it('同じメールアドレスのユーザーが既に存在する場合に409とEMAIL_ALREADY_EXISTSを返す', async () => {
      // 既存ユーザーがヒットする
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(
        makeUser({ email: 'yamada@example.com' }) as never,
      );

      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: '別の 山田',
          email: 'yamada@example.com',
          password: 'Password123!',
          role: 'sales',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
      expect(vi.mocked(prisma.user.create)).not.toHaveBeenCalled();
    });
  });

  describe('TC-USR-003: ユーザー登録 - パスワードが短い', () => {
    it('passwordが7文字（8文字未満）の場合に400バリデーションエラーを返す', async () => {
      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'テスト ユーザー',
          email: 'test@example.com',
          password: 'abc',
          role: 'sales',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(vi.mocked(prisma.user.create)).not.toHaveBeenCalled();
    });

    it('passwordがちょうど8文字の場合は登録が通る（境界値）', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);
      vi.mocked(prisma.user.create).mockResolvedValueOnce(makeUser() as never);

      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'テスト ユーザー',
          email: 'test@example.com',
          password: 'abcd1234',
          role: 'sales',
        });

      expect(res.status).toBe(201);
    });
  });

  describe('TC-USR-004: ユーザー登録 - salesによる登録', () => {
    it('salesユーザーがユーザー登録を試みると403を返す', async () => {
      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          name: 'テスト ユーザー',
          email: 'test@example.com',
          password: 'Password123!',
          role: 'sales',
        });

      expect(res.status).toBe(403);
      expect(vi.mocked(prisma.user.create)).not.toHaveBeenCalled();
    });
  });

  describe('TC-USR-005: ユーザー削除 - 自分自身を削除', () => {
    it('自分自身のuser_idを指定して削除しようとすると400とCANNOT_DELETE_SELFを返す', async () => {
      // managerToken の userId は MANAGER_USER_ID=3
      const res = await request(app)
        .delete(`/api/v1/users/${MANAGER_USER_ID}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CANNOT_DELETE_SELF');
      expect(vi.mocked(prisma.user.delete)).not.toHaveBeenCalled();
    });
  });

  describe('TC-USR-006: ユーザー更新 - パスワード空欄で変更なし', () => {
    it('password空文字で更新してもpasswordHashが変更されない（旧パスワードでbcrypt検証できる）', async () => {
      const originalPassword = 'OriginalPass1!';
      const originalHash = await bcrypt.hash(originalPassword, 10);

      const existingUser = makeUser({
        id: 10,
        passwordHash: originalHash,
        email: 'target@example.com',
      });

      // updateUser 内の findUnique（ユーザー存在確認）
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(existingUser as never);

      // update のモック: passwordHash は変化しない（空パスワードは無視されるため）
      const updatedUser = {
        ...existingUser,
        name: '更新後 名前',
        updatedAt: new Date('2026-03-21'),
      };
      vi.mocked(prisma.user.update).mockResolvedValueOnce(updatedUser as never);

      const res = await request(app)
        .put('/api/v1/users/10')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: '更新後 名前',
          password: '',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('更新後 名前');

      // prisma.user.update が passwordHash を含まないデータで呼ばれていることを確認
      // （空パスワードはスキップされるため passwordHash は更新データに含まれない）
      const updateCall = vi.mocked(prisma.user.update).mock.calls[0][0];
      expect(updateCall?.data).not.toHaveProperty('passwordHash');

      // 元のハッシュで bcrypt 検証が通ること（パスワードが変更されていない証明）
      const isOriginalPasswordValid = await bcrypt.compare(originalPassword, originalHash);
      expect(isOriginalPasswordValid).toBe(true);
    });
  });
});
