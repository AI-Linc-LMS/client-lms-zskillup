import { apiClient } from './client';
import type { FinancialsOverviewDto, FinancialsPaymentsDto } from '@/shared/dto/financials.dto';

/**
 * Financials API client (Phase 7). Gated server-side by @Roles(ADMIN, SUPER_ADMIN)
 * + @RequireCapability('canViewFinancials').
 */
export async function getFinancialsOverview(): Promise<FinancialsOverviewDto> {
  return (await apiClient.get<FinancialsOverviewDto>('/api/v1/admin/financials/overview')).data;
}

/** Real collected-revenue view from Razorpay payments (Super-Admin only). Optional
 *  ISO date range drives the date-filtered figures (default = current month). */
export async function getFinancialsPayments(range?: {
  from?: string;
  to?: string;
}): Promise<FinancialsPaymentsDto> {
  const qs = new URLSearchParams();
  if (range?.from) qs.set('from', range.from);
  if (range?.to) qs.set('to', range.to);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return (await apiClient.get<FinancialsPaymentsDto>(`/api/v1/admin/financials/payments${suffix}`)).data;
}
