import { apiClient } from './client';
import type {
  StudyMaterialDto,
  StudyMaterialProgressResultDto,
} from '@/shared/dto/study-material.dto';

export type {
  StudyMaterialDto,
  StudyMaterialSectionDto,
  StudyMaterialTopicDto,
  StudyMaterialItemDto,
  StudyMaterialItemKind,
  StudyMaterialVideoProvider,
  StudyMaterialProgressResultDto,
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
