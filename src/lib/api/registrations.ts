import { apiClient } from './client';

/**
 * Company-drive registration API (assessment lifecycle, Phase 1).
 * Mirrors backend src/shared/dto/registration.dto.ts.
 */
export interface ApiRegistration {
  id: string;
  status: 'REGISTERED' | 'COMPLETED' | 'CANCELLED';
  registeredAt: string;
  companyId: string;
  companySlug: string;
  companyName: string;
  companyLogoUrl: string | null;
}

/** The signed-in student's non-cancelled company-drive registrations. */
export async function getMyRegistrations(): Promise<ApiRegistration[]> {
  const res = await apiClient.get<ApiRegistration[]>('/api/v1/registrations/mine');
  return res.data;
}

/** Register the student for a company drive (idempotent). */
export async function registerForCompany(slug: string): Promise<ApiRegistration> {
  const res = await apiClient.post<ApiRegistration>(`/api/v1/companies/${slug}/register`, {});
  return res.data;
}

/** Cancel a company-drive registration. */
export async function cancelRegistration(slug: string): Promise<void> {
  await apiClient.delete(`/api/v1/companies/${slug}/register`);
}
