import { apiClient } from './client';
import type {
  AdminStudyMaterialDto,
  StudyMaterialItemKind,
} from '@/shared/dto/study-material.dto';

export type {
  AdminStudyMaterialDto,
  AdminStudyMaterialSectionDto,
  AdminStudyMaterialTopicDto,
  AdminStudyMaterialItemDto,
} from '@/shared/dto/study-material.dto';

export async function getAdminStudyMaterial(companyId: string): Promise<AdminStudyMaterialDto> {
  return (await apiClient.get<AdminStudyMaterialDto>(`/api/v1/admin/companies/${companyId}/study-material`)).data;
}

// ── sections ──────────────────────────────────────────────────────────────
export async function createSection(body: { companyId: string; title: string; subtitle?: string }) {
  await apiClient.post('/api/v1/admin/study-material/sections', body);
}
export async function updateSection(
  id: string,
  body: Partial<{ title: string; subtitle: string | null; isPublished: boolean; orderIndex: number }>,
) {
  await apiClient.patch(`/api/v1/admin/study-material/sections/${id}`, body);
}
export async function deleteSection(id: string) {
  await apiClient.delete(`/api/v1/admin/study-material/sections/${id}`);
}

// ── topics ────────────────────────────────────────────────────────────────
export async function createTopic(body: { sectionId: string; title: string }) {
  await apiClient.post('/api/v1/admin/study-material/topics', body);
}
export async function updateTopic(id: string, body: Partial<{ title: string; orderIndex: number }>) {
  await apiClient.patch(`/api/v1/admin/study-material/topics/${id}`, body);
}
export async function deleteTopic(id: string) {
  await apiClient.delete(`/api/v1/admin/study-material/topics/${id}`);
}

// ── items ─────────────────────────────────────────────────────────────────
export interface ItemInput {
  kind: StudyMaterialItemKind;
  title: string;
  description?: string | null;
  url?: string | null;
  durationLabel?: string | null;
  quizTopicSlug?: string | null;
  quizQuestionCount?: number | null;
  isFree?: boolean;
}
export async function createItem(body: ItemInput & { topicId: string }) {
  await apiClient.post('/api/v1/admin/study-material/items', body);
}
export async function updateItem(id: string, body: Partial<ItemInput & { orderIndex: number }>) {
  await apiClient.patch(`/api/v1/admin/study-material/items/${id}`, body);
}
export async function deleteItem(id: string) {
  await apiClient.delete(`/api/v1/admin/study-material/items/${id}`);
}

export async function reorderStudyMaterial(level: 'section' | 'topic' | 'item', ids: string[]) {
  await apiClient.post('/api/v1/admin/study-material/reorder', { level, ids });
}

/** (Re)generate this company's quiz sections from its real question bank. */
export async function generateStudyMaterialQuizzes(
  companyId: string,
): Promise<{ sections: number; topics: number; quizzes: number }> {
  return (
    await apiClient.post<{ sections: number; topics: number; quizzes: number }>(
      `/api/v1/admin/companies/${companyId}/study-material/generate-quizzes`,
      {},
    )
  ).data;
}
