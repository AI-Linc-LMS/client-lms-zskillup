import { apiClient } from './client';

/**
 * Scheduled company-assessment API (assessment lifecycle, Phase 2).
 * Mirrors backend src/shared/dto/scheduled-assessment.dto.ts.
 */
export interface ApiScheduledAssessment {
  id: string;
  companyId: string;
  companySlug: string;
  companyName: string;
  companyLogoUrl: string | null;
  mockTestId: string | null;
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  registrationCloseAt: string | null;
  proctored: boolean;
  isActive: boolean;
}

export interface CreateScheduledAssessmentPayload {
  companyId: string;
  mockTestId?: string;
  title: string;
  scheduledAt: string;
  durationMinutes?: number;
  registrationCloseAt?: string;
  proctored?: boolean;
  isActive?: boolean;
}

// ── Student / public ──────────────────────────────────────────────────────────

/** The signed-in student's scheduled assessments (registered companies). */
export async function getMySchedule(): Promise<ApiScheduledAssessment[]> {
  const res = await apiClient.get<ApiScheduledAssessment[]>('/api/v1/me/schedule');
  return res.data;
}

/** Active scheduled assessments for a company (shown on the hub; public). */
export async function getCompanyScheduledAssessments(
  slug: string,
): Promise<ApiScheduledAssessment[]> {
  const res = await apiClient.get<ApiScheduledAssessment[]>(
    `/api/v1/companies/${slug}/scheduled-assessments`,
    { auth: 'public' },
  );
  return res.data;
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export async function listScheduledAssessments(): Promise<ApiScheduledAssessment[]> {
  const res = await apiClient.get<ApiScheduledAssessment[]>('/api/v1/admin/scheduled-assessments');
  return res.data;
}

export async function createScheduledAssessment(
  payload: CreateScheduledAssessmentPayload,
): Promise<ApiScheduledAssessment> {
  const res = await apiClient.post<ApiScheduledAssessment>(
    '/api/v1/admin/scheduled-assessments',
    payload,
  );
  return res.data;
}

export async function updateScheduledAssessment(
  id: string,
  patch: Partial<CreateScheduledAssessmentPayload>,
): Promise<void> {
  await apiClient.patch(`/api/v1/admin/scheduled-assessments/${id}`, patch);
}

export async function deleteScheduledAssessment(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/admin/scheduled-assessments/${id}`);
}

export interface AssessmentResultRow {
  userId: string;
  fullName: string | null;
  email: string;
  score: number;
  total: number;
  scorePct: number;
  percentile: number;
  timeTakenSec: number;
  status: string;
  submittedAt: string | null;
  proctored: boolean;
  tabSwitches: number;
  fullscreenExits: number;
  violations: number;
}

export interface AssessmentResults {
  assessment: {
    id: string;
    title: string;
    companyId: string;
    companyName: string;
    scheduledAt: string;
    proctored: boolean;
  };
  stats: {
    registered: number;
    attempted: number;
    avgScorePct: number;
    topScorePct: number;
    flagged: number;
  };
  rows: AssessmentResultRow[];
}

export async function getAssessmentResults(id: string): Promise<AssessmentResults> {
  const res = await apiClient.get<AssessmentResults>(
    `/api/v1/admin/scheduled-assessments/${id}/results`,
  );
  return res.data;
}
