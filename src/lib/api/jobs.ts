import { apiClient, type DownloadedFile } from './client';
import type {
  ApplyToJobDto,
  CreateJobPostingDto,
  JobApplicantDto,
  JobApplicationDto,
  JobBoardFilters,
  JobPostingDto,
  JobPostingQuestionDto,
  JobQuestionDto,
  JobTargetDto,
  JobTargetViewDto,
  SendApplicantEmailDto,
  UpdateJobApplicationDto,
  JobPostingPatch,
  UpsertJobQuestionDto,
} from '@/shared/dto/jobs.dto';
import type { JobStatus } from '@/shared/enums';
import type { EligibilityOutcome } from '@/shared/drive-eligibility';
import type { MatchResult, MatchWeights } from '@/shared/drive-matching';

export type {
  JobApplicantDto,
  JobApplicationDto,
  JobPostingDto,
  JobPostingQuestionDto,
  JobQuestionDto,
  JobTargetViewDto,
} from '@/shared/dto/jobs.dto';

/**
 * Which PMS a call goes to.
 *
 * The TPO console reuses the admin PMS screens wholesale — same composer, same
 * applicants table, same stage machine — against a controller that scopes everything to
 * one college. Rather than fork those components, the handful of calls they make take a
 * base and default to the admin one, so an existing caller is unchanged.
 *
 * It is NOT a free-text path: a mistyped base would silently call an endpoint that does
 * not exist, and the screen would render an empty table rather than an error.
 */
export type JobsApiBase = '/api/v1/admin/jobs' | '/api/v1/tpo/jobs';
export const ADMIN_JOBS_BASE: JobsApiBase = '/api/v1/admin/jobs';
export const TPO_JOBS_BASE: JobsApiBase = '/api/v1/tpo/jobs';

/**
 * The SCREEN path that matches an API base.
 *
 * The shared PMS components were given a `base` for their fetches and kept their links
 * hardcoded to /admin/jobs. The APIs were therefore correct while every link out of
 * them pointed into the admin console — which middleware refuses to a COLLEGE_ADMIN, so
 * a TPO pressing "New posting" was bounced to their dashboard. The API being right is
 * what made it invisible to route probes: nothing 404s, nothing errors, the user just
 * ends up somewhere else.
 *
 * One prop now drives both, so they cannot disagree again.
 */
export function uiBaseFor(base: JobsApiBase): '/admin/jobs' | '/tpo/jobs' {
  return base === TPO_JOBS_BASE ? '/tpo/jobs' : '/admin/jobs';
}

/** Admin: every posting including drafts. */
export async function listAdminJobs(base: JobsApiBase = ADMIN_JOBS_BASE): Promise<JobPostingDto[]> {
  return (await apiClient.get<JobPostingDto[]>(base)).data;
}

export async function createJob(
  dto: CreateJobPostingDto,
  base: JobsApiBase = ADMIN_JOBS_BASE,
): Promise<JobPostingDto> {
  return (await apiClient.post<JobPostingDto>(base, dto)).data;
}

/** Duplicate a posting as a fresh unpublished draft (fields, questions and targets), so
 *  an admin re-running a similar role doesn't retype it. Returns the new draft. */
export async function cloneJob(id: string): Promise<JobPostingDto> {
  return (await apiClient.post<JobPostingDto>(`/api/v1/admin/jobs/${id}/clone`, {})).data;
}

export async function updateJob(
  id: string,
  dto: JobPostingPatch,
  base: JobsApiBase = ADMIN_JOBS_BASE,
): Promise<JobPostingDto> {
  return (await apiClient.patch<JobPostingDto>(`${base}/${id}`, dto)).data;
}

