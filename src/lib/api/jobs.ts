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
import type { JobApplicationStatus, JobStatus } from '@/shared/enums';
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

/** Admin: every posting including drafts. */
export async function listAdminJobs(): Promise<JobPostingDto[]> {
  return (await apiClient.get<JobPostingDto[]>('/api/v1/admin/jobs')).data;
}

export async function createJob(dto: CreateJobPostingDto): Promise<JobPostingDto> {
  return (await apiClient.post<JobPostingDto>('/api/v1/admin/jobs', dto)).data;
}

/** Duplicate a posting as a fresh unpublished draft (fields, questions and targets), so
 *  an admin re-running a similar role doesn't retype it. Returns the new draft. */
export async function cloneJob(id: string): Promise<JobPostingDto> {
  return (await apiClient.post<JobPostingDto>(`/api/v1/admin/jobs/${id}/clone`, {})).data;
}

export async function updateJob(id: string, dto: JobPostingPatch): Promise<JobPostingDto> {
  return (await apiClient.patch<JobPostingDto>(`/api/v1/admin/jobs/${id}`, dto)).data;
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

export async function getJobTargets(jobId: string): Promise<JobTargetViewDto[]> {
  return (await apiClient.get<JobTargetViewDto[]>(`/api/v1/admin/jobs/${jobId}/targets`)).data;
}

export async function setJobTargets(jobId: string, targets: JobTargetDto[]): Promise<JobTargetViewDto[]> {
  return (await apiClient.put<JobTargetViewDto[]>(`/api/v1/admin/jobs/${jobId}/targets`, { targets })).data;
}

export async function getJobReach(jobId: string): Promise<{ isPublic: boolean; students: number }> {
  return (await apiClient.get<{ isPublic: boolean; students: number }>(`/api/v1/admin/jobs/${jobId}/reach`)).data;
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
  opts: { status?: JobApplicationStatus[]; search?: string; sort?: string; limit?: number; offset?: number } = {},
): Promise<ApplicantPage> {
  const base = jobId ? `/api/v1/admin/jobs/${jobId}/applications` : '/api/v1/admin/jobs/applications';
  return (await apiClient.get<ApplicantPage>(`${base}${toQuery(opts as Record<string, unknown>)}`)).data;
}

/** True per-status applicant counts for one job (search-aware, ignores the status
 *  filter — the chips ARE the status selector). Backs the filter-chip totals. */
export async function getApplicantFacets(
  jobId: string,
  opts: { search?: string } = {},
): Promise<Record<JobApplicationStatus, number>> {
  return (
    await apiClient.get<Record<JobApplicationStatus, number>>(
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
  status?: JobApplicationStatus[],
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
export async function getDriveCandidates(id: string): Promise<CandidateView> {
  const res = await apiClient.get<CandidateView>(`/api/v1/admin/jobs/${id}/candidates`);
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
    `/api/v1/admin/jobs/${driveId}/candidates/options`,
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
    `/api/v1/admin/jobs/${driveId}/candidates?${qs.toString()}`,
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
    `/api/v1/admin/jobs/${driveId}/candidates/bulk`,
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
): Promise<MoveStageResultDto> {
  const res = await apiClient.post<MoveStageResultDto>(
    `/api/v1/admin/jobs/applications/${applicationId}/stage`,
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
}): Promise<{ moved: number; failed: Array<{ applicationId: string; reason: string }> }> {
  const res = await apiClient.post<{
    moved: number;
    failed: Array<{ applicationId: string; reason: string }>;
  }>(`/api/v1/admin/jobs/applications/stage/bulk`, body);
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
  funnel: {
    steps: FunnelStepDto[];
    period: { from: string | null; to: string | null };
    worstDropOff: { stage: string; label: string; lost: number; rate: RateDto } | null;
  };
  /** Who in the audience CANNOT apply — not a count of refusals, which are never logged. */
  audienceWithoutPaidAccess: number;
  assessmentParticipation: RateDto;
  shortlistRatio: RateDto;
  shortlistCapacity: number | null;
  timeToFillDays: number | null;
  ctc: {
    bands: Array<{ label: string; min: number; max: number | null; count: number }>;
    /** Leads the display: one exceptional offer drags a mean above what most students see. */
    median: number | null;
    highest: number | null;
    lowest: number | null;
    mean: number | null;
    counted: number;
  };
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

export async function getStageImprovement(
  params: { driveId?: string } = {},
): Promise<StageImprovementDto> {
  const qs = params.driveId ? `?driveId=${encodeURIComponent(params.driveId)}` : '';
  const res = await apiClient.get<StageImprovementDto>(
    `/api/v1/admin/placement-analytics/stage-improvement${qs}`,
  );
  return res.data;
}

/** The drive funnel as CSV. §14: "provide downloadable reports." */
export async function exportDriveFunnelCsv(
  driveId: string,
): Promise<{ blob: Blob; filename: string | null }> {
  return (await apiClient.getFile(`/api/v1/admin/placement-analytics/drives/${driveId}/export`)).data;
}
