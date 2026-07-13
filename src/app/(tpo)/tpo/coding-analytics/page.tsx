'use client';

import { useCallback, useEffect, useState } from 'react';
import { Award, Code2, Loader2, Target, Users } from 'lucide-react';
import { getTpoCodingAnalytics } from '@/lib/api/tpo';
import type { TpoCodingAnalytics } from '@/shared';
import { useTpoConsole } from '@/components/tpo/TpoConsole';
import { BentoCard, KpiCard } from '@/components/tpo/ui';
import { Donut } from '@/components/superadmin/dashboard-ui';

const DIFF = [
  { key: 'easy', label: 'Easy', color: '#059669' },
  { key: 'medium', label: 'Medium', color: '#f5b400' },
  { key: 'hard', label: 'Hard', color: '#dc2626' },
] as const;

export default function CodingAnalyticsPage() {
  const { cohortId, cohorts } = useTpoConsole();
  const [data, setData] = useState<TpoCodingAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getTpoCodingAnalytics(cohortId || undefined)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load coding analytics'))
      .finally(() => setLoading(false));
  }, [cohortId]);

  useEffect(() => {
    load();
  }, [load]);

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
  if (!data) return null;

  const donutSegments = DIFF.map((d) => ({
    label: d.label,
    color: d.color,
    value: data.difficulty[d.key].solved,
  }));

  return (
    <div className="space-y-6">
      <p className="text-sm font-semibold text-slate-500">
        Coding analytics · <span className="text-navy">{cohortLabel}</span>
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Users} label="Active Coders" value={data.activeCoders} tone="sky" source="≥1 submission" />
        <KpiCard icon={Award} label="Problems Solved" value={data.totalSolved} tone="emerald" source="Distinct solved" />
        <KpiCard icon={Target} label="Solve Rate" value={`${data.solveRate}%`} tone="orange" source="Solved / attempted" />
        <KpiCard icon={Code2} label="Attempted" value={data.totalAttempted} tone="violet" source="Distinct attempted" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <BentoCard title="Difficulty Breakdown" subtitle="Solved problems by difficulty." source="Coding submissions × problem difficulty">
          {data.totalSolved === 0 ? (
            <p className="text-sm text-slate-400">No coding activity yet.</p>
          ) : (
            <div className="space-y-4">
              <Donut segments={donutSegments} centerTop={data.totalSolved} centerBottom="Solved" />
              <div className="space-y-2.5 border-t border-slate-100 pt-3">
                {DIFF.map((d) => {
                  const b = data.difficulty[d.key];
                  const rate = b.attempted > 0 ? Math.round((b.solved / b.attempted) * 100) : 0;
                  return (
                    <div key={d.key} className="flex items-center gap-3">
                      <span className="w-16 shrink-0 text-sm font-semibold" style={{ color: d.color }}>{d.label}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full" style={{ width: `${rate}%`, background: d.color }} />
                      </div>
                      <span className="w-24 text-right text-xs text-slate-500">
                        <span className="font-bold text-navy">{b.solved}</span>/{b.attempted} · {rate}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </BentoCard>

        <BentoCard title="Company-Tagged Performance" subtitle="Solve rate on each company's pattern problems." source="Coding submissions × company tags">
          {data.companies.length === 0 ? (
            <p className="text-sm text-slate-400">No company-tagged coding activity yet.</p>
          ) : (
            <div className="space-y-3">
              {data.companies.map((c) => (
                <div key={c.slug}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-semibold text-navy">{c.name}</span>
                    <span className="shrink-0 text-xs text-slate-500">
                      <span className="font-bold text-navy">{c.solveRate}%</span> · {c.solved}/{c.attempted}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#ffd24d] to-[#f5b400]" style={{ width: `${c.solveRate}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </BentoCard>
      </div>
    </div>
  );
}
