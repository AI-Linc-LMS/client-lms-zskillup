import { apiClient } from './client';
import type {
  CohortDto,
  SendCollegeReportResult,
  TpoCollegeSummary,
  TpoDashboard,
} from '@/shared';

/**
 * Admin / Super-Admin view of a college's TPO analytics (TPO Panel View). The SAME
 * college-scoped analytics a TPO sees, for a college chosen by id — gated server-side
 * to ADMIN / SUPER_ADMIN. Plus the one-click "email the report to the college".
 */

const base = (collegeId: string) => `/api/v1/admin/colleges/${collegeId}`;

export async function getAdminCollegeAnalytics(
  collegeId: string,
  cohortId?: string,
): Promise<TpoDashboard> {
  const qs = cohortId ? `?cohortId=${encodeURIComponent(cohortId)}` : '';
  return (await apiClient.get<TpoDashboard>(`${base(collegeId)}/analytics${qs}`)).data;
}

export async function getAdminCollegeSummary(collegeId: string): Promise<TpoCollegeSummary> {
  return (await apiClient.get<TpoCollegeSummary>(`${base(collegeId)}/college-summary`)).data;
}

/** Cohorts for the batch filter (served by AdminCohortsController). */
export async function getAdminCollegeCohorts(collegeId: string): Promise<CohortDto[]> {
  return (await apiClient.get<CohortDto[]>(`${base(collegeId)}/cohorts`)).data;
}

export async function emailCollegeReport(
  collegeId: string,
  body: { cohortId?: string; recipients?: string[] },
): Promise<SendCollegeReportResult> {
  return (await apiClient.post<SendCollegeReportResult>(`${base(collegeId)}/report/email`, body)).data;
}
