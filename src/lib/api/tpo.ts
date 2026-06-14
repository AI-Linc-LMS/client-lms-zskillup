import { apiClient } from './client';
import type { TpoBulkInviteDto, TpoBulkInviteResult } from '@/shared';

/**
 * TPO API client (Implementation Plan §4). v1 ships bulk-invite; dashboards
 * + at-risk + reports land in Sprint 7 once PPS is computable.
 */

export async function bulkInviteStudents(dto: TpoBulkInviteDto): Promise<TpoBulkInviteResult> {
  const res = await apiClient.post<TpoBulkInviteResult>('/api/v1/tpo/invitations', dto);
  return res.data;
}
