import { apiClient } from './client';
import type {
  AdminTopicConceptVideoDto,
  SetTopicConceptVideoDto,
} from '@/shared/dto/topic-concept-video.dto';

export type { AdminTopicConceptVideoDto } from '@/shared/dto/topic-concept-video.dto';

/** List depth-1 topics with their concept video (admin authoring). */
export async function listConceptVideoTopics(): Promise<AdminTopicConceptVideoDto[]> {
  return (await apiClient.get<AdminTopicConceptVideoDto[]>('/api/v1/admin/questions/topics/concept-videos')).data;
}

/** Set (or clear, with empty url) a topic's concept video. Provider auto-detected. */
export async function setTopicConceptVideo(
  id: string,
  body: SetTopicConceptVideoDto,
): Promise<AdminTopicConceptVideoDto> {
  return (
    await apiClient.patch<AdminTopicConceptVideoDto>(`/api/v1/admin/questions/topics/${id}/concept-video`, body)
  ).data;
}
