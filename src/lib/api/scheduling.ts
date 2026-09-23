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
  /** When true, the runner auto-submits after `proctorMaxWarnings` proctoring warnings. */
  proctorAutoSubmit?: boolean;
  proctorMaxWarnings?: number;
  isActive: boolean;
  /** Stamped by publish; null = built but its audience was never emailed. */
  publishedAt?: string | null;
  /** Hard close of the availability window (admin-set), or null = open-ended.
   *  This is the REAL close — use it (not scheduledAt+duration) to decide whether
   *  a student can still start; see {@link assessmentWindowEndMs}. */
  endsAt: string | null;
  /** Free-form description shown on the pre-assessment instructions screen. */
  description?: string | null;
  /** Candidate-facing instructions shown on the pre-assessment screen. */
  instructions?: string | null;
  /** True = visible-locked drive: the student may SEE it but isn't entitled to open
   *  or attempt it (unpaid / non-matching plan). Render a lock + upgrade prompt, no
   *  click-through. Absent/false ⇒ accessible. */
  locked?: boolean;
}

/**
 * The instant a scheduled assessment stops being startable — the admin-set close
 * (`endsAt`), or `scheduledAt + durationMinutes` only as a fallback when no explicit
 * close was configured.
 *
 * `durationMinutes` is the per-ATTEMPT time limit (how long a student gets ONCE they
 * begin), NOT the availability window. Conflating the two made a live drive vanish
 * from the UI at start+duration (9:00 + 120m = 11:00) even though its window was open
 * until 23:30 — the backend correctly allowed starts, but every FE entry point hid the
 * Start button early (bug surfaced in the 2026-08-16 drive). Always gate availability
 * on this, never on scheduledAt+duration.
 */
export function assessmentWindowEndMs(a: {
  scheduledAt: string;
  durationMinutes: number;
  endsAt: string | null;
}): number {
  return a.endsAt
    ? new Date(a.endsAt).getTime()
    : new Date(a.scheduledAt).getTime() + a.durationMinutes * 60_000;
}

export interface CreateScheduledAssessmentPayload {
  companyId: string;
  mockTestId?: string;
  title: string;
  scheduledAt: string;
  durationMinutes?: number;
  registrationCloseAt?: string;
  proctored?: boolean;
  proctorAutoSubmit?: boolean;
  proctorMaxWarnings?: number;
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
  /** Percent of the paper's total marks needed to pass. Omitted = 60. */
  passingScore?: number;
  mcqCount?: number;
  codingCount?: number;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD' | 'MIXED';
  /** Coding-round band. Omit (or 'MIXED') = every band. */
  codingDifficulty?: 'EASY' | 'MEDIUM' | 'HARD' | 'MIXED';
  proctored?: boolean;
  proctorAutoSubmit?: boolean;
  proctorMaxWarnings?: number;
  subscriptionLockEnabled?: boolean;
  profileLockEnabled?: boolean;
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
  codingDifficulty?: 'EASY' | 'MEDIUM' | 'HARD' | 'MIXED';
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

/** 409 QUESTION_SET_LOCKED when `mockTestId` changes on a drive that already has attempts. */
export async function updateScheduledAssessment(
  id: string,
  patch: Partial<CreateScheduledAssessmentPayload>,
): Promise<void> {
  await apiClient.patch(`/api/v1/admin/scheduled-assessments/${id}`, patch);
}

export async function deleteScheduledAssessment(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/admin/scheduled-assessments/${id}`);
}

/** One section of the paper, scored for one student. `maxMarks` is the whole section's
 *  worth — the same for every student, attempted or not — so a section a student never
 *  opened is a 0 out of its maximum, never a blank. Sections arrive in the paper's own
 *  order (`order` = the section's first item), which is the order the report's
 *  section columns use. */
export interface AssessmentResultSection {
  name: string;
  /** Marks earned in this section, by the same rules as the overall score (MCQ: full
   *  marks when correct; coding: partial credit for test cases passed). */
  score: number;
  maxMarks: number;
  order: number;
}

export interface AssessmentResultRow {
  userId: string;
  fullName: string | null;
  email: string;
  phone: string | null;
  /** Did this student sit the test? False only on the roster rows a `roster` report
   *  appends. Read this rather than inferring absence from a zero score - a genuine
   *  zero is not an absence, and the two must never render the same. */
  attempted: boolean;
  collegeName: string | null;
  /** Department - student_profiles.branch (CSE/IT/ECE/EEE/MECH/CIVIL/OTHER). */
  branch: string | null;
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
  /** True iff the N-warning engine auto-submitted this attempt. */
  autoSubmittedByProctor?: boolean;
  /** Distinct proctoring warnings raised (server-counted). */
  warningCount?: number;
  sections: AssessmentResultSection[];
}

export interface AssessmentResults {
  assessment: {
    id: string;
    title: string;
    companyId: string | null;
    companyName: string;
    /** Set for a college (TPO/campus) drive — those embargo the report until released. */
    collegeId: string | null;
    /** Whether the scored report has been released to students (only meaningful for a
     *  college drive; company/platform drives are never embargoed). */
    resultsReleased: boolean;
    cohort: string | null;
    scheduledAt: string;
    proctored: boolean;
    proctorAutoSubmit?: boolean;
    proctorMaxWarnings?: number;
    /** Percent of `maxMarks` a student must score to pass. THE pass criterion —
     *  never the roster's accuracy column, which is correct ÷ attempted. */
    passingScore: number;
    /** MCQ items + coding items (counted from the link tables). */
    totalQuestions: number;
    /** Sum of every item's marks (MCQ + coding). */
    maxMarks: number;
    // The marks split. OPTIONAL only because this UI can be live for the few minutes
    // before its paired backend is (deploy the backend first); once that is out they
    // are always present. Absent ⇒ the split is simply not shown — never guessed,
    // because a business value is rendered, never computed here (ADR-007).
    mcqCount?: number;
    codingCount?: number;
    /** Marks carried by the MCQ half — below `passMarks` means the paper cannot be
     *  passed on MCQs alone. */
    mcqMarks?: number;
    /** Marks carried by the coding half. */
    codingMarks?: number;
    /** `maxMarks × passingScore%`, rounded up — the whole-mark bar to clear. */
    passMarks?: number;
    /** The PAPER's sections in its own order — the authority for the report's section
     *  columns. The rows carry the same list, but a cohort where nobody has sat the
     *  test yet has none, and that is exactly when a new cohort runs its first report.
     *  Optional for the deploy window only (backend ships first). */
    sections?: AssessmentResultSection[];
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

/** Release (or re-embargo) a drive's scored results so students can see their report.
 *  Only a college drive embargoes results; on a company/platform drive this is a no-op. */
export async function releaseAssessmentResults(id: string, released = true): Promise<void> {
  await apiClient.post(`/api/v1/admin/scheduled-assessments/${id}/release`, { released });
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
