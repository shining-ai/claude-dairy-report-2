import { describe, it, expect, beforeEach, vi } from 'vitest';
import './helpers/mockPrisma';
import { prisma } from '../src/lib/prisma';
import { request, app, salesToken, managerToken } from './helpers/testApp';

function makeDraftReport(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    userId: 1,
    reportDate: new Date('2026-03-20'),
    problem: '課題',
    plan: '計画',
    status: 'draft',
    createdAt: new Date('2026-03-20'),
    updatedAt: new Date('2026-03-20'),
    ...overrides,
  };
}

function makeVisit(overrides: Record<string, unknown> = {}) {
  return {
    id: 10,
    reportId: 1,
    customerId: 1,
    visitContent: '商談内容',
    sortOrder: 1,
    createdAt: new Date('2026-03-20'),
    updatedAt: new Date('2026-03-20'),
    customer: { id: 1, companyName: '株式会社A商事', contactName: '田中 一郎' },
    ...overrides,
  };
}

describe('訪問記録API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('TC-VST-001: 訪問記録追加 - 正常', () => {
    it('自分のdraft日報に訪問記録を追加するとステータス201と追加された訪問記録を返す', async () => {
      vi.mocked(prisma.dailyReport.findUnique).mockResolvedValueOnce(makeDraftReport() as never);
      vi.mocked(prisma.visitRecord.create).mockResolvedValueOnce(makeVisit() as never);

      const res = await request(app)
        .post('/api/v1/reports/1/visits')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          customer_id: 1,
          visit_content: '商談内容',
          sort_order: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.visit_id).toBe(10);
      expect(res.body.data.customer.company_name).toBe('株式会社A商事');
      expect(res.body.data.visit_content).toBe('商談内容');
    });
  });

  describe('TC-VST-002: 訪問記録追加 - submitted状態の日報', () => {
    it('submitted状態の日報に訪問記録を追加しようとすると403を返す', async () => {
      vi.mocked(prisma.dailyReport.findUnique).mockResolvedValueOnce(
        makeDraftReport({ status: 'submitted' }) as never,
      );

      const res = await request(app)
        .post('/api/v1/reports/1/visits')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          customer_id: 1,
          visit_content: '商談内容',
          sort_order: 1,
        });

      expect(res.status).toBe(403);
    });
  });

  describe('TC-VST-003: 訪問記録追加 - 顧客IDなし', () => {
    it('customer_idを省略すると400バリデーションエラーを返す', async () => {
      vi.mocked(prisma.dailyReport.findUnique).mockResolvedValueOnce(makeDraftReport() as never);

      const res = await request(app)
        .post('/api/v1/reports/1/visits')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          visit_content: '商談内容',
          sort_order: 1,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('TC-VST-004: 訪問記録削除 - 正常（2件以上ある場合）', () => {
    it('訪問記録が2件の時に1件削除するとステータス204を返す', async () => {
      vi.mocked(prisma.dailyReport.findUnique).mockResolvedValueOnce(makeDraftReport() as never);
      vi.mocked(prisma.visitRecord.findFirst).mockResolvedValueOnce(makeVisit() as never);
      // 訪問記録が2件存在する
      vi.mocked(prisma.visitRecord.count).mockResolvedValueOnce(2);
      vi.mocked(prisma.visitRecord.delete).mockResolvedValueOnce(makeVisit() as never);

      const res = await request(app)
        .delete('/api/v1/reports/1/visits/10')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(res.status).toBe(204);
    });
  });

  describe('TC-VST-005: 訪問記録削除 - 最後の1件', () => {
    it('訪問記録が1件しかない時に削除しようとすると400とMINIMUM_VISIT_REQUIREDを返す', async () => {
      vi.mocked(prisma.dailyReport.findUnique).mockResolvedValueOnce(makeDraftReport() as never);
      vi.mocked(prisma.visitRecord.findFirst).mockResolvedValueOnce(makeVisit() as never);
      // 訪問記録が1件しか存在しない
      vi.mocked(prisma.visitRecord.count).mockResolvedValueOnce(1);

      const res = await request(app)
        .delete('/api/v1/reports/1/visits/10')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('MINIMUM_VISIT_REQUIRED');
    });
  });

  describe('TC-VST-006: 訪問記録並び替え - 正常', () => {
    it('全訪問記録のvisit_idとsort_orderを指定すると200と並び替え後の情報を返す', async () => {
      vi.mocked(prisma.dailyReport.findUnique).mockResolvedValueOnce(makeDraftReport() as never);
      // $transaction モック（各updateManyを返す）
      vi.mocked(prisma.$transaction).mockResolvedValueOnce([{ count: 1 }, { count: 1 }] as never);

      const res = await request(app)
        .patch('/api/v1/reports/1/visits/reorder')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          visits: [
            { visit_id: 10, sort_order: 2 },
            { visit_id: 11, sort_order: 1 },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.visits).toHaveLength(2);
      expect(res.body.data.visits[0]).toMatchObject({ visit_id: 10, sort_order: 2 });
      expect(res.body.data.visits[1]).toMatchObject({ visit_id: 11, sort_order: 1 });
    });

    it('managerは訪問記録並び替えを実行できない（403）', async () => {
      const res = await request(app)
        .patch('/api/v1/reports/1/visits/reorder')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          visits: [{ visit_id: 10, sort_order: 1 }],
        });

      expect(res.status).toBe(403);
    });
  });
});
