'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Clock, FileCheck2, Loader2, Target, TrendingUp } from 'lucide-react';
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
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
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
    return <div className="grid h-64 place-items-center"><Loader2 className="size-6 animate-spin text-slate-400" /></div>;
  }

  const accuracyPct = acc?.accuracyPct ?? 0;
  const weak = topics.filter((t) => t.total >= 2 && t.accuracyPct < 60).sort((a, b) => a.accuracyPct - b.accuracyPct);
  const chrono = [...mocks].reverse(); // oldest → newest for the trend
  const bestPct = mocks.length ? Math.max(...mocks.map((m) => m.pct)) : 0;
  const avgPct = mocks.length ? Math.round(mocks.reduce((s, m) => s + m.pct, 0) / mocks.length) : 0;

  return (
    <div className="space-y-6">
      {/* Readiness front-and-center */}
      <ReadinessPanel />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Practice accuracy */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-400">
            <Target className="size-4 text-orange" /> Practice accuracy
          </h3>
          <div className="mt-4 flex items-center gap-6">
            <Ring pct={accuracyPct} label="accuracy" />
            <div className="grid flex-1 grid-cols-2 gap-3">
              <Kpi icon={CheckCircle2} label="Correct" value={acc?.correct ?? 0} tone="text-emerald-600" />
              <Kpi icon={Target} label="Attempted" value={acc?.total ?? 0} tone="text-navy" />
              <Kpi icon={Clock} label="Avg / Q" value={`${acc?.avgTimeSec ?? 0}s`} tone="text-indigo-600" />
              <Kpi icon={FileCheck2} label="Mocks" value={mocks.length} tone="text-violet-600" />
            </div>
          </div>
        </div>

        {/* Mock score trend */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-400">
              <TrendingUp className="size-4 text-orange" /> Assessment scores
            </h3>
            {mocks.length ? (
              <span className="text-xs font-semibold text-slate-400">best {bestPct}% · avg {avgPct}%</span>
            ) : null}
          </div>
          {chrono.length === 0 ? (
            <p className="mt-6 text-sm text-slate-500">
              No mock/assessment attempts yet.{' '}
              <Link href="/mock-tests" className="font-semibold text-orange hover:underline">Take a mock quiz →</Link>
            </p>
          ) : (
            <div className="mt-5 flex h-40 items-end gap-2">
              {chrono.slice(-14).map((m, i) => (
                <div key={m.attemptId} className="group relative flex flex-1 flex-col items-center justify-end">
                  <motion.div
                    className="w-full rounded-t-md"
                    style={{ background: tone(m.pct) }}
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(4, m.pct)}%` }}
                    transition={{ duration: 0.6, delay: i * 0.04, ease: EASE }}
                    title={`${m.title}: ${m.pct}%`}
                  />
                  <span className="mt-1 text-[9px] font-bold tabular-nums text-slate-400">{m.pct}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Focus areas */}
      {weak.length ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50/40 p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-amber-700">
            <AlertTriangle className="size-4" /> Focus areas
          </h3>
          <p className="mt-1 text-xs text-slate-500">Topics under 60% — drill these to lift your readiness.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {weak.slice(0, 12).map((t) => (
              <Link
                key={t.topicSlug}
                href={`/practice?topic=${t.topicSlug}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-navy hover:bg-amber-50"
              >
                {t.topicName}
                <span className="font-extrabold" style={{ color: tone(t.accuracyPct) }}>{t.accuracyPct}%</span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Kpi({ icon: Icon, label, value, tone: t }: { icon: typeof Target; label: string; value: number | string; tone: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-2.5">
      <Icon className={cn('size-3.5', t)} />
      <p className={cn('mt-1 text-lg font-black tabular-nums', t)}>{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
    </div>
  );
}
