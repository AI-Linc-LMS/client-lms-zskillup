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