export async function deleteJob(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/admin/jobs/${id}`);
}

/* ---------------------------------------------------------------------------
 * Applications
 * ------------------------------------------------------------------------- */

/** Whether *I* have applied to this job. null = not yet. */
export async function getMyApplication(slug: string): Promise<JobApplicationDto | null> {
  return (await apiClient.get<JobApplicationDto | null>(`/api/v1/jobs/${slug}/my-application`)).data;
}

/**
 * Apply. Throws with code `PAYWALL` when the student has no active plan - the
 * server decides that, not us. The button is hidden for free students as a
 * courtesy, never as the control.
 */
export async function applyToJob(slug: string): Promise<JobApplicationDto> {
  return (await apiClient.post<JobApplicationDto>(`/api/v1/jobs/${slug}/apply`, {})).data;
}

export async function listMyApplications(): Promise<JobApplicationDto[]> {
  return (await apiClient.get<JobApplicationDto[]>('/api/v1/me/job-applications')).data;
}

/* --- admin --- */

export async function listJobApplicants(jobId: string): Promise<JobApplicantDto[]> {
  return (await apiClient.get<JobApplicantDto[]>(`/api/v1/admin/jobs/${jobId}/applications`)).data;
}

export async function updateJobApplication(
  applicationId: string,
  dto: UpdateJobApplicationDto,
): Promise<JobApplicantDto> {
  return (
    await apiClient.patch<JobApplicantDto>(`/api/v1/admin/jobs/applications/${applicationId}`, dto)
  ).data;
}

export async function emailJobApplicant(
  applicationId: string,
  dto: SendApplicantEmailDto,
): Promise<{ sent: true }> {
  return (
    await apiClient.post<{ sent: true }>(
      `/api/v1/admin/jobs/applications/${applicationId}/email`,
      dto,
    )
  ).data;
}

/* ---------------------------------------------------------------------------
 * The board
 * ------------------------------------------------------------------------- */

/** Turn the filter object into a query string, dropping anything unset. */
function toQuery(filters: Record<string, unknown>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v)) {
      if (v.length === 0) continue;
      for (const item of v) p.append(k, String(item));
    } else {
      p.set(k, String(v));
    }
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

export interface JobBoardPage {
  items: JobPostingDto[];
  total: number;
}

/** The jobs this caller may see. Works signed out; a signed-in student also gets
 *  anything targeted at their college, cohort or drives. */
export async function listJobs(filters: JobBoardFilters = {}): Promise<JobBoardPage> {
  return (await apiClient.get<JobBoardPage>(`/api/v1/jobs${toQuery({ ...filters })}`)).data;
}

export interface JobFacets {
  companies: string[];
  locations: string[];
  workModes: string[];
  employmentTypes: string[];
  jobKinds: string[];
  /** Ordered by how often they appear on real postings, not alphabetically. */
  skills: string[];
  passoutYears: number[];
  total: number;
}

export async function getJobFacets(): Promise<JobFacets> {
  return (await apiClient.get<JobFacets>('/api/v1/jobs/facets')).data;
}

/* --- student actions --- */

export async function applyToJobWith(slug: string, dto: ApplyToJobDto): Promise<JobApplicationDto> {
  return (await apiClient.post<JobApplicationDto>(`/api/v1/jobs/${slug}/apply`, dto)).data;
}

export async function toggleSaveJob(slug: string): Promise<{ saved: boolean }> {
  return (await apiClient.post<{ saved: boolean }>(`/api/v1/jobs/${slug}/save`, {})).data;
}

export async function listSavedJobSlugs(): Promise<string[]> {
  return (await apiClient.get<string[]>('/api/v1/me/saved-jobs')).data;
}

/* --- admin: targeting --- */

export async function getJobTargets(
  jobId: string,
  base: JobsApiBase = ADMIN_JOBS_BASE,
): Promise<JobTargetViewDto[]> {
  return (await apiClient.get<JobTargetViewDto[]>(`${base}/${jobId}/targets`)).data;
}

export async function setJobTargets(
  jobId: string,
  targets: JobTargetDto[],
  base: JobsApiBase = ADMIN_JOBS_BASE,
): Promise<JobTargetViewDto[]> {
  return (await apiClient.put<JobTargetViewDto[]>(`${base}/${jobId}/targets`, { targets })).data;
}

export async function getJobReach(
  jobId: string,
  base: JobsApiBase = ADMIN_JOBS_BASE,
): Promise<{ isPublic: boolean; students: number }> {
  return (await apiClient.get<{ isPublic: boolean; students: number }>(`${base}/${jobId}/reach`)).data;
}

/* --- admin: questions --- */

export async function getQuestionLibrary(): Promise<JobQuestionDto[]> {
  return (await apiClient.get<JobQuestionDto[]>('/api/v1/admin/jobs/questions/library')).data;
}

export async function createQuestion(dto: UpsertJobQuestionDto): Promise<JobQuestionDto> {
  return (await apiClient.post<JobQuestionDto>('/api/v1/admin/jobs/questions', dto)).data;
}

export async function updateQuestion(
  questionId: string,
  dto: UpsertJobQuestionDto,
): Promise<JobQuestionDto> {
  return (await apiClient.patch<JobQuestionDto>(`/api/v1/admin/jobs/questions/${questionId}`, dto))
    .data;
}

export async function deleteQuestion(questionId: string): Promise<void> {
  await apiClient.delete(`/api/v1/admin/jobs/questions/${questionId}`);
}

export async function getJobQuestions(jobId: string): Promise<JobPostingQuestionDto[]> {
  return (await apiClient.get<JobPostingQuestionDto[]>(`/api/v1/admin/jobs/${jobId}/questions`)).data;
}

export async function setJobQuestions(
  jobId: string,
  questions: Array<{ questionId: string; isRequired?: boolean; sortOrder?: number }>,
): Promise<JobPostingQuestionDto[]> {
  return (await apiClient.put<JobPostingQuestionDto[]>(`/api/v1/admin/jobs/${jobId}/questions`, { questions })).data;
}

/** The questions a STUDENT must answer. Served from the admin route because the
 *  posting's question set is not secret - only the applicant list is. */
/** The application questions for a job, for the STUDENT apply form. Hits the PUBLIC,
 *  visibility-checked route by slug - NOT the admin route, which a student 403s (the bug
 *  that left the apply form blank while the server still required the answers). */
export async function getPublicJobQuestions(slug: string): Promise<JobPostingQuestionDto[]> {
  return (
    await apiClient.get<JobPostingQuestionDto[]>(
      `/api/v1/jobs/${encodeURIComponent(slug)}/questions`,
    )
  ).data;
}

export interface BuiltResumeDto {
  title: string;
  template: string;
  data: Record<string, unknown>;
}

/** The BUILT (Resume Builder) resume an applicant attached, for admin review. Null when
 *  they uploaded a PDF or applied with just their profile. */
export async function getApplicantResume(applicationId: string): Promise<BuiltResumeDto | null> {
  return (
    await apiClient.get<BuiltResumeDto | null>(
      `/api/v1/admin/jobs/applications/${applicationId}/resume`,
    )
  ).data;
}

/* --- admin: applicants --- */

export interface ApplicantPage {
  items: JobApplicantDto[];
  total: number;
}

export async function listApplicants(
  jobId: string | null,
  // §10 stage strings, not the six-value enum — the API accepts all twenty-one.
  opts: { status?: string[]; search?: string; sort?: string; limit?: number; offset?: number } = {},
  apiBase: JobsApiBase = ADMIN_JOBS_BASE,
): Promise<ApplicantPage> {
  const base = jobId ? `${apiBase}/${jobId}/applications` : `${apiBase}/applications`;
  return (await apiClient.get<ApplicantPage>(`${base}${toQuery(opts as Record<string, unknown>)}`)).data;
}

/** True per-status applicant counts for one job (search-aware, ignores the status
 *  filter — the chips ARE the status selector). Backs the filter-chip totals. */
export async function getApplicantFacets(
  jobId: string,
  opts: { search?: string } = {},
): Promise<Record<string, number>> {
  return (
    await apiClient.get<Record<string, number>>(
      `/api/v1/admin/jobs/${jobId}/applications/facets${toQuery(opts as Record<string, unknown>)}`,
    )
  ).data;
}

/**
 * Applicants as CSV - one job, or every job when jobId is omitted. Fetched through the API
 * client so the request carries the admin's in-memory access token; a plain link cannot,
 * and always came back 401.
 */
export async function exportApplicantsCsv(
  jobId?: string | null,
  status?: string[],
): Promise<DownloadedFile> {
  const qs = toQuery({ jobId, status: status?.join(',') });
  return (await apiClient.getFile(`/api/v1/admin/jobs/export/applications${qs}`)).data;
}

/** One move in a drive's life (PRD §5). */
export interface JobStatusEventDto {
  id: string;
  fromStatus: JobStatus | null;
  toStatus: JobStatus;
  reason: string | null;
  nextReviewAt: string | null;
  changedBy: string | null;
  createdAt: string;
}

/**
 * Move a drive through its lifecycle.
 *
 * Its own call rather than a field on the edit PATCH, because a status move is something
 * somebody DID: cancelling emails every applicant, going cold books a date to look again.
 * The server refuses an impossible move and says which ones are possible instead.
 */
export async function transitionDrive(
  id: string,
  to: JobStatus,
  opts: { reason?: string | null; nextReviewDate?: string | null } = {},
): Promise<JobPostingDto> {
  const res = await apiClient.post<JobPostingDto>(`/api/v1/admin/jobs/${id}/transition`, {
    to,
    reason: opts.reason ?? undefined,
    nextReviewDate: opts.nextReviewDate ?? undefined,
  });
  return res.data;
}

/** A drive's full status history, newest first. */
export async function getDriveStatusHistory(id: string): Promise<JobStatusEventDto[]> {
  const res = await apiClient.get<JobStatusEventDto[]>(`/api/v1/admin/jobs/${id}/status-history`);
  return res.data;
}

/* ── PRD §6: the candidate-fit view ─────────────────────────────────────────── */

export interface CandidateRow {
  userId: string;
  fullName: string | null;
  email: string;
  collegeName: string | null;
  cohort: string | null;
  branch: string | null;
  paidAccess: boolean;
  eligibility: EligibilityOutcome;
  match: MatchResult;
  applicationStatus: string | null;
  appliedAt: string | null;
  placementStatus: string | null;
  resumeUpdatedAt: string | null;
  lastActivityAt: string | null;
}

export interface CandidateView {
  drive: { id: string; title: string; companyName: string };
  weights: MatchWeights;
  rows: CandidateRow[];
  summary: {
    audience: number;
    eligible: number;
    failedEligibility: number;
    needsReview: number;
    applied: number;
    scored: number;
    insufficientData: number;
  };
}

/** Eligibility and match for everyone a drive reaches. Staff-only. */
export async function getDriveCandidates(
  id: string,
  base: JobsApiBase = ADMIN_JOBS_BASE,
): Promise<CandidateView> {
  const res = await apiClient.get<CandidateView>(`${base}/${id}/candidates`);
  return res.data;
}

/* ------------------------------------------------------------------------- */
/* §15 — candidate search, saved views and bulk actions                       */
/* ------------------------------------------------------------------------- */

/** One row of the §15 candidate list. Mirrors the server's SearchableCandidate. */
export interface SearchedCandidate {
  userId: string;
  fullName: string | null;
  email: string;
  collegeName: string | null;
  cohort: string | null;
  branch: string | null;
  paidAccess: boolean;
  eligible: boolean;
  needsReview: boolean;
  score: number | null;
  coverage: number;
  dimensionScores?: Partial<Record<string, number | null>> | null;
  applicationStatus: string | null;
  appliedAt: string | null;
  placementStatus: string | null;
  /** `'withheld'` when the viewer lacks canViewFinancials — never 0 (§17). */
  bestOfferCtc: number | null | 'withheld';
  lastActivityAt: string | null;
  staleWeightPct?: number;
  oldestEvidenceAgeDays?: number | null;
}

export interface CandidateSearchPage {
  items: SearchedCandidate[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  /** False when the viewer may not read CTC — the column renders "withheld". */
  ctcVisible: boolean;
  viewCounts: Array<{ view: string; label: string; description: string; count: number }>;
  appliedView: string | null;
  sort: { key: string; dir: 'asc' | 'desc' };
}

export interface CandidateSearchOptions {
  views: Array<{ key: string; label: string; description: string }>;
  sorts: Array<{ key: string; label: string; unavailableReason: string | null }>;
  bulkActions: Array<{ key: string; label: string; needsReason: boolean }>;
  maxBulkSize: number;
}

export interface BulkActionResult {
  action: string;
  applied: Array<{ candidateId: string; name: string | null }>;
  skipped: Array<{ candidateId: string; name: string | null; reason: string }>;
  appliedCount: number;
  skippedCount: number;
  capacityWarning?: string;
}

export async function getCandidateSearchOptions(driveId: string): Promise<CandidateSearchOptions> {
  const res = await apiClient.get<CandidateSearchOptions>(
    `/api/v1/admin/jobs/${driveId}/candidate-search/options`,
  );
  return res.data;
}

export async function searchCandidates(
  driveId: string,
  params: Record<string, string | number | boolean | undefined | null>,
): Promise<CandidateSearchPage> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    qs.set(k, String(v));
  }
  const res = await apiClient.get<CandidateSearchPage>(
    `/api/v1/admin/jobs/${driveId}/candidate-search?${qs.toString()}`,
  );
  return res.data;
}

/**
 * Act on a selection (§15).
 *
 * `expectedCount` is always sent: the server refuses the request if the resolved set no
 * longer matches what the operator saw, which is the guard against a filtered list having
 * changed under them.
 */
export async function bulkCandidateAction(
  driveId: string,
  body: {
    action: string;
    candidateIds: string[];
    reason?: string | null;
    toStage?: string | null;
    roundId?: string | null;
    ownerUserId?: string | null;
    expectedCount: number;
  },
): Promise<BulkActionResult> {
  const res = await apiClient.post<BulkActionResult>(
    `/api/v1/admin/jobs/${driveId}/candidate-search/bulk`,
    body,
  );
  return res.data;
}

/* ------------------------------------------------------------------------- */
/* §10 — the application pipeline                                             */
/* ------------------------------------------------------------------------- */

/** One recorded move in a candidate's history. Nothing here is ever overwritten. */
export interface StageEventDto {
  fromStage: string | null;
  toStage: string;
  roundId: string | null;
  reason: string | null;
  /** The panel's words, kept apart from `reason` (which is why WE moved them). */
  feedback: string | null;
  score: number | null;
  changedBy: string | null;
  byStudent: boolean;
  createdAt: string;
}

export interface MoveStageResultDto {
  stage: string;
  from: string;
}

/** Move one candidate. The server validates with the same `checkStageMove` the UI uses. */
export async function moveApplicationStage(
  applicationId: string,
  body: { to: string; reason?: string | null; roundId?: string | null; feedback?: string | null; score?: number | null },
  base: JobsApiBase = ADMIN_JOBS_BASE,
): Promise<MoveStageResultDto> {
  const res = await apiClient.post<MoveStageResultDto>(
    `${base}/applications/${applicationId}/stage`,
    body,
  );
  return res.data;
}

/**
 * Move several at once.
 *
 * Returns the failures NAMED rather than a count — a bulk move that quietly drops a
 * third of its targets is worse than one that fails, because nobody checks a number.
 */
export async function moveApplicationStagesBulk(body: {
  applicationIds: string[];
  to: string;
  reason?: string | null;
  roundId?: string | null;
}, base: JobsApiBase = ADMIN_JOBS_BASE): Promise<{ moved: number; failed: Array<{ applicationId: string; reason: string }> }> {
  const res = await apiClient.post<{
    moved: number;
    failed: Array<{ applicationId: string; reason: string }>;
  }>(`${base}/applications/stage/bulk`, body);
  return res.data;
}

/** Every move ever recorded for one application, newest first. */
export async function getApplicationHistory(applicationId: string): Promise<StageEventDto[]> {
  const res = await apiClient.get<StageEventDto[]>(
    `/api/v1/admin/jobs/applications/${applicationId}/history`,
  );
  return res.data;
}

/* ------------------------------------------------------------------------- */
/* §14 — placement analytics                                                  */
/* ------------------------------------------------------------------------- */

/**
 * A measured rate, with everything needed to read it honestly.
 *
 * Deliberately not a number. §14 asks for the denominator and the period on every rate,
 * and `pct` is null when there is nothing to divide — "no data" is not "zero percent".
 */
export interface RateDto {
  numerator: number;
  denominator: number;
  pct: number | null;
  period: { from: string | null; to: string | null };
  of: string;
}

export interface FunnelStepDto {
  stage: string;
  label: string;
  count: number;
  conversionFromPrevious: RateDto | null;
  conversionFromTop: RateDto | null;
  stoppedHere: number;
}

/** The funnel, named because all six §14 reporting levels return the same shape. */
export interface FunnelDto {
  steps: FunnelStepDto[];
  period: { from: string | null; to: string | null };
  worstDropOff: { stage: string; label: string; lost: number; rate: RateDto } | null;
}

/** A CTC spread. Median leads everywhere it is rendered — see `CtcCard`. */
export interface CtcDto {
  bands: Array<{ label: string; min: number; max: number | null; count: number }>;
  /** Leads the display: one exceptional offer drags a mean above what most students see. */
  median: number | null;
  highest: number | null;
  lowest: number | null;
  mean: number | null;
  counted: number;
}

export interface DriveAnalyticsDto {
  drive: {
    id: string;
    title: string;
    companyName: string;
    status: string;
    employmentType: string | null;
    location: string | null;
    publishedAt: string | null;
    deadline: string | null;
  };
  audience: {
    total: number;
    eligible: number;
    failedEligibility: number;
    /** §4 returns UNKNOWN for absent data — kept apart from "failed" on purpose. */
    needsReview: number;
    alreadyPlaced: number;
  };
  funnel: FunnelDto;
  /** Who in the audience CANNOT apply — not a count of refusals, which are never logged. */
  audienceWithoutPaidAccess: number;
  assessmentParticipation: RateDto;
  shortlistRatio: RateDto;
  shortlistCapacity: number | null;
  timeToFillDays: number | null;
  ctc: CtcDto;
}

export async function getDriveAnalytics(driveId: string): Promise<DriveAnalyticsDto> {
  const res = await apiClient.get<DriveAnalyticsDto>(
    `/api/v1/admin/placement-analytics/drives/${driveId}`,
  );
  return res.data;
}

export interface StageImprovementDto {
  period: { from: string | null; to: string | null };
  worstDropOff: { stage: string; label: string; lost: number; rate: RateDto } | null;
  losses: Array<{
    stage: string;
    label: string;
    lost: number;
    rate: RateDto;
    /** A fixed, readable mapping — not a generated sentence that sounds like analysis. */
    intervention: string | null;
  }>;
  recordedReasons: Array<{ stage: string; reason: string | null; n: number }>;
}

/**
 * The §14 filter set, as the server parses it.
 *
 * Every field is optional and an unknown value is ignored rather than guessed — the report
 * narrows, it does not fail. College scoping is NOT in here on purpose: the server decides
 * which colleges a caller may read from their own portfolio, so a client cannot widen its
 * own scope by sending a different id.
 */
export interface AnalyticsFilterParams {
  from?: string;
  to?: string;
  collegeId?: string;
  cohort?: string;
  department?: string;
  companyId?: string;
  driveId?: string;
  role?: string;
  driveStatus?: string;
  employmentType?: string;
  location?: string;
  placementStatus?: string;
  ctcMin?: number;
  ctcMax?: number;
}

function analyticsQuery(params: AnalyticsFilterParams = {}): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

export async function getStageImprovement(
  params: AnalyticsFilterParams = {},
): Promise<StageImprovementDto> {
  const res = await apiClient.get<StageImprovementDto>(
    `/api/v1/admin/placement-analytics/stage-improvement${analyticsQuery(params)}`,
  );
  return res.data;
}

/** The drive funnel as CSV. §14: "provide downloadable reports." */
export async function exportDriveFunnelCsv(
  driveId: string,
): Promise<{ blob: Blob; filename: string | null }> {
  return (await apiClient.getFile(`/api/v1/admin/placement-analytics/drives/${driveId}/export`)).data;
}

/* ------------------------------------------------------------------------- */
/* §14 — the other four reporting levels                                      */
/*                                                                            */
/* The drive level shipped first because it sits beside the per-drive pages.  */
/* These are the ones a super-admin and a TPO actually open: the platform as  */
/* a whole, one college or cohort, one employer, one student.                 */
/* ------------------------------------------------------------------------- */

/** Level 5 — ZSkillup overall. The only level with no id, because it is everything. */
export interface OverallReportDto {
  scope: {
    active_drives: number;
    employers: number;
    students: number;
    colleges: number;
    period: { from: string | null; to: string | null };
  };
  funnel: FunnelDto;
  placement: {
    offersReceived: RateDto;
    accepted: RateDto;
    joined: RateDto;
    /** The conversion campus hiring actually loses people at: accepted is not at a desk. */
    offerToJoining: RateDto;
  };
  roleDemand: Array<{ role: string; drives: number }>;
  timeToPlacementDays: number | null;
  ctc: CtcDto;
}

export async function getOverallPlacementReport(
  params: AnalyticsFilterParams = {},
): Promise<OverallReportDto> {
  const res = await apiClient.get<OverallReportDto>(
    `/api/v1/admin/placement-analytics/overall${analyticsQuery(params)}`,
  );
  return res.data;
}

/** Level 3 — one college, or one cohort or department inside it. */
export interface CollegeReportDto {
  college: { id: string; name: string; city: string | null; state: string | null };
  cohort: string | null;
  department: string | null;
  students: number;
  profileCompleteness: RateDto;
  applicationCoverage: RateDto;
  paidAccess: {
    /** Three counts rather than one "paid" figure — a college buying for its cohort is
     *  not the same commercial fact as a cohort paying individually. */
    anyAccess: RateDto;
    cashPaid: RateDto;
    complimentary: number;
    collegeSponsored: number;
  };
  funnel: FunnelDto;
  placement: {
    offersReceived: RateDto;
    accepted: RateDto;
    joined: RateDto;
    placedStudents: RateDto;
    unplaced: number;
    notSeeking: number;
  };
  ctc: CtcDto;
  byDepartment: Array<{ group: string; students: number; share: RateDto }>;
  byCohort: Array<{ group: string; students: number; share: RateDto }>;
  byPassoutYear: Array<{ group: string; students: number; share: RateDto }>;
}

export async function getCollegePlacementReport(
  collegeId: string,
  params: AnalyticsFilterParams = {},
): Promise<CollegeReportDto> {
  const res = await apiClient.get<CollegeReportDto>(
    `/api/v1/admin/placement-analytics/colleges/${collegeId}${analyticsQuery(params)}`,
  );
  return res.data;
}

/** Level 2 — one employer across every drive they have run. */
export interface CompanyReportDto {
  company: { id: string; name: string | null };
  drives: number;
  driveList: Array<{
    id: string;
    title: string;
    status: string;
    employment_type: string | null;
    published_at: string | null;
    company_name: string | null;
  }>;
  funnel: FunnelDto;
  /** True — and rendered — because an eligible audience across drives double-counts people. */
  funnelTopIsApplied: boolean;
  declineReasons: Array<{ stage: string; reason: string | null; n: number }>;
  timeToFillDays: number | null;
  ctc: CtcDto;
}

export async function getCompanyPlacementReport(
  companyId: string,
  params: AnalyticsFilterParams = {},
): Promise<CompanyReportDto> {
  const res = await apiClient.get<CompanyReportDto>(
    `/api/v1/admin/placement-analytics/companies/${companyId}${analyticsQuery(params)}`,
  );
  return res.data;
}

/** Level 4 — one student: every application, the whole move history, and their offers. */
export interface StudentReportDto {
  userId: string;
  applications: Array<{
    id: string;
    job_posting_id: string;
    status: string;
    applied_at: string;
    title: string;
    company_name: string | null;
    employment_type: string | null;
  }>;
  timeline: Array<{
    application_id: string;
    from_stage: string | null;
    to_stage: string;
    round_id: string | null;
    reason: string | null;
    feedback: string | null;
    score: string | number | null;
    by_student: boolean;
    created_at: string;
  }>;
  placement: {
    status: string;
    offers: Array<{
      id?: string;
      status: string;
      kind: string;
      ctc?: number | null;
      offerDate?: string | null;
      companyName?: string | null;
    }>;
    milestones: { offersReceived: number; accepted: number; joined: number };
    bestCtc: number | null;
  } | null;
  /** §14's "repeated rejection stages" — where this student keeps stopping. */
  recurringStopStages: Array<{ stage: string; times: number }>;
  conversion: RateDto;
}

export async function getStudentPlacementReport(userId: string): Promise<StudentReportDto> {
  const res = await apiClient.get<StudentReportDto>(
    `/api/v1/admin/placement-analytics/students/${userId}`,
  );
  return res.data;
}

/* ------------------------------------------------------------------------- */
/* §23.1 / §23.2 — reading a JD, and planning each round's practice           */
/* ------------------------------------------------------------------------- */

import type { ExtractedJd, RoundPracticePlan } from '@/shared/jd-extraction';
import type { AuthoringMode, PlanConfig, PracticeWeight } from '@/shared/round-assessment-plan';

export interface JdExtractionResultDto {
  id: string;
  extraction: ExtractedJd;
  roundPlan: Array<{
    sequence: number;
    kind: string;
    name: string;
    practice: RoundPracticePlan;
  }>;
}

/** Read a JD into a reviewable draft. Writes nothing to any drive (§23.1, §23.2). */
export async function extractJd(body: {
  jdText: string;
  driveId?: string | null;
}): Promise<JdExtractionResultDto> {
  const res = await apiClient.post<JdExtractionResultDto>(
    '/api/v1/admin/jobs/jd/extract',
    body,
  );
  return res.data;
}

/** Record a review (and any edits) before the plan may be applied. */
export async function reviewJdExtraction(
  extractionId: string,
  edits?: Record<string, unknown> | null,
): Promise<{ reviewed: boolean }> {
  const res = await apiClient.post<{ reviewed: boolean }>(
    `/api/v1/admin/jobs/jd/extractions/${extractionId}/review`,
    { edits: edits ?? null },
  );
  return res.data;
}

/**
 * Write a reviewed round plan onto a drive.
 *
 * Without `replaceExisting` this REPORTS what it would replace and does nothing — §23.1
 * asks to "ask before regenerating or replacing them".
 */
export async function applyJdExtraction(
  extractionId: string,
  body: { driveId: string; replaceExisting?: boolean },
): Promise<{ applied: boolean; rounds: number; wouldReplace?: number }> {
  const res = await apiClient.post<{ applied: boolean; rounds: number; wouldReplace?: number }>(
    `/api/v1/admin/jobs/jd/extractions/${extractionId}/apply`,
    body,
  );
  return res.data;
}

export interface RoundPlanRowDto {
  roundId: string;
  roundKind: string;
  label: string;
  sequence: number;
  competencies: string[];
  practiceFormat: string;
  /** False for rounds a person must score — the UI must not offer a pass mark then. */
  autoScored: boolean;
  noPracticeReason: string | null;
  plan: Record<string, unknown> | null;
  suggestedConfig: PlanConfig | null;
}

export interface RoundPlansDto {
  drive: { id: string; title: string };
  rounds: RoundPlanRowDto[];
  summary: {
    total: number;
    planned: number;
    /** The number that matters: rounds with practice still unplanned. */
    awaitingPlan: number;
    nothingToPractise: number;
  };
}

export async function getRoundPlans(
  driveId: string,
  base: JobsApiBase = ADMIN_JOBS_BASE,
): Promise<RoundPlansDto> {
  const res = await apiClient.get<RoundPlansDto>(`${base}/${driveId}/round-plans`);
  return res.data;
}

export async function upsertRoundPlan(
  driveId: string,
  roundId: string,
  body: {
    mode: AuthoringMode;
    weight?: PracticeWeight;
    config?: PlanConfig;
    note?: string | null;
    gateApprovedBy?: string | null;
  },
  base: JobsApiBase = ADMIN_JOBS_BASE,
): Promise<Record<string, unknown>> {
  const res = await apiClient.post<Record<string, unknown>>(
    `${base}/${driveId}/round-plans/${encodeURIComponent(roundId)}`,
    body,
  );
  return res.data;
}

/* ------------------------------------------------------------------------- */
/* §12 / §13 — rounds, invites, RSVPs, and what was shared with whom          */
/* ------------------------------------------------------------------------- */

/** Who is in each round right now — the view a drive owner runs the day on. */
export interface RoundRosterRowDto {
  roundId: string;
  round: string;
  sequence: number;
  inRound: number;
  /** Null when the round has no stated capacity. Capacity is reported, never enforced. */
  capacity: number | null;
}

export async function getRoundRoster(driveId: string): Promise<RoundRosterRowDto[]> {
  const res = await apiClient.get<RoundRosterRowDto[]>(`/api/v1/admin/jobs/${driveId}/rounds/roster`);
  return res.data;
}

/** The latest RSVP per candidate per round. Earlier answers stay in the table. */
export interface RoundRsvpDto {
  roundId: string;
  response: string;
  reason: string | null;
  preferredSlot: string | null;
  respondedAt: string;
  userId: string;
  name: string | null;
  email: string;
}

export async function getRoundRsvps(driveId: string): Promise<RoundRsvpDto[]> {
  const res = await apiClient.get<RoundRsvpDto[]>(`/api/v1/admin/jobs/${driveId}/rounds/rsvps`);
  return res.data;
}

/**
 * The result of inviting people into a round.
 *
 * `skipped` NAMES every failure rather than counting them: "38 of 41 invited" tells an
 * operator three people need chasing without saying which three, so nobody chases them.
 * `capacityWarning` is advisory — §12 asks to surface clashes and allow an override, so a
 * team knowingly putting 30 people in a 25-seat lab is told and then left alone.
 */
export interface RoundInviteResultDto {
  round: string;
  invited: number;
  skipped: Array<{ applicationId: string; reason: string }>;
  capacityWarning?: string;
}

export async function inviteToRound(
  driveId: string,
  roundId: string,
  applicationIds: string[],
): Promise<RoundInviteResultDto> {
  const res = await apiClient.post<RoundInviteResultDto>(
    `/api/v1/admin/jobs/${driveId}/rounds/invite`,
    { roundId, applicationIds },
  );
  return res.data;
}

/** One recorded disclosure of candidate data (§13). */
export interface ShareLogEntryDto {
  id: string;
  jobPostingId: string | null;
  kind: string;
  recipient: string | null;
  recipientEmail: string | null;
  candidateIds: string[];
  candidateCount: number;
  fields: string[];
  includedResumes: boolean;
  consentBasis: string | null;
  sharedBy: string | null;
  createdAt: string;
}

export async function getDriveShares(driveId: string): Promise<ShareLogEntryDto[]> {
  const res = await apiClient.get<ShareLogEntryDto[]>(`/api/v1/admin/jobs/${driveId}/shares`);
  return res.data;
}

/* ------------------------------------------------------------------------- */
/* §18 — duplicates and the effect of changing eligibility mid-drive          */
/* ------------------------------------------------------------------------- */

/**
 * Accounts that look like the same person, grouped by the SIGNAL that matched them.
 *
 * Ordered by how much each signal is worth rather than by size: a phone collision is
 * nearly always the same person, a shared name frequently is not.
 */
export interface DuplicateGroupDto {
  matchedOn: string;
  signal: 'PHONE' | 'NAME_ONE_WITHOUT_COLLEGE' | 'NAME_AND_COLLEGE' | string;
  accounts: number;
  members: Array<{
    userId: string;
    name: string | null;
    email: string;
    collegeId: string | null;
    createdAt: string;
    lastLoginAt: string | null;
  }>;
}

export interface DuplicateStudentsDto {
  groups: DuplicateGroupDto[];
  counts: { byPhone: number; nameWithOrphanAccount: number; byNameAndCollege: number };
  /** The server says, in the payload, that it will not merge. Rendered, not paraphrased. */
  note: string;
  duplicateApplications: string;
}

export async function getDuplicateStudents(
  params: { collegeId?: string; limit?: number } = {},
): Promise<DuplicateStudentsDto> {
  const q = new URLSearchParams();
  if (params.collegeId) q.set('collegeId', params.collegeId);
  if (params.limit) q.set('limit', String(params.limit));
  const qs = q.toString();
  const res = await apiClient.get<DuplicateStudentsDto>(
    `/api/v1/admin/jobs/students/duplicates${qs ? `?${qs}` : ''}`,
  );
  return res.data;
}

/* ------------------------------------------------------------------------- */
/* §18 — the effect of changing eligibility mid-drive                         */
/* ------------------------------------------------------------------------- */

/**
 * Who was judged under eligibility rules that have since changed (§18).
 *
 * Named, never counted: a warning that cannot say WHO is asking an operator to accept a
 * risk nobody has measured. Only people who actually applied appear — an evaluation run
 * while browsing gave nobody a place to lose.
 */
export interface EligibilityImpactDto {
  currentRulesVersion: number;
  rulesChangedAt: string | null;
  impacted: Array<{
    userId: string;
    name: string | null;
    email: string;
    judgedUnderVersion: number;
    wasEligible: boolean | null;
    verdict: string | null;
    evaluatedAt: string | null;
    applicationId: string;
    applicationStatus: string;
  }>;
  impactedCount: number;
}

export async function getEligibilityImpact(driveId: string): Promise<EligibilityImpactDto> {
  const res = await apiClient.get<EligibilityImpactDto>(
    `/api/v1/admin/jobs/${driveId}/eligibility-impact`,
  );
  return res.data;
}

/* ------------------------------------------------------------------------- */
/* §23.5 — one round's practice, and the decisions people made about it       */
/* ------------------------------------------------------------------------- */

import type {
  CandidatePracticeRow,
  PracticeDecision,
  RecommendationThresholds,
} from '@/shared/practice-decision';

/**
 * The practice dashboard for one round.
 *
 * Driven by the ASSIGNED list rather than by attempts, so a student who was assigned and
 * never started is a row rather than an absence — they are precisely who this exists to
 * surface.
 */
export interface RoundPracticeDto {
  round: { roundId: string; roundKind: string; autoScored: boolean };
  thresholds: RecommendationThresholds;
  rows: CandidatePracticeRow[];
  summary: {
    assigned: number;
    submitted: number;
    notStarted: number;
    decided: number;
    awaitingDecision: number;
    /** Decisions that went against the recommendation. Surfaced, never prevented. */
    divergent: number;
  };
}

export async function getRoundPractice(
  driveId: string,
  roundId: string,
): Promise<RoundPracticeDto> {
  const res = await apiClient.get<RoundPracticeDto>(
    `/api/v1/admin/jobs/${driveId}/rounds/${encodeURIComponent(roundId)}/practice`,
  );
  return res.data;
}

/**
 * The result of recording a decision.
 *
 * `stageMoveRequired` is the important field: four of the six decisions are practice-side
 * only, and the two that change the candidate's position in the EMPLOYER's process must
 * also go through §10's pipeline — so the server says when that is still owed rather than
 * quietly doing it somewhere the move would not be validated, recorded or notified.
 */
export interface PracticeDecisionResultDto {
  recorded: true;
  decision: PracticeDecision;
  stageMoveRequired: boolean;
  suggestedStage?: string | null;
  divergesFromRecommendation: boolean;
}

export async function recordPracticeDecision(
  driveId: string,
  roundId: string,
  userId: string,
  body: { decision: PracticeDecision; reason?: string | null },
): Promise<PracticeDecisionResultDto> {
  const res = await apiClient.post<PracticeDecisionResultDto>(
    `/api/v1/admin/jobs/${driveId}/rounds/${encodeURIComponent(roundId)}/practice/${userId}/decision`,
    body,
  );
  return res.data;
}

export interface PracticeDecisionHistoryRowDto {
  decision: string;
  reason: string | null;
  recommendationAtDecision: string | null;
  decidedBy: string | null;
  decidedByName?: string | null;
  createdAt: string;
}

export async function getPracticeDecisionHistory(
  driveId: string,
  roundId: string,
  userId: string,
): Promise<PracticeDecisionHistoryRowDto[]> {
  const res = await apiClient.get<PracticeDecisionHistoryRowDto[]>(
    `/api/v1/admin/jobs/${driveId}/rounds/${encodeURIComponent(roundId)}/practice/${userId}/decisions`,
  );
  return res.data;
}

/* ------------------------------------------------------------------------- */
/* §23.6 — interview plans and the sessions run against them                  */
/* ------------------------------------------------------------------------- */

import type { InterviewPlan } from '@/shared/interview-plan';
import type { CalibrationReport } from '@/shared/practice-calibration';
import type { QuestionIssue } from '@/shared/question-quality';
import type { AssignmentAudience } from '@/shared/assignment-audience';

/** The saved plan row, or null when a round has none yet. */
export interface SavedInterviewPlanDto {
  id: string;
  job_posting_id: string;
  round_id: string;
  round_kind: string;
  mode: string;
  role: string | null;
  competencies: InterviewPlan['competencies'];
  questions: InterviewPlan['questions'];
  rubric: string | null;
  duration_minutes: number | null;
  candidate_brief: string | null;
  created_at: string;
  updated_at: string;
}

export async function getInterviewPlan(
  driveId: string,
  roundId: string,
): Promise<SavedInterviewPlanDto | null> {
  const res = await apiClient.get<SavedInterviewPlanDto | null>(
    `/api/v1/admin/jobs/${driveId}/rounds/${encodeURIComponent(roundId)}/interview-plan`,
  );
  return res.data;
}

/**
 * A starting plan suggested from the round and the JD.
 *
 * It deliberately leaves `expectedEvidence` empty on every competency: the shared rule
 * refuses to save a competency with none, so the suggestion cannot be accepted blind.
 * Somebody has to say what a good answer sounds like before this becomes a plan.
 */
export async function suggestInterviewPlan(
  driveId: string,
  roundId: string,
): Promise<InterviewPlan> {
  const res = await apiClient.get<InterviewPlan>(
    `/api/v1/admin/jobs/${driveId}/rounds/${encodeURIComponent(roundId)}/interview-plan/suggest`,
  );
  return res.data;
}

export async function saveInterviewPlan(
  driveId: string,
  roundId: string,
  plan: InterviewPlan,
): Promise<SavedInterviewPlanDto> {
  const res = await apiClient.post<SavedInterviewPlanDto>(
    `/api/v1/admin/jobs/${driveId}/rounds/${encodeURIComponent(roundId)}/interview-plan`,
    plan,
  );
  return res.data;
}

/** Scheduling result. A clash is REPORTED, never blocked. */
export interface InterviewSessionDto {
  id: string;
  userId: string;
  interviewerName: string | null;
  scheduledAt: string | null;
  status: string;
  clashWarning?: string | null;
}

export async function scheduleInterview(
  driveId: string,
  roundId: string,
  body: {
    userId: string;
    interviewerUserId?: string | null;
    interviewerName?: string | null;
    scheduledAt?: string | null;
    durationMinutes?: number | null;
    venue?: string | null;
    meetingLink?: string | null;
  },
): Promise<InterviewSessionDto> {
  const res = await apiClient.post<InterviewSessionDto>(
    `/api/v1/admin/jobs/${driveId}/rounds/${encodeURIComponent(roundId)}/interview-sessions`,
    body,
  );
  return res.data;
}

export async function recordInterviewOutcome(
  sessionId: string,
  body: {
    status: string;
    competencyScores?: Array<{ competency: string; score: number | null }> | null;
    overallScore?: number | null;
    feedback?: string | null;
    recommendedPractice?: string[] | null;
    statusReason?: string | null;
  },
): Promise<{ recorded: true }> {
  const res = await apiClient.post<{ recorded: true }>(
    `/api/v1/admin/jobs/interview-sessions/${sessionId}/outcome`,
    body,
  );
  return res.data;
}

/* ------------------------------------------------------------------------- */
/* §23.7 — did the practice predict what the employer actually did?           */
/* ------------------------------------------------------------------------- */

export type RoundCalibrationDto = CalibrationReport & {
  round: { roundId: string; roundKind: string; autoScored: boolean };
};

export async function getRoundCalibration(
  driveId: string,
  roundId: string,
): Promise<RoundCalibrationDto> {
  const res = await apiClient.get<RoundCalibrationDto>(
    `/api/v1/admin/jobs/${driveId}/rounds/${encodeURIComponent(roundId)}/calibration`,
  );
  return res.data;
}

/* ------------------------------------------------------------------------- */
/* §23.8 — read a paper before students do                                    */
/* ------------------------------------------------------------------------- */

export interface QuestionReviewDto {
  assessment: { id: string; title: string };
  questions: number;
  issues: Array<QuestionIssue & { stem: string | null; relatedStem: string | null }>;
  blocking: number;
  review: number;
  clean: number;
  /** The server's own framing — a flag list is easy to misread as a verdict. */
  note: string;
  severities: Record<string, string>;
}

export async function getQuestionReview(
  scheduledAssessmentId: string,
): Promise<QuestionReviewDto> {
  const res = await apiClient.get<QuestionReviewDto>(
    `/api/v1/admin/jobs/assessments/${scheduledAssessmentId}/question-review`,
  );
  return res.data;
}

/* ------------------------------------------------------------------------- */
/* §23.4 — who an assignment would actually reach                             */
/* ------------------------------------------------------------------------- */

/**
 * `blocked` is kept APART from `recipients`, and `matched` sits alongside both — so a
 * recipient list shortened by the access gate is always visibly shorter than the audience
 * it came from, rather than quietly looking like the whole cohort.
 */
export interface ResolvedAudienceDto {
  audience: AssignmentAudience;
  label: string;
  recipients: Array<{ userId: string; name: string | null; email: string }>;
  blocked: Array<{ userId: string; name: string | null; email: string; reason: string }>;
  matched: number;
}

export async function resolveAssignmentAudience(body: {
  audience: AssignmentAudience;
  driveId?: string | null;
  roundId?: string | null;
  collegeId?: string | null;
  cohortId?: string | null;
  userIds?: string[] | null;
}): Promise<ResolvedAudienceDto> {
  const res = await apiClient.post<ResolvedAudienceDto>(
    '/api/v1/admin/jobs/assignment-audience/resolve',
    body,
  );
  return res.data;
}

/* ------------------------------------------------------------------------- */
/* §11 — which stage changes email the candidate                             */
/* ------------------------------------------------------------------------- */

export interface StageNotificationsDto {
  stages: Array<{
    stage: string;
    label: string;
    enabled: boolean;
    /** Stages where silence is actively harmful — the candidate has to act. */
    actionRequired: boolean;
  }>;
  /** The server's own statement that reasons never reach the candidate. Rendered as is. */
  note: string;
}

export async function getStageNotifications(): Promise<StageNotificationsDto> {
  const res = await apiClient.get<StageNotificationsDto>('/api/v1/admin/stage-notifications');
  return res.data;
}

export async function setStageNotification(
  stage: string,
  enabled: boolean,
): Promise<StageNotificationsDto> {
  const res = await apiClient.patch<StageNotificationsDto>('/api/v1/admin/stage-notifications', {
    stage,
    enabled,
  });
  return res.data;
}

/* ------------------------------------------------------------------------- */
/* §20 — importing the academic marks the eligibility engine needs            */
/* ------------------------------------------------------------------------- */

import type {
  AcademicColumn,
  AcademicImportResult,
  ScoreScale,
} from '@/shared/academic-import';

export async function getAcademicCoverage(params: { collegeId?: string } = {}): Promise<{
  total: number;
  withGraduation: number;
  withTenth: number;
  withTwelfth: number;
}> {
  const qs = params.collegeId ? `?collegeId=${encodeURIComponent(params.collegeId)}` : '';
  const res = await apiClient.get<{
    total: number;
    withGraduation: number;
    withTenth: number;
    withTwelfth: number;
  }>(`/api/v1/admin/academics/coverage${qs}`);
  return res.data;
}

/**
 * Preview or apply a CSV of academic marks.
 *
 * `apply` defaults to false on the server, so the first call always reports what WOULD
 * happen. Nothing is written until somebody has read that.
 */
export async function importAcademics(body: {
  csv: string;
  collegeId?: string | null;
  scales?: Partial<Record<AcademicColumn, ScoreScale>>;
  cgpaMultiplier?: number;
  apply?: boolean;
}): Promise<AcademicImportResult> {
  const res = await apiClient.post<AcademicImportResult>('/api/v1/admin/academics/import', body);
  return res.data;
}

/* ------------------------------------------------------------------------- */
/* Drive roster import — bulk-adding a drive's offline registrations          */
/* ------------------------------------------------------------------------- */

import type {
  ImportPreview,
  ImportResult,
  RosterRow,
} from '@/shared/drive-roster-import';

/**
 * Classify an uploaded roster against a drive. Writes nothing.
 *
 * The file is parsed in the browser and only rows travel, so spreadsheet quirks
 * (encodings, a title row above the headers, merged cells) stay out of the API while
 * every decision that touches the database stays on the server.
 */
export async function previewDriveRoster(
  driveId: string,
  body: { rows: RosterRow[]; defaultStage?: string | null },
): Promise<ImportPreview> {
  const res = await apiClient.post<ImportPreview>(
    `/api/v1/admin/jobs/${driveId}/roster/preview`,
    body,
  );
  return res.data;
}

/**
 * Add the importable rows to the drive.
 *
 * The server re-classifies from scratch rather than trusting what preview returned: in
 * between, a student can apply on the board, an account can be suspended, or another
 * operator can import the same sheet.
 */
export async function importDriveRoster(
  driveId: string,
  body: {
    rows: RosterRow[];
    defaultStage?: string | null;
    collegeId?: string;
    cohortId?: string;
    sourceNote?: string;
    source?: 'BULK_UPLOAD' | 'OFFLINE' | 'TPO_ADDED';
  },
): Promise<ImportResult> {
  const res = await apiClient.post<ImportResult>(
    `/api/v1/admin/jobs/${driveId}/roster/import`,
    body,
  );
  return res.data;
}

/* ------------------------------------------------------------------------- */
/* Cross-drive application search, and job creatives                          */
/* ------------------------------------------------------------------------- */

import type {
  ApplicationSearchResult,
  CompanyFacet,
  DriveFacet,
  SavedApplicationView,
} from '@/shared/application-search';
import type { JobCreativeDto } from '@/shared/dto/jobs.dto';

export interface ApplicationSearchFilters {
  companyName?: string;
  driveId?: string;
  collegeId?: string;
  cohort?: string;
  branch?: string;
  stages?: string[];
  source?: string;
  course?: string;
  eligibility?: string;
  offerStatus?: string;
  placementStatus?: string;
  minScore?: number;
  maxScore?: number;
  search?: string;
  appliedFrom?: string;
  appliedTo?: string;
  view?: string;
  sort?: string;
  dir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export async function getApplicationSearchOptions(): Promise<{
  views: SavedApplicationView[];
  sorts: Record<string, string>;
}> {
  const res = await apiClient.get<{ views: SavedApplicationView[]; sorts: Record<string, string> }>(
    '/api/v1/admin/applications/options',
  );
  return res.data;
}

export async function getApplicationCompanies(): Promise<CompanyFacet[]> {
  const res = await apiClient.get<CompanyFacet[]>('/api/v1/admin/applications/companies');
  return res.data;
}

/** Drives, optionally narrowed to one company — the dropdown only offers what exists. */
export async function getApplicationDrives(company?: string): Promise<DriveFacet[]> {
  const qs = company ? `?company=${encodeURIComponent(company)}` : '';
  const res = await apiClient.get<DriveFacet[]>(`/api/v1/admin/applications/drives${qs}`);
  return res.data;
}

export async function searchApplications(
  filters: ApplicationSearchFilters,
): Promise<ApplicationSearchResult> {
  const res = await apiClient.post<ApplicationSearchResult>(
    '/api/v1/admin/applications/search',
    filters,
  );
  return res.data;
}

/** The export carries exactly the current filter, so the file matches the screen. */
export async function exportApplications(filters: ApplicationSearchFilters) {
  // Unwrapped here rather than at the call site: every other client function in this
  // file returns the payload, not the envelope, and one that differed would be a trap.
  const res = await apiClient.postFile('/api/v1/admin/applications/search/export', filters);
  return res.data;
}

export async function listJobCreatives(jobId: string): Promise<JobCreativeDto[]> {
  const res = await apiClient.get<JobCreativeDto[]>(`/api/v1/admin/jobs/${jobId}/creatives`);
  return res.data;
}

export async function addJobCreative(
  jobId: string,
  body: { url: string; alt?: string; isCover?: boolean },
): Promise<JobCreativeDto> {
  const res = await apiClient.post<JobCreativeDto>(`/api/v1/admin/jobs/${jobId}/creatives`, body);
  return res.data;
}

export async function reorderJobCreatives(jobId: string, ids: string[]): Promise<void> {
  await apiClient.put(`/api/v1/admin/jobs/${jobId}/creatives/order`, { ids });
}

export async function setJobCreativeCover(jobId: string, creativeId: string): Promise<void> {
  await apiClient.put(`/api/v1/admin/jobs/${jobId}/creatives/${creativeId}/cover`, {});
}

export async function deleteJobCreative(jobId: string, creativeId: string): Promise<void> {
  await apiClient.delete(`/api/v1/admin/jobs/${jobId}/creatives/${creativeId}`);
}
