import { createCartOrder, createCollegeOrder, createOrder, verifyPayment } from '@/lib/api/payments';
import type { CartItemDto, EntitlementDto } from '@/shared/dto/payments.dto';
import type { BillingPeriod, EntitlementScope } from '@/shared/enums';

/**
 * Razorpay Checkout integration. Loads the hosted checkout script on demand,
 * creates a server-priced order, opens the widget, and verifies the signature.
 * The whole flow is one call: `startPurchase(...)` → PurchaseResult.
 *
 * The webhook is the authoritative fulfillment path on the backend; the verify
 * call here is the fast, user-facing confirmation. Both are idempotent, so a
 * race just no-ops.
 */

const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

interface RazorpayHandlerResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  handler?: (response: RazorpayHandlerResponse) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open(): void;
  on(event: string, handler: (payload: unknown) => void): void;
}

interface RazorpayConstructor {
  new (options: RazorpayOptions): RazorpayInstance;
}

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

let scriptPromise: Promise<boolean> | null = null;

function loadScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<boolean>((resolve) => {
    const el = document.createElement('script');
    el.src = SCRIPT_SRC;
    el.async = true;
    el.onload = () => resolve(true);
    el.onerror = () => {
      scriptPromise = null; // allow a retry on the next attempt
      resolve(false);
    };
    document.body.appendChild(el);
  });
  return scriptPromise;
}

export interface StartPurchaseParams {
  scope: EntitlementScope;
  scopeRef?: string | null;
  period: BillingPeriod;
  /** Shown in the Razorpay widget (e.g. "Profit & Loss — monthly"). */
  description?: string;
  prefill?: { name?: string | null; email?: string | null };
  /** College B2B purchase (cohort-wide) instead of an individual student buy. */
  forCollege?: boolean;
}

export interface PurchaseResult {
  ok: boolean;
  entitlement?: EntitlementDto | null;
  /** User closed the widget without paying. */
  dismissed?: boolean;
  error?: string;
}

/** Run the full purchase flow. Resolves once the payment is confirmed, the user
 *  dismisses the widget, or an error occurs. Never rejects. */
export async function startPurchase(params: StartPurchaseParams): Promise<PurchaseResult> {
  const loaded = await loadScript();
  if (!loaded) {
    return { ok: false, error: 'Could not open the payment window. Check your connection and try again.' };
  }

  let order;
  try {
    const dto = {
      scope: params.scope,
      scopeRef: params.scopeRef ?? undefined,
      period: params.period,
    };
    order = params.forCollege ? await createCollegeOrder(dto) : await createOrder(dto);
  } catch (err) {
    return { ok: false, error: messageOf(err, 'Could not start the payment. Please try again.') };
  }

  const Ctor = window.Razorpay;
  if (!Ctor) {
    return { ok: false, error: 'The payment window is unavailable right now. Please try again.' };
  }

  return new Promise<PurchaseResult>((resolve) => {
    let settled = false;
    const done = (r: PurchaseResult) => {
      if (!settled) {
        settled = true;
        resolve(r);
      }
    };

    const rzp = new Ctor({
      key: order.razorpayKeyId,
      order_id: order.razorpayOrderId,
      amount: order.amountCents,
      currency: order.currency,
      name: 'prephasz',
      description: params.description ?? 'Unlock practice',
      prefill: {
        name: params.prefill?.name ?? undefined,
        email: params.prefill?.email ?? undefined,
      },
      theme: { color: '#f5b400' },
      handler: (response: RazorpayHandlerResponse) => {
        void (async () => {
          try {
            const res = await verifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            done({ ok: true, entitlement: res.entitlement });
          } catch {
            done({
              ok: false,
              error: 'Payment received but confirmation is still catching up - refresh in a moment to see your access.',
            });
          }
        })();
      },
      modal: { ondismiss: () => done({ ok: false, dismissed: true }) },
    });

    rzp.on('payment.failed', () =>
      done({ ok: false, error: 'Payment failed - no money was deducted. Please try again.' }),
    );
    rzp.open();
  });
}

export interface CartPurchaseResult {
  ok: boolean;
  dismissed?: boolean;
  error?: string;
  /** How many lines were skipped as already-owned (nothing charged for them). */
  skipped?: number;
}

/** Check out a whole cart in ONE Razorpay order. Server re-prices every line and
 *  drops anything already owned. Resolves once paid, dismissed, or errored. */
export async function startCartPurchase(
  items: CartItemDto[],
  prefill?: { name?: string | null; email?: string | null },
): Promise<CartPurchaseResult> {
  const loaded = await loadScript();
  if (!loaded) {
    return { ok: false, error: 'Could not open the payment window. Check your connection and try again.' };
  }

  let order;
  try {
    order = await createCartOrder({ items });
  } catch (err) {
    return { ok: false, error: messageOf(err, 'Could not start the payment. Please try again.') };
  }

  const Ctor = window.Razorpay;
  if (!Ctor) {
    return { ok: false, error: 'The payment window is unavailable right now. Please try again.' };
  }
  const skipped = order.skipped?.length ?? 0;

  return new Promise<CartPurchaseResult>((resolve) => {
    let settled = false;
    const done = (r: CartPurchaseResult) => {
      if (!settled) {
        settled = true;
        resolve(r);
      }
    };

    const rzp = new Ctor({
      key: order.razorpayKeyId,
      order_id: order.razorpayOrderId,
      amount: order.amountCents,
      currency: order.currency,
      name: 'prephasz',
      description: `${order.lines.length} item${order.lines.length === 1 ? '' : 's'}`,
      prefill: { name: prefill?.name ?? undefined, email: prefill?.email ?? undefined },
      theme: { color: '#f5b400' },
      handler: (response: RazorpayHandlerResponse) => {
        void (async () => {
          try {
            await verifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            done({ ok: true, skipped });
          } catch {
            done({
              ok: false,
              error: 'Payment received but confirmation is still catching up - refresh in a moment to see your access.',
            });
          }
        })();
      },
      modal: { ondismiss: () => done({ ok: false, dismissed: true }) },
    });

    rzp.on('payment.failed', () =>
      done({ ok: false, error: 'Payment failed - no money was deducted. Please try again.' }),
    );
    rzp.open();
  });
}

function messageOf(err: unknown, fallback: string): string {
  const msg = (err as { message?: string } | null)?.message;
  return typeof msg === 'string' && msg.length > 0 ? msg : fallback;
}
