import { apiClient } from './client';
import type { RefundEligibility, RefundRequestStatus } from '@/shared/refund-window';

/** One purchase on the student's billing page. */
export interface MyPurchase {
  orderId: string;
  status: string;
  amountCents: number;
  currency: string;
  scopeType: string | null;
  scopeRef: string | null;
  productLabel: string | null;
  paidAt: string | null;
  createdAt: string;
  refund: {
    status: RefundRequestStatus | null;
    requestedAt: string | null;
    decidedAt: string | null;
    processedAt: string | null;
    adminNote: string | null;
  };
  /** Computed server-side with the SAME shared predicate this app uses. */
  eligibility: RefundEligibility;
}

export interface AdminRefundRow {
  id: string;
  orderId: string;
  status: RefundRequestStatus;
  amountCents: number;
  reason: string | null;
  adminNote: string | null;
  razorpayRefundId: string | null;
  requestedAt: string;
  decidedAt: string | null;
  processedAt: string | null;
  student: { id: string; fullName: string | null; email: string };
  order: { scopeType: string | null; scopeRef: string | null; paidAt: string | null };
}

export async function getMyPurchases(): Promise<MyPurchase[]> {
  const res = await apiClient.get<MyPurchase[]>('/api/v1/payments/my-purchases');
  return res.data;
}

export async function requestRefund(
  orderId: string,
  reason?: string,
): Promise<{ id: string; status: RefundRequestStatus }> {
  const res = await apiClient.post<{ id: string; status: RefundRequestStatus }>(
    `/api/v1/payments/orders/${orderId}/refund-request`,
    { reason },
  );
  return res.data;
}

export async function listRefundRequests(params: {
  status?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<{ rows: AdminRefundRow[]; total: number; counts: Record<string, number> }> {
  const q = new URLSearchParams();
  if (params.status && params.status !== 'ALL') q.set('status', params.status);
  if (params.limit) q.set('limit', String(params.limit));
  if (params.offset) q.set('offset', String(params.offset));
  const res = await apiClient.get<{
    rows: AdminRefundRow[];
    total: number;
    counts: Record<string, number>;
  }>(`/api/v1/admin/refund-requests${q.toString() ? `?${q}` : ''}`);
  return res.data;
}

/** Approve: calls Razorpay. `error` set (with status FAILED) when Razorpay refused. */
export async function approveRefund(
  id: string,
): Promise<{ status: RefundRequestStatus; razorpayRefundId: string | null; error?: string }> {
  const res = await apiClient.post<{
    status: RefundRequestStatus;
    razorpayRefundId: string | null;
    error?: string;
  }>(`/api/v1/admin/refund-requests/${id}/approve`, {});
  return res.data;
}

export async function rejectRefund(
  id: string,
  note?: string,
): Promise<{ status: RefundRequestStatus }> {
  const res = await apiClient.post<{ status: RefundRequestStatus }>(
    `/api/v1/admin/refund-requests/${id}/reject`,
    { note },
  );
  return res.data;
}
