'use client';

import { useEffect, useState } from 'react';
import { getMe } from '@/lib/api/me';
import { getFinancialsOverview } from '@/lib/api/financials';
import { formatMoney } from '@/lib/api/subscriptions';
import type { FinancialsOverviewDto } from '@/shared/dto/financials.dto';
import { CreditCard, IndianRupee, Loader2, Lock, TrendingUp, Users } from 'lucide-react';

/**
 * Why the projection reads what it reads.
 *
 * "MRR ₹0" is frequently CORRECT and still reads like a broken panel - it was
 * reported as "metrics not updating" when in fact every subscription on the
 * platform was cancelled, expired, on a ₹0 trial, or carried no priced plan at
 * all. A number nobody can explain gets escalated; a number that explains itself
 * does not. So this states the reason in the same words the data supports, and
 * only claims what the counts actually prove.
 */
function projectionReason(d: FinancialsOverviewDto): string {
  if (d.payingSubscriptions > 0) {
    const nr = d.nonRenewing ?? 0;
    const nonRenewingNote = nr
      ? ` ${nr} of them ${nr === 1 ? 'is' : 'are'} cancelled but still inside the paid period - non-renewing, so ${nr === 1 ? 'it keeps' : 'they keep'} earning until that date and then drop${nr === 1 ? 's' : ''} off.`
      : '';
    return `From ${d.payingSubscriptions} paying subscription${d.payingSubscriptions === 1 ? '' : 's'} on a priced plan.${nonRenewingNote} Trials and complimentary access contribute nothing by design.`;
  }
  const why: string[] = [];
  if (d.cancelled > 0) why.push(`${d.cancelled} cancelled`);
  if (d.expired > 0) why.push(`${d.expired} expired`);
  if (d.trials > 0) why.push(`${d.trials} on a free trial`);
  if (d.complimentary > 0) why.push(`${d.complimentary} with no priced plan attached (complimentary)`);
  const tail =
    d.cancelled > 0
      ? ' A cancelled subscription keeps earning until its paid period ends (non-renewing); these have all passed that date.'
      : '';
  return why.length
    ? `₹0 because no subscription is currently active, non-trial AND on a priced plan - ${why.join(', ')}.${tail}`
    : '₹0 because there are no subscriptions yet. This projects from college subscription plans; one-off student purchases appear under Collected (real).';
}

/**
 * Lightweight financial dashboard (Phase 7). MRR/ARR + plan mix derived from
 * subscriptions. Capability-gated (canViewFinancials via /me; SUPER_ADMIN implicit).
 */
export function FinancialsDashboard() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [data, setData] = useState<FinancialsOverviewDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      // Resolve capability first; a fetch failure here is an ERROR, not a denial.
      let me;
      try {
        me = await getMe();
      } catch {
        if (alive) setError('Could not verify your access. Please refresh.');
        return;
      }
      if (!alive) return;
      const can = me?.capabilities?.canViewFinancials ?? false;
      setAllowed(can);
      if (!can) return;
      try {
        const d = await getFinancialsOverview();
        if (alive) setData(d);
      } catch {
        if (alive) setError('Failed to load financials.');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Error takes precedence over the capability gate so a network/backend failure
  // never masquerades as "no permission".
  if (error) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }
  if (allowed === null) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16">
        <Loader2 className="size-6 animate-spin text-slate-500" />
      </div>
    );
  }
  if (!allowed) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white py-16 text-center">
        <Lock className="size-8 text-slate-400" />
        <p className="max-w-sm text-sm text-slate-600">
          You don&apos;t have the <span className="font-semibold">View financials</span> capability.
          Ask a super-admin to grant it.
        </p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16">
        <Loader2 className="size-6 animate-spin text-slate-500" />
      </div>
    );
  }

  const cur = data.currency;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<TrendingUp className="size-5" />} label="MRR" value={formatMoney(data.mrrCents, cur)} accent="from-emerald-500 to-emerald-600" />
        <Kpi icon={<IndianRupee className="size-5" />} label="ARR" value={formatMoney(data.arrCents, cur)} accent="from-indigo-500 to-indigo-600" />
        <Kpi icon={<CreditCard className="size-5" />} label="Booked value" value={formatMoney(data.bookedValueCents, cur)} accent="from-orange-500 to-orange-600" />
        <Kpi icon={<Users className="size-5" />} label="Paying colleges" value={String(data.payingSubscriptions)} accent="from-slate-600 to-slate-700" />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MiniStat label="Active" value={data.activeSubscriptions} />
        <MiniStat label="Trials" value={data.trials} />
        <MiniStat label="Expired" value={data.expired} />
        <MiniStat label="Cancelled" value={data.cancelled} />
      </div>

      <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-600">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Why this number
        </span>
        <span className="mt-1 block">{projectionReason(data)}</span>
      </p>

      <p className="text-sm text-slate-600">
        <span className="font-semibold text-navy">{data.newActivations30d}</span> paying activation
        {data.newActivations30d === 1 ? '' : 's'} in the last 30 days.
      </p>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-bold text-navy">Revenue by plan</h2>
        </div>
        {data.byPlan.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-500">
            No paying subscriptions yet.
            <span className="mt-1 block text-xs text-slate-400">
              A subscription appears here once it is active, non-trial and linked to a plan with a
              price. Access granted without a priced plan is counted as complimentary and earns
              nothing.
            </span>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              <tr>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3 text-right">Active</th>
                <th className="px-4 py-3 text-right">MRR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.byPlan.map((p) => (
                <tr key={p.planId ?? p.planName} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-navy">{p.planName}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">{p.activeCount}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">{formatMoney(p.monthlyCents, cur)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-slate-500">
        Lightweight estimate derived from plan prices × active subscriptions. MRR normalises dated
        plans to 30 days; perpetual plans count toward booked value only. Not a billing system.
      </p>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <span className={`inline-flex size-9 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white`}>
        {icon}
      </span>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black tracking-tight text-navy">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-center">
      <p className="text-lg font-extrabold text-navy tabular-nums">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{label}</p>
    </div>
  );
}
