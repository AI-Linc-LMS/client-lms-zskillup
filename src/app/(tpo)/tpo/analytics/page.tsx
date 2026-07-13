'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, ArrowRight, GraduationCap, Loader2, Sparkles, TrendingUp } from 'lucide-react';
import { getTpoAnalytics, getTpoRecommendations } from '@/lib/api/tpo';
import type { TpoDashboard, TpoRecommendation, TpoRecommendations } from '@/shared';
import { useTpoConsole } from '@/components/tpo/TpoConsole';
import { BentoCard, Quad, ReadinessBadge } from '@/components/tpo/ui';
import { QuadrantScatter } from '@/components/tpo/QuadrantScatter';
import { StudentDrawer } from '@/components/tpo/StudentDrawer';

const PART_HIGH = 15;
const PERF_HIGH = 50;

const PERF_WEIGHTS = [
  { label: 'Practice accuracy', weight: 35 },
  { label: 'Mock tests', weight: 30 },
  { label: 'Coding', weight: 20 },
  { label: 'Topic coverage', weight: 15 },
];

export default function StudentAnalyticsPage() {
  const { cohortId, cohorts } = useTpoConsole();
  const [data, setData] = useState<TpoDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [recs, setRecs] = useState<TpoRecommendations | null>(null);
  const [recsLoading, setRecsLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getTpoAnalytics(cohortId || undefined)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load analytics'))
      .finally(() => setLoading(false));
  }, [cohortId]);

  useEffect(() => {
    load();
  }, [load]);

  // Recommendations load independently so they never block the analytics render.
  useEffect(() => {
    let cancelled = false;
    setRecsLoading(true);
    setRecs(null);
    getTpoRecommendations(cohortId || undefined)
      .then((r) => !cancelled && setRecs(r))
      .catch(() => !cancelled && setRecs(null))
      .finally(() => !cancelled && setRecsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [cohortId]);

  const departments = useMemo(() => {
    const map = new Map<string, { count: number; partSum: number; readySum: number }>();
    for (const s of data?.students ?? []) {
      const key = s.branch?.trim() || 'Unspecified';
      const e = map.get(key) ?? { count: 0, partSum: 0, readySum: 0 };
      e.count += 1;
      e.partSum += s.participation;
      e.readySum += s.readiness;
      map.set(key, e);
    }
    return [...map.entries()]
      .map(([branch, e]) => ({
        branch,
        count: e.count,
        avgParticipation: Math.round(e.partSum / e.count),
        avgReadiness: Math.round(e.readySum / e.count),
      }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  const needsSupport = useMemo(
    () =>
      (data?.students ?? [])
        .filter((s) => s.participation >= PART_HIGH && s.readiness < PERF_HIGH)
        .sort((a, b) => a.readiness - b.readiness)
        .slice(0, 8),
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
  if (!data || data.students.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-600">
        No student activity to analyse yet. Invite your cohort to populate this view.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm font-semibold text-slate-600">
        Performance &amp; participation · <span className="text-navy">{cohortLabel}</span>
      </p>

      {/* Scatter */}
      <BentoCard
        title="Performance & Participation Map"
        subtitle="Each dot is a student. Click to drill into their full profile."
        source="Assessment scores + platform activity"
      >
        <QuadrantScatter students={data.students} partHigh={PART_HIGH} perfHigh={PERF_HIGH} onSelect={setSelectedId} />
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Quad label="High effort · High performance" value={data.quadrants.highPartHighPerf} tone="emerald" />
          <Quad label="High effort · Needs support" value={data.quadrants.highPartLowPerf} tone="amber" />
          <Quad label="Low effort · High performance" value={data.quadrants.lowPartHighPerf} tone="sky" />
          <Quad label="Low effort · Low performance" value={data.quadrants.lowPartLowPerf} tone="red" />
        </div>
      </BentoCard>

      {/* Score explainers */}
      <div className="grid gap-5 lg:grid-cols-2">
        <BentoCard
          title="Student Performance Score"
          subtitle="A weighted readiness composite - every signal, transparently."
          source="Aptitude + Coding + Mock + coverage"
        >
          <div className="space-y-2.5">
            {PERF_WEIGHTS.map((w) => (
              <div key={w.label} className="flex items-center gap-3">
                <span className="w-32 shrink-0 text-sm text-navy">{w.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#ffd24d] to-[#f5b400]" style={{ width: `${w.weight}%` }} />
                </div>
                <span className="w-10 text-right text-xs font-semibold tabular-nums text-slate-600">{w.weight}%</span>
              </div>
            ))}
          </div>
        </BentoCard>

        <BentoCard
          title="Student Participation Score"
          subtitle="Engagement volume across the platform."
          source="Questions + mock tests + coding activity"
        >
          <div className="flex h-full flex-col justify-center gap-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-center">
              <p className="text-sm font-semibold text-navy">
                practice questions <span className="text-[#1a1d29]">+ 3×</span> mock tests{' '}
                <span className="text-[#1a1d29]">+ 2×</span> coding problems
              </p>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-slate-600">
              <Activity className="size-3.5 text-[#f5b400]" /> A student at <span className="font-bold text-navy">{PART_HIGH}+</span> counts
              as high participation.
            </p>
          </div>
        </BentoCard>
      </div>

      {/* Department + Company participation maps */}
      <div className="grid gap-5 lg:grid-cols-2">
        <BentoCard
          title="Department-wise Participation Map"
          subtitle="Engagement & readiness by branch."
          source="Student activity grouped by branch"
        >
          <div className="space-y-3">
            {departments.map((d) => (
              <div key={d.branch}>
                <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-1.5 font-semibold text-navy">
                    <GraduationCap className="size-3.5 text-slate-500" /> {d.branch}
                    <span className="text-xs font-normal text-slate-500">({d.count})</span>
                  </span>
                  <span className="text-xs text-slate-600">
                    <span className="font-bold text-navy">{d.avgReadiness}%</span> avg readiness
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-navy" style={{ width: `${d.avgReadiness}%` }} />
                </div>
              </div>
            ))}
            {departments.length === 1 && departments[0].branch === 'Unspecified' && (
              <p className="pt-1 text-[11px] text-slate-500">
                Branch isn&apos;t set for these students yet - capture it at invite to unlock a full department map.
              </p>
            )}
          </div>
        </BentoCard>

        <BentoCard
          title="Company-wise Participation Map"
          subtitle="Readiness on each company's tagged questions."
          source="Company-tagged practice"
        >
          {data.companyReadiness.length === 0 ? (
            <p className="text-sm text-slate-500">No company-tagged practice yet.</p>
          ) : (
            <div className="space-y-3">
              {data.companyReadiness.slice(0, 8).map((c) => (
                <div key={c.slug}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-semibold text-navy">{c.name}</span>
                    <span className="shrink-0 text-xs text-slate-600">
                      <span className="font-bold text-navy">{c.readiness}%</span> · {c.attempted} attempts
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#ffd24d] to-[#f5b400]" style={{ width: `${c.readiness}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </BentoCard>
      </div>

      {/* Priority group + AI recommendations */}
      <div className="grid gap-5 lg:grid-cols-3">
        <BentoCard
          title="Priority - high effort, needs support"
          subtitle="Engaged students under-performing. Click to open a profile."
          source="Participation ≥ threshold + readiness < 50"
          className="lg:col-span-2"
        >
          {needsSupport.length === 0 ? (
            <p className="text-sm text-slate-500">No students in this quadrant - nice work.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {needsSupport.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(s.id)}
                    className="flex w-full items-center justify-between gap-3 py-2.5 text-left transition-colors hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-navy">{s.name ?? s.email}</p>
                      <p className="truncate text-xs text-slate-500">{s.branch ?? '-'}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-xs text-slate-600">
                        <Activity className="mr-1 inline size-3" />
                        {s.participation}
                      </span>
                      <span className="w-10 text-right text-sm font-bold tabular-nums text-navy">{s.readiness}%</span>
                      <ReadinessBadge band={s.band} />
                      <ArrowRight className="size-4 text-slate-400" />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </BentoCard>

        <BentoCard
          title="AI Recommended Actions"
          subtitle="Prioritized interventions for this cohort."
          source={recs?.basis ?? 'Live cohort metrics'}
          action={
            recs && !recsLoading ? (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  recs.generatedByAi ? 'bg-[#fff5ea] text-[#a16207]' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <Sparkles className="size-3" /> {recs.generatedByAi ? 'AI' : 'Rules'}
              </span>
            ) : null
          }
        >
          {recsLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
              <Loader2 className="size-4 animate-spin" /> Analysing cohort…
            </div>
          ) : !recs || recs.actions.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              Recommendations appear as your cohort builds activity.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {recs.actions.map((a, i) => (
                <li key={`${a.title}-${i}`} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-navy">{a.title}</p>
                    <PriorityChip priority={a.priority} />
                  </div>
                  <p className="mt-0.5 text-xs leading-snug text-slate-600">{a.detail}</p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{a.group}</p>
                </li>
              ))}
            </ul>
          )}
        </BentoCard>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <TrendingUp className="size-3.5" /> Tip: the top-left quadrant (engaged but under-performing) is where
        coaching moves the needle fastest.
      </div>

      <StudentDrawer studentId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function PriorityChip({ priority }: { priority: TpoRecommendation['priority'] }) {
  const map = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-slate-100 text-slate-600',
  } as const;
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${map[priority]}`}>
      {priority}
    </span>
  );
}
