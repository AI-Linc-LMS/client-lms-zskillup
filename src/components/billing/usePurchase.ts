'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { startPurchase, type PurchaseResult } from '@/lib/payments/razorpay-checkout';
import type { CheckoutPrefill } from '@/lib/payments/checkout-contact';
import { useCheckoutContact } from './CheckoutPhoneProvider';
import type { BillingPeriod, EntitlementScope } from '@/shared/enums';

export interface BuyArgs {
  /** A stable key for this buyable (e.g. `topic:profit-loss:MONTHLY`) - drives the busy state. */
  key: string;
  scope: EntitlementScope;
  scopeRef?: string | null;
  period: BillingPeriod;
  /** What the user is unlocking, e.g. "Profit & Loss (monthly)". */
  label: string;
  /** Name, email and mobile for the widget - see checkoutPrefillFromMe. */
  prefill?: CheckoutPrefill;
  /** College B2B purchase (cohort-wide) instead of an individual student buy. */
  forCollege?: boolean;
  onPurchased?: (result: PurchaseResult) => void;
}

/**
 * Shared purchase hook: opens Razorpay Checkout, toasts the outcome, and reports
 * which buyable is mid-flight so a card/button can show its own spinner. Reused
 * by the Upgrade page, the practice/company Buy CTAs, and the in-runner paywall.
 */
export function usePurchase() {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const resolveContact = useCheckoutContact();

  const buy = useCallback(async (args: BuyArgs): Promise<PurchaseResult> => {
    if (busyKey) return { ok: false, dismissed: true };
    setBusyKey(args.key);
    try {
      // Settle the mobile the widget opens with (may briefly ask the buyer for one).
      const prefill = await resolveContact(args.prefill, { forCollege: args.forCollege });
      if (!prefill) return { ok: false, dismissed: true };
      const res = await startPurchase({
        scope: args.scope,
        scopeRef: args.scopeRef,
        period: args.period,
        description: args.label,
        prefill,
        forCollege: args.forCollege,
      });
      if (res.ok) {
        toast.success(`Unlocked - ${args.label}`);
        args.onPurchased?.(res);
      } else if (!res.dismissed) {
        toast.error(res.error ?? 'Purchase could not be completed.');
      }
      return res;
    } finally {
      setBusyKey(null);
    }
  }, [busyKey, resolveContact]);

  return { buy, busyKey, isBusy: busyKey !== null };
}
