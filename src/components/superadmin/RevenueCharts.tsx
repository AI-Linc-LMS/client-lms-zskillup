'use client';

import { useEffect, useState } from 'react';
import { CreditCard, IndianRupee, Loader2, TrendingUp, Users } from 'lucide-react';
import { getFinancialsOverview } from '@/lib/api/financials';
import type { FinancialsOverviewDto } from '@/shared/dto/financials.dto';
import { ReadinessDonut } from '@/components/charts/ReadinessDonut';

const PLAN_COLORS = ['#ffc42d', '#0284c7', '#7c3aed', '#059669', '#f59e0b', '#dc2626'];
const inr = (cents: number) => '₹' + Math.round(cents / 100).toLocaleString('en-IN');

function Kpi({ icon: Icon, label, value, tone }: { icon: typeof IndianRupee; label: string; value: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <Icon className={`size-5 ${tone}`} />
      <p className="mt-2 text-xl font-black tabular-nums text-navy">{value}</p>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-bold text-navy">{title}</h3>
      <div className="mt-4">{children}</div>
    </div>
  );
}

/** Revenue & subscription graphs (recharts donuts) — MRR by plan + subscription mix. */
export function RevenueCharts() {
  const [d, setD] = useState<FinancialsOverviewDto | null | 'err'>(null);

  useEffect(() => {
    getFinancialsOverview()
      .then(setD)
      .catch(() => setD('err'));
  }, []);

  if (d === null) {
    return (
      <div className="grid h-40 place-items-center rounded-2xl border border-slate-200 bg-white">
        <Loader2 className="size-6 animate-spin text-slate-300" />
      </div>
    );
  }
  if (d === 'err') return null;

  const planSegments = d.byPlan
    .map((p, i) => ({ label: p.planName, color: PLAN_COLORS[i % PLAN_COLORS.length], value: p.monthlyCents }))
    .sort((a, b) => b.value - a.value);
  const statusSegments = [
    { label: 'Paying', color: '#059669', value: d.payingSubscriptions },
    { label: 'Trials', color: '#0284c7', value: d.trials },
    { label: 'Expired', color: '#f59e0b', value: d.expired },
    { label: 'Cancelled', color: '#dc2626', value: d.cancelled },
  ];

  const hasRevenue = d.mrrCents > 0 || d.activeSubscriptions > 0;

  return (
    <section className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi icon={IndianRupee} label="MRR" value={inr(d.mrrCents)} tone="text-[#f5b400]" />
        <Kpi icon={TrendingUp} label="ARR" value={inr(d.arrCents)} tone="text-emerald-600" />
        <Kpi icon={CreditCard} label="Paying subs" value={d.payingSubscriptions.toLocaleString('en-IN')} tone="text-violet-600" />
        <Kpi icon={Users} label="Active subs" value={d.activeSubscriptions.toLocaleString('en-IN')} tone="text-sky-600" />
      </div>

      {hasRevenue ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card title="Monthly revenue by plan">
            {planSegments.length ? (
              <ReadinessDonut segments={planSegments} centerValue={inr(d.mrrCents)} centerLabel="MRR / mo" formatValue={(v) => inr(v)} />
            ) : (
              <p className="py-6 text-center text-sm text-slate-400">No priced plans active yet.</p>
            )}
          </Card>
          <Card title="Subscription mix">
            <ReadinessDonut segments={statusSegments} centerValue={d.activeSubscriptions.toLocaleString('en-IN')} centerLabel="Active" />
          </Card>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-400">
          No subscription revenue yet - charts appear once colleges or students are on paid plans.
        </div>
      )}
    </section>
  );
}
