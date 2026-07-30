import { apiClient } from './client';
import type {
  StudyMaterialDto,
  StudyMaterialProgressResultDto,
  WatchSaveResultDto,
} from '@/shared/dto/study-material.dto';

export type {
  StudyMaterialDto,
  StudyMaterialSectionDto,
  StudyMaterialTopicDto,
  StudyMaterialItemDto,
  StudyMaterialItemKind,
  StudyMaterialVideoProvider,
  StudyMaterialProgressResultDto,
  WatchSaveResultDto,
} from '@/shared/dto/study-material.dto';

/** A company's published Study Material tree + the caller's progress. */
export async function getStudyMaterial(slug: string): Promise<StudyMaterialDto> {
  return (await apiClient.get<StudyMaterialDto>(`/api/v1/companies/${slug}/study-material`)).data;
}

/** Mark a study-material item done / undone. */
export async function completeStudyMaterialItem(
  slug: string,
  itemId: string,
  done: boolean,
): Promise<StudyMaterialProgressResultDto> {
  return (
    await apiClient.post<StudyMaterialProgressResultDto>(
      `/api/v1/companies/${slug}/study-material/items/${itemId}/complete`,
      { done },
    )
  ).data;
}

/** A section's published Study Material tree + the caller's progress. Mirrors the
 *  company endpoint but keyed by the taxonomy root slug (Sectional Hubs). */
export async function getSectionStudyMaterial(slug: string): Promise<StudyMaterialDto> {
  return (await apiClient.get<StudyMaterialDto>(`/api/v1/sections/${slug}/study-material`)).data;
}

/** Mark a section study-material item done / undone. */
export async function completeSectionStudyMaterialItem(
  slug: string,
  itemId: string,
  done: boolean,
): Promise<StudyMaterialProgressResultDto> {
  return (
    await apiClient.post<StudyMaterialProgressResultDto>(
      `/api/v1/sections/${slug}/study-material/items/${itemId}/complete`,
      { done },
    )
  ).data;
}

/** Save a video watch-progress ping (whole seconds). Auto-completes server-side at
 *  the watch threshold; `completed` flips true on the first crossing. */
export async function saveStudyMaterialWatch(
  scope: 'company' | 'section',
  slug: string,
  itemId: string,
  positionSeconds: number,
  durationSeconds: number,
): Promise<WatchSaveResultDto> {
  const base = scope === 'section' ? 'sections' : 'companies';
  return (
    await apiClient.post<WatchSaveResultDto>(
      `/api/v1/${base}/${slug}/study-material/items/${itemId}/watch`,
      { positionSeconds: Math.max(0, Math.floor(positionSeconds)), durationSeconds: Math.max(0, Math.floor(durationSeconds)) },
    )
  ).data;
}
