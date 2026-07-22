import { apiClient } from './client';
import type { CohortDto, CreateCohortDto } from '@/shared';

/** Cohort management (TPO console - Batch 4). College-scoped server-side. */

export type Cohort = CohortDto;

export async function listCohorts(): Promise<Cohort[]> {
  const res = await apiClient.get<Cohort[]>('/api/v1/tpo/cohorts');
  return res.data;
}

export async function createCohort(body: CreateCohortDto): Promise<Cohort> {
  const res = await apiClient.post<Cohort>('/api/v1/tpo/cohorts', body);
  return res.data;
}
