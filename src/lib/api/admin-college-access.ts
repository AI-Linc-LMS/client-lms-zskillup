import { apiClient } from './client';
import type { AdminAssignmentDto } from '@/shared';

/**
 * Super-admin ↔ college portfolio management (TPO Panel View, 3-tier hierarchy).
 * A SUPER_ADMIN assigns each ADMIN a set of colleges; an admin with NO assignments
 * keeps all-colleges access (backward compatible). Gated server-side to SUPER_ADMIN
 * via `@Roles` on AdminAccessController.
 *
 *   GET  /api/v1/admin/college-access            — every ADMIN + their scoped colleges
 *   PUT  /api/v1/admin/college-access/:adminId   — replace an admin's college set
 */

export async function listAdminCollegeAssignments(): Promise<AdminAssignmentDto[]> {
  return (await apiClient.get<AdminAssignmentDto[]>('/api/v1/admin/college-access')).data;
}

/** Replace an admin's assigned colleges (empty array clears → admin reverts to all). */
export async function setAdminColleges(
  adminId: string,
  collegeIds: string[],
): Promise<{ adminId: string; collegeIds: string[] }> {
  return (
    await apiClient.put<{ adminId: string; collegeIds: string[] }>(
      `/api/v1/admin/college-access/${adminId}`,
      { collegeIds },
    )
  ).data;
}
