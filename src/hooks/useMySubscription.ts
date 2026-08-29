'use client';

import { useCallback, useEffect, useState } from 'react';
import { getMySubscription } from '@/lib/api/payments';
import type { EntitlementDto, MySubscriptionDto } from '@/shared/dto/payments.dto';
import type { FeatureLockModule } from '@/lib/api/feature-locks';
import { EntitlementScope } from '@/shared/enums';

/**
 * Whether a given feature-lock module is EFFECTIVELY subscription-locked for this student,
 * from the server-computed per-module map. Use this — not the bare `paywallEnabled` — for a
 * module's up-front lock, so freeing one module (e.g. mocks) opens only that module's wall.
 * Fails OPEN: null sub (loading/error) → not locked. Falls back to the master paywall when an
 * older server omits the per-module map, preserving today's behaviour until the field lands.
 */
export function moduleSubscriptionLocked(
  sub: MySubscriptionDto | null,
  module: FeatureLockModule,
): boolean {
  if (!sub) return false;
  const map = sub.subscriptionLocks;
  if (map && typeof map[module] === 'boolean') return map[module];
  return sub.paywallEnabled ?? false;
}

/** Which "tier" the student is in - drives the Upgrade & Renew module + nav. */
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
   *  hub or the Full Platform plan - this is the "entitled" half of the gate.
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
 * widget (or another tab) reflects here on return. **Fails OPEN** - a fetch error
 * leaves `planStatus: 'none'` and `paywallEnabled: false`, so a transient blip
 * never walls a user out of a feature.
 */
/**
 * ONE shared subscription poll for the whole app.
 *
 * Two problems, one mechanism. (1) A cancellation performed by an admin left the
 * "PREMIUM MEMBER" badge on screen until the student refreshed or signed out and in
 * again - the hook re-checked on focus/visibility, which never fires for someone
 * sitting on the dashboard. (2) Every mount fired its own request, so a single
 * dashboard load hit /payments/my-subscription three times.
 *
 * A module-level store fixes both: subscribers share one in-flight request and one
 * interval, so N components cost ONE poll, and a status change lands within a
 * couple of minutes without anyone touching the page. The interval only ticks while
 * the tab is visible - a backgrounded tab must not poll a paid API forever, and the
 * existing visibility listener already re-checks the moment it comes back.
 */
const POLL_MS = 120_000;
type Snapshot = { loading: boolean } & Omit<MySubscriptionState, 'loading' | 'refresh'>;
let shared: Snapshot = { loading: true, ...EMPTY };
let inFlight: Promise<void> | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
const subscribers = new Set<(s: Snapshot) => void>();

function publish(next: Snapshot): void {
  shared = next;
  for (const fn of subscribers) fn(next);
}

function fetchShared(): Promise<void> {
  // Collapse concurrent callers onto one request (three mounts = one call).
  if (inFlight) return inFlight;
  inFlight = getMySubscription()
    .then((sub) => publish({ loading: false, ...derive(sub) }))
    .catch(() => publish({ loading: false, ...EMPTY }))
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export function useMySubscription(enabled = true): MySubscriptionState {
  const [state, setState] = useState<Omit<MySubscriptionState, 'refresh'>>({
    loading: enabled,
    ...EMPTY,
  });

  const check = useCallback(() => {
    void fetchShared();
  }, []);

  useEffect(() => {
    if (!enabled) {
      setState({ loading: false, ...EMPTY });
      return;
    }
    const onShared = (next: Snapshot) => setState(next);
    subscribers.add(onShared);
    // Adopt whatever the store already knows, then refresh.
    setState(shared);
    void fetchShared();

    const onFocus = () => check();
    const onVis = () => document.visibilityState === 'visible' && check();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    if (!timer) {
      timer = setInterval(() => {
        if (document.visibilityState === 'visible') void fetchShared();
      }, POLL_MS);
    }

    return () => {
      subscribers.delete(onShared);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
      // Last consumer leaves: stop polling rather than leak an interval per session.
      if (subscribers.size === 0 && timer) {
        clearInterval(timer);
        timer = null;
      }
    };
  }, [check, enabled]);

  return { ...state, refresh: () => (enabled ? check() : undefined) };
}
