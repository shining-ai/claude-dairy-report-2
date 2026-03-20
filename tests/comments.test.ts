import { describe, it, expect, beforeEach, vi } from 'vitest';
import './helpers/mockPrisma';
import { prisma } from '../src/lib/prisma';
import { request, app, salesToken, managerToken } from './helpers/testApp';

// manager ユーザー ID はトークン生成時に 3 を指定（testApp.ts 参照）
const MANAGER_USER_ID = 3;
// 別の manager を模倣する ID（managerToken の userId とは異なる）
const OTHER_MANAGER_USER_ID = 99;

function makeReport(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    userId: 1,
    reportDate: new Date('2026-03-20'),
    problem: '課題内容',
    plan: '計画内容',
    status: 'submitted',
    createdAt: new Date('2026-03-20'),
    updatedAt: new Date('2026-03-20'),
    ...overrides,
  };
}

function makeComment(overrides: Record<string, unknown> = {}) {
  return {
    id: 10,
    reportId: 1,
    userId: MANAGER_USER_ID,
    commentText: 'よく頑張りました',
    createdAt: new Date('2026-03-20'),
    updatedAt: new Date('2026-03-20'),
    user: { id: MANAGER_USER_ID, name: '佐藤 部長' },
    ...overrides,
  };
}

describe('コメントAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('TC-CMT-001: コメント追加 - managerによる正常追加', () => {
    it('managerが日報にコメントを追加すると201とコメントデータを返す', async () => {
      vi.mocked(prisma.dailyReport.findUnique).mockResolvedValueOnce(makeReport() as never);
      vi.mocked(prisma.comment.create).mockResolvedValueOnce(makeComment() as never);

      const res = await request(app)
        .post('/api/v1/reports/1/comments')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ comment_text: 'よく頑張りました' });

      expect(res.status).toBe(201);
      expect(res.body.data.comment_id).toBe(10);
      expect(res.body.data.comment_text).toBe('よく頑張りました');
      expect(res.body.data.user.user_id).toBe(MANAGER_USER_ID);
      expect(res.body.data.user.name).toBe('佐藤 部長');
      // コメントが prisma.comment.create に正しいデータで保存されているか確認
      expect(vi.mocked(prisma.comment.create)).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reportId: 1,
            userId: MANAGER_USER_ID,
            commentText: 'よく頑張りました',
          }),
        }),
      );
    });
  });

  describe('TC-CMT-002: コメント追加 - salesによる追加', () => {
    it('salesユーザーがコメント追加を試みると403を返す', async () => {
      const res = await request(app)
        .post('/api/v1/reports/1/comments')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({ comment_text: 'コメント内容' });

      expect(res.status).toBe(403);
      // sales は コメント作成権限がないため prisma は呼ばれない
      expect(vi.mocked(prisma.comment.create)).not.toHaveBeenCalled();
    });
  });

  describe('TC-CMT-003: コメント追加 - 内容が空', () => {
    it('comment_textが空文字の場合に400バリデーションエラーを返す', async () => {
      vi.mocked(prisma.dailyReport.findUnique).mockResolvedValueOnce(makeReport() as never);

      const res = await request(app)
        .post('/api/v1/reports/1/comments')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ comment_text: '' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(vi.mocked(prisma.comment.create)).not.toHaveBeenCalled();
    });

    it('comment_textを省略した場合に400バリデーションエラーを返す', async () => {
      vi.mocked(prisma.dailyReport.findUnique).mockResolvedValueOnce(makeReport() as never);

      const res = await request(app)
        .post('/api/v1/reports/1/comments')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('TC-CMT-004: コメント削除 - 自分のコメントを削除', () => {
    it('自分が投稿したコメントを削除するとステータス204を返す', async () => {
      vi.mocked(prisma.comment.findFirst).mockResolvedValueOnce(
        makeComment({ userId: MANAGER_USER_ID }) as never,
      );
      vi.mocked(prisma.comment.delete).mockResolvedValueOnce(makeComment() as never);

      const res = await request(app)
        .delete('/api/v1/reports/1/comments/10')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(204);
      expect(vi.mocked(prisma.comment.delete)).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 10 } }),
      );
    });
  });

  describe('TC-CMT-005: コメント削除 - 他人のコメントを削除', () => {
    it('別のmanagerが投稿したコメントを削除しようとすると403を返す', async () => {
      // コメントは OTHER_MANAGER_USER_ID が投稿したもの（managerToken の userId=3 とは異なる）
      vi.mocked(prisma.comment.findFirst).mockResolvedValueOnce(
        makeComment({ userId: OTHER_MANAGER_USER_ID }) as never,
      );

      const res = await request(app)
        .delete('/api/v1/reports/1/comments/10')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(403);
      expect(vi.mocked(prisma.comment.delete)).not.toHaveBeenCalled();
    });
  });
});
