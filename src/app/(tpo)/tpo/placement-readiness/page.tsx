'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2, Trophy } from 'lucide-react';
import { getTpoAnalytics, getTpoReadinessTrend } from '@/lib/api/tpo';
import type { TpoDashboard, TpoReadinessTrend } from '@/shared';
import { useTpoConsole } from '@/components/tpo/TpoConsole';
import { BentoCard } from '@/components/tpo/ui';
import { PlacementOutcomes } from '@/components/tpo/PlacementOutcomes';
import { Donut } from '@/components/superadmin/dashboard-ui';
import { ReadinessTrendChart } from '@/components/tpo/ReadinessTrendChart';
import { ConsoleHero } from '@/components/layout/ConsoleHero';

const BANDS = [
  { label: 'Ready (70+)', color: '#059669', test: (r: number) => r >= 70 },
  { label: 'Near ready (55–69)', color: '#0284c7', test: (r: number) => r >= 55 && r < 70 },
  { label: 'Developing (40–54)', color: '#f59e0b', test: (r: number) => r >= 40 && r < 55 },
  { label: 'At risk (<40)', color: '#dc2626', test: (r: number) => r < 40 },
] as const;

const MEDAL = ['bg-amber-100 text-amber-700', 'bg-slate-200 text-slate-600', 'bg-orange/15 text-[#1a1a1a]'];

export default function PlacementReadinessPage() {
  const { cohortId, cohorts } = useTpoConsole();
  const [data, setData] = useState<TpoDashboard | null>(null);
  const [trend, setTrend] = useState<TpoReadinessTrend | null>(null);
  const [trendLoading, setTrendLoading] = useState(true);
  // A malformed range is now a 400 from the server rather than a silent fallback to
  // the default window, so the page has to say so instead of drawing the wrong dates.
  const [trendError, setTrendError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Readiness-trend date range (#4). Empty = backend default (last 5 days, dynamic).
  const [range, setRange] = useState<{ from: string; to: string }>({ from: '', to: '' });

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getTpoAnalytics(cohortId || undefined)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load placement readiness'))
      .finally(() => setLoading(false));
  }, [cohortId]);

  useEffect(() => {
    load();
  }, [load]);

  // The trend refetches on its own when the cohort or the date range changes, so
  // adjusting dates never reloads the whole page.
  useEffect(() => {
    let alive = true;
    setTrendLoading(true);
    setTrendError(null);
    getTpoReadinessTrend(cohortId || undefined, {
      from: range.from || undefined,
      to: range.to || undefined,
    })
      .then((t) => alive && setTrend(t))
      .catch((e) => {
        if (!alive) return;
        setTrend(null);
        setTrendError(
          e instanceof Error ? e.message : 'Could not load the readiness trend for that range.',
        );
      })
      .finally(() => alive && setTrendLoading(false));
    return () => {
      alive = false;
    };
  }, [cohortId, range.from, range.to]);

  const donutSegments = useMemo(() => {
    const students = data?.students ?? [];
    return BANDS.map((b) => ({ label: b.label, color: b.color, value: students.filter((s) => b.test(s.readiness)).length }));
  }, [data]);

  const topPerformers = useMemo(
    () => [...(data?.students ?? [])].sort((a, b) => b.readiness - a.readiness).slice(0, 10),
    [data],
  );

  const cohortLabel = cohortId ? cohorts.find((c) => c.id === cohortId)?.name ?? 'Batch' : 'All batches';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-7 animate-spin text-slate-500" />
      </div>
    );
  }
  if (error) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>;
  }
  if (!data || data.overview.totalStudents === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-600">
        No readiness data yet. Invite your cohort to get started.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ConsoleHero
        icon={Trophy}
        eyebrow="Placement Office"
        title="Placement Readiness"
        description="Readiness distribution across bands, the weekly trend, and your top performers in this scope."
        actions={
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/80 ring-1 ring-inset ring-white/15">
            {cohortLabel}
          </span>
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <BentoCard title="Overall Readiness" subtitle="Distribution across readiness bands." source="Aptitude + Coding + Mock + coverage">
          <div className="pt-1">
            <Donut segments={donutSegments} centerTop={data.overview.totalStudents.toLocaleString('en-IN')} centerBottom="Students" />
          </div>
        </BentoCard>

        <BentoCard
          title="Readiness Trend"
          subtitle="Average readiness for every date in the selected range - defaults to the last 5 days."
          source="Daily readiness snapshots"
        >
          <div className="mb-3 flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              From
              <input
                type="date"
                value={range.from}
                max={range.to || undefined}
                onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-navy focus:border-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
              />
            </label>
            <label className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              To
              <input
                type="date"
                value={range.to}
                min={range.from || undefined}
                onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-navy focus:border-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
              />
            </label>
            {range.from || range.to ? (
              <button
                type="button"
                onClick={() => setRange({ from: '', to: '' })}
                className="h-9 rounded-lg px-2.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-navy"
              >
                Reset to last 5 days
              </button>
            ) : (
              <span className="pb-2 text-xs text-slate-400">Showing the last 5 days</span>
            )}
          </div>
          {trendError ? (
            <div
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200"
            >
              {trendError}
            </div>
          ) : trendLoading || !trend ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <Loader2 className="size-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <ReadinessTrendChart trend={trend} />
          )}
        </BentoCard>
      </div>

      <BentoCard title="Top Performers" subtitle="Highest-readiness students in this scope." source="Overall readiness composite">
        <ul className="divide-y divide-slate-100">
          {topPerformers.map((s, i) => (
            <li key={s.id}>
              <Link href={`/tpo/students/${s.id}`} className="flex items-center justify-between gap-3 py-2.5 transition-colors hover:bg-slate-50">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`grid size-7 shrink-0 place-items-center rounded-lg text-xs font-black tabular-nums ${MEDAL[i] ?? 'bg-slate-100 text-slate-500'}`}>
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-navy">{s.name ?? s.email}</p>
                    <p className="truncate text-xs text-slate-500">{s.branch ?? '-'}{s.rollNumber ? ` · ${s.rollNumber}` : ''}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${s.readiness}%` }} />
                  </div>
                  <span className="w-10 text-right text-sm font-bold tabular-nums text-navy">{s.readiness}%</span>
                  <Trophy className="size-4 text-amber-400" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </BentoCard>

      <p className="text-[11px] text-slate-500">
        &ldquo;Placement-ready&rdquo; reflects a readiness composite (aptitude, coding, mock &amp; coverage), not
        confirmed offers. Confirmed placement outcomes are tracked below.
      </p>

      <PlacementOutcomes cohortId={cohortId} students={data.students} />
    </div>
  );
}
