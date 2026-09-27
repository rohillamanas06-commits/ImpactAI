import { api } from './client';
import type { WhatsAppMessage, WhatsAppSimulatePayload } from './types';

export const webhooksApi = {
  simulateWhatsApp: (data: WhatsAppSimulatePayload) =>
    api.post<WhatsAppMessage>('/webhooks/whatsapp/simulate', data),

  getWhatsAppMessages: (projectId?: string) =>
    api.get<WhatsAppMessage[]>(`/webhooks/whatsapp/messages${projectId ? `?project_id=${projectId}` : ''}`),
};
