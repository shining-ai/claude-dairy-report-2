import apiClient from './client';

export interface ReportUser {
  user_id: number;
  name: string;
  department?: string;
}

export interface ReportCustomer {
  customer_id: number;
  company_name: string;
  contact_name?: string;
}

export interface VisitRecord {
  visit_id: number;
  customer: ReportCustomer;
  visit_content: string;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface Comment {
  comment_id: number;
  user: ReportUser;
  comment_text: string;
  created_at: string;
}

export type ReportStatus = 'draft' | 'submitted' | 'reviewed';

export interface Report {
  report_id: number;
  report_date: string;
  status: ReportStatus;
  user: ReportUser;
  problem?: string;
  plan?: string;
  visits: VisitRecord[];
  comments: Comment[];
  visit_count?: number;
  comment_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ReportSummary {
  report_id: number;
  report_date: string;
  user: ReportUser;
  status: ReportStatus;
  visit_count: number;
  comment_count: number;
}

export interface ReportListParams {
  date_from?: string;
  date_to?: string;
  user_id?: number;
  status?: ReportStatus;
  page?: number;
  per_page?: number;
}

export interface CreateVisitData {
  customer_id: number;
  visit_content: string;
  sort_order: number;
}

export interface UpdateVisitData {
  customer_id: number;
  visit_content: string;
  sort_order: number;
}

export interface ReorderVisitData {
  visit_id: number;
  sort_order: number;
}

export interface CreateReportData {
  report_date: string;
  problem?: string;
  plan?: string;
  visits: CreateVisitData[];
}

export interface UpdateReportData {
  problem?: string;
  plan?: string;
}

export interface ReportListResponse {
  data: {
    reports: ReportSummary[];
    pagination: {
      total: number;
      page: number;
      per_page: number;
      total_pages: number;
    };
  };
}

export interface ReportResponse {
  data: Report;
}

export const getReports = (params?: ReportListParams) =>
  apiClient.get<ReportListResponse>('/reports', { params });

export const getReport = (id: number) =>
  apiClient.get<ReportResponse>(`/reports/${id}`);

export const createReport = (data: CreateReportData) =>
  apiClient.post<ReportResponse>('/reports', data);

export const updateReport = (id: number, data: UpdateReportData) =>
  apiClient.put<ReportResponse>(`/reports/${id}`, data);

export const submitReport = (id: number) =>
  apiClient.patch<ReportResponse>(`/reports/${id}/submit`);

export const reviewReport = (id: number) =>
  apiClient.patch<ReportResponse>(`/reports/${id}/review`);

export const addVisit = (reportId: number, data: CreateVisitData) =>
  apiClient.post<{ data: VisitRecord }>(`/reports/${reportId}/visits`, data);

export const updateVisit = (reportId: number, visitId: number, data: UpdateVisitData) =>
  apiClient.put<{ data: VisitRecord }>(`/reports/${reportId}/visits/${visitId}`, data);

export const deleteVisit = (reportId: number, visitId: number) =>
  apiClient.delete(`/reports/${reportId}/visits/${visitId}`);

export const reorderVisits = (reportId: number, visits: ReorderVisitData[]) =>
  apiClient.patch(`/reports/${reportId}/visits/reorder`, { visits });

export const getComments = (reportId: number) =>
  apiClient.get<{ data: { comments: Comment[] } }>(`/reports/${reportId}/comments`);

export const addComment = (reportId: number, commentText: string) =>
  apiClient.post<{ data: Comment }>(`/reports/${reportId}/comments`, { comment_text: commentText });

export const deleteComment = (reportId: number, commentId: number) =>
  apiClient.delete(`/reports/${reportId}/comments/${commentId}`);
