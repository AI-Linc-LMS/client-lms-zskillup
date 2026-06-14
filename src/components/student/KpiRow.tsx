'use client';

import { useEffect, useState } from 'react';
import { listCourses, listTopics } from '@/lib/api/catalog';
import { getPracticeAccuracy } from '@/lib/api/practice';
import { getMockHistory } from '@/lib/api/mocks';
import { getMockStats } from '@/lib/mock-stats';

/**
 * Dashboard KPI row — all four tiles are live: practice accuracy
 * (`GET /practice/accuracy`), catalog size (`GET /courses`), topic count
 * (`GET /topics`), and mock attempts (`GET /mocks/attempts/mine`).
 */
export function KpiRow() {
  const [accuracy, setAccuracy] = useState<{ total: number; accuracyPct: number } | null>(null);
  const [courses, setCourses] = useState<number | null>(null);
  const [topics, setTopics] = useState<number | null>(null);
  const [mocks, setMocks] = useState<{ taken: number; best: number | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPracticeAccuracy()
      .then((a) => !cancelled && setAccuracy(a))
      .catch(() => {});
    listCourses()
      .then((c) => !cancelled && setCourses(c.length))
      .catch(() => {});
    listTopics()
      .then((t) => !cancelled && setTopics(t.length))
      .catch(() => {});
    getMockHistory()
      .then((rows) => {
        if (cancelled) return;
        const stats = getMockStats(rows);
        setMocks({ taken: stats.taken, best: stats.bestPct });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const fmt = (v: number | null) => (v === null ? '—' : String(v));

  const kpis = [
    {
      label: 'Practice accuracy',
      value: accuracy ? `${accuracy.accuracyPct}%` : '—',
      sub:
        accuracy && accuracy.total > 0
          ? `${accuracy.total} question${accuracy.total === 1 ? '' : 's'} attempted`
          : 'Start a practice set',
    },
    { label: 'Prep courses', value: fmt(courses), sub: 'Available in your catalog' },
    { label: 'Topics to master', value: fmt(topics), sub: 'Across every track' },
    {
      label: 'Mock tests',
      value: mocks ? String(mocks.taken) : '—',
      sub: mocks && mocks.taken > 0 ? `Best score ${mocks.best}%` : 'Take your first timed mock',
    },
  ];

  return (
    <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            {kpi.label}
          </p>
          <p className="mt-2 text-[26px] font-extrabold leading-none text-navy">{kpi.value}</p>
          <p className="mt-1.5 text-[11px] text-slate-400">{kpi.sub}</p>
        </div>
      ))}
    </section>
  );
}
