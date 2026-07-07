import { apiClient } from './client';
import type { AssistantChatDto, AssistantReplyDto } from '@/shared/dto/assistant.dto';

/** Ask the in-app help assistant ("Ziggy"). Public endpoint — `auth: 'public'` so a
 *  logged-out marketing-site visitor is a best-effort guest (no token priming, no
 *  refresh loop, and a stray 401 never bounces them to /login). */
export async function askAssistant(dto: AssistantChatDto): Promise<AssistantReplyDto> {
  const res = await apiClient.post<AssistantReplyDto>('/api/v1/assistant/chat', dto, { auth: 'public' });
  return res.data;
}
