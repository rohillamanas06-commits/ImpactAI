import { api } from './client';
import type { Media, MediaDetail, ResourceType } from './types';

export interface MediaFilters {
  location?: string;
  activity?: string;
  resource_type?: ResourceType;
  date_from?: string;
  date_to?: string;
}

export interface UploadMeta {
  location?: string;
  activity?: string;
  media_date?: string;
  latitude?: number;
  longitude?: number;
}

export const mediaApi = {
  list: (projectId: string, filters: MediaFilters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const qs = params.toString();
    return api.get<Media[]>(`/projects/${projectId}/media${qs ? `?${qs}` : ''}`);
  },

  upload: (projectId: string, files: File[], meta: UploadMeta = {}) => {
    const form = new FormData();
    files.forEach((file) => form.append('files', file));
    if (meta.location) form.append('location', meta.location);
    if (meta.activity) form.append('activity', meta.activity);
    if (meta.media_date) form.append('media_date', meta.media_date);
    if (meta.latitude !== undefined && meta.latitude !== null) form.append('latitude', String(meta.latitude));
    if (meta.longitude !== undefined && meta.longitude !== null) form.append('longitude', String(meta.longitude));
    return api.post<Media[]>(`/projects/${projectId}/media`, form);
  },

  getGeo: (projectId: string) => api.get<Media[]>(`/projects/${projectId}/geo`),

  updateGeo: (mediaId: string, data: { latitude: number; longitude: number; location?: string }, projectId?: string) =>
    api.patch<Media>(projectId ? `/projects/${projectId}/media/${mediaId}/geo` : `/media/${mediaId}/geo`, data),

  getTimeline: (projectId: string) => api.get<import('./types').TimelineResponse>(`/projects/${projectId}/timeline`),

  get: (mediaId: string) => api.get<MediaDetail>(`/media/${mediaId}`),

  remove: (mediaId: string, destroyOnCloudinary = false) =>
    api.delete<void>(`/media/${mediaId}?destroy_on_cloudinary=${destroyOnCloudinary}`),
};

