import { apiClient } from './client';
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
import type { JobApplicationStatus } from '@/shared/enums';

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
export async function getPublicJobQuestions(jobId: string): Promise<JobPostingQuestionDto[]> {
  return getJobQuestions(jobId);
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

/** The CSV download URL. Hit with a normal navigation so the browser saves the file
 *  rather than the fetch layer parsing it as JSON. */
export function applicantsExportUrl(jobId?: string | null, status?: JobApplicationStatus[]): string {
  return `/api/v1/admin/jobs/export/applications${toQuery({ jobId, status: status?.join(',') })}`;
}
