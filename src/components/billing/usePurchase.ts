'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { startPurchase, type PurchaseResult } from '@/lib/payments/razorpay-checkout';
import type { BillingPeriod, EntitlementScope } from '@/shared/enums';

export interface BuyArgs {
  /** A stable key for this buyable (e.g. `topic:profit-loss:MONTHLY`) — drives the busy state. */
  key: string;
  scope: EntitlementScope;
  scopeRef?: string | null;
  period: BillingPeriod;
  /** What the user is unlocking, e.g. "Profit & Loss (monthly)". */
  label: string;
  prefill?: { name?: string | null; email?: string | null };
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

  const buy = useCallback(async (args: BuyArgs): Promise<PurchaseResult> => {
    if (busyKey) return { ok: false, dismissed: true };
    setBusyKey(args.key);
    try {
      const res = await startPurchase({
        scope: args.scope,
        scopeRef: args.scopeRef,
        period: args.period,
        description: args.label,
        prefill: args.prefill,
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
  }, [busyKey]);

  return { buy, busyKey, isBusy: busyKey !== null };
}
