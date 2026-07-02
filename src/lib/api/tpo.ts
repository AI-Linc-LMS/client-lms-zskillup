import { apiClient } from './client';
import type { TpoBulkInviteDto, TpoBulkInviteResult, TpoDashboard } from '@/shared';

export async function getTpoAnalytics(cohortId?: string): Promise<TpoDashboard> {
  const qs = cohortId ? `?cohortId=${encodeURIComponent(cohortId)}` : '';
  const res = await apiClient.get<TpoDashboard>(`/api/v1/tpo/analytics${qs}`);
  return res.data;
}

/**
 * TPO API client (Implementation Plan §4). v1 ships bulk-invite; dashboards
 * + at-risk + reports land in Sprint 7 once PPS is computable.
 */

export async function bulkInviteStudents(dto: TpoBulkInviteDto): Promise<TpoBulkInviteResult> {
  const res = await apiClient.post<TpoBulkInviteResult>('/api/v1/tpo/invitations', dto);
  return res.data;
}
