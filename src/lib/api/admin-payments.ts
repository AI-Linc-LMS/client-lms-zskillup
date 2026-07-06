import { apiClient } from './client';
import type {
  EntitlementDto,
  GrantEntitlementDto,
  PriceBookEntryDto,
  UpdatePriceBookDto,
} from '@/shared/dto/payments.dto';

/**
 * Admin billing API client (Razorpay program). Gated server-side by
 * @Roles(ADMIN, SUPER_ADMIN) + @RequireCapability('canManageSubscriptions').
 */

// ── Price book (configurable pricing) ──────────────────────────────────────
export async function getPriceBook(): Promise<PriceBookEntryDto[]> {
  return (await apiClient.get<PriceBookEntryDto[]>('/api/v1/admin/price-book')).data;
}

export async function updatePrice(id: string, dto: UpdatePriceBookDto): Promise<PriceBookEntryDto> {
  return (await apiClient.patch<PriceBookEntryDto>(`/api/v1/admin/price-book/${id}`, dto)).data;
}

// ── Entitlements ───────────────────────────────────────────────────────────
export async function listEntitlements(params?: {
  userId?: string;
  collegeId?: string;
}): Promise<EntitlementDto[]> {
  const qs = new URLSearchParams();
  if (params?.userId) qs.set('userId', params.userId);
  if (params?.collegeId) qs.set('collegeId', params.collegeId);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return (await apiClient.get<EntitlementDto[]>(`/api/v1/admin/entitlements${suffix}`)).data;
}

export async function grantEntitlement(dto: GrantEntitlementDto): Promise<EntitlementDto> {
  return (await apiClient.post<EntitlementDto>('/api/v1/admin/entitlements/grant', dto)).data;
}

export async function revokeEntitlement(id: string): Promise<EntitlementDto> {
  return (await apiClient.post<EntitlementDto>(`/api/v1/admin/entitlements/${id}/revoke`, {})).data;
}
