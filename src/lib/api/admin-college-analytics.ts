import { apiClient } from './client';
import type {
  CohortDto,
  SendCollegeReportResult,
  TpoCollegeSummary,
  TpoCompanyReadinessReport,
  TpoDashboard,
  TpoParticipation,
  TpoReportableAssessment,
} from '@/shared';
import type { AssessmentResults } from './scheduling';

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

/** Extra participation & engagement roll-ups (gamification, drives, live sessions). */
export async function getAdminCollegeParticipation(
  collegeId: string,
  cohortId?: string,
): Promise<TpoParticipation> {
  const qs = cohortId ? `?cohortId=${encodeURIComponent(cohortId)}` : '';
  return (await apiClient.get<TpoParticipation>(`${base(collegeId)}/participation${qs}`)).data;
}

/** Roster-wide student-level readiness for ONE company (the TPO report, for a college
 *  chosen by id). Same endpoint shape as GET /tpo/company-readiness/students. */
export async function getAdminCollegeCompanyReadinessStudents(
  collegeId: string,
  company: string,
  cohortId?: string,
): Promise<TpoCompanyReadinessReport> {
  const params = new URLSearchParams({ company });
  if (cohortId) params.set('cohortId', cohortId);
  return (
    await apiClient.get<TpoCompanyReadinessReport>(
      `${base(collegeId)}/company-readiness/students?${params.toString()}`,
    )
  ).data;
}

/** The drives this college can report on — its own, plus any its students attempted.
 *  The same list a TPO's picker shows, for a college chosen by id. */
export async function getAdminCollegeReportableAssessments(
  collegeId: string,
): Promise<TpoReportableAssessment[]> {
  const res = await apiClient.get<{ assessments: TpoReportableAssessment[] }>(
    `${base(collegeId)}/assessments/reportable`,
  );
  return res.data.assessments;
}

/** A college's whole roster against the Placement Readiness Test. */
export async function getAdminCollegePlacementReadinessReport(
  collegeId: string,
): Promise<AssessmentResults> {
  const res = await apiClient.get<AssessmentResults>(
    `${base(collegeId)}/reports/placement-readiness`,
  );
  return res.data;
}

/** One drive's results for a college. `roster` adds every student on that college's
 *  roster who did NOT attempt, as a row with `attempted: false`. */
export async function getAdminCollegeAssessmentResults(
  collegeId: string,
  id: string,
  opts: { roster?: boolean } = {},
): Promise<AssessmentResults> {
  const res = await apiClient.get<AssessmentResults>(
    `${base(collegeId)}/assessments/${id}/results${opts.roster ? '?roster=1' : ''}`,
  );
  return res.data;
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
