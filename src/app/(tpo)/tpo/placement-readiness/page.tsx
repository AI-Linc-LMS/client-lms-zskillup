'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2, TrendingUp, Trophy } from 'lucide-react';
import { getTpoAnalytics, getTpoReadinessTrend } from '@/lib/api/tpo';
import type { TpoDashboard, TpoReadinessTrend } from '@/shared';
import { useTpoConsole } from '@/components/tpo/TpoConsole';
import { BentoCard } from '@/components/tpo/ui';
import { PlacementOutcomes } from '@/components/tpo/PlacementOutcomes';
import { AreaChart, Donut } from '@/components/superadmin/dashboard-ui';

const BANDS = [
  { label: 'Ready (70+)', color: '#059669', test: (r: number) => r >= 70 },
  { label: 'Near ready (55–69)', color: '#0284c7', test: (r: number) => r >= 55 && r < 70 },
  { label: 'Developing (40–54)', color: '#f59e0b', test: (r: number) => r >= 40 && r < 55 },
  { label: 'At risk (<40)', color: '#dc2626', test: (r: number) => r < 40 },
] as const;

const MEDAL = ['bg-amber-100 text-amber-700', 'bg-slate-200 text-slate-600', 'bg-orange/15 text-[#1a1d29]'];

export default function PlacementReadinessPage() {
  const { cohortId, cohorts } = useTpoConsole();
  const [data, setData] = useState<TpoDashboard | null>(null);
  const [trend, setTrend] = useState<TpoReadinessTrend | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([getTpoAnalytics(cohortId || undefined), getTpoReadinessTrend(cohortId || undefined)])
      .then(([d, t]) => {
        setData(d);
        setTrend(t);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load placement readiness'))
      .finally(() => setLoading(false));
  }, [cohortId]);

  useEffect(() => {
    load();
  }, [load]);

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
        <Loader2 className="size-7 animate-spin text-slate-400" />
      </div>
    );
  }
  if (error) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>;
  }
  if (!data || data.overview.totalStudents === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
        No readiness data yet. Invite your cohort to get started.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm font-semibold text-slate-500">
        Placement readiness · <span className="text-navy">{cohortLabel}</span>
      </p>

      <div className="grid gap-5 lg:grid-cols-2">
        <BentoCard title="Overall Readiness" subtitle="Distribution across readiness bands." source="Aptitude + Coding + Mock + coverage">
          <div className="pt-1">
            <Donut segments={donutSegments} centerTop={data.overview.totalStudents.toLocaleString('en-IN')} centerBottom="Students" />
          </div>
        </BentoCard>

        <BentoCard title="Readiness Trend" subtitle="Average readiness over time (weekly snapshots)." source="Weekly readiness snapshots">
          {trend && trend.points.length >= 2 ? (
            <AreaChart
              id="readiness-trend"
              color="#f5b400"
              height={200}
              data={trend.points.map((p) => ({ date: p.date, count: p.avgReadiness }))}
            />
          ) : (
            <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-2 text-center">
              <TrendingUp className="size-8 text-slate-300" />
              <p className="text-sm font-semibold text-navy">Collecting history</p>
              <p className="max-w-xs text-xs text-slate-500">
                A snapshot of campus readiness is recorded each week. The trend line appears once a
                couple of weeks of data accrue.
              </p>
            </div>
          )}
        </BentoCard>
      </div>

      <BentoCard title="Top Performers" subtitle="Highest-readiness students in this scope." source="Overall readiness composite">
        <ul className="divide-y divide-slate-100">
          {topPerformers.map((s, i) => (
            <li key={s.id}>
              <Link href={`/tpo/students/${s.id}`} className="flex items-center justify-between gap-3 py-2.5 transition-colors hover:bg-slate-50">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`grid size-7 shrink-0 place-items-center rounded-lg text-xs font-black tabular-nums ${MEDAL[i] ?? 'bg-slate-100 text-slate-400'}`}>
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-navy">{s.name ?? s.email}</p>
                    <p className="truncate text-xs text-slate-400">{s.branch ?? '—'}{s.rollNumber ? ` · ${s.rollNumber}` : ''}</p>
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

      <p className="text-[11px] text-slate-400">
        &ldquo;Placement-ready&rdquo; reflects a readiness composite (aptitude, coding, mock &amp; coverage), not
        confirmed offers. Confirmed placement outcomes are tracked below.
      </p>

      <PlacementOutcomes cohortId={cohortId} students={data.students} />
    </div>
  );
}
