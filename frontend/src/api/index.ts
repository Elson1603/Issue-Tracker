import axios from 'axios';
import {
  DashboardSummary,
  Issue,
  IssueListResponse,
  ReportDetail,
  ReportListResponse,
  SavedReport,
  SyncJob,
  SyncJobListResponse,
  TrendDataPoint
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const dashboardApi = {
  getSummary: (startDate?: string, endDate?: string) =>
    api.get<DashboardSummary>('/dashboard/summary', {
      params: { start_date: startDate, end_date: endDate },
    }).then(res => res.data),

  getTrends: (days = 14) =>
    api.get<{ trends: TrendDataPoint[] }>('/dashboard/trends', {
      params: { days },
    }).then(res => res.data),

  getCategoryBreakdown: (startDate?: string, endDate?: string) =>
    api.get<{ categories: Record<string, number> }>('/dashboard/category-breakdown', {
      params: { start_date: startDate, end_date: endDate },
    }).then(res => res.data),
};

export const syncApi = {
  createJob: (data: {
    provider: string;
    start_date?: string;
    end_date?: string;
    filter_by?: string;
    folder_filter?: string;
    subject_filter?: string;
  }) => api.post<SyncJob>('/sync-jobs', data).then(res => res.data),

  getJob: (jobId: string) =>
    api.get<SyncJob>(`/sync-jobs/${jobId}`).then(res => res.data),

  retryJob: (jobId: string) =>
    api.post<SyncJob>(`/sync-jobs/${jobId}/retry`).then(res => res.data),

  listJobs: (limit = 20) =>
    api.get<SyncJobListResponse>('/sync-jobs', { params: { limit } }).then(res => res.data),

  preview: (data: {
    provider: string;
    start_date?: string;
    end_date?: string;
    folder_filter?: string;
    subject_filter?: string;
  }) => api.post('/sync-jobs/preview', data).then(res => res.data),
};

export const issuesApi = {
  list: (params: {
    search?: string;
    start_date?: string;
    end_date?: string;
    status?: string;
    category?: string;
    application?: string;
    resolution_team?: string;
    needs_review?: boolean;
    page?: number;
    page_size?: number;
    sort_by?: string;
    sort_order?: string;
  }) => api.get<IssueListResponse>('/issues', { params }).then(res => res.data),

  get: (issueId: string) =>
    api.get<Issue>(`/issues/${issueId}`).then(res => res.data),

  getThread: (issueId: string) =>
    api.get<{ thread: any; messages: any[] }>(`/issues/${issueId}/thread`).then(res => res.data),

  update: (issueId: string, data: Partial<Issue> & { audit_reason?: string }) =>
    api.patch<Issue>(`/issues/${issueId}`, data).then(res => res.data),
};

export const reportsApi = {
  list: (params: {
    search?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }) => api.get<ReportListResponse>('/reports', { params }).then(res => res.data),

  create: (data: {
    name?: string;
    start_date: string;
    end_date: string;
    date_filter_type?: string;
  }) => api.post<SavedReport>('/reports', data).then(res => res.data),

  getDetail: (reportId: string) =>
    api.get<ReportDetail>(`/reports/${reportId}`).then(res => res.data),

  getDownloadUrl: (reportId: string) => `${API_BASE_URL}/api/v1/reports/${reportId}/download`,

  delete: (reportId: string) =>
    api.delete<{ success: boolean; message: string }>(`/reports/${reportId}`).then(res => res.data),
};

export const reviewQueueApi = {
  list: (page = 1, pageSize = 20) =>
    api.get<IssueListResponse>('/review-queue', {
      params: { page, page_size: pageSize },
    }).then(res => res.data),
};

export const settingsApi = {
  getEmailProviders: () =>
    api.get<Record<string, any>>('/settings/email-provider').then(res => res.data),

  getAuthUrl: (provider: string) =>
    api.get<{ auth_url: string; redirect_uri: string }>(`/settings/email-provider/auth-url?provider=${provider}`).then(res => res.data),

  connectEmailProvider: (data: any) =>
    api.post('/settings/email-provider/connect', data).then(res => res.data),

  getAiSettings: () =>
    api.get('/settings/ai-provider').then(res => res.data),

  updateAiSettings: (data: { model?: string; api_key?: string }) =>
    api.post('/settings/ai-provider', data).then(res => res.data),

  runEvaluation: () =>
    api.get('/settings/evaluate').then(res => res.data),
};

