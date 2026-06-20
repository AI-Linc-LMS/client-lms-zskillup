import { apiClient } from './client';

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
  const res = await apiClient.get<ApiNotificationFeed>('/api/v1/notifications', { auth: 'public' });
  return res.data;
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.post('/api/v1/notifications/read-all', {});
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.post(`/api/v1/notifications/${id}/read`, {});
}
