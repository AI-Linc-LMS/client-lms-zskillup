import { apiClient } from './client';
import type {
  CreateLiveSessionDto,
  LiveSessionDto,
  LiveSessionListDto,
  UpdateLiveSessionDto,
} from '@/shared/dto/live-sessions.dto';
import type {
  EntityNotificationSendDto,
  SendEntityNotificationDto,
} from '@/shared/dto/entity-notify.dto';

export type { LiveSessionDto, LiveSessionListDto, LiveSessionStatus } from '@/shared/dto/live-sessions.dto';
export { LiveSessionAudience } from '@/shared/enums';

/** Live sessions API client. Admin routes need ADMIN/SUPER_ADMIN; student route is any signed-in user. */

// ── Admin ─────────────────────────────────────────────────────────────────

export async function listAdminLiveSessions(): Promise<LiveSessionListDto> {
  return (await apiClient.get<LiveSessionListDto>('/api/v1/admin/live-sessions')).data;
}

export async function createLiveSession(body: CreateLiveSessionDto): Promise<LiveSessionDto> {
  return (await apiClient.post<LiveSessionDto>('/api/v1/admin/live-sessions', body)).data;
}

export async function updateLiveSession(id: string, body: UpdateLiveSessionDto): Promise<LiveSessionDto> {
  return (await apiClient.patch<LiveSessionDto>(`/api/v1/admin/live-sessions/${id}`, body)).data;
}

export async function deleteLiveSession(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/admin/live-sessions/${id}`);
}

/** Notify students ABOUT a session, on the admin's schedule - never changes the session's
 *  own schedule, and can be sent repeatedly. Needs the canBroadcast capability. */
export async function notifyLiveSession(
  id: string,
  body: SendEntityNotificationDto,
): Promise<{ recipients: number }> {
  return (await apiClient.post<{ recipients: number }>(`/api/v1/admin/live-sessions/${id}/notify`, body))
    .data;
}

/** What has already been sent about a session, newest first. */
export async function listLiveSessionNotifications(id: string): Promise<EntityNotificationSendDto[]> {
  return (
    await apiClient.get<EntityNotificationSendDto[]>(`/api/v1/admin/live-sessions/${id}/notifications`)
  ).data;
}

// ── Student ───────────────────────────────────────────────────────────────

export async function listMyLiveSessions(): Promise<LiveSessionListDto> {
  return (await apiClient.get<LiveSessionListDto>('/api/v1/live-sessions')).data;
}

/** Register for a session. Free students must do this before the join link appears. */
export async function registerForLiveSession(id: string): Promise<{ signupKind: string }> {
  return (await apiClient.post<{ signupKind: string }>(`/api/v1/live-sessions/${id}/register`, {})).data;
}

/** Mark interest. For paying students - a demand signal that never gates access. */
export async function markLiveSessionInterest(id: string): Promise<{ signupKind: string }> {
  return (await apiClient.post<{ signupKind: string }>(`/api/v1/live-sessions/${id}/interest`, {})).data;
}
