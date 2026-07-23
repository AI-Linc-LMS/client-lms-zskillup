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
  /** When the assessment window closes (scheduledAt + duration). Backend-computed. */
  endsAt: string | null;
  /** Free-form description shown on the pre-assessment instructions screen. */
  description?: string | null;
  /** Candidate-facing instructions shown on the pre-assessment screen. */
  instructions?: string | null;
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

/** A single scheduled assessment by id (STUDENT-scoped to the caller's eligibility). */
export async function getScheduledAssessment(id: string): Promise<ApiScheduledAssessment> {
  const res = await apiClient.get<ApiScheduledAssessment>(`/api/v1/scheduled-assessments/${id}`);
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

// ── Bank-sampling creator (matches the TPO Assessment Center flow) ──────────────

/** Build an admin drive by sampling the bank — same MCQ/coding-round flow as the TPO
 *  panel (mode → sections → coding topics → counts). Mirrors AdminBuildAssessmentDto. */
export interface BuildAssessmentPayload {
  mode: 'SECTIONAL' | 'COMPANY';
  companySlug?: string;
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  mcqCount?: number;
  codingCount?: number;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD' | 'MIXED';
  proctored?: boolean;
  /** Target a single individual (non-college) cohort — members-only visibility. */
  cohortId?: string;
  topicIds?: string[];
  codingTopics?: string[];
}

export interface BuildAvailability {
  mcqAvailable: number;
  codingAvailable: number;
}

export async function buildScheduledAssessment(
  payload: BuildAssessmentPayload,
): Promise<ApiScheduledAssessment> {
  const res = await apiClient.post<ApiScheduledAssessment>(
    '/api/v1/admin/scheduled-assessments/build',
    payload,
  );
  return res.data;
}

export async function previewBuildAssessment(payload: {
  mode: 'SECTIONAL' | 'COMPANY';
  companySlug?: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD' | 'MIXED';
  topicIds?: string[];
  codingTopics?: string[];
}): Promise<BuildAvailability> {
  const res = await apiClient.post<BuildAvailability>(
    '/api/v1/admin/scheduled-assessments/build/preview',
    payload,
  );
  return res.data;
}

export async function getAdminCodingTopics(
  companySlug?: string,
): Promise<Array<{ topic: string; count: number }>> {
  const qs = companySlug ? `?companySlug=${encodeURIComponent(companySlug)}` : '';
  const res = await apiClient.get<Array<{ topic: string; count: number }>>(
    `/api/v1/admin/scheduled-assessments/build/coding-topics${qs}`,
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

export interface AssessmentResultSection {
  name: string;
  correct: number;
  total: number;
}

export interface AssessmentResultRow {
  userId: string;
  fullName: string | null;
  email: string;
  phone: string | null;
  collegeName: string | null;
  cohort: string | null;
  score: number;
  /** Maximum marks. */
  total: number;
  scorePct: number;
  /** 1-based overall rank (by score desc, time asc). */
  rank: number;
  passed: boolean;
  percentile: number;
  startedAt: string | null;
  submittedAt: string | null;
  timeTakenSec: number;
  totalQuestions: number;
  attemptedQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  /** Correct / attempted, %. */
  accuracy: number;
  status: string;
  proctored: boolean;
  tabSwitches: number;
  fullscreenExits: number;
  faceViolations: number;
  faceValidationFailures: number;
  multipleFaceDetections: number;
  /** Total logged violations. */
  violations: number;
  integrityScore: number | null;
  sections: AssessmentResultSection[];
}

export interface AssessmentResults {
  assessment: {
    id: string;
    title: string;
    companyId: string;
    companyName: string;
    cohort: string | null;
    scheduledAt: string;
    proctored: boolean;
    passingScore: number;
    totalQuestions: number;
    maxMarks: number;
  };
  stats: {
    registered: number;
    attempted: number;
    avgScorePct: number;
    topScorePct: number;
    flagged: number;
    passed: number;
  };
  rows: AssessmentResultRow[];
}

export async function getAssessmentResults(id: string): Promise<AssessmentResults> {
  const res = await apiClient.get<AssessmentResults>(
    `/api/v1/admin/scheduled-assessments/${id}/results`,
  );
  return res.data;
}

export interface AssessmentLeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatarUrl: string | null;
  collegeName: string | null;
  level: number;
  totalXp: number;
  badgesEarned: number;
  currentStreakDays: number;
  scorePct: number;
  percentile: number;
  score: number;
  total: number;
  timeTakenSec: number;
  isYou: boolean;
}
export interface AssessmentSectionPercentile {
  section: string;
  correct: number;
  total: number;
  accuracyPct: number;
  percentile: number;
}
export interface AssessmentLeaderboard {
  assessment: { id: string; title: string; companyName: string };
  total: number;
  myRank: number | null;
  myPercentile: number | null;
  sections: AssessmentSectionPercentile[];
  entries: AssessmentLeaderboardEntry[];
}

export async function getAssessmentLeaderboard(id: string): Promise<AssessmentLeaderboard> {
  const res = await apiClient.get<AssessmentLeaderboard>(
    `/api/v1/scheduled-assessments/${id}/leaderboard`,
  );
  return res.data;
}
