'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  IndianRupee,
  Loader2,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';
import { getFinancialsPayments } from '@/lib/api/financials';
import { formatPrice } from '@/lib/api/subscriptions';
import type { FinancialsPaymentsDto } from '@/shared/dto/financials.dto';
import { StatCard, Panel, ProgressRow } from '@/components/superadmin/dashboard-ui';

type Preset = 'month' | 'last-month' | 'year' | 'all' | 'custom';

const PRESETS: { key: Preset; label: string }[] = [
  { key: 'month', label: 'This month' },
  { key: 'last-month', label: 'Last month' },
  { key: 'year', label: 'This year' },
  { key: 'all', label: 'All time' },
  { key: 'custom', label: 'Custom' },
];

/** Resolve a preset to an ISO {from,to}; undefined lets the backend default to month. */
function resolveRange(preset: Preset, customFrom: string, customTo: string): { from?: string; to?: string } {
  const now = new Date();
  const iso = (d: Date) => d.toISOString();
  switch (preset) {
    case 'month':
      return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(now) };
    case 'last-month':
      return {
        from: iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        to: iso(new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)),
      };
    case 'year':
      return { from: iso(new Date(now.getFullYear(), 0, 1)), to: iso(now) };
    case 'all':
      return { from: '2000-01-01T00:00:00.000Z', to: iso(now) };
    case 'custom':
      return {
        from: customFrom ? new Date(customFrom).toISOString() : undefined,
        to: customTo ? new Date(`${customTo}T23:59:59`).toISOString() : undefined,
      };
  }
}

function fmtRange(from: string, to: string) {
  const f = new Date(from).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const t = new Date(to).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${f} – ${t}`;
}

export function FinancialsPaymentsBoard() {
  const [data, setData] = useState<FinancialsPaymentsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState<Preset>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const range = useMemo(() => resolveRange(preset, customFrom, customTo), [preset, customFrom, customTo]);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getFinancialsPayments(range)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load financials'))
      .finally(() => setLoading(false));
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  const scopeMax = Math.max(1, ...(data?.rangeRevenueByScope ?? []).map((s) => s.amountCents));
  const collegeMax = Math.max(1, ...(data?.revenueByCollege ?? []).map((c) => c.amountCents));

  return (
    <div className="space-y-5">
      {/* Date filter */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm">
        <span className="flex items-center gap-1.5 px-1 text-xs font-semibold text-slate-500">
          <CalendarClock className="size-4 text-slate-400" /> Period
        </span>
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPreset(p.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              preset === p.key ? 'bg-navy text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {p.label}
          </button>
        ))}
        {preset === 'custom' && (
          <span className="flex items-center gap-2">
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs" />
            <span className="text-slate-400">→</span>
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs" />
          </span>
        )}
        {data && (
          <span className="ml-auto text-[11px] text-slate-400">{fmtRange(data.rangeFrom, data.rangeTo)}</span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-slate-400" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>
      ) : data ? (
        <>
          {/* Range KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Revenue (period)" value={formatPrice(data.rangeRevenueCents, data.currency)} icon={<IndianRupee className="size-4" />} accent="#059669" />
            <StatCard label="Successful (period)" value={data.rangeSuccessfulPayments} icon={<CheckCircle2 className="size-4" />} accent="#2563eb" />
            <StatCard label="Failed (period)" value={data.rangeFailedPayments} icon={<XCircle className="size-4" />} accent="#dc2626" />
            <StatCard label="Pending (period)" value={data.rangePendingPayments} icon={<AlertTriangle className="size-4" />} accent="#f59e0b" />
          </div>

          {/* Always-current KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label="This month" value={formatPrice(data.monthlyRevenueCents, data.currency)} icon={<IndianRupee className="size-4" />} accent="#f37021" />
            <StatCard label="This year" value={formatPrice(data.annualRevenueCents, data.currency)} icon={<TrendingUp className="size-4" />} accent="#f37021" />
            <StatCard label="Lifetime" value={formatPrice(data.lifetimeRevenueCents, data.currency)} icon={<IndianRupee className="size-4" />} accent="#1e3a8a" />
            <StatCard label="Active subscriptions" value={data.activeEntitlements} sub={`${data.activeSubscribers} subscribers`} icon={<Users className="size-4" />} accent="#2563eb" />
            <StatCard label="Expiring ≤ 7 days" value={data.expiringSoon} icon={<CalendarClock className="size-4" />} accent="#dc2626" />
          </div>

          {/* Breakdowns */}
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Revenue by product (B2C, period)">
              {data.rangeRevenueByScope.length === 0 ? (
                <p className="text-sm text-slate-400">No captured B2C revenue in this period.</p>
              ) : (
                <div className="space-y-3">
                  {data.rangeRevenueByScope.map((s) => (
                    <ProgressRow
                      key={s.scope}
                      label={`${s.scope} (${s.count})`}
                      value={s.amountCents}
                      total={scopeMax}
                      color="#059669"
                      hint={formatPrice(s.amountCents, data.currency)}
                    />
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Revenue by college (B2B)">
              <p className="mb-3 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-700">
                Booked plan value — college checkout isn&apos;t live yet, so this is contracted, not collected.
              </p>
              {data.revenueByCollege.length === 0 ? (
                <p className="text-sm text-slate-400">No active college subscriptions.</p>
              ) : (
                <div className="space-y-3">
                  {data.revenueByCollege.map((c) => (
                    <ProgressRow
                      key={c.collegeId}
                      label={`${c.collegeName} (${c.subscriptions})`}
                      value={c.amountCents}
                      total={collegeMax}
                      color="#1e3a8a"
                      hint={formatPrice(c.amountCents, data.currency)}
                    />
                  ))}
                </div>
              )}
            </Panel>
          </div>

          <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Building2 className="size-3.5" /> &ldquo;Period&rdquo; figures follow the date filter above; month/year/lifetime and
            subscription counts are always current.
          </p>
        </>
      ) : null}
    </div>
  );
}
