import { apiClient } from './client';
import type { ResumeData, TemplateKey } from '@/components/resume/types';
import type {
  ResumeDetailDto,
  ResumeSummaryDto,
  SaveResumeDto,
  UpdateResumeDto,
} from '@/shared/dto/resume.dto';

/** Resume persistence API client. All routes are owner-scoped (@CurrentUser). */

export interface SavedResumeDetail {
  id: string;
  title: string;
  template: TemplateKey;
  data: ResumeData;
  createdAt: string;
  updatedAt: string;
}

function toDetail(d: ResumeDetailDto): SavedResumeDetail {
  return {
    id: d.id,
    title: d.title,
    template: d.template as TemplateKey,
    data: d.data as unknown as ResumeData,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

export async function listResumes(): Promise<ResumeSummaryDto[]> {
  return (await apiClient.get<ResumeSummaryDto[]>('/api/v1/me/resumes')).data;
}

export async function getResume(id: string): Promise<SavedResumeDetail> {
  return toDetail((await apiClient.get<ResumeDetailDto>(`/api/v1/me/resumes/${id}`)).data);
}

export async function createResume(payload: {
  title: string;
  template: TemplateKey;
  data: ResumeData;
}): Promise<SavedResumeDetail> {
  const body: SaveResumeDto = {
    title: payload.title,
    template: payload.template,
    data: payload.data as unknown as Record<string, unknown>,
  };
  return toDetail((await apiClient.post<ResumeDetailDto>('/api/v1/me/resumes', body)).data);
}

export async function updateResume(
  id: string,
  payload: { title?: string; template?: TemplateKey; data?: ResumeData },
): Promise<SavedResumeDetail> {
  const body: UpdateResumeDto = {
    ...(payload.title !== undefined ? { title: payload.title } : {}),
    ...(payload.template !== undefined ? { template: payload.template } : {}),
    ...(payload.data !== undefined ? { data: payload.data as unknown as Record<string, unknown> } : {}),
  };
  return toDetail((await apiClient.patch<ResumeDetailDto>(`/api/v1/me/resumes/${id}`, body)).data);
}

/**
 * Upsert the user's PRIMARY resume - the single record the profile page keeps in
 * sync. Free and paywall-exempt (completing your profile never costs a resume run
 * or 402), unlike {@link createResume}. Updates the existing primary or creates it.
 */
export async function upsertPrimaryResume(payload: {
  title: string;
  template: TemplateKey;
  data: ResumeData;
}): Promise<SavedResumeDetail> {
  const body: SaveResumeDto = {
    title: payload.title,
    template: payload.template,
    data: payload.data as unknown as Record<string, unknown>,
  };
  return toDetail((await apiClient.put<ResumeDetailDto>('/api/v1/me/resumes/primary', body)).data);
}

export async function deleteResume(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/me/resumes/${id}`);
}
