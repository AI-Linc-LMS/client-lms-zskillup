import { apiClient } from './client';

/** Student-facing tip (GET /students/today-tip). */
export interface ApiTip {
  id: string;
  title: string;
  body: string;
  category: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  icon: string | null;
}

export interface AdminTip extends ApiTip {
  code: string;
  isActive: boolean;
  priority: number;
  createdAt: string;
}

export async function getTodaysTip(): Promise<ApiTip | null> {
  const res = await apiClient.get<ApiTip | null>('/api/v1/students/today-tip');
  return res.data;
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export interface AdminTipInput {
  code?: string;
  title?: string;
  body?: string;
  category?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  icon?: string | null;
  isActive?: boolean;
  priority?: number;
}

export async function listAdminTips(): Promise<AdminTip[]> {
  const res = await apiClient.get<AdminTip[]>('/api/v1/admin/tips');
  return res.data;
}

export async function createAdminTip(dto: AdminTipInput): Promise<AdminTip> {
  const res = await apiClient.post<AdminTip>('/api/v1/admin/tips', dto);
  return res.data;
}

export async function updateAdminTip(id: string, dto: AdminTipInput): Promise<AdminTip> {
  const res = await apiClient.patch<AdminTip>(`/api/v1/admin/tips/${id}`, dto);
  return res.data;
}

export async function deleteAdminTip(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/admin/tips/${id}`);
}
