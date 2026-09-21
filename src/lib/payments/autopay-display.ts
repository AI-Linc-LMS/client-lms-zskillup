import { AutopayChargeStatus, AutopayStatus, BillingPeriod, EntitlementScope } from '@/shared/enums';
import type { StatusTone } from '@/components/student/StatusPill';
import { scopeLabel } from './pricing';

/**
 * How Autopay reads to a person — shared by the student panel, the post-purchase
 * offer and the admin ledger, so a mandate is described in the same words wherever
 * it appears. Pure presentation: every value here is rendered from server data,
 * never computed (frontend/CLAUDE §8).
 */

/** A mandate's status as a pill: a word the student recognises, and a tone that
 *  says whether it needs them. */
export const AUTOPAY_STATUS: Record<AutopayStatus, { label: string; tone: StatusTone }> = {
  [AutopayStatus.CREATED]: { label: 'Awaiting approval', tone: 'neutral' },
  [AutopayStatus.AUTHENTICATED]: { label: 'Approved', tone: 'info' },
  [AutopayStatus.ACTIVE]: { label: 'Active', tone: 'positive' },
  [AutopayStatus.PENDING]: { label: 'Payment retrying', tone: 'warning' },
  [AutopayStatus.HALTED]: { label: 'Payment failed', tone: 'negative' },
  [AutopayStatus.PAUSED]: { label: 'Paused', tone: 'neutral' },
  [AutopayStatus.CANCELLED]: { label: 'Stopped', tone: 'neutral' },
  [AutopayStatus.COMPLETED]: { label: 'Completed', tone: 'neutral' },
};

export const CHARGE_STATUS: Record<AutopayChargeStatus, { label: string; tone: StatusTone }> = {
  [AutopayChargeStatus.CAPTURED]: { label: 'Paid', tone: 'positive' },
  [AutopayChargeStatus.FAILED]: { label: 'Failed', tone: 'negative' },
  [AutopayChargeStatus.REFUNDED]: { label: 'Refunded', tone: 'neutral' },
};

/** A mandate that is still going to charge — the ones a student can stop. */
export const STOPPABLE: ReadonlySet<AutopayStatus> = new Set([
  AutopayStatus.CREATED,
  AutopayStatus.AUTHENTICATED,
  AutopayStatus.ACTIVE,
  AutopayStatus.PENDING,
]);

/** "every month" / "every 3 months" / "every year". */
export function cadence(period: BillingPeriod): string {
  switch (period) {
    case BillingPeriod.MONTHLY:
      return 'every month';
    case BillingPeriod.QUARTERLY:
      return 'every 3 months';
    case BillingPeriod.ANNUAL:
      return 'every year';
    default:
      return '';
  }
}

/** "Full platform" or "Company · tcs" — what the mandate renews. */
export function itemLabel(scope: EntitlementScope, scopeRef: string | null): string {
  return scopeRef ? `${scopeLabel(scope)} · ${scopeRef}` : scopeLabel(scope);
}

/** A date the way the rest of billing shows it: 20 Oct 2026. */
export function autopayDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

// ─── Post-purchase offer ─────────────────────────────────────────────────────

/** What was just bought, in the shape the autopay offer needs. */
export interface PurchasedItem {
  scope: EntitlementScope;
  scopeRef: string | null;
  period: BillingPeriod;
  label: string;
}

/** Fired on `window` after a one-time purchase succeeds. Every checkout path goes
 *  through razorpay-checkout, so one listener offers autopay after all of them —
 *  no buy button anywhere has to know autopay exists. */
export const PURCHASE_COMPLETE_EVENT = 'zsk:purchase-complete';

export function announcePurchase(items: PurchasedItem[]): void {
  if (typeof window === 'undefined' || items.length === 0) return;
  window.dispatchEvent(new CustomEvent<PurchasedItem[]>(PURCHASE_COMPLETE_EVENT, { detail: items }));
}
