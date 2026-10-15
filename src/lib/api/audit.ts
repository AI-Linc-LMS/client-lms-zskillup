import { apiClient } from './client';

/**
 * Audit-log viewer API client (Phase 3). Wraps the SUPER_ADMIN-only
 * `GET /api/v1/admin/audit-logs` forensics endpoint. Read-only.
 */

export interface AuditLogRow {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  actorName: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  metadata: Record<string, unknown>;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditLogFilters {
  actorId?: string;
  action?: string;
  entity?: string;
  entityId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

/** The audit action verbs the backend records (drives the filter dropdown). */
export const AUDIT_ACTIONS: { value: string; label: string }[] = [
  { value: 'auth.login', label: 'Login' },
  { value: 'user.update', label: 'User edited' },
  { value: 'user.suspend', label: 'User suspended' },
  { value: 'user.activate', label: 'User activated' },
  { value: 'user.verify_email', label: 'Email verified' },
  { value: 'user.send_reset_link', label: 'Reset link sent' },
  { value: 'user.capabilities', label: 'Capabilities changed' },
  { value: 'user.role_change', label: 'Role changed' },
  { value: 'student.delete', label: 'Student deleted' },
  { value: 'broadcast.send', label: 'Broadcast sent' },
  { value: 'impersonation.start', label: 'Impersonation' },
  { value: 'user_sheet.view', label: 'User sheet viewed' },
  { value: 'user_sheet.export', label: 'User sheet exported' },

  /**
   * The placement surface (§17).
   *
   * These nine were written by the backend from the day §4–§18 shipped and were absent
   * from this list, so the viewer could not filter to a single one of them — "who took
   * the candidate list?" was unanswerable through the interface that exists to answer it.
   *
   * Deliberately NOT here: stage changes, drive status changes and employer shares. Each
   * already has a richer domain table (`application_stage_events`, `job_status_events`,
   * `candidate_share_log`) carrying the reason, the feedback and the fields shared.
   * Duplicating them into audit would create two trails that can disagree.
   */
  { value: 'drive.score_override', label: 'Match score overridden' },
  { value: 'drive.score_override_cleared', label: 'Score override cleared' },
  { value: 'drive.eligibility_mark', label: 'Marked eligible / ineligible' },
  { value: 'drive.audience_change', label: 'Drive visibility changed' },
  { value: 'drive.candidates_export', label: 'Candidate list exported' },
  { value: 'drive.analytics_export', label: 'Report exported' },
  { value: 'application.owner_assign', label: 'Application owner assigned' },
  { value: 'application.archive', label: 'Application archived' },
  { value: 'application.unarchive', label: 'Application restored' },
];

export async function listAuditLogs(
  filters: AuditLogFilters = {},
): Promise<{ rows: AuditLogRow[]; total: number }> {
  const qs = new URLSearchParams();
  if (filters.actorId) qs.set('actorId', filters.actorId);
  if (filters.action) qs.set('action', filters.action);
  if (filters.entity) qs.set('entity', filters.entity);
  if (filters.entityId) qs.set('entityId', filters.entityId);
  if (filters.startDate) qs.set('startDate', filters.startDate);
  if (filters.endDate) qs.set('endDate', filters.endDate);
  if (filters.limit) qs.set('limit', String(filters.limit));
  if (filters.offset !== undefined) qs.set('offset', String(filters.offset));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  const res = await apiClient.get<{ rows: AuditLogRow[]; total: number }>(
    `/api/v1/admin/audit-logs${suffix}`,
  );
  return res.data;
}
