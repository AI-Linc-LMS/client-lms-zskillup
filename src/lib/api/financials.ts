import { apiClient } from './client';
import type { FinancialsOverviewDto } from '@/shared/dto/financials.dto';

/**
 * Financials API client (Phase 7). Gated server-side by @Roles(ADMIN, SUPER_ADMIN)
 * + @RequireCapability('canViewFinancials').
 */
export async function getFinancialsOverview(): Promise<FinancialsOverviewDto> {
  return (await apiClient.get<FinancialsOverviewDto>('/api/v1/admin/financials/overview')).data;
}
