'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AlertTriangle, BarChart3, CheckCircle2, Clock, FileCheck2, Loader2, Target, TrendingUp } from 'lucide-react';
import { getPracticeAccuracy, getTopicAccuracy, type ApiAccuracy, type ApiTopicAccuracy } from '@/lib/api/practice';
import { getMockHistory, type ApiMockAttemptHistory } from '@/lib/api/mocks';
import { ReadinessPanel } from '@/components/student/ReadinessPanel';
import { cn } from '@/lib/utils';

const EASE = [0.16, 1, 0.3, 1] as const;
const tone = (p: number) => (p >= 80 ? '#10b981' : p >= 60 ? '#6366f1' : p >= 40 ? '#f59e0b' : '#ef4444');

function Ring({ pct, size = 128, label }: { pct: number; size?: number; label: string }) {
  const r = size / 2 - 11;
  const circ = 2 * Math.PI * r;
  const c = tone(pct);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef2f7" strokeWidth={10} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={c} strokeWidth={10} strokeLinecap="round"
          strokeDasharray={circ} initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: circ - (pct / 100) * circ }}
          transition={{ duration: 1, ease: EASE }} style={{ filter: `drop-shadow(0 0 6px ${c}55)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black tabular-nums text-navy">{pct}%</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      </div>
    </div>
  );
}

export function PerformanceDashboard() {
  const [acc, setAcc] = useState<ApiAccuracy | null>(null);
  const [topics, setTopics] = useState<ApiTopicAccuracy[]>([]);
  const [mocks, setMocks] = useState<ApiMockAttemptHistory[] | null>(null);

  useEffect(() => {
    Promise.allSettled([getPracticeAccuracy(), getTopicAccuracy(), getMockHistory()]).then(([a, t, m]) => {
      if (a.status === 'fulfilled') setAcc(a.value);
      if (t.status === 'fulfilled') setTopics(t.value);
      setMocks(m.status === 'fulfilled' ? m.value : []);
    });
  }, []);

  if (mocks === null) {
    return <div className="grid h-64 place-items-center"><Loader2 className="size-6 animate-spin text-slate-500" /></div>;
  }

  const accuracyPct = acc?.accuracyPct ?? 0;
  const weak = topics.filter((t) => t.total >= 2 && t.accuracyPct < 60).sort((a, b) => a.accuracyPct - b.accuracyPct);
  const chrono = [...mocks].reverse(); // oldest → newest for the trend
  const bestPct = mocks.length ? Math.max(...mocks.map((m) => m.pct)) : 0;
  const avgPct = mocks.length ? Math.round(mocks.reduce((s, m) => s + m.pct, 0) / mocks.length) : 0;

  return (
    <div className="space-y-7">
      {/* Readiness front-and-center */}
      <ReadinessPanel tour="performance" />

      <section>
        <h2 className="mb-4 flex items-center gap-2.5 text-lg font-extrabold tracking-tight text-navy sm:text-xl">
          <BarChart3 className="size-5 text-indigo-500" /> Practice analytics
        </h2>

        {/* Bento grid - accuracy card spans 2 cols, trend fills the rest */}
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Practice accuracy - featured, spans 2 columns */}
          <div data-tour="perf:practice-accuracy" className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 lg:col-span-2">
            <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 to-indigo-400" />
            <span
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full bg-indigo-500 opacity-[0.06] blur-3xl"
            />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-indigo-600 ring-1 ring-inset ring-indigo-100">
              <Target className="size-3.5" /> Practice accuracy
            </span>
            <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
              <Ring pct={accuracyPct} size={150} label="accuracy" />
              <div className="grid flex-1 grid-cols-2 gap-3.5">
                <Kpi icon={CheckCircle2} label="Correct" value={acc?.correct ?? 0} tone="text-emerald-600" />
                <Kpi icon={Target} label="Attempted" value={acc?.total ?? 0} tone="text-navy" />
                <Kpi icon={Clock} label="Avg / Q" value={`${acc?.avgTimeSec ?? 0}s`} tone="text-indigo-600" />
                <Kpi icon={FileCheck2} label="Mocks" value={mocks.length} tone="text-violet-600" />
              </div>
            </div>
          </div>

          {/* Mock score trend */}
          <div data-tour="perf:score-trend" className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6">
            <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 to-indigo-400" />
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-indigo-600 ring-1 ring-inset ring-indigo-100">
                <TrendingUp className="size-3.5" /> Scores
              </span>
              {mocks.length ? (
                <span className="text-xs font-semibold text-slate-500">best {bestPct}% · avg {avgPct}%</span>
              ) : null}
            </div>
            {chrono.length === 0 ? (
              <div className="mt-6 grid place-items-center rounded-2xl border border-dashed border-slate-200 py-10 text-center">
                <p className="text-sm text-slate-600">
                  No mock/assessment attempts yet.{' '}
                  <Link href="/mock-assessment" className="font-semibold text-indigo-600 hover:underline">Take a mock quiz →</Link>
                </p>
              </div>
            ) : (
              <div className="mt-5">
                <div className="relative h-40">
                  {/* gridlines */}
                  {[100, 75, 50, 25, 0].map((g) => (
                    <div
                      key={g}
                      aria-hidden
                      className="absolute inset-x-0 border-t border-dashed border-slate-100"
                      style={{ bottom: `${g}%` }}
                    />
                  ))}
                  {/* bars */}
                  <div className="absolute inset-0 flex items-end gap-1.5">
                    {chrono.slice(-14).map((m, i) => (
                      <div
                        key={m.attemptId}
                        className="group relative flex h-full flex-1 flex-col items-center justify-end"
                        title={`${m.title}: ${m.pct}%`}
                      >
                        <span className="mb-1 text-[9px] font-bold tabular-nums text-slate-600 opacity-0 transition-opacity group-hover:opacity-100">
                          {m.pct}
                        </span>
                        <motion.div
                          className="w-full rounded-t-md transition-[filter] group-hover:brightness-110"
                          style={{ background: tone(m.pct) }}
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.max(3, m.pct)}%` }}
                          transition={{ duration: 0.6, delay: i * 0.04, ease: EASE }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <p className="mt-2 text-right text-[10px] font-medium text-slate-500">
                  last {Math.min(14, chrono.length)} attempts →
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Focus areas */}
      {weak.length ? (
        <section data-tour="perf:focus-areas">
          <h2 className="mb-4 flex items-center gap-2.5 text-lg font-extrabold tracking-tight text-navy sm:text-xl">
            <AlertTriangle className="size-5 text-amber-500" /> Focus areas
          </h2>
          <div className="relative overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50/80 to-orange-50/40 p-6">
            <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-orange-400" />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-amber-700 ring-1 ring-inset ring-amber-200">
              <AlertTriangle className="size-3.5" /> Under 60%
            </span>
            <p className="mt-2.5 text-sm text-slate-600">Topics under 60% - drill these to lift your readiness.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {weak.slice(0, 12).map((t) => (
                <Link
                  key={t.topicSlug}
                  href={`/dashboard/quiz/adaptive?topic=${t.topicSlug}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-white px-3.5 py-2 text-sm font-semibold text-navy shadow-sm transition-colors hover:bg-amber-50"
                >
                  {t.topicName}
                  <span className="font-extrabold tabular-nums" style={{ color: tone(t.accuracyPct) }}>{t.accuracyPct}%</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Kpi({ icon: Icon, label, value, tone: t }: { icon: typeof Target; label: string; value: number | string; tone: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 transition-colors hover:border-indigo-200 hover:bg-indigo-50/40">
      <Icon className={cn('size-4', t)} />
      <p className={cn('mt-1.5 text-2xl font-black tabular-nums sm:text-3xl', t)}>{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
    </div>
  );
}
