import { api } from './client';
import type { Project, ProjectDetail } from './types';

export interface ProjectCreateInput {
  name: string;
  description?: string;
}

export interface ProjectUpdateInput {
  name?: string;
  description?: string;
}

export const projectsApi = {
  list: () => api.get<Project[]>('/projects'),
  create: (data: ProjectCreateInput) => api.post<Project>('/projects', data),
  get: (id: string) => api.get<ProjectDetail>(`/projects/${id}`),
  update: (id: string, data: ProjectUpdateInput) => api.patch<Project>(`/projects/${id}`, data),
  remove: (id: string) => api.delete<void>(`/projects/${id}`),
};
