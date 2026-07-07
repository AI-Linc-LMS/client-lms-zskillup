'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarClock, RefreshCw } from 'lucide-react';
import { getMySubscription } from '@/lib/api/payments';
import type { MySubscriptionDto } from '@/shared/dto/payments.dto';
import { EntitlementScope } from '@/shared/enums';
import { cn } from '@/lib/utils';

/**
 * Compact "subscription validity" card for the dashboard right rail (above the
 * skill profile). Shows how many days the full-platform plan is valid for, and
 * turns amber with a Renew link in the final week. Renders nothing for students
 * with no active platform plan, to keep the rail uncluttered.
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

  const platform = sub?.entitlements.find(
    (e) => e.scopeType === EntitlementScope.PLATFORM && e.status === 'ACTIVE',
  );
  const days = platform?.daysRemaining ?? null;

  // Nothing to show until we know, and hide entirely for free-tier students.
  if (!loaded || days == null) return null;

  const urgent = days <= 7;

  return (
    <div
      className={cn(
        'rounded-3xl border p-4 shadow-sm',
        urgent ? 'border-amber-300 bg-amber-50/70' : 'border-slate-200 bg-white',
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'grid size-10 shrink-0 place-items-center rounded-2xl',
            urgent ? 'bg-amber-100 text-amber-600' : 'bg-emerald-50 text-emerald-600',
          )}
        >
          <CalendarClock className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Subscription</p>
          <p className="text-sm font-black text-navy">
            Valid for {days} day{days === 1 ? '' : 's'}
          </p>
        </div>
      </div>
      {urgent && (
        <Link
          href="/upgrade"
          className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-orange px-3 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-orange/90"
        >
          <RefreshCw className="size-3.5" /> Renew to keep full access
        </Link>
      )}
    </div>
  );
}
