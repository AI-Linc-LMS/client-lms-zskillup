import { apiClient } from './client';
import type {
  AdminTransactionsPageDto,
  EntitlementDto,
  GrantEntitlementDto,
  GrantedEntitlementDto,
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

/** All complimentary (admin-granted) entitlements + the granted user's identity. */
export async function listAdminGrants(): Promise<GrantedEntitlementDto[]> {
  return (await apiClient.get<GrantedEntitlementDto[]>('/api/v1/admin/entitlements/grants')).data;
}

export async function grantEntitlement(dto: GrantEntitlementDto): Promise<EntitlementDto> {
  return (await apiClient.post<EntitlementDto>('/api/v1/admin/entitlements/grant', dto)).data;
}

export async function revokeEntitlement(id: string): Promise<EntitlementDto> {
  return (await apiClient.post<EntitlementDto>(`/api/v1/admin/entitlements/${id}/revoke`, {})).data;
}

// ── Transactions ledger ────────────────────────────────────────────────────
/** Paginated transactions: payment + buyer identity + purchased product + validity. */
export async function listAdminTransactions(opts: {
  limit?: number;
  offset?: number;
  status?: string;
} = {}): Promise<AdminTransactionsPageDto> {
  const p = new URLSearchParams();
  if (opts.limit != null) p.set('limit', String(opts.limit));
  if (opts.offset != null) p.set('offset', String(opts.offset));
  if (opts.status) p.set('status', opts.status);
  const qs = p.toString();
  return (await apiClient.get<AdminTransactionsPageDto>(`/api/v1/admin/transactions${qs ? `?${qs}` : ''}`)).data;
}
