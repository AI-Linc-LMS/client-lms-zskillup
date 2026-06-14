'use client';

import { useEffect, useState } from 'react';
import { formatDateIN } from '@/lib/format';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { StatusPill } from '@/components/student/StatusPill';
import {
  getPracticeAccuracy,
  getTopicAccuracy,
  type ApiAccuracy,
  type ApiTopicAccuracy,
} from '@/lib/api/practice';
import { getMockHistory, type ApiMockAttemptHistory } from '@/lib/api/mocks';

/**
 * Performance report — fully live (Sprint 3 exit: "reports show accuracy" +
 * the Sprint 4 mock report surface). Practice numbers come from
 * `GET /practice/accuracy` (+ per-topic), assessment numbers from
 * `GET /mocks/attempts/mine`. The PPS readiness score arrives in Sprint 7.
 */
export function PerformanceLive() {
  const [accuracy, setAccuracy] = useState<ApiAccuracy | null>(null);
  const [topics, setTopics] = useState<ApiTopicAccuracy[] | null>(null);
  const [mocks, setMocks] = useState<ApiMockAttemptHistory[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([getPracticeAccuracy(), getTopicAccuracy(), getMockHistory()]).then(
      ([a, t, m]) => {
        if (cancelled) return;
        if (a.status === 'fulfilled') setAccuracy(a.value);
        if (t.status === 'fulfilled') setTopics(t.value);
        if (m.status === 'fulfilled') setMocks(m.value);
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-16 shadow-sm">
        <Loader2 className="size-5 animate-spin text-slate-400" aria-hidden="true" />
      </div>
    );
  }

  const weak = (topics ?? []).filter((t) => t.total >= 3 && t.accuracyPct < 60);
  const kpis = [
    {
      label: 'Practice accuracy',
      value: accuracy && accuracy.total > 0 ? `${accuracy.accuracyPct}%` : '—',
      sub: accuracy && accuracy.total > 0 ? 'across all topics' : 'no attempts yet',
    },
    {
      label: 'Questions attempted',
      value: accuracy ? String(accuracy.total) : '—',
      sub: 'server-graded',
    },
    {
      label: 'Avg speed',
      value: accuracy && accuracy.total > 0 ? `${accuracy.avgTimeSec}s` : '—',
      sub: 'per question',
    },
    {
      label: 'Mock tests',
      value: mocks ? String(mocks.length) : '—',
      sub:
        mocks && mocks.length > 0
          ? `best ${Math.max(...mocks.map((m) => m.pct))}%`
          : 'none taken yet',
    },
  ];

  return (
    <div className="space-y-8">
      {/* KPI stat row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map(({ label, value, sub }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              {label}
            </p>
            <p className="mt-2 text-[26px] font-extrabold leading-none text-navy">{value}</p>
            <p className="mt-1 text-xs text-slate-400">{sub}</p>
          </div>
        ))}
      </div>

      {/* Topic-wise accuracy */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="mb-5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Topic-wise Accuracy
        </p>
        {topics === null || topics.length === 0 ? (
          <div className="py-4 text-center">
            <p className="text-sm font-semibold text-navy">No practice data yet.</p>
            <p className="mt-1 text-xs text-slate-500">
              Attempt a few questions and your per-topic accuracy appears here.
            </p>
            <Button asChild size="sm" className="mt-4">
              <Link href="/topic-mastery">Start practising</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {topics.map((t) => (
              <div key={t.topicSlug} className="flex items-center gap-3">
                <span className="w-44 shrink-0 text-sm text-slate-600">{t.topicName}</span>
                <ProgressBar
                  value={t.accuracyPct}
                  className="flex-1"
                  barClassName={barColor(t.accuracyPct)}
                  label={`${t.topicName} accuracy`}
                />
                <span className="w-24 shrink-0 text-right text-sm font-semibold text-navy">
                  {t.accuracyPct}% <span className="font-normal text-slate-400">({t.correct}/{t.total})</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Weak areas */}
      {weak.length > 0 ? (
        <section>
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Weak Areas
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {weak.slice(0, 3).map((t) => (
              <div key={t.topicSlug} className="rounded-xl border border-red-200 bg-white p-5 shadow-sm">
                <div className="mb-1 flex items-center justify-between">
                  <p className="font-semibold text-navy">{t.topicName}</p>
                  <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-semibold text-red-700 ring-1 ring-red-200">
                    {t.accuracyPct}%
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {t.correct} of {t.total} correct — drill this topic to pull the average up.
                </p>
                <Button asChild size="sm" variant="outline" className="mt-4">
                  <Link href={`/practice?topic=${encodeURIComponent(t.topicSlug)}`}>Drill now</Link>
                </Button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Mock assessment results */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="mb-5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Mock Assessment Results
        </p>
        {mocks === null || mocks.length === 0 ? (
          <div className="py-4 text-center">
            <p className="text-sm font-semibold text-navy">No mock tests taken yet.</p>
            <p className="mt-1 text-xs text-slate-500">
              Finish a timed mock and your score, percentile, and review land here.
            </p>
            <Button asChild size="sm" className="mt-4">
              <Link href="/mock-tests">Browse mock tests</Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Mock', 'Date', 'Score', 'Percentile', 'Status', ''].map((h, i) => (
                    <th
                      key={h || `c${i}`}
                      className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mocks.map((m) => (
                  <tr key={m.attemptId} className="border-b border-slate-50 last:border-0">
                    <td className="py-3 pr-4 font-semibold text-navy">{m.title}</td>
                    <td className="py-3 pr-4 text-slate-400">{formatDateIN(m.submittedAt)}</td>
                    <td className="py-3 pr-4 font-semibold text-navy">
                      {m.pct}% <span className="font-normal text-slate-400">({m.score}/{m.total})</span>
                    </td>
                    <td className="py-3 pr-4 text-slate-600">{m.percentile}th</td>
                    <td className="py-3 pr-4">
                      {m.status === 'EXPIRED' ? (
                        <StatusPill tone="warning" label="Timed out" />
                      ) : m.passed ? (
                        <StatusPill tone="positive" label="Passed" />
                      ) : (
                        <StatusPill tone="negative" label="Below pass mark" />
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/dashboard/quiz?report=${m.attemptId}`}
                        className="text-xs font-semibold text-orange hover:underline"
                      >
                        View report →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function barColor(accuracy: number): string {
  if (accuracy > 80) return 'bg-emerald-500';
  if (accuracy >= 60) return 'bg-amber-400';
  return 'bg-red-500';
}
