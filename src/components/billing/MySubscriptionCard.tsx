'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Crown, Sparkles, Ticket } from 'lucide-react';
import { getMySubscription } from '@/lib/api/payments';
import type { MySubscriptionDto } from '@/shared/dto/payments.dto';
import { EntitlementScope, EntitlementSource, EntitlementSubject } from '@/shared/enums';
import { cn } from '@/lib/utils';

/**
 * Compact "My Subscription" card for the profile aside. Shows full-platform
 * status (with days left) or a count of active unlocks, and always links to
 * /upgrade. Fails silent - renders the upsell state if the fetch errors.
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
  const activeEnts = (sub?.entitlements ?? []).filter((e) => e.status === 'ACTIVE');
  const activeCount = activeEnts.length;
  const isPremium = (sub?.hasPlatform ?? false) || activeCount > 0;
  // Admin-granted (complimentary) access - shown so the student's own account
  // reflects the "Complimentary / Admin Granted" status, not just the admin console.
  // Purchase-dominant, mirroring the viaCollege rule below: a student who has
  // actually bought something is Premium, even if they ALSO hold a comp. Without
  // this, relabelling an unpaid grant as ADMIN_GRANT silently demotes the badge,
  // and a later real purchase would still read "Complimentary".
  const isComplimentary =
    !activeEnts.some((e) => e.source === EntitlementSource.PURCHASE) &&
    activeEnts.some((e) => e.source === EntitlementSource.ADMIN_GRANT);
  // Provided by the student's college rather than bought - labelled so they know
  // why they have it, and why there is nothing for them to renew. A student who
  // ALSO bought something keeps the Premium badge: telling a paying customer
  // their access is their institution's would be wrong, and misleading if the
  // college later drops a company they personally own.
  const viaCollege =
    activeEnts.some((e) => e.subjectType === EntitlementSubject.COLLEGE) &&
    !activeEnts.some((e) => e.subjectType === EntitlementSubject.USER);

  return (
    <div
      className={cn(
        'rounded-3xl border bg-white p-5 shadow-sm',
        isPremium ? 'border-[#ffc42d]/45 ring-1 ring-[#ffc42d]/10' : 'border-slate-200',
      )}
    >
      <h2 className="flex items-center gap-1.5 text-sm font-bold text-navy">
        <Ticket className="size-4 text-[#f5b400]" /> My subscription
        {viaCollege ? (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-sky-700 ring-1 ring-inset ring-sky-200">
            <Crown className="size-2.5" strokeWidth={2.75} /> Via your college
          </span>
        ) : isComplimentary ? (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-700 ring-1 ring-inset ring-emerald-200">
            <Crown className="size-2.5" strokeWidth={2.75} /> Complimentary
          </span>
        ) : isPremium ? (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#ffd24d] to-[#f5b400] px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#171717]">
            <Crown className="size-2.5" strokeWidth={2.75} /> Premium
          </span>
        ) : null}
      </h2>

      {!loaded ? (
        <div className="mt-3 h-14 animate-pulse rounded-xl bg-slate-100" />
      ) : sub?.hasPlatform ? (
        <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="flex items-center gap-1.5 text-sm font-extrabold text-navy">
            <Sparkles className="size-4 text-[#f5b400]" /> Full platform
          </p>
          <p className="mt-0.5 text-xs text-slate-600">
            {platform?.daysRemaining != null
              ? `${platform.daysRemaining} days remaining`
              : isComplimentary
                ? 'Lifetime access'
                : 'Active'}
            {isComplimentary ? ' · granted by admin' : ''}
          </p>
        </div>
      ) : activeCount > 0 ? (
        <p className="mt-2 text-xs leading-relaxed text-slate-600">
          You have <span className="font-bold text-navy">{activeCount}</span> active unlock
          {activeCount === 1 ? '' : 's'}. Go full-platform to open everything.
        </p>
      ) : (
        <p className="mt-2 text-xs leading-relaxed text-slate-600">
          You&apos;re on the free tier - the first 5 questions of any topic are on us.
        </p>
      )}

      <Link
        href="/upgrade"
        className="mt-3 flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-[#ffd24d] to-[#f5b400] px-4 py-2 text-xs font-extrabold text-[#171717] transition hover:brightness-105"
      >
        {sub?.hasPlatform ? 'Manage subscription' : 'Upgrade'} <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}
