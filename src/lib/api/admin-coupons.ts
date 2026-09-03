import { apiClient } from './client';
import type {
  CouponCampaignDto,
  CouponDto,
  CouponUsageStatsDto,
  CreateCampaignDto,
  CreateCouponDto,
  UpdateCampaignDto,
  UpdateCouponDto,
} from '@/shared/dto/coupons.dto';

/**
 * Admin coupons & campaigns API client. Gated server-side by
 * @Roles(ADMIN, SUPER_ADMIN) + @RequireCapability('canManageSubscriptions'); an
 * ADMIN sees/edits only what they created, a SUPER_ADMIN overrides all.
 */

const BASE = '/api/v1/admin/coupons';

// ── Coupons ─────────────────────────────────────────────────────────────────
export async function listCoupons(): Promise<CouponDto[]> {
  return (await apiClient.get<CouponDto[]>(BASE)).data;
}

export async function createCoupon(dto: CreateCouponDto): Promise<CouponDto> {
  return (await apiClient.post<CouponDto>(BASE, dto)).data;
}

export async function updateCoupon(id: string, dto: UpdateCouponDto): Promise<CouponDto> {
  return (await apiClient.patch<CouponDto>(`${BASE}/${id}`, dto)).data;
}

export async function deleteCoupon(id: string): Promise<{ id: string }> {
  return (await apiClient.delete<{ id: string }>(`${BASE}/${id}`)).data;
}

// ── Campaigns ───────────────────────────────────────────────────────────────
export async function listCampaigns(): Promise<CouponCampaignDto[]> {
  return (await apiClient.get<CouponCampaignDto[]>(`${BASE}/campaigns`)).data;
}

export async function createCampaign(dto: CreateCampaignDto): Promise<CouponCampaignDto> {
  return (await apiClient.post<CouponCampaignDto>(`${BASE}/campaigns`, dto)).data;
}

export async function updateCampaign(id: string, dto: UpdateCampaignDto): Promise<CouponCampaignDto> {
  return (await apiClient.patch<CouponCampaignDto>(`${BASE}/campaigns/${id}`, dto)).data;
}

export async function deleteCampaign(id: string): Promise<{ id: string }> {
  return (await apiClient.delete<{ id: string }>(`${BASE}/campaigns/${id}`)).data;
}

// ── Usage & campaign-performance dashboard ──────────────────────────────────
export async function getCouponUsage(): Promise<CouponUsageStatsDto> {
  return (await apiClient.get<CouponUsageStatsDto>(`${BASE}/usage`)).data;
}
