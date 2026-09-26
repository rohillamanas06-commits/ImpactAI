import { api } from './client';
import type { CompareResponse } from './types';

export const compareApi = {
  compare: (mediaBeforeId: string, mediaAfterId: string) =>
    api.post<CompareResponse>('/compare', {
      media_before_id: mediaBeforeId,
      media_after_id: mediaAfterId,
    }),
  list: (projectId: string) => api.get<CompareResponse[]>(`/projects/${projectId}/comparisons`),
  remove: (comparisonId: string) => api.delete<void>(`/comparisons/${comparisonId}`),
  clearAll: (projectId: string) => api.delete<void>(`/projects/${projectId}/comparisons`),
};

