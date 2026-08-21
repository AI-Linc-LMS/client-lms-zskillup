import { apiClient } from './client';
import type { CreateJobPostingDto, JobPostingDto, UpdateJobPostingDto } from '@/shared/dto/jobs.dto';

export type { JobPostingDto } from '@/shared/dto/jobs.dto';

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
