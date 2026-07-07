import { apiClient } from './client';
import type { AssistantChatDto, AssistantReplyDto } from '@/shared/dto/assistant.dto';

/** Ask the in-app help assistant ("Ziggy"). Public endpoint — works logged-out too. */
export async function askAssistant(dto: AssistantChatDto): Promise<AssistantReplyDto> {
  const res = await apiClient.post<AssistantReplyDto>('/api/v1/assistant/chat', dto);
  return res.data;
}
