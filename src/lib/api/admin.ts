import { apiClient } from './client';
import type {
  AdminCreateCollegeDto,
  AdminUpdateCollegeDto,
} from '@/shared';

/**
 * Admin (super-admin) API client. Wraps the `/api/v1/admin/*` endpoints.
 * All routes are SUPER_ADMIN-only — backend RolesGuard enforces; this client
 * is just transport. Day 3.5 brings up the colleges console first; other
 * admin entities (companies, courses, questions) will fold into this file
 * as their consoles are built (Sprint 8 polish).
 */

export interface AdminCollegeRow {
  id: string;
  name: string;
  slug: string;
  state: string;
  city: string;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
}

export async function listAdminColleges(): Promise<AdminCollegeRow[]> {
  const res = await apiClient.get<AdminCollegeRow[]>('/api/v1/admin/colleges');
  return res.data;
}

export async function createAdminCollege(dto: AdminCreateCollegeDto): Promise<{ id: string }> {
  const res = await apiClient.post<{ id: string }>('/api/v1/admin/colleges', dto);
  return res.data;
}

export async function updateAdminCollege(
  id: string,
  dto: AdminUpdateCollegeDto,
): Promise<{ id: string }> {
  const res = await apiClient.patch<{ id: string }>(`/api/v1/admin/colleges/${id}`, dto);
  return res.data;
}

export async function suspendAdminCollege(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/admin/colleges/${id}`);
}
