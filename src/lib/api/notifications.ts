import { apiClient } from './client';
import { hasRoleHint } from '@/lib/session-hints';

/** In-app notification (assessment lifecycle, Phase 3). */
export interface ApiNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export interface ApiNotificationFeed {
  items: ApiNotification[];
  unreadCount: number;
}

export async function getNotifications(): Promise<ApiNotificationFeed> {
  // NOT `auth: 'public'`. That posture skips the pre-flight refresh, so on the first
  // paint after a sign-in the access token is not in memory yet: the call went out
  // bare, 401'd, and never retried - every signed-in student saw an empty bell until
  // something else happened to refresh. The default posture refreshes first and
  // retries once on 401. Guests are short-circuited here rather than by the posture,
  // so they never fire a pointless refresh. (Same trap, same fix, as me.ts.)
  if (!hasRoleHint()) return { items: [], unreadCount: 0 };
  const res = await apiClient.get<ApiNotificationFeed>('/api/v1/notifications');
  return res.data;
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.post('/api/v1/notifications/read-all', {});
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.post(`/api/v1/notifications/${id}/read`, {});
}
