import { apiClient } from './client';
import type {
  CreateJobPostingDto,
  JobApplicantDto,
  JobApplicationDto,
  JobPostingDto,
  SendApplicantEmailDto,
  UpdateJobApplicationDto,
  UpdateJobPostingDto,
} from '@/shared/dto/jobs.dto';

export type { JobApplicantDto, JobApplicationDto, JobPostingDto } from '@/shared/dto/jobs.dto';

/** Admin: every posting including drafts. */
export async function listAdminJobs(): Promise<JobPostingDto[]> {
  return (await apiClient.get<JobPostingDto[]>('/api/v1/admin/jobs')).data;
}

export async function createJob(dto: CreateJobPostingDto): Promise<JobPostingDto> {
  return (await apiClient.post<JobPostingDto>('/api/v1/admin/jobs', dto)).data;
}

export async function updateJob(id: string, dto: UpdateJobPostingDto): Promise<JobPostingDto> {
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
