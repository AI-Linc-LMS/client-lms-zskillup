import { apiClient } from './client';
import type {
  AdminAutopayListDto,
  AutopayChargeDto,
  AutopayDto,
  AutopayListDto,
  StartAutopayDto,
  StartAutopayResultDto,
  VerifyAutopayDto,
} from '@/shared/dto/autopay.dto';
import type { AutopayStatus } from '@/shared/enums';

/**
 * Razorpay Autopay — a student's recurring renewal mandate, plus the admin ledger.
 *
 * Autopay RENEWS something already bought; it never takes the first payment (that
 * goes through normal checkout, where coupons apply). Starting 404s while the
 * backend's AUTOPAY_ENABLED switch is off — `listMyAutopay().enabled` is how the UI
 * knows whether to offer it at all.
 */

export async function listMyAutopay(): Promise<AutopayListDto> {
  return (await apiClient.get<AutopayListDto>('/api/v1/payments/autopay')).data;
}

export async function startAutopay(dto: StartAutopayDto): Promise<StartAutopayResultDto> {
  return (await apiClient.post<StartAutopayResultDto>('/api/v1/payments/autopay', dto)).data;
}

export async function verifyAutopay(dto: VerifyAutopayDto): Promise<AutopayDto> {
  return (await apiClient.post<AutopayDto>('/api/v1/payments/autopay/verify', dto)).data;
}

export async function cancelMyAutopay(id: string): Promise<AutopayDto> {
  return (await apiClient.post<AutopayDto>(`/api/v1/payments/autopay/${id}/cancel`, {})).data;
}

// ─── Admin / Super Admin ─────────────────────────────────────────────────────

export async function adminListAutopay(filter: {
  status?: AutopayStatus;
  q?: string;
} = {}): Promise<AdminAutopayListDto> {
  const params = new URLSearchParams();
  if (filter.status) params.set('status', filter.status);
  if (filter.q?.trim()) params.set('q', filter.q.trim());
  const qs = params.toString();
  return (await apiClient.get<AdminAutopayListDto>(`/api/v1/admin/autopay${qs ? `?${qs}` : ''}`)).data;
}

export async function adminAutopayCharges(id: string): Promise<AutopayChargeDto[]> {
  return (await apiClient.get<AutopayChargeDto[]>(`/api/v1/admin/autopay/${id}/charges`)).data;
}

export async function adminCancelAutopay(id: string): Promise<AutopayDto> {
  return (await apiClient.post<AutopayDto>(`/api/v1/admin/autopay/${id}/cancel`, {})).data;
}
