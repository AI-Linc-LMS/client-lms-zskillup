'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  CalendarClock,
  Clock,
  CreditCard,
  Layers,
  Loader2,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { getTpoBilling, type TpoBillingDto } from '@/lib/api/tpo';
import { formatPrice } from '@/lib/api/subscriptions';
import { EntitlementScope } from '@/shared/enums';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function fmtDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
}

function titleCase(s: string) {
  return s.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Human label for an entitlement / order scope. */
function scopeLabel(scopeType: EntitlementScope | null, scopeRef: string | null): string {
  if (scopeType === EntitlementScope.PLATFORM) return 'Full Platform';
  if (scopeType === EntitlementScope.COMPANY) return `${titleCase(scopeRef ?? 'Company')} - cohort access`;
  if (scopeType === EntitlementScope.SECTION) return `${titleCase(scopeRef ?? '')} section`;
  if (scopeType === EntitlementScope.TOPIC) return `${titleCase((scopeRef ?? '').split(':').pop() ?? '')} topic`;
  return scopeRef ? titleCase(scopeRef) : 'Purchase';
}

const ENT_STATUS: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  EXPIRED: 'bg-slate-100 text-slate-600 ring-slate-200',
  CANCELLED: 'bg-slate-100 text-slate-500 ring-slate-200',
};

const ORDER_STATUS: Record<string, string> = {
  PAID: 'bg-emerald-50 text-emerald-700',
  CREATED: 'bg-amber-50 text-amber-700',
  FAILED: 'bg-rose-50 text-rose-700',
  REFUNDED: 'bg-slate-100 text-slate-600',
  EXPIRED: 'bg-slate-100 text-slate-600',
};

export default function SubscriptionPage() {
  const [data, setData] = useState<TpoBillingDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTpoBilling()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load billing'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-7 animate-spin text-slate-500" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error ?? 'Failed to load billing'}
      </div>
    );
  }

  const { subscription: sub, entitlements, history } = data;
  const activeEnts = entitlements.filter((e) => e.status === 'ACTIVE');
  const nothing = !sub && activeEnts.length === 0 && history.length === 0;

  return (
    <div className="space-y-6">
      <ConsoleHero
        icon={Wallet}
        eyebrow="Placement Office"
        title="Subscription & Billing"
        description="Your college's plan, active cohort access and payment history. Cohort access unlocks a company's question bank for every student in your college."
        actions={
          <Link
            href="/tpo/billing"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-white/15 transition hover:bg-white/15"
          >
            <CreditCard className="size-4" /> Manage access
          </Link>
        }
      />

      {nothing ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#fff5ea] text-[#f5b400]">
            <CreditCard className="size-6" />
          </span>
          <h2 className="mt-4 text-lg font-extrabold text-navy">No active subscription</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
            Your college doesn&apos;t have an active plan or cohort access yet. Explore Cohort Access to
            unlock company question banks for your students.
          </p>
          <Button asChild className="mt-4">
            <Link href="/tpo/billing">Browse Cohort Access</Link>
          </Button>
        </div>
      ) : (
        <>
          {/* Platform plan (only when an admin has assigned one) */}
          {sub ? <PlanCard sub={sub} /> : null}

          {/* Active cohort access - inherited by every student in the college */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-500">
                <Layers className="size-4" /> Active access
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                <ShieldCheck className="size-3" /> Every student in your college inherits this
              </span>
            </div>
            {activeEnts.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                No active cohort access yet. Buy a company&apos;s bank from{' '}
                <Link href="/tpo/billing" className="font-semibold text-[#a16207] hover:underline">
                  Cohort Access
                </Link>
                .
              </p>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {activeEnts.map((e) => (
                  <div key={e.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-2">
                      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[#fff5ea] text-[#f5b400]">
                        <Building2 className="size-4" />
                      </span>
                      <p className="min-w-0 flex-1 truncate text-sm font-bold text-navy">
                        {scopeLabel(e.scopeType, e.scopeRef)}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset',
                          ENT_STATUS[e.status] ?? ENT_STATUS.ACTIVE,
                        )}
                      >
                        {e.status}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {e.expiresAt ? `${e.daysRemaining ?? 0}d left · ${fmtDate(e.expiresAt)}` : 'No expiry'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Payment history */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-500">
              <Clock className="size-4" /> Payment history
            </h2>
            {history.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No payments yet.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="pb-2">Item</th>
                      <th className="pb-2">Billing</th>
                      <th className="pb-2 text-right">Amount</th>
                      <th className="pb-2 text-right">Status</th>
                      <th className="pb-2 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {history.map((h) => (
                      <tr key={h.orderId}>
                        <td className="py-2.5 font-semibold text-navy">{scopeLabel(h.scopeType, h.scopeRef)}</td>
                        <td className="py-2.5 capitalize text-slate-600">
                          {h.period ? h.period.toLowerCase() : 'one-time'}
                        </td>
                        <td className="py-2.5 text-right tabular-nums text-navy">
                          {formatPrice(h.amountCents, h.currency)}
                        </td>
                        <td className="py-2.5 text-right">
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[11px] font-bold',
                              ORDER_STATUS[h.status] ?? 'bg-slate-100 text-slate-600',
                            )}
                          >
                            {h.status === 'CREATED' ? 'Pending' : h.status.charAt(0) + h.status.slice(1).toLowerCase()}
                          </span>
                        </td>
                        <td className="py-2.5 text-right tabular-nums text-slate-600">
                          {new Date(h.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: '2-digit',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function PlanCard({ sub }: { sub: NonNullable<TpoBillingDto['subscription']> }) {
  const seatPct = sub.seatLimit > 0 ? Math.min(100, Math.round((sub.seatsUsed / sub.seatLimit) * 100)) : 0;
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          <CreditCard className="size-3.5" /> Plan
        </span>
        <p className="mt-2 text-lg font-black text-navy">{sub.planName}</p>
        <p className="text-xs text-slate-500">
          {sub.status}
          {sub.isTrial ? ' · Trial' : ''}
        </p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          <Users className="size-3.5" /> Seats
        </span>
        <p className="mt-2 text-2xl font-black tabular-nums text-navy">
          {sub.seatsUsed.toLocaleString('en-IN')}{' '}
          <span className="text-base font-semibold text-slate-500">/ {sub.seatLimit.toLocaleString('en-IN')}</span>
        </p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${seatPct >= 90 ? 'bg-red-500' : 'bg-navy'}`}
            style={{ width: `${seatPct}%` }}
          />
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          <CalendarClock className="size-3.5" /> Validity
        </span>
        <p className="mt-2 text-sm font-bold text-navy">{fmtDate(sub.startsAt)}</p>
        <p className="text-xs text-slate-500">to {sub.expiresAt ? fmtDate(sub.expiresAt) : 'no expiry'}</p>
      </div>
    </div>
  );
}
