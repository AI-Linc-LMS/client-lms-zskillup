'use client';

import Link from 'next/link';
import { Brain, Lock } from 'lucide-react';
import { moduleSubscriptionLocked, useMySubscription } from '@/hooks/useMySubscription';

/**
 * Plan-aware access chip for the Mock Assessment hero.
 *
 * Mock assessments are PAID-ONLY - there is no free mock. Access is gated on
 * FULL-PLATFORM or COMPANY entitlement (careerToolsEntitled), NOT on owning any
 * scope (a Topic/Section-only owner is NOT mock-eligible). When the paywall is on
 * and the student is not entitled we show an up-front LOCK that links to /shop,
 * rather than advertising an attempt they can't make. Fails OPEN: paywall off /
 * still loading / entitled -> positive state.
 */
export function MockAllowanceChip() {
  const { careerToolsEntitled, sub } = useMySubscription(true);
  const locked = moduleSubscriptionLocked(sub, 'mock') && !careerToolsEntitled;

  if (locked) {
    return (
      <Link
        href="/shop"
        className="inline-flex items-center gap-2 rounded-xl border border-orange/30 bg-orange/10 px-4 py-3 text-sm font-semibold text-white/80 transition-colors hover:bg-orange/15"
      >
        <Lock className="size-4 text-orange" /> Upgrade to attempt mocks
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
      <Brain className="size-4 text-white/40" /> Unlimited attempts
    </div>
  );
}
