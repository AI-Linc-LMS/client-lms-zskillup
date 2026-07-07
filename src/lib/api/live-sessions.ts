import { apiClient } from './client';
import type {
  CreateLiveSessionDto,
  LiveSessionDto,
  LiveSessionListDto,
  UpdateLiveSessionDto,
} from '@/shared/dto/live-sessions.dto';

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

// ── Student ───────────────────────────────────────────────────────────────

export async function listMyLiveSessions(): Promise<LiveSessionListDto> {
  return (await apiClient.get<LiveSessionListDto>('/api/v1/live-sessions')).data;
}
