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
  // §10 stage strings, not the six-value enum — the API accepts all twenty-one.
  opts: { status?: string[]; search?: string; sort?: string; limit?: number; offset?: number } = {},
): Promise<ApplicantPage> {
  const base = jobId ? `/api/v1/admin/jobs/${jobId}/applications` : '/api/v1/admin/jobs/applications';
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

export async function getRoundPlans(driveId: string): Promise<RoundPlansDto> {
  const res = await apiClient.get<RoundPlansDto>(`/api/v1/admin/jobs/${driveId}/round-plans`);
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
): Promise<Record<string, unknown>> {
  const res = await apiClient.post<Record<string, unknown>>(
    `/api/v1/admin/jobs/${driveId}/round-plans/${encodeURIComponent(roundId)}`,
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
