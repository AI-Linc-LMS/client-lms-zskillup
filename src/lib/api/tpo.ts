import { apiClient } from './client';
import type {
  CollegeSubscriptionDto,
  CreateTpoAssessmentDto,
  CreateTpoPlacementDto,
  TpoAssessment,
  TpoAssessmentList,
  TpoBulkInviteDto,
  TpoBulkInviteResult,
  TpoCodingAnalytics,
  TpoCollegeSummary,
  TpoCompanyHeatmap,
  TpoDashboard,
  TpoInterviewAnalytics,
  TpoPlacement,
  TpoPlacementSummary,
  TpoReadinessTrend,
  TpoRecommendations,
  TpoStudentDetail,
} from '@/shared';
import type { AssessmentResults } from './scheduling';

export async function getTpoAnalytics(cohortId?: string): Promise<TpoDashboard> {
  const qs = cohortId ? `?cohortId=${encodeURIComponent(cohortId)}` : '';
  const res = await apiClient.get<TpoDashboard>(`/api/v1/tpo/analytics${qs}`);
  return res.data;
}

/** College identity + headline counts for the console chrome (brand + batch selector). */
export async function getTpoCollegeSummary(): Promise<TpoCollegeSummary> {
  const res = await apiClient.get<TpoCollegeSummary>('/api/v1/tpo/college-summary');
  return res.data;
}

/** Full per-student drill-down for the Student Analytics drawer. */
export async function getTpoStudentDetail(id: string): Promise<TpoStudentDetail> {
  const res = await apiClient.get<TpoStudentDetail>(`/api/v1/tpo/students/${id}`);
  return res.data;
}

/** Cohort-level AI (or rule-based) recommended actions. */
export async function getTpoRecommendations(cohortId?: string): Promise<TpoRecommendations> {
  const qs = cohortId ? `?cohortId=${encodeURIComponent(cohortId)}` : '';
  const res = await apiClient.get<TpoRecommendations>(`/api/v1/tpo/recommendations${qs}`);
  return res.data;
}

/** Company Readiness heatmap (student counts per accuracy band per company). */
export async function getTpoCompanyHeatmap(cohortId?: string): Promise<TpoCompanyHeatmap> {
  const qs = cohortId ? `?cohortId=${encodeURIComponent(cohortId)}` : '';
  const res = await apiClient.get<TpoCompanyHeatmap>(`/api/v1/tpo/company-heatmap${qs}`);
  return res.data;
}

/** Campus coding analytics — solve rate, difficulty breakdown, company-tagged. */
export async function getTpoCodingAnalytics(cohortId?: string): Promise<TpoCodingAnalytics> {
  const qs = cohortId ? `?cohortId=${encodeURIComponent(cohortId)}` : '';
  const res = await apiClient.get<TpoCodingAnalytics>(`/api/v1/tpo/coding-analytics${qs}`);
  return res.data;
}

/** Campus interview analytics — readiness, communication, confidence, weaknesses. */
export async function getTpoInterviewAnalytics(cohortId?: string): Promise<TpoInterviewAnalytics> {
  const qs = cohortId ? `?cohortId=${encodeURIComponent(cohortId)}` : '';
  const res = await apiClient.get<TpoInterviewAnalytics>(`/api/v1/tpo/interview-analytics${qs}`);
  return res.data;
}

/** The college's current subscription (plan, seats, validity) — null if none. */
export async function getTpoSubscription(): Promise<CollegeSubscriptionDto | null> {
  const res = await apiClient.get<CollegeSubscriptionDto | null>('/api/v1/tpo/subscription');
  return res.data;
}

/** Placement-readiness trend over time (weekly snapshots). */
export async function getTpoReadinessTrend(cohortId?: string): Promise<TpoReadinessTrend> {
  const qs = cohortId ? `?cohortId=${encodeURIComponent(cohortId)}` : '';
  const res = await apiClient.get<TpoReadinessTrend>(`/api/v1/tpo/readiness/trend${qs}`);
  return res.data;
}

// ── Placement outcomes (real offers) ────────────────────────────────────────────

export async function getTpoPlacements(cohortId?: string): Promise<TpoPlacement[]> {
  const qs = cohortId ? `?cohortId=${encodeURIComponent(cohortId)}` : '';
  const res = await apiClient.get<TpoPlacement[]>(`/api/v1/tpo/placements${qs}`);
  return res.data;
}

export async function getTpoPlacementSummary(cohortId?: string): Promise<TpoPlacementSummary> {
  const qs = cohortId ? `?cohortId=${encodeURIComponent(cohortId)}` : '';
  const res = await apiClient.get<TpoPlacementSummary>(`/api/v1/tpo/placements/summary${qs}`);
  return res.data;
}

export async function recordTpoPlacement(dto: CreateTpoPlacementDto): Promise<TpoPlacement> {
  const res = await apiClient.post<TpoPlacement>('/api/v1/tpo/placements', dto);
  return res.data;
}

export async function deleteTpoPlacement(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/tpo/placements/${id}`);
}

// ── Assessment Center ───────────────────────────────────────────────────────────

export async function getTpoAssessments(cohortId?: string): Promise<TpoAssessmentList> {
  const qs = cohortId ? `?cohortId=${encodeURIComponent(cohortId)}` : '';
  const res = await apiClient.get<TpoAssessmentList>(`/api/v1/tpo/assessments${qs}`);
  return res.data;
}

export async function createTpoAssessment(dto: CreateTpoAssessmentDto): Promise<TpoAssessment> {
  const res = await apiClient.post<TpoAssessment>('/api/v1/tpo/assessments', dto);
  return res.data;
}

export async function getTpoAssessmentResults(id: string): Promise<AssessmentResults> {
  const res = await apiClient.get<AssessmentResults>(`/api/v1/tpo/assessments/${id}/results`);
  return res.data;
}

export async function releaseTpoAssessment(id: string): Promise<void> {
  await apiClient.post(`/api/v1/tpo/assessments/${id}/release`, {});
}

export async function deleteTpoAssessment(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/tpo/assessments/${id}`);
}

/**
 * TPO API client (Implementation Plan §4). v1 ships bulk-invite; dashboards
 * + at-risk + reports land in Sprint 7 once PPS is computable.
 */

export async function bulkInviteStudents(dto: TpoBulkInviteDto): Promise<TpoBulkInviteResult> {
  const res = await apiClient.post<TpoBulkInviteResult>('/api/v1/tpo/invitations', dto);
  return res.data;
}
