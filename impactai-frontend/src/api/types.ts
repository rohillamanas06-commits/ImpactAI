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
  latitude: number | null;
  longitude: number | null;
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
  exif_data: Record<string, unknown> | null;
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

export interface BeforeAfterPair {
  before_media: Media;
  after_media: Media;
  location: string | null;
  similarity_reason: string;
  time_gap_days: number;
}

export interface TimelineBucket {
  period: string; // YYYY-MM
  count: number;
  media_items: Media[];
}

export interface TimelineResponse {
  project_id: UUID;
  total_items: number;
  date_min: string | null;
  date_max: string | null;
  buckets: TimelineBucket[];
  auto_detected_pairs: BeforeAfterPair[];
}

export interface WhatsAppMessage {
  id: UUID;
  sender_phone: string;
  sender_name: string | null;
  message_id: string | null;
  caption: string | null;
  media_url: string | null;
  media_type: string | null;
  project_id: UUID | null;
  media_id: UUID | null;
  status: string;
  reply_text: string | null;
  created_at: string;
}

export interface WhatsAppSimulatePayload {
  sender_phone: string;
  sender_name?: string;
  caption: string;
  image_url?: string;
  project_id?: UUID;
}

export interface SocialShareKit {
  report_id: UUID;
  title: string;
  twitter_card_text: string;
  linkedin_post_text: string;
  instagram_caption: string;
  hashtags: string[];
  suggested_stat_callouts: string[];
  shareable_url: string;
}

export interface VoiceQueryResponse {
  intent: string;
  spoken_response: string;
  action_type: string;
  data?: Record<string, any>;
  extracted_params?: Record<string, any>;
}

