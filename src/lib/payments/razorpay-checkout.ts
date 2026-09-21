import { createCartOrder, createCollegeOrder, createOrder, verifyPayment } from '@/lib/api/payments';
import { startAutopay, verifyAutopay } from '@/lib/api/autopay';
import type { AutopayDto } from '@/shared/dto/autopay.dto';
import { announcePurchase, type PurchasedItem } from './autopay-display';
import { scopeLabel } from './pricing';
import type { CartItemDto, EntitlementDto } from '@/shared/dto/payments.dto';
import type { BillingPeriod, EntitlementScope } from '@/shared/enums';
import { widgetPrefill, type CheckoutPrefill } from './checkout-contact';

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

/** What the handler returns for a SUBSCRIPTION: no order id, and the signature is
 *  over `payment_id|subscription_id` — the reverse of an order's. */
interface RazorpaySubscriptionHandlerResponse {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  /** One-time payment. Mutually exclusive with `subscription_id`. */
  order_id?: string;
  /** Autopay mandate. Razorpay reads the amount from the plan, so none is sent. */
  subscription_id?: string;
  amount?: number;
  currency?: string;
  name: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  handler?: (response: RazorpayHandlerResponse & RazorpaySubscriptionHandlerResponse) => void;
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
  /** Shown in the Razorpay widget (e.g. "Profit & Loss - monthly"). */
  description?: string;
  /** Name, email and mobile shown pre-filled in the widget (an invalid mobile is dropped). */
  prefill?: CheckoutPrefill;
  /** College B2B purchase (cohort-wide) instead of an individual student buy. */
  forCollege?: boolean;
  /** Optional coupon code — validated + applied server-side. */
  couponCode?: string;
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
      couponCode: params.couponCode,
    };
    order = params.forCollege ? await createCollegeOrder(dto) : await createOrder(dto);
  } catch (err) {
    return { ok: false, error: messageOf(err, 'Could not start the payment. Please try again.') };
  }

  // A coupon cleared the whole charge — access was granted server-side and there is
  // no Razorpay order to open. Report success straight away.
  if (order.free) {
    if (!params.forCollege) announcePurchase([purchasedFrom(params)]);
    return { ok: true, entitlement: null };
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
      prefill: widgetPrefill(params.prefill),
      theme: { color: '#f5b400' },
      handler: (response: RazorpayHandlerResponse) => {
        void (async () => {
          try {
            const res = await verifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            if (!params.forCollege) announcePurchase([purchasedFrom(params)]);
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
  prefill?: CheckoutPrefill,
  couponCode?: string,
): Promise<CartPurchaseResult> {
  const loaded = await loadScript();
  if (!loaded) {
    return { ok: false, error: 'Could not open the payment window. Check your connection and try again.' };
  }

  let order;
  try {
    order = await createCartOrder({ items, couponCode });
  } catch (err) {
    return { ok: false, error: messageOf(err, 'Could not start the payment. Please try again.') };
  }

  const skipped = order.skipped?.length ?? 0;

  // A coupon cleared the whole charge — access was granted server-side, no widget.
  if (order.free) {
    announcePurchase(order.lines.map(purchasedFromLine));
    return { ok: true, skipped };
  }

  const Ctor = window.Razorpay;
  if (!Ctor) {
    return { ok: false, error: 'The payment window is unavailable right now. Please try again.' };
  }

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
      prefill: widgetPrefill(prefill),
      theme: { color: '#f5b400' },
      handler: (response: RazorpayHandlerResponse) => {
        void (async () => {
          try {
            await verifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            announcePurchase(order.lines.map(purchasedFromLine));
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

// ─── Autopay ─────────────────────────────────────────────────────────────────

/** What a single purchase bought, for the post-purchase autopay offer. */
function purchasedFrom(params: StartPurchaseParams): PurchasedItem {
  return {
    scope: params.scope,
    scopeRef: params.scopeRef ?? null,
    period: params.period,
    label: params.description ?? scopeLabel(params.scope),
  };
}

/** What one cart line bought. Skipped lines (already owned) are never announced. */
function purchasedFromLine(line: {
  scopeType: EntitlementScope;
  scopeRef: string | null;
  period: BillingPeriod;
}): PurchasedItem {
  return {
    scope: line.scopeType,
    scopeRef: line.scopeRef,
    period: line.period,
    label: line.scopeRef ? `${scopeLabel(line.scopeType)} · ${line.scopeRef}` : scopeLabel(line.scopeType),
  };
}

export interface StartAutopayParams {
  scope: EntitlementScope;
  scopeRef?: string | null;
  period: BillingPeriod;
  description?: string;
  prefill?: CheckoutPrefill;
}

export interface AutopayResult {
  ok: boolean;
  autopay?: AutopayDto;
  /** When the first renewal charge will run — shown on the confirmation. */
  firstChargeAt?: string | null;
  dismissed?: boolean;
  error?: string;
}

/**
 * Authorise an Autopay mandate for something the student already holds.
 *
 * The plan price is not charged today: the server schedules the first renewal one day
 * before current access ends. Razorpay does take a small, refundable verification
 * amount to approve the mandate (₹5 on test cards; it varies by method) and says so on
 * its own screen — so our copy must never claim nothing is charged.
 * Never rejects.
 */
export async function startAutopayMandate(params: StartAutopayParams): Promise<AutopayResult> {
  const loaded = await loadScript();
  if (!loaded) {
    return { ok: false, error: 'Could not open the payment window. Check your connection and try again.' };
  }

  let mandate;
  try {
    mandate = await startAutopay({
      scope: params.scope,
      scopeRef: params.scopeRef ?? undefined,
      period: params.period,
    });
  } catch (err) {
    return { ok: false, error: messageOf(err, 'Could not set up autopay. Please try again.') };
  }

  const Ctor = window.Razorpay;
  if (!Ctor) {
    return { ok: false, error: 'The payment window is unavailable right now. Please try again.' };
  }

  return new Promise<AutopayResult>((resolve) => {
    let settled = false;
    const done = (r: AutopayResult) => {
      if (!settled) {
        settled = true;
        resolve(r);
      }
    };

    const rzp = new Ctor({
      key: mandate.razorpayKeyId,
      subscription_id: mandate.razorpaySubscriptionId,
      name: 'prephasz',
      description: params.description ?? 'Autopay for renewals',
      prefill: widgetPrefill(params.prefill),
      theme: { color: '#f5b400' },
      handler: (response) => {
        void (async () => {
          try {
            const autopay = await verifyAutopay({
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySubscriptionId: response.razorpay_subscription_id,
              razorpaySignature: response.razorpay_signature,
            });
            done({ ok: true, autopay, firstChargeAt: mandate.firstChargeAt });
          } catch {
            done({
              ok: false,
              error: 'Autopay was authorised, but confirmation is still catching up - refresh in a moment.',
            });
          }
        })();
      },
      modal: { ondismiss: () => done({ ok: false, dismissed: true }) },
    });

    rzp.on('payment.failed', () =>
      done({ ok: false, error: 'Autopay could not be authorised - nothing was charged. Please try again.' }),
    );
    rzp.open();
  });
}
