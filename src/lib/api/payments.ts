import { apiClient } from './client';
import type {
  CartCheckoutDto,
  CartOrderResultDto,
  CreateOrderDto,
  CreateOrderResultDto,
  EntitlementDto,
  MySubscriptionDto,
  PriceBookEntryDto,
  VerifyPaymentDto,
} from '@/shared/dto/payments.dto';

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
