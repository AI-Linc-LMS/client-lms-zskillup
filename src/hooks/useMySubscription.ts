'use client';

import { useCallback, useEffect, useState } from 'react';
import { getMySubscription } from '@/lib/api/payments';
import type { EntitlementDto, MySubscriptionDto } from '@/shared/dto/payments.dto';
import { EntitlementScope } from '@/shared/enums';

/** Which "tier" the student is in — drives the Upgrade & Renew module + nav. */
export type PlanStatus = 'none' | 'custom' | 'platform';

export interface MySubscriptionState {
  loading: boolean;
  /** Raw payload (null until first load / on error). */
  sub: MySubscriptionDto | null;
  hasPlatform: boolean;
  /** ACTIVE (non-expired, non-cancelled) grants only. */
  active: EntitlementDto[];
  planStatus: PlanStatus;
  /** Career tools (Mock Interview, Resume Builder) are bundled with a Company
   *  hub or the Full Platform plan — this is the "entitled" half of the gate.
   *  The free-run allowance is layered on top by the feature-specific gate. */
  careerToolsEntitled: boolean;
  /** Server-reported paywall switch. While false the whole paywall is dormant
   *  and every gate must fall OPEN. Defaults false (safe) until the field lands. */
  paywallEnabled: boolean;
  refresh: () => void;
}

const EMPTY: Omit<MySubscriptionState, 'loading' | 'refresh'> = {
  sub: null,
  hasPlatform: false,
  active: [],
  planStatus: 'none',
  careerToolsEntitled: false,
  paywallEnabled: false,
};

function derive(sub: MySubscriptionDto): Omit<MySubscriptionState, 'loading' | 'refresh'> {
  const active = (sub.entitlements ?? []).filter((e) => e.status === 'ACTIVE');
  const hasPlatform = sub.hasPlatform;
  const hasCompany = active.some((e) => e.scopeType === EntitlementScope.COMPANY);
  const planStatus: PlanStatus = hasPlatform ? 'platform' : active.length > 0 ? 'custom' : 'none';
  // Prefer the server-computed flags (they respect PAYWALL_ENABLED + college
  // inheritance); fall back to a client derivation for older payloads.
  const paywallEnabled = sub.paywallEnabled ?? false;
  const careerToolsEntitled = sub.careerToolsEntitled ?? (hasPlatform || hasCompany);
  return { sub, hasPlatform, active, planStatus, careerToolsEntitled, paywallEnabled };
}

/**
 * Live subscription/entitlement status for the signed-in student. One fetch,
 * re-checked on window focus / tab visibility so a purchase made in the checkout
 * widget (or another tab) reflects here on return. **Fails OPEN** — a fetch error
 * leaves `planStatus: 'none'` and `paywallEnabled: false`, so a transient blip
 * never walls a user out of a feature.
 */
export function useMySubscription(enabled = true): MySubscriptionState {
  const [state, setState] = useState<Omit<MySubscriptionState, 'refresh'>>({
    loading: enabled,
    ...EMPTY,
  });

  const check = useCallback((signal?: { cancelled: boolean }) => {
    getMySubscription()
      .then((sub) => {
        if (!signal?.cancelled) setState({ loading: false, ...derive(sub) });
      })
      .catch(() => {
        if (!signal?.cancelled) setState({ loading: false, ...EMPTY });
      });
  }, []);

  useEffect(() => {
    if (!enabled) {
      setState({ loading: false, ...EMPTY });
      return;
    }
    const signal = { cancelled: false };
    check(signal);
    const onFocus = () => check();
    const onVis = () => document.visibilityState === 'visible' && check();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      signal.cancelled = true;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [check, enabled]);

  return { ...state, refresh: () => (enabled ? check() : undefined) };
}
