import { api } from './client';
import type { SearchResult } from './types';

export const searchApi = {
  search: (query: string, projectId?: string, limit = 20) =>
    api.post<SearchResult[]>('/search', {
      query,
      project_id: projectId || undefined,
      limit,
    }),
};
