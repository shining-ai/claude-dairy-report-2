import { prisma } from '../lib/prisma';
import type { UserRole, ReportStatus } from '../types/index';
import { AppError } from '../middleware/errorHandler';

interface VisitInput {
  customer_id: number;
  visit_content: string;
  sort_order: number;
}

interface CreateReportInput {
  report_date: string;
  problem?: string;
  plan?: string;
  visits: VisitInput[];
}

interface ListReportsQuery {
  date_from?: string;
  date_to?: string;
  user_id?: number;
  status?: ReportStatus;
  page?: number;
  per_page?: number;
}

function formatVisit(visit: {
  id: number;
  customer: { id: number; companyName: string; contactName: string | null };
  visitContent: string;
  sortOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  return {
    visit_id: visit.id,
    customer: {
      customer_id: visit.customer.id,
      company_name: visit.customer.companyName,
      contact_name: visit.customer.contactName,
    },
    visit_content: visit.visitContent,
    sort_order: visit.sortOrder,
    ...(visit.createdAt !== undefined ? { created_at: visit.createdAt } : {}),
    ...(visit.updatedAt !== undefined ? { updated_at: visit.updatedAt } : {}),
  };
}

function formatComment(comment: {
  id: number;
  user: { id: number; name: string };
  commentText: string;
  createdAt: Date;
}) {
  return {
    comment_id: comment.id,
    user: {
      user_id: comment.user.id,
      name: comment.user.name,
    },
    comment_text: comment.commentText,
    created_at: comment.createdAt,
  };
}

export async function listReports(
  requestUserId: number,
  requestUserRole: UserRole,
  query: ListReportsQuery,
) {
  const page = query.page ?? 1;
  const perPage = query.per_page ?? 20;
  const skip = (page - 1) * perPage;

  // sales は自分の日報のみ
  const userFilter =
    requestUserRole === 'sales'
      ? { userId: requestUserId }
      : query.user_id
        ? { userId: query.user_id }
        : {};

  const statusFilter = query.status ? { status: query.status } : {};

  const dateFilter =
    query.date_from || query.date_to
      ? {
          reportDate: {
            ...(query.date_from ? { gte: new Date(query.date_from) } : {}),
            ...(query.date_to ? { lte: new Date(query.date_to) } : {}),
          },
        }
      : {};

  const where = { ...userFilter, ...statusFilter, ...dateFilter };

  const [total, reports] = await Promise.all([
    prisma.dailyReport.count({ where }),
    prisma.dailyReport.findMany({
      where,
      skip,
      take: perPage,
      orderBy: { reportDate: 'desc' },
      include: {
        user: { select: { id: true, name: true } },
        _count: {
          select: { visitRecords: true, comments: true },
        },
      },
    }),
  ]);

  return {
    reports: reports.map((r) => ({
      report_id: r.id,
      report_date: r.reportDate.toISOString().slice(0, 10),
      user: { user_id: r.user.id, name: r.user.name },
      status: r.status,
      visit_count: r._count.visitRecords,
      comment_count: r._count.comments,
    })),
    pagination: {
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    },
  };
}

export async function createReport(
  userId: number,
  input: CreateReportInput,
) {
  if (!input.report_date) {
    throw new AppError(400, 'VALIDATION_ERROR', '日報日付は必須です');
  }
  if (!input.visits || input.visits.length === 0) {
    throw new AppError(400, 'VALIDATION_ERROR', '訪問記録は1件以上必須です');
  }
  for (const v of input.visits) {
    if (!v.customer_id) {
      throw new AppError(400, 'VALIDATION_ERROR', '訪問記録の顧客IDは必須です');
    }
    if (!v.visit_content) {
      throw new AppError(400, 'VALIDATION_ERROR', '訪問記録の訪問内容は必須です');
    }
  }

  const reportDate = new Date(input.report_date);

  // 重複チェック
  const existing = await prisma.dailyReport.findUnique({
    where: { userId_reportDate: { userId, reportDate } },
  });
  if (existing) {
    throw new AppError(409, 'REPORT_ALREADY_EXISTS', 'この日付の日報は既に作成されています');
  }

  const report = await prisma.dailyReport.create({
    data: {
      userId,
      reportDate,
      problem: input.problem,
      plan: input.plan,
      visitRecords: {
        create: input.visits.map((v) => ({
          customerId: v.customer_id,
          visitContent: v.visit_content,
          sortOrder: v.sort_order,
        })),
      },
    },
    include: {
      user: { select: { id: true, name: true } },
      visitRecords: {
        include: { customer: { select: { id: true, companyName: true, contactName: true } } },
        orderBy: { sortOrder: 'asc' },
      },
      comments: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  return {
    report_id: report.id,
    report_date: report.reportDate.toISOString().slice(0, 10),
    status: report.status,
    user: { user_id: report.user.id, name: report.user.name },
    problem: report.problem,
    plan: report.plan,
    visits: report.visitRecords.map(formatVisit),
    comments: report.comments.map(formatComment),
    created_at: report.createdAt,
    updated_at: report.updatedAt,
  };
}

export async function getReport(
  reportId: number,
  requestUserId: number,
  requestUserRole: UserRole,
) {
  const report = await prisma.dailyReport.findUnique({
    where: { id: reportId },
    include: {
      user: { select: { id: true, name: true, department: true } },
      visitRecords: {
        include: { customer: { select: { id: true, companyName: true, contactName: true } } },
        orderBy: { sortOrder: 'asc' },
      },
      comments: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!report) {
    throw new AppError(404, 'NOT_FOUND', '日報が見つかりません');
  }

  if (requestUserRole === 'sales' && report.userId !== requestUserId) {
    throw new AppError(403, 'FORBIDDEN', '権限がありません');
  }

  return {
    report_id: report.id,
    report_date: report.reportDate.toISOString().slice(0, 10),
    status: report.status,
    user: {
      user_id: report.user.id,
      name: report.user.name,
      department: report.user.department,
    },
    problem: report.problem,
    plan: report.plan,
    visits: report.visitRecords.map(formatVisit),
    comments: report.comments.map(formatComment),
    created_at: report.createdAt,
    updated_at: report.updatedAt,
  };
}

export async function updateReport(
  reportId: number,
  requestUserId: number,
  input: { problem?: string; plan?: string },
) {
  const report = await prisma.dailyReport.findUnique({ where: { id: reportId } });
  if (!report) {
    throw new AppError(404, 'NOT_FOUND', '日報が見つかりません');
  }
  if (report.userId !== requestUserId) {
    throw new AppError(403, 'FORBIDDEN', '権限がありません');
  }
  if (report.status !== 'draft') {
    throw new AppError(403, 'FORBIDDEN', 'draft状態の日報のみ更新できます');
  }

  const updated = await prisma.dailyReport.update({
    where: { id: reportId },
    data: {
      problem: input.problem,
      plan: input.plan,
    },
  });

  return {
    report_id: updated.id,
    problem: updated.problem,
    plan: updated.plan,
    updated_at: updated.updatedAt,
  };
}

export async function submitReport(reportId: number, requestUserId: number) {
  const report = await prisma.dailyReport.findUnique({ where: { id: reportId } });
  if (!report) {
    throw new AppError(404, 'NOT_FOUND', '日報が見つかりません');
  }
  if (report.userId !== requestUserId) {
    throw new AppError(403, 'FORBIDDEN', '権限がありません');
  }
  if (report.status !== 'draft') {
    throw new AppError(400, 'INVALID_STATUS_TRANSITION', '提出できない状態の日報です');
  }

  const updated = await prisma.dailyReport.update({
    where: { id: reportId },
    data: { status: 'submitted' },
  });

  return {
    report_id: updated.id,
    status: updated.status,
    updated_at: updated.updatedAt,
  };
}

export async function reviewReport(reportId: number) {
  const report = await prisma.dailyReport.findUnique({ where: { id: reportId } });
  if (!report) {
    throw new AppError(404, 'NOT_FOUND', '日報が見つかりません');
  }
  if (report.status !== 'submitted') {
    throw new AppError(400, 'INVALID_STATUS_TRANSITION', '確認済みにできない状態の日報です');
  }

  const updated = await prisma.dailyReport.update({
    where: { id: reportId },
    data: { status: 'reviewed' },
  });

  return {
    report_id: updated.id,
    status: updated.status,
    updated_at: updated.updatedAt,
  };
}
