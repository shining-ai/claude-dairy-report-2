import { describe, it, expect, beforeEach, vi } from 'vitest';
import './helpers/mockPrisma';
import { prisma } from '../src/lib/prisma';
import { request, app, salesToken, managerToken, otherSalesToken } from './helpers/testApp';

// テスト用モックデータのファクトリ
function makeReport(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    userId: 1,
    reportDate: new Date('2026-03-20'),
    problem: '課題内容',
    plan: '計画内容',
    status: 'draft',
    createdAt: new Date('2026-03-20'),
    updatedAt: new Date('2026-03-20'),
    ...overrides,
  };
}

function makeReportWithRelations(overrides: Record<string, unknown> = {}) {
  return {
    ...makeReport(overrides),
    user: { id: 1, name: '山田 太郎' },
    visitRecords: [
      {
        id: 1,
        customer: { id: 1, companyName: '株式会社A商事', contactName: '田中 一郎' },
        visitContent: '商談を実施',
        sortOrder: 1,
        createdAt: new Date('2026-03-20'),
        updatedAt: new Date('2026-03-20'),
      },
    ],
    comments: [],
  };
}

describe('日報API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('TC-RPT-001: 日報作成 - 正常', () => {
    it('salesユーザーが訪問記録1件以上で日報を作成するとステータス201とdraft日報を返す', async () => {
      // 重複チェック（存在しない）
      vi.mocked(prisma.dailyReport.findUnique).mockResolvedValueOnce(null);
      // 日報作成
      vi.mocked(prisma.dailyReport.create).mockResolvedValueOnce(makeReportWithRelations() as never);

      const res = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          report_date: '2026-03-20',
          problem: '課題内容',
          plan: '計画内容',
          visits: [
            { customer_id: 1, visit_content: '商談を実施', sort_order: 1 },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('draft');
      expect(res.body.data.visits).toHaveLength(1);
      expect(res.body.data.report_date).toBe('2026-03-20');
    });
  });

  describe('TC-RPT-002: 日報作成 - 同一日付の二重登録', () => {
    it('同一ユーザー・同一日付の日報が既に存在する場合に409とREPORT_ALREADY_EXISTSを返す', async () => {
      // 重複チェック（既存あり）
      vi.mocked(prisma.dailyReport.findUnique).mockResolvedValueOnce(makeReport() as never);

      const res = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          report_date: '2026-03-20',
          problem: '課題内容',
          plan: '計画内容',
          visits: [{ customer_id: 1, visit_content: '商談を実施', sort_order: 1 }],
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('REPORT_ALREADY_EXISTS');
    });
  });

  describe('TC-RPT-003: 日報作成 - 訪問記録0件', () => {
    it('visits配列が空の場合に400バリデーションエラーを返す', async () => {
      const res = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          report_date: '2026-03-20',
          problem: '課題内容',
          plan: '計画内容',
          visits: [],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('TC-RPT-004: 日報作成 - managerロールによる作成', () => {
    it('managerが日報作成を試みると403を返す', async () => {
      const res = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          report_date: '2026-03-20',
          problem: '課題内容',
          plan: '計画内容',
          visits: [{ customer_id: 1, visit_content: '商談を実施', sort_order: 1 }],
        });

      expect(res.status).toBe(403);
    });
  });

  describe('TC-RPT-005: 日報一覧取得 - salesは自分の日報のみ取得', () => {
    it('salesユーザーが日報一覧を取得すると自分のユーザーIDでフィルターされた結果を返す', async () => {
      const reports = [
        {
          id: 1,
          reportDate: new Date('2026-03-20'),
          status: 'draft',
          user: { id: 1, name: '山田 太郎' },
          _count: { visitRecords: 1, comments: 0 },
        },
      ];
      vi.mocked(prisma.dailyReport.count).mockResolvedValueOnce(1);
      vi.mocked(prisma.dailyReport.findMany).mockResolvedValueOnce(reports as never);

      const res = await request(app)
        .get('/api/v1/reports')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.reports).toHaveLength(1);
      expect(res.body.data.reports[0].user.user_id).toBe(1);
      // prisma.dailyReport.findMany が userId: 1 でフィルターされていることを確認
      expect(vi.mocked(prisma.dailyReport.findMany)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 1 }),
        }),
      );
    });
  });

  describe('TC-RPT-006: 日報一覧取得 - managerは全員の日報を取得', () => {
    it('managerが日報一覧を取得するとuserIdフィルターなしで全ての日報を返す', async () => {
      const reports = [
        {
          id: 1,
          reportDate: new Date('2026-03-20'),
          status: 'draft',
          user: { id: 1, name: '山田 太郎' },
          _count: { visitRecords: 1, comments: 0 },
        },
        {
          id: 2,
          reportDate: new Date('2026-03-19'),
          status: 'submitted',
          user: { id: 2, name: '鈴木 次郎' },
          _count: { visitRecords: 2, comments: 1 },
        },
      ];
      vi.mocked(prisma.dailyReport.count).mockResolvedValueOnce(2);
      vi.mocked(prisma.dailyReport.findMany).mockResolvedValueOnce(reports as never);

      const res = await request(app)
        .get('/api/v1/reports')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.reports).toHaveLength(2);
      // manager は userId フィルターなし（userId プロパティが where に含まれない）
      const findManyCall = vi.mocked(prisma.dailyReport.findMany).mock.calls[0][0];
      expect(findManyCall?.where).not.toHaveProperty('userId');
    });
  });

  describe('TC-RPT-007: 日報一覧取得 - 日付範囲フィルター', () => {
    it('date_from と date_to を指定すると該当期間の日報のみ返す', async () => {
      const reports = [
        {
          id: 1,
          reportDate: new Date('2026-03-05'),
          status: 'draft',
          user: { id: 1, name: '山田 太郎' },
          _count: { visitRecords: 1, comments: 0 },
        },
      ];
      vi.mocked(prisma.dailyReport.count).mockResolvedValueOnce(1);
      vi.mocked(prisma.dailyReport.findMany).mockResolvedValueOnce(reports as never);

      const res = await request(app)
        .get('/api/v1/reports?date_from=2026-03-01&date_to=2026-03-10')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      // prisma.dailyReport.findMany が reportDate フィルターで呼ばれていることを確認
      const findManyCall = vi.mocked(prisma.dailyReport.findMany).mock.calls[0][0];
      expect(findManyCall?.where).toHaveProperty('reportDate');
      expect(findManyCall?.where?.reportDate).toMatchObject({
        gte: new Date('2026-03-01'),
        lte: new Date('2026-03-10'),
      });
    });
  });

  describe('TC-RPT-008: 日報一覧取得 - ステータスフィルター', () => {
    it('status=submitted を指定すると submitted 状態の日報のみ返す', async () => {
      const reports = [
        {
          id: 2,
          reportDate: new Date('2026-03-19'),
          status: 'submitted',
          user: { id: 1, name: '山田 太郎' },
          _count: { visitRecords: 1, comments: 0 },
        },
      ];
      vi.mocked(prisma.dailyReport.count).mockResolvedValueOnce(1);
      vi.mocked(prisma.dailyReport.findMany).mockResolvedValueOnce(reports as never);

      const res = await request(app)
        .get('/api/v1/reports?status=submitted')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(res.status).toBe(200);
      const findManyCall = vi.mocked(prisma.dailyReport.findMany).mock.calls[0][0];
      expect(findManyCall?.where).toMatchObject({ status: 'submitted' });
    });
  });

  describe('TC-RPT-009: 日報詳細取得 - 他ユーザーの日報（sales）', () => {
    it('salesユーザーが他ユーザーの日報詳細を取得しようとすると403を返す', async () => {
      // userId=2 の日報（otherSalesToken のユーザーは userId=2 だが、salesToken のユーザーは userId=1）
      vi.mocked(prisma.dailyReport.findUnique).mockResolvedValueOnce(
        makeReportWithRelations({ userId: 2 }) as never,
      );

      const res = await request(app)
        .get('/api/v1/reports/1')
        .set('Authorization', `Bearer ${salesToken}`); // userId=1 のトークン

      expect(res.status).toBe(403);
    });
  });

  describe('TC-RPT-010: 日報提出 - 正常', () => {
    it('自分のdraft日報を提出するとステータス200でsubmittedに変更される', async () => {
      vi.mocked(prisma.dailyReport.findUnique).mockResolvedValueOnce(
        makeReport({ userId: 1, status: 'draft' }) as never,
      );
      vi.mocked(prisma.dailyReport.update).mockResolvedValueOnce(
        makeReport({ userId: 1, status: 'submitted' }) as never,
      );

      const res = await request(app)
        .patch('/api/v1/reports/1/submit')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('submitted');
    });
  });

  describe('TC-RPT-011: 日報提出 - 既に提出済みの日報', () => {
    it('すでにsubmittedの日報を提出しようとすると400とINVALID_STATUS_TRANSITIONを返す', async () => {
      vi.mocked(prisma.dailyReport.findUnique).mockResolvedValueOnce(
        makeReport({ userId: 1, status: 'submitted' }) as never,
      );

      const res = await request(app)
        .patch('/api/v1/reports/1/submit')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });
  });

  describe('TC-RPT-012: 日報確認済み - manager による正常確認', () => {
    it('managerがsubmitted日報を確認済みにするとステータス200でreviewedに変更される', async () => {
      vi.mocked(prisma.dailyReport.findUnique).mockResolvedValueOnce(
        makeReport({ status: 'submitted' }) as never,
      );
      vi.mocked(prisma.dailyReport.update).mockResolvedValueOnce(
        makeReport({ status: 'reviewed' }) as never,
      );

      const res = await request(app)
        .patch('/api/v1/reports/1/review')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('reviewed');
    });
  });

  describe('TC-RPT-013: 日報確認済み - salesによる実行', () => {
    it('salesユーザーがreviewエンドポイントを呼ぶと403を返す', async () => {
      const res = await request(app)
        .patch('/api/v1/reports/1/review')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(res.status).toBe(403);
    });

    it('otherSalesユーザーがreviewエンドポイントを呼ぶと403を返す', async () => {
      const res = await request(app)
        .patch('/api/v1/reports/1/review')
        .set('Authorization', `Bearer ${otherSalesToken}`);

      expect(res.status).toBe(403);
    });
  });
});
