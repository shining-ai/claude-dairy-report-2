/**
 * E2E シナリオテスト
 *
 * API レベルのシナリオ検証。Prisma をモックして DB 接続なしで実行する。
 * 各シナリオでは複数ステップのリクエストを順番に実行し、
 * 前のレスポンスの id を次のリクエストに使用する。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import './helpers/mockPrisma';
import { prisma } from '../src/lib/prisma';
import { request, app, salesToken, managerToken } from './helpers/testApp';

describe('E2Eシナリオテスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('E2E-001: 営業担当者による日報提出フロー', () => {
    it('draft作成→更新→提出→提出後編集不可の一連フローが正常に動作する', async () => {
      // --- ステップ1: 日報作成（POST /api/v1/reports） ---
      const draftReport = {
        id: 100,
        userId: 1,
        reportDate: new Date('2026-03-20'),
        problem: '当初の課題',
        plan: '当初の計画',
        status: 'draft',
        createdAt: new Date('2026-03-20'),
        updatedAt: new Date('2026-03-20'),
        user: { id: 1, name: '山田 太郎' },
        visitRecords: [
          {
            id: 200,
            customer: { id: 1, companyName: '株式会社A商事', contactName: '田中 一郎' },
            visitContent: '初回商談',
            sortOrder: 1,
            createdAt: new Date('2026-03-20'),
            updatedAt: new Date('2026-03-20'),
          },
        ],
        comments: [],
      };
      // 重複チェック（存在しない）
      vi.mocked(prisma.dailyReport.findUnique).mockResolvedValueOnce(null);
      // 日報作成
      vi.mocked(prisma.dailyReport.create).mockResolvedValueOnce(draftReport as never);

      const createRes = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          report_date: '2026-03-20',
          problem: '当初の課題',
          plan: '当初の計画',
          visits: [{ customer_id: 1, visit_content: '初回商談', sort_order: 1 }],
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.data.status).toBe('draft');
      const reportId = createRes.body.data.report_id;
      expect(reportId).toBe(100);

      // --- ステップ2: 日報更新（PUT /api/v1/reports/:id） ---
      const updatedDraftReport = {
        ...draftReport,
        plan: '修正後の計画',
        updatedAt: new Date('2026-03-20T10:00:00Z'),
      };
      // updateReport 内の findUnique（日報存在確認・権限チェック）
      vi.mocked(prisma.dailyReport.findUnique).mockResolvedValueOnce(
        { ...draftReport } as never,
      );
      vi.mocked(prisma.dailyReport.update).mockResolvedValueOnce(updatedDraftReport as never);

      const updateRes = await request(app)
        .put(`/api/v1/reports/${reportId}`)
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          plan: '修正後の計画',
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.plan).toBe('修正後の計画');
      // updateReport のレスポンスは report_id / problem / plan / updated_at のみ（status は含まない）
      expect(updateRes.body.data.report_id).toBe(reportId);

      // --- ステップ3: 日報提出（PATCH /api/v1/reports/:id/submit） ---
      const submittedReport = {
        ...draftReport,
        plan: '修正後の計画',
        status: 'submitted',
        updatedAt: new Date('2026-03-20T11:00:00Z'),
      };
      // submitReport 内の findUnique（日報存在確認）
      vi.mocked(prisma.dailyReport.findUnique).mockResolvedValueOnce(
        { ...draftReport, plan: '修正後の計画' } as never,
      );
      vi.mocked(prisma.dailyReport.update).mockResolvedValueOnce(submittedReport as never);

      const submitRes = await request(app)
        .patch(`/api/v1/reports/${reportId}/submit`)
        .set('Authorization', `Bearer ${salesToken}`);

      expect(submitRes.status).toBe(200);
      expect(submitRes.body.data.status).toBe('submitted');

      // --- ステップ4: 提出後の編集が403になることを確認（PUT /api/v1/reports/:id） ---
      // submitted 状態の日報は更新できない
      vi.mocked(prisma.dailyReport.findUnique).mockResolvedValueOnce(
        submittedReport as never,
      );

      const editAfterSubmitRes = await request(app)
        .put(`/api/v1/reports/${reportId}`)
        .set('Authorization', `Bearer ${salesToken}`)
        .send({ plan: '提出後に変更しようとする計画' });

      expect(editAfterSubmitRes.status).toBe(403);
    });
  });

  describe('E2E-002: 上長による確認・コメントフロー', () => {
    it('managerがコメント追加→review→draftはreview不可の一連フローが正常に動作する', async () => {
      const reportId = 101;
      const submittedReport = {
        id: reportId,
        userId: 1,
        reportDate: new Date('2026-03-19'),
        problem: '課題',
        plan: '計画',
        status: 'submitted',
        createdAt: new Date('2026-03-19'),
        updatedAt: new Date('2026-03-19'),
      };

      // --- ステップ1: コメント追加（POST /api/v1/reports/:id/comments） ---
      const comment = {
        id: 300,
        reportId,
        userId: 3,
        commentText: '内容を確認しました。良い報告です。',
        createdAt: new Date('2026-03-20'),
        updatedAt: new Date('2026-03-20'),
        user: { id: 3, name: '佐藤 部長' },
      };
      // addComment 内の findUnique（日報存在確認）
      vi.mocked(prisma.dailyReport.findUnique).mockResolvedValueOnce(submittedReport as never);
      vi.mocked(prisma.comment.create).mockResolvedValueOnce(comment as never);

      const commentRes = await request(app)
        .post(`/api/v1/reports/${reportId}/comments`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ comment_text: '内容を確認しました。良い報告です。' });

      expect(commentRes.status).toBe(201);
      expect(commentRes.body.data.comment_id).toBe(300);
      expect(commentRes.body.data.comment_text).toBe('内容を確認しました。良い報告です。');
      expect(commentRes.body.data.user.user_id).toBe(3);

      // --- ステップ2: 確認済みにする（PATCH /api/v1/reports/:id/review） ---
      const reviewedReport = {
        ...submittedReport,
        status: 'reviewed',
        updatedAt: new Date('2026-03-20T12:00:00Z'),
      };
      // reviewReport 内の findUnique（日報存在確認）
      vi.mocked(prisma.dailyReport.findUnique).mockResolvedValueOnce(submittedReport as never);
      vi.mocked(prisma.dailyReport.update).mockResolvedValueOnce(reviewedReport as never);

      const reviewRes = await request(app)
        .patch(`/api/v1/reports/${reportId}/review`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(reviewRes.status).toBe(200);
      expect(reviewRes.body.data.status).toBe('reviewed');

      // --- ステップ3: draft状態の日報は review できないことを確認（→ 400） ---
      const draftReportId = 102;
      const draftReport = {
        id: draftReportId,
        userId: 2,
        reportDate: new Date('2026-03-18'),
        problem: '別の課題',
        plan: '別の計画',
        status: 'draft',
        createdAt: new Date('2026-03-18'),
        updatedAt: new Date('2026-03-18'),
      };
      // reviewReport 内の findUnique（draft 日報）
      vi.mocked(prisma.dailyReport.findUnique).mockResolvedValueOnce(draftReport as never);

      const reviewDraftRes = await request(app)
        .patch(`/api/v1/reports/${draftReportId}/review`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(reviewDraftRes.status).toBe(400);
      expect(reviewDraftRes.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });
  });

  describe('E2E-003: 顧客登録から日報作成', () => {
    it('manager顧客作成→sales顧客一覧で確認→新顧客で日報作成の一連フローが正常に動作する', async () => {
      // --- ステップ1: manager が顧客作成（POST /api/v1/customers） ---
      const newCustomer = {
        id: 400,
        companyName: '新規 株式会社',
        contactName: '新規 担当',
        phone: '06-9876-5432',
        email: 'contact@new-company.example.com',
        address: '大阪府大阪市1-2-3',
        notes: null,
        createdAt: new Date('2026-03-20'),
        updatedAt: new Date('2026-03-20'),
      };
      vi.mocked(prisma.customer.create).mockResolvedValueOnce(newCustomer as never);

      const createCustomerRes = await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          company_name: '新規 株式会社',
          contact_name: '新規 担当',
          phone: '06-9876-5432',
          email: 'contact@new-company.example.com',
          address: '大阪府大阪市1-2-3',
        });

      expect(createCustomerRes.status).toBe(201);
      expect(createCustomerRes.body.data.customer_id).toBe(400);
      expect(createCustomerRes.body.data.company_name).toBe('新規 株式会社');
      const newCustomerId = createCustomerRes.body.data.customer_id;

      // --- ステップ2: sales が顧客一覧取得（GET /api/v1/customers） → 新顧客が含まれる ---
      const customerList = [
        {
          id: 1,
          companyName: '株式会社A商事',
          contactName: '田中 一郎',
          phone: null,
          email: null,
        },
        {
          id: newCustomerId,
          companyName: '新規 株式会社',
          contactName: '新規 担当',
          phone: '06-9876-5432',
          email: 'contact@new-company.example.com',
        },
      ];
      vi.mocked(prisma.customer.count).mockResolvedValueOnce(2);
      vi.mocked(prisma.customer.findMany).mockResolvedValueOnce(customerList as never);

      const listCustomersRes = await request(app)
        .get('/api/v1/customers')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(listCustomersRes.status).toBe(200);
      expect(listCustomersRes.body.data.customers).toHaveLength(2);
      const foundCustomer = listCustomersRes.body.data.customers.find(
        (c: { customer_id: number }) => c.customer_id === newCustomerId,
      );
      expect(foundCustomer).toBeDefined();
      expect(foundCustomer.company_name).toBe('新規 株式会社');

      // --- ステップ3: 新顧客を使って日報作成（POST /api/v1/reports） ---
      const newReport = {
        id: 500,
        userId: 1,
        reportDate: new Date('2026-03-21'),
        problem: '新規顧客への課題',
        plan: '新規顧客への計画',
        status: 'draft',
        createdAt: new Date('2026-03-21'),
        updatedAt: new Date('2026-03-21'),
        user: { id: 1, name: '山田 太郎' },
        visitRecords: [
          {
            id: 600,
            customer: {
              id: newCustomerId,
              companyName: '新規 株式会社',
              contactName: '新規 担当',
            },
            visitContent: '新規顧客への初回訪問',
            sortOrder: 1,
            createdAt: new Date('2026-03-21'),
            updatedAt: new Date('2026-03-21'),
          },
        ],
        comments: [],
      };
      // 重複チェック（同日の日報は存在しない）
      vi.mocked(prisma.dailyReport.findUnique).mockResolvedValueOnce(null);
      vi.mocked(prisma.dailyReport.create).mockResolvedValueOnce(newReport as never);

      const createReportRes = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          report_date: '2026-03-21',
          problem: '新規顧客への課題',
          plan: '新規顧客への計画',
          visits: [
            {
              customer_id: newCustomerId,
              visit_content: '新規顧客への初回訪問',
              sort_order: 1,
            },
          ],
        });

      expect(createReportRes.status).toBe(201);
      expect(createReportRes.body.data.status).toBe('draft');
      expect(createReportRes.body.data.report_id).toBe(500);
      // 訪問記録に新顧客が含まれていることを確認
      expect(createReportRes.body.data.visits[0].customer.customer_id).toBe(newCustomerId);
      expect(createReportRes.body.data.visits[0].customer.company_name).toBe('新規 株式会社');
    });
  });
});
