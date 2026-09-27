import { api } from './client';
import type { VoiceQueryResponse } from './types';

export const voiceApi = {
  query: (query: string, projectId?: string) =>
    api.post<VoiceQueryResponse>('/voice/query', { query, project_id: projectId }),

  getConfig: () =>
    api.get<{
      assistant_name: string;
      sample_prompts: string[];
      web_speech_supported: boolean;
      vapi_integration_enabled: boolean;
    }>('/voice/config'),
};
