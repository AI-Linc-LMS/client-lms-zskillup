import { apiClient } from './client';
import type {
  CollegeRequestSummaryDto,
  CollegeRequestDetailDto,
  CreateCollegeRequestDto,
  UpdateCollegeRequestDto,
} from '@/shared';

/**
 * College onboarding requests (Batch 2). ADMIN creates/edits/submits; SUPER_ADMIN
 * approves/rejects. All routes are auth-gated + role-checked server-side.
 */

export type CollegeRequestSummary = CollegeRequestSummaryDto;
export type CollegeRequestDetail = CollegeRequestDetailDto;
export type CreateCollegeRequestBody = CreateCollegeRequestDto;
export type UpdateCollegeRequestBody = UpdateCollegeRequestDto;

export async function listCollegeRequests(status?: string): Promise<CollegeRequestSummary[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await apiClient.get<CollegeRequestSummary[]>(`/api/v1/college-requests${qs}`);
  return res.data;
}

export async function getCollegeRequest(id: string): Promise<CollegeRequestDetail> {
  const res = await apiClient.get<CollegeRequestDetail>(`/api/v1/college-requests/${id}`);
  return res.data;
}

export async function createCollegeRequest(
  body: CreateCollegeRequestBody,
): Promise<CollegeRequestDetail> {
  const res = await apiClient.post<CollegeRequestDetail>('/api/v1/college-requests', body);
  return res.data;
}

export async function updateCollegeRequest(
  id: string,
  body: UpdateCollegeRequestBody,
): Promise<CollegeRequestDetail> {
  const res = await apiClient.patch<CollegeRequestDetail>(`/api/v1/college-requests/${id}`, body);
  return res.data;
}

export async function submitCollegeRequest(id: string): Promise<CollegeRequestDetail> {
  const res = await apiClient.post<CollegeRequestDetail>(`/api/v1/college-requests/${id}/submit`, {});
  return res.data;
}

export async function approveCollegeRequest(id: string): Promise<CollegeRequestDetail> {
  const res = await apiClient.post<CollegeRequestDetail>(`/api/v1/college-requests/${id}/approve`, {});
  return res.data;
}

export async function rejectCollegeRequest(id: string, reason: string): Promise<CollegeRequestDetail> {
  const res = await apiClient.post<CollegeRequestDetail>(`/api/v1/college-requests/${id}/reject`, {
    reason,
  });
  return res.data;
}
