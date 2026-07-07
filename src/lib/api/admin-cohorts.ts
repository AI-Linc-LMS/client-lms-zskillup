import { apiClient } from './client';
import type { CohortDto, CreateCohortDto, TpoBulkInviteDto, TpoBulkInviteResult } from '@/shared';

/**
 * Admin-side cohort + invitation management, scoped to a college by id. Backing
 * routes are ADMIN-only (/admin/colleges/:collegeId/…). The TPO console has
 * read-only cohort access; configuration lives with the Platform Admin.
 */

export async function getCollegeCohorts(collegeId: string): Promise<CohortDto[]> {
  const res = await apiClient.get<CohortDto[]>(`/api/v1/admin/colleges/${collegeId}/cohorts`);
  return res.data;
}

export async function createCollegeCohort(collegeId: string, body: CreateCohortDto): Promise<CohortDto> {
  const res = await apiClient.post<CohortDto>(`/api/v1/admin/colleges/${collegeId}/cohorts`, body);
  return res.data;
}

export async function inviteCollegeStudents(
  collegeId: string,
  dto: TpoBulkInviteDto,
): Promise<TpoBulkInviteResult> {
  const res = await apiClient.post<TpoBulkInviteResult>(`/api/v1/admin/colleges/${collegeId}/invitations`, dto);
  return res.data;
}
