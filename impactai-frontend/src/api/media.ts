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
    return api.post<Media[]>(`/projects/${projectId}/media`, form);
  },

  get: (mediaId: string) => api.get<MediaDetail>(`/media/${mediaId}`),

  remove: (mediaId: string, destroyOnCloudinary = false) =>
    api.delete<void>(`/media/${mediaId}?destroy_on_cloudinary=${destroyOnCloudinary}`),
};
