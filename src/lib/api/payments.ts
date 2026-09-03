import { apiClient } from './client';
import type {
  CartCheckoutDto,
  CartOrderResultDto,
  CreateOrderDto,
  CreateOrderResultDto,
  EntitlementDto,
  MySubscriptionDto,
  PracticeAccessMapDto,
  PriceBookEntryDto,
  VerifyPaymentDto,
} from '@/shared/dto/payments.dto';
import type { CouponPreviewRequestDto, CouponPreviewResultDto } from '@/shared/dto/coupons.dto';

/**
 * Student payments API client (billing program). Purchase a topic / section /
 * company / platform via Razorpay, confirm the checkout, and read "My
 * Subscription". Server prices everything - the client never sends an amount.
 */

export async function getPricing(): Promise<PriceBookEntryDto[]> {
  const res = await apiClient.get<PriceBookEntryDto[]>('/api/v1/payments/pricing');
  return res.data;
}

export async function getMySubscription(): Promise<MySubscriptionDto> {
  const res = await apiClient.get<MySubscriptionDto>('/api/v1/payments/my-subscription');
  return res.data;
}

/** Server-truth for Practice Hub up-front locks (Phase 8). Fails open server-side —
 *  while the paywall/single-scope is off, hasPlatform is true + the free maps empty. */
export async function getPracticeAccessMap(): Promise<PracticeAccessMapDto> {
  const res = await apiClient.get<PracticeAccessMapDto>('/api/v1/payments/practice-access-map');
  return res.data;
}

export async function createOrder(dto: CreateOrderDto): Promise<CreateOrderResultDto> {
  const res = await apiClient.post<CreateOrderResultDto>('/api/v1/payments/orders', dto);
  return res.data;
}

/** Cart: create ONE Razorpay order for multiple items (server prices + de-dupes). */
export async function createCartOrder(dto: CartCheckoutDto): Promise<CartOrderResultDto> {
  const res = await apiClient.post<CartOrderResultDto>('/api/v1/payments/cart/orders', dto);
  return res.data;
}

/** College B2B: create a cohort-wide company-access order (COLLEGE_ADMIN only). */
export async function createCollegeOrder(dto: CreateOrderDto): Promise<CreateOrderResultDto> {
  const res = await apiClient.post<CreateOrderResultDto>('/api/v1/payments/college/orders', dto);
  return res.data;
}

export async function verifyPayment(
  dto: VerifyPaymentDto,
): Promise<{ status: string; entitlement: EntitlementDto | null }> {
  const res = await apiClient.post<{ status: string; entitlement: EntitlementDto | null }>(
    '/api/v1/payments/verify',
    dto,
  );
  return res.data;
}

/** Preview a coupon against a cart before checkout. Server prices the lines + computes
 *  the discount; the returned number is exactly what will be charged. Never throws for
 *  an invalid code — it returns { valid:false, reason }. */
export async function previewCoupon(dto: CouponPreviewRequestDto): Promise<CouponPreviewResultDto> {
  const res = await apiClient.post<CouponPreviewResultDto>('/api/v1/payments/coupons/preview', dto);
  return res.data;
}
