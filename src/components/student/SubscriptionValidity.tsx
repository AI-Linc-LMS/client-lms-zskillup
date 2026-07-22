'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  Crown,
  Layers,
  RefreshCw,
  Sparkles,
  Target,
} from 'lucide-react';
import { getMySubscription } from '@/lib/api/payments';
import type { MySubscriptionDto } from '@/shared/dto/payments.dto';
import { entitlementLabel } from '@/lib/payments/entitlement-links';
import { EntitlementScope } from '@/shared/enums';
import { cn } from '@/lib/utils';

function scopeIcon(s: EntitlementScope) {
  if (s === EntitlementScope.PLATFORM) return Sparkles;
  if (s === EntitlementScope.SECTION) return Layers;
  if (s === EntitlementScope.COMPANY) return Building2;
  return Target;
}

/** "5 Aug"-style short date for an expiry timestamp. */
const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : null;

/**
 * Subscriptions card for the dashboard right rail (above the skill profile).
 * Lists every active plan with the time left + expiry date, and in the final
 * week surfaces a renewal nudge - the in-app companion to the SUBSCRIPTION
 * notification the backend materialises a week before each plan ends. Renders
 * nothing for free-tier students, to keep the rail uncluttered.
 */
export function SubscriptionValidity() {
  const [sub, setSub] = useState<MySubscriptionDto | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    getMySubscription()
      .then((s) => alive && setSub(s))
      .catch(() => {})
      .finally(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, []);

  if (!loaded || !sub) return null;

  // Soonest-expiring first; perpetual (null) plans sink to the bottom.
  const active = sub.entitlements
    .filter((e) => e.status === 'ACTIVE')
    .sort((a, b) => (a.daysRemaining ?? Infinity) - (b.daysRemaining ?? Infinity));

  if (active.length === 0) return null; // free tier - nothing to show

  const expiring = active.filter((e) => e.daysRemaining != null && e.daysRemaining <= 7);
  const shown = active.slice(0, 4);
  const extra = active.length - shown.length;

  return (
    <div className="overflow-hidden rounded-3xl border border-[#ffc42d]/45 bg-white shadow-sm ring-1 ring-[#ffc42d]/10">
      {/* Premium banner - this card only renders for paying members, so it doubles
          as the dashboard's Premium status marker. */}
      <div className="flex items-center gap-2 bg-gradient-to-r from-[#fff6e0] via-[#fffaf0] to-white px-4 py-2.5">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#ffd24d] to-[#f5b400] text-[#171717] shadow-[0_2px_8px_-2px_rgba(245,180,0,0.7)]">
          <Crown className="size-3.5" strokeWidth={2.5} />
        </span>
        <span className="text-[11px] font-black uppercase tracking-wider text-[#a16207]">Premium member</span>
        <span className="ml-auto hidden text-[10px] font-semibold text-[#a16207]/80 sm:inline">
          Enjoying Premium benefits
        </span>
      </div>

      <div className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-black text-navy">
          <CalendarClock className="size-4 text-[#f5b400]" /> Your subscriptions
        </h2>
        <Link href="/upgrade" className="text-[11px] font-bold text-[#a16207] hover:underline">
          Manage →
        </Link>
      </div>

      {/* Renewal nudge - the in-app reminder shown in a plan's final week. */}
      {expiring.length > 0 && (
        <div className="mb-3 rounded-2xl border border-amber-300 bg-amber-50/80 p-3">
          <p className="flex items-start gap-2 text-xs font-semibold text-amber-800">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span>
              {expiring.length === 1
                ? `${entitlementLabel(expiring[0].scopeType, expiring[0].scopeRef)} ends in ${expiring[0].daysRemaining} day${expiring[0].daysRemaining === 1 ? '' : 's'}.`
                : `${expiring.length} plans expire within a week.`}
            </span>
          </p>
          <Link
            href="/upgrade"
            className="mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-orange px-3 py-1.5 text-xs font-bold text-[#171717] transition-colors hover:bg-orange/90"
          >
            <RefreshCw className="size-3.5" /> Renew now
          </Link>
        </div>
      )}

      <ul className="space-y-1.5">
        {shown.map((e) => {
          const Icon = scopeIcon(e.scopeType);
          const urgent = e.daysRemaining != null && e.daysRemaining <= 7;
          const date = fmtDate(e.expiresAt);
          return (
            <li key={e.id} className="flex items-center gap-2.5 rounded-xl border border-slate-100 px-2.5 py-2">
              <span
                className={cn(
                  'grid size-7 shrink-0 place-items-center rounded-lg',
                  urgent ? 'bg-amber-100 text-amber-600' : 'bg-[#fff5ea] text-[#f5b400]',
                )}
              >
                <Icon className="size-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-navy">
                  {entitlementLabel(e.scopeType, e.scopeRef)}
                </span>
                <span className={cn('text-[11px]', urgent ? 'font-semibold text-amber-600' : 'text-slate-500')}>
                  {e.daysRemaining != null
                    ? `${e.daysRemaining} day${e.daysRemaining === 1 ? '' : 's'} left${date ? ` · ${date}` : ''}`
                    : 'Lifetime access'}
                </span>
              </span>
            </li>
          );
        })}
      </ul>

      {extra > 0 && (
        <Link
          href="/upgrade"
          className="mt-2 block text-center text-[11px] font-semibold text-slate-600 transition-colors hover:text-[#a16207]"
        >
          +{extra} more subscription{extra === 1 ? '' : 's'}
        </Link>
      )}
      </div>
    </div>
  );
}
