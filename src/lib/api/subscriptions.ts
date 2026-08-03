import { apiClient } from './client';
import type {
  AssignSubscriptionDto,
  CollegeSubscriptionDto,
  CreateSubscriptionPlanDto,
  ExtendSubscriptionDto,
  StartTrialDto,
  SubscriptionPlanDto,
  UpdateSubscriptionPlanDto,
} from '@/shared/dto/subscription.dto';

/**
 * Subscription catalog + lifecycle API client (Phase 4). All routes are gated
 * server-side by @Roles(ADMIN, SUPER_ADMIN) + @RequireCapability('canManageSubscriptions').
 */

// ── Plans ──────────────────────────────────────────────────────────────────
export async function listSubscriptionPlans(includeArchived = false): Promise<SubscriptionPlanDto[]> {
  const res = await apiClient.get<SubscriptionPlanDto[]>(
    `/api/v1/admin/subscription-plans${includeArchived ? '?includeArchived=true' : ''}`,
  );
  return res.data;
}

export async function createSubscriptionPlan(dto: CreateSubscriptionPlanDto): Promise<SubscriptionPlanDto> {
  const res = await apiClient.post<SubscriptionPlanDto>('/api/v1/admin/subscription-plans', dto);
  return res.data;
}

export async function updateSubscriptionPlan(
  id: string,
  dto: UpdateSubscriptionPlanDto,
): Promise<SubscriptionPlanDto> {
  const res = await apiClient.patch<SubscriptionPlanDto>(`/api/v1/admin/subscription-plans/${id}`, dto);
  return res.data;
}

// ── Subscriptions ──────────────────────────────────────────────────────────
export async function listSubscriptions(): Promise<CollegeSubscriptionDto[]> {
  const res = await apiClient.get<CollegeSubscriptionDto[]>('/api/v1/admin/subscriptions');
  return res.data;
}

export async function assignSubscription(dto: AssignSubscriptionDto): Promise<CollegeSubscriptionDto> {
  const res = await apiClient.post<CollegeSubscriptionDto>('/api/v1/admin/subscriptions/assign', dto);
  return res.data;
}

export async function extendSubscription(
  id: string,
  dto: ExtendSubscriptionDto,
): Promise<CollegeSubscriptionDto> {
  const res = await apiClient.post<CollegeSubscriptionDto>(
    `/api/v1/admin/subscriptions/${id}/extend`,
    dto,
  );
  return res.data;
}

export async function startTrial(dto: StartTrialDto): Promise<CollegeSubscriptionDto> {
  const res = await apiClient.post<CollegeSubscriptionDto>('/api/v1/admin/subscriptions/trial', dto);
  return res.data;
}

export async function cancelSubscription(id: string): Promise<CollegeSubscriptionDto> {
  const res = await apiClient.post<CollegeSubscriptionDto>(
    `/api/v1/admin/subscriptions/${id}/cancel`,
    {},
  );
  return res.data;
}

/**
 * Format a MONEY AMOUNT. Zero renders as a real zero (₹0), never "Free" —
 * a revenue figure of nothing collected is still an amount, and labelling it
 * "Free" makes a financials KPI read like a pricing tier. Use this for anything
 * collected, owed, or refunded; use formatPrice for a PLAN's price, where "Free"
 * is a genuine tier.
 */
export function formatMoney(cents: number, currency = 'INR'): string {
  const symbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : `${currency} `;
  const major = cents / 100;
  const fractionDigits = Number.isInteger(major) ? 0 : 2;
  // Sign before the symbol: a refund reads "-₹79", not "₹-79".
  const sign = major < 0 ? '-' : '';
  return `${sign}${symbol}${Math.abs(major).toLocaleString('en-IN', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;
}

/**
 * Format a PLAN PRICE, where a zero price genuinely means a free tier
 * (e.g. 4999900 → ₹49,999; 0 → Free). Shows paise only when the amount isn't a
 * whole major unit, so display stays consistent for whole-rupee plan prices.
 */
export function formatPrice(cents: number, currency = 'INR'): string {
  if (cents === 0) return 'Free';
  const symbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : `${currency} `;
  const major = cents / 100;
  const fractionDigits = Number.isInteger(major) ? 0 : 2;
  return `${symbol}${major.toLocaleString('en-IN', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;
}
