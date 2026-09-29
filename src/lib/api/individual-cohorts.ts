import { apiClient } from './client';
import type { CohortDto } from '@/shared';

/** Individual (non-college) cohort management (Admin). */

export type IndividualCohort = CohortDto;

export interface IndividualCohortMember {
  id: string;
  fullName: string | null;
  email: string;
  status: string;
}

export interface AddCohortUsersResult {
  added: number;
  invited: number;
  skipped: number;
  rows: Array<{ email: string; status: 'added' | 'invited' | 'skipped' | 'invalid'; reason?: string }>;
}

const BASE = '/api/v1/admin/individual-cohorts';

export async function listIndividualCohorts(): Promise<IndividualCohort[]> {
  return (await apiClient.get<IndividualCohort[]>(BASE)).data;
}

export async function createIndividualCohort(body: { name: string; description?: string }): Promise<IndividualCohort> {
  return (await apiClient.post<IndividualCohort>(BASE, body)).data;
}

export async function updateIndividualCohort(id: string, body: { name: string; description?: string }): Promise<IndividualCohort> {
  return (await apiClient.patch<IndividualCohort>(`${BASE}/${id}`, body)).data;
}

export async function deleteIndividualCohort(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}

export async function listCohortMembers(id: string): Promise<IndividualCohortMember[]> {
  return (await apiClient.get<IndividualCohortMember[]>(`${BASE}/${id}/members`)).data;
}

export async function addCohortUsers(
  id: string,
  entries: Array<{ email: string; fullName?: string }>,
): Promise<AddCohortUsersResult> {
  return (await apiClient.post<AddCohortUsersResult>(`${BASE}/${id}/members`, { entries })).data;
}

export async function removeCohortMember(id: string, userId: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}/members/${userId}`);
}

/** What a grant to this cohort would reach, before committing to it. */
export interface CohortAccessPreview {
  members: number;
  alreadyHave: number;
  wouldGrant: number;
}

export async function previewCohortAccess(
  id: string,
  scope: string,
  scopeRef?: string,
): Promise<CohortAccessPreview> {
  const qs = new URLSearchParams({ scope, ...(scopeRef ? { scopeRef } : {}) });
  return (await apiClient.get<CohortAccessPreview>(`${BASE}/${id}/access?${qs}`)).data;
}

/** Give every member the same access. Members who already hold it are left alone. */
export async function grantCohortAccess(
  id: string,
  body: { scope: string; scopeRef?: string; durationDays?: number },
): Promise<{ members: number; granted: number; alreadyHad: number }> {
  return (await apiClient.post<{ members: number; granted: number; alreadyHad: number }>(
    `${BASE}/${id}/access`,
    body,
  )).data;
}
