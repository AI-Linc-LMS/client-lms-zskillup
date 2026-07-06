'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, Ticket } from 'lucide-react';
import { getMySubscription } from '@/lib/api/payments';
import type { MySubscriptionDto } from '@/shared/dto/payments.dto';
import { EntitlementScope } from '@/shared/enums';

/**
 * Compact "My Subscription" card for the profile aside. Shows full-platform
 * status (with days left) or a count of active unlocks, and always links to
 * /upgrade. Fails silent — renders the upsell state if the fetch errors.
 */
export function MySubscriptionCard() {
  const [sub, setSub] = useState<MySubscriptionDto | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMySubscription()
      .then((s) => !cancelled && setSub(s))
      .catch(() => {})
      .finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const platform = sub?.entitlements.find(
    (e) => e.scopeType === EntitlementScope.PLATFORM && e.status === 'ACTIVE',
  );
  const activeCount = (sub?.entitlements ?? []).filter((e) => e.status === 'ACTIVE').length;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-1.5 text-sm font-bold text-navy">
        <Ticket className="size-4 text-orange" /> My subscription
      </h2>

      {!loaded ? (
        <div className="mt-3 h-14 animate-pulse rounded-xl bg-slate-100" />
      ) : sub?.hasPlatform ? (
        <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="flex items-center gap-1.5 text-sm font-extrabold text-navy">
            <Sparkles className="size-4 text-orange" /> Full platform
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {platform?.daysRemaining != null ? `${platform.daysRemaining} days remaining` : 'Active'}
          </p>
        </div>
      ) : activeCount > 0 ? (
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          You have <span className="font-bold text-navy">{activeCount}</span> active unlock
          {activeCount === 1 ? '' : 's'}. Go full-platform to open everything.
        </p>
      ) : (
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          You&apos;re on the free tier — the first 5 questions of any topic are on us.
        </p>
      )}

      <Link
        href="/upgrade"
        className="mt-3 flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-[#f7a14e] to-[#f37021] px-4 py-2 text-xs font-extrabold text-white shadow-[0_10px_24px_-12px_rgba(243,112,33,0.8)]"
      >
        {sub?.hasPlatform ? 'Manage subscription' : 'Upgrade'} <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}
