// Mirrors app/schemas.py on the backend, field for field.

export type UUID = string;
export type ResourceType = 'image' | 'video';

export interface Project {
  id: UUID;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface DateRange {
  start: string;
  end: string;
}

export interface ProjectStats {
  total_media: number;
  images: number;
  videos: number;
  locations: string[];
  activities: string[];
  date_range: DateRange | null;
}

export interface ProjectDetail extends Project {
  stats: ProjectStats;
}

export interface Media {
  id: UUID;
  project_id: UUID;
  cloudinary_public_id: string;
  cloudinary_resource_type: ResourceType;
  secure_url: string;
  thumbnail_url: string | null;
  original_filename: string | null;
  format: string | null;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  media_date: string | null;
  location: string | null;
  activity: string | null;
  ai_location_guess: string | null;
  ai_activity_guess: string | null;
  description: string | null;
  tags: string[];
  signals: string[];
  created_at: string;
}

export interface MediaDetail extends Media {
  transformations: Record<string, unknown> | null;
  ai_raw_response: Record<string, unknown> | null;
}

export interface SearchResult {
  media: Media;
  score: number;
}

export interface CompareResponse {
  id: UUID;
  project_id: UUID;
  media_before: Media;
  media_after: Media;
  narrative: string | null;
  changes: string[];
  created_at: string;
}

export interface Report {
  id: UUID;
  project_id: UUID;
  title: string;
  period_start: string | null;
  period_end: string | null;
  stats: {
    total_media?: number;
    images?: number;
    videos?: number;
    locations?: string[];
    activities?: string[];
    top_tags?: string[];
    date_range?: DateRange | null;
    [key: string]: unknown;
  };
  narrative: string | null;
  highlights: string[];
  source_media_ids: string[];
  created_at: string;
}
