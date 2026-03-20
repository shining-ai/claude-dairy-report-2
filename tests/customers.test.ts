import { describe, it, expect, beforeEach, vi } from 'vitest';
import './helpers/mockPrisma';
import { prisma } from '../src/lib/prisma';
import { request, app, salesToken, managerToken } from './helpers/testApp';

function makeCustomer(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    companyName: '株式会社A商事',
    contactName: '田中 一郎',
    phone: '03-1234-5678',
    email: 'tanaka@a-shoji.example.com',
    address: '東京都千代田区1-1-1',
    notes: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('顧客APIテスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('TC-CST-001: 顧客登録 - 正常', () => {
    it('managerが会社名を含む正常データで顧客を登録すると201と顧客データを返す', async () => {
      vi.mocked(prisma.customer.create).mockResolvedValueOnce(makeCustomer() as never);

      const res = await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          company_name: '株式会社A商事',
          contact_name: '田中 一郎',
          phone: '03-1234-5678',
          email: 'tanaka@a-shoji.example.com',
          address: '東京都千代田区1-1-1',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.customer_id).toBe(1);
      expect(res.body.data.company_name).toBe('株式会社A商事');
      expect(res.body.data.contact_name).toBe('田中 一郎');
      // prisma.customer.create が正しい会社名で呼ばれているか確認
      expect(vi.mocked(prisma.customer.create)).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ companyName: '株式会社A商事' }),
        }),
      );
    });
  });

  describe('TC-CST-002: 顧客登録 - salesによる登録', () => {
    it('salesユーザーが顧客登録を試みると403を返す', async () => {
      const res = await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({ company_name: '株式会社テスト' });

      expect(res.status).toBe(403);
      expect(vi.mocked(prisma.customer.create)).not.toHaveBeenCalled();
    });
  });

  describe('TC-CST-003: 顧客登録 - 会社名なし', () => {
    it('company_nameを省略すると400バリデーションエラーを返す', async () => {
      const res = await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          contact_name: '田中 一郎',
          phone: '03-1234-5678',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(vi.mocked(prisma.customer.create)).not.toHaveBeenCalled();
    });

    it('company_nameが空文字の場合に400バリデーションエラーを返す', async () => {
      const res = await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ company_name: '' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('TC-CST-004: 顧客一覧取得 - キーワード検索', () => {
    it('qパラメーターにA商事を指定すると一致する顧客のみ返す', async () => {
      const matchingCustomers = [
        {
          id: 1,
          companyName: '株式会社A商事',
          contactName: '田中 一郎',
          phone: '03-1234-5678',
          email: 'tanaka@a-shoji.example.com',
        },
      ];
      vi.mocked(prisma.customer.count).mockResolvedValueOnce(1);
      vi.mocked(prisma.customer.findMany).mockResolvedValueOnce(matchingCustomers as never);

      const res = await request(app)
        .get('/api/v1/customers?q=A%E5%95%86%E4%BA%8B')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.customers).toHaveLength(1);
      expect(res.body.data.customers[0].company_name).toBe('株式会社A商事');
      // prisma.customer.findMany が q によるフィルターで呼ばれているか確認
      expect(vi.mocked(prisma.customer.findMany)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ companyName: expect.objectContaining({ contains: 'A商事' }) }),
            ]),
          }),
        }),
      );
    });

    it('qパラメーターなしで全顧客を返す', async () => {
      const allCustomers = [
        { id: 1, companyName: '株式会社A商事', contactName: '田中 一郎', phone: null, email: null },
        { id: 2, companyName: 'B株式会社', contactName: '中村 花子', phone: null, email: null },
        { id: 3, companyName: 'C工業株式会社', contactName: '小林 三郎', phone: null, email: null },
      ];
      vi.mocked(prisma.customer.count).mockResolvedValueOnce(3);
      vi.mocked(prisma.customer.findMany).mockResolvedValueOnce(allCustomers as never);

      const res = await request(app)
        .get('/api/v1/customers')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.customers).toHaveLength(3);
      expect(res.body.data.pagination.total).toBe(3);
    });
  });

  describe('TC-CST-005: 顧客削除 - 訪問記録に紐づく顧客', () => {
    it('訪問記録に使用されている顧客を削除しようとすると409とCUSTOMER_IN_USEを返す', async () => {
      vi.mocked(prisma.customer.findUnique).mockResolvedValueOnce(makeCustomer() as never);
      // 訪問記録が1件存在する
      vi.mocked(prisma.visitRecord.count).mockResolvedValueOnce(1);

      const res = await request(app)
        .delete('/api/v1/customers/1')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CUSTOMER_IN_USE');
      expect(vi.mocked(prisma.customer.delete)).not.toHaveBeenCalled();
    });
  });

  describe('TC-CST-006: 顧客削除 - 正常（訪問記録なし）', () => {
    it('訪問記録に使用されていない顧客を削除すると204を返す', async () => {
      vi.mocked(prisma.customer.findUnique).mockResolvedValueOnce(makeCustomer() as never);
      // 訪問記録が0件
      vi.mocked(prisma.visitRecord.count).mockResolvedValueOnce(0);
      vi.mocked(prisma.customer.delete).mockResolvedValueOnce(makeCustomer() as never);

      const res = await request(app)
        .delete('/api/v1/customers/1')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(204);
      expect(vi.mocked(prisma.customer.delete)).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 } }),
      );
    });
  });
});
