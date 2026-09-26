import { api } from './client';
import type { Report } from './types';

export interface ReportGenerateInput {
  title?: string;
  period_start?: string;
  period_end?: string;
  highlight_media_ids?: string[];
}

export const reportsApi = {
  generate: (projectId: string, data: ReportGenerateInput = {}) =>
    api.post<Report>(`/projects/${projectId}/reports`, data),
  list: (projectId: string) => api.get<Report[]>(`/projects/${projectId}/reports`),
  get: (reportId: string) => api.get<Report>(`/reports/${reportId}`),
  remove: (reportId: string) => api.delete<void>(`/reports/${reportId}`),
};

