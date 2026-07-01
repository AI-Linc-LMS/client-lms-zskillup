'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { formatDateIN } from '@/lib/format';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  BarChart3,
  Calendar,
  Clock,
  FileText,
  Loader2,
  Trophy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusPill } from '@/components/student/StatusPill';
import { AnimatedNumber, Stagger, StaggerItem } from '@/components/motion/primitives';
import { getMockHistory, type ApiMockAttemptHistory } from '@/lib/api/mocks';
import { getMockStats } from '@/lib/mock-stats';

/**
 * Live mock history (Sprint 4): the KPI row and past-results list on
 * /mock-assessment, computed from the student's real finalized attempts
 * (`GET /mocks/attempts/mine`). Each row deep-links to its persisted report.
 */
export function MockHistory() {
  const [rows, setRows] = useState<ApiMockAttemptHistory[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMockHistory()
      .then((r) => {
        if (!cancelled) setRows(r);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || 'Could not load your results.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!rows) {
    return (
      <div className="flex items-center justify-center gap-3 rounded-3xl border border-slate-200/80 bg-white p-12 shadow-sm">
        <Loader2 className="size-5 animate-spin text-orange" aria-hidden="true" />
        <span className="text-sm text-slate-400">Loading your results…</span>
      </div>
    );
  }

  const { taken: testsTaken, avgPct, bestPercentile } = getMockStats(rows);

  const kpis: Array<{
    label: string;
    value: number;
    suffix?: string;
    display?: string;
    icon: ReactNode;
    from: string;
    to: string;
    glow: string;
  }> = [
    {
      label: 'Tests Taken',
      value: testsTaken,
      icon: <FileText className="size-5" />,
      from: '#f7a14e',
      to: '#f37021',
      glow: '#f37021',
    },
    {
      label: 'Avg Score',
      value: avgPct ?? 0,
      suffix: avgPct !== null ? '%' : undefined,
      display: avgPct === null ? '—' : undefined,
      icon: <BarChart3 className="size-5" />,
      from: '#7c6cf5',
      to: '#5b3bf5',
      glow: '#6d3bf5',
    },
    {
      label: 'Best Percentile',
      value: bestPercentile ?? 0,
      suffix: bestPercentile !== null ? 'th' : undefined,
      display: bestPercentile === null ? '—' : undefined,
      icon: <Trophy className="size-5" />,
      from: '#34d399',
      to: '#059669',
      glow: '#10b981',
    },
  ];

  return (
    <>
      {/* KPI row */}
      <Stagger className="grid gap-4 sm:grid-cols-3">
        {kpis.map((kpi) => (
          <StaggerItem key={kpi.label}>
            <div className="group relative h-full overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_-18px_rgba(15,23,42,0.35)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_-24px_rgba(15,23,42,0.5)]">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-50/70 via-transparent to-transparent"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -right-8 -top-10 size-28 rounded-full opacity-[0.08] blur-2xl transition-opacity duration-500 group-hover:opacity-25"
                style={{ background: kpi.glow }}
              />
              <div className="relative z-10">
                <div className="flex items-start justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    {kpi.label}
                  </p>
                  <span
                    className="flex size-10 items-center justify-center rounded-xl text-white shadow-sm"
                    style={{ background: `linear-gradient(135deg, ${kpi.from}, ${kpi.to})` }}
                  >
                    {kpi.icon}
                  </span>
                </div>
                <p className="mt-3 text-[30px] font-extrabold leading-none tracking-tight text-navy tabular-nums">
                  {kpi.display ?? (
                    <>
                      <AnimatedNumber value={kpi.value} />
                      {kpi.suffix}
                    </>
                  )}
                </p>
              </div>
            </div>
          </StaggerItem>
        ))}
      </Stagger>

      {/* Past results */}
      <section className="mt-8">
        <header className="mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            History
          </p>
          <h2 className="mt-1 text-xl font-extrabold tracking-tight text-navy">Past Results</h2>
        </header>

        {rows.length === 0 ? (
          <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-12 text-center shadow-[0_8px_30px_-18px_rgba(15,23,42,0.35)]">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-50/70 via-transparent to-transparent"
            />
            <div className="relative z-10">
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-[#7c6cf5] to-[#5b3bf5] text-white shadow-sm">
                <Clock className="size-5" aria-hidden="true" />
              </span>
              <p className="mt-4 text-base font-bold text-navy">No results yet.</p>
              <p className="mt-1 text-sm text-slate-500">
                Finish your first mock test and your score history will appear here.
              </p>
            </div>
          </div>
        ) : (
          <Stagger className="space-y-3">
            {rows.map((row) => (
              <StaggerItem key={row.attemptId}>
                <ResultRow row={row} />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </section>
    </>
  );
}

/** A single past-result card — score ring/bar, percentile, status badge, date,
 *  deep-linking to the persisted server-graded report. */
function ResultRow({ row }: { row: ApiMockAttemptHistory }) {
  const expired = row.status === 'EXPIRED';
  const tone = expired ? 'amber' : row.passed ? 'emerald' : 'red';
  const accent =
    tone === 'emerald'
      ? { bar: 'from-emerald-400 to-emerald-600', text: 'text-emerald-600', glow: '#10b981' }
      : tone === 'amber'
        ? { bar: 'from-amber-400 to-amber-600', text: 'text-amber-600', glow: '#f59e0b' }
        : { bar: 'from-rose-400 to-rose-600', text: 'text-rose-600', glow: '#f43f5e' };
  const pct = Math.max(0, Math.min(100, row.pct));

  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
      <Link
        href={`/dashboard/quiz?report=${row.attemptId}`}
        aria-label={`View report for ${row.title}`}
        className="group relative block overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_-20px_rgba(15,23,42,0.35)] transition-shadow duration-300 hover:shadow-[0_18px_50px_-24px_rgba(15,23,42,0.45)]"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-12 size-32 rounded-full opacity-[0.06] blur-2xl transition-opacity duration-500 group-hover:opacity-20"
          style={{ background: accent.glow }}
        />
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
          {/* Title + meta */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-navy">{row.title}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5" aria-hidden="true" />
                {formatDateIN(row.submittedAt)}
              </span>
              <span className="flex items-center gap-1">
                <Trophy className="size-3.5" aria-hidden="true" />
                {row.percentile}th percentile
              </span>
            </div>
          </div>

          {/* Score with bar */}
          <div className="w-full md:w-44 md:shrink-0">
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Score
              </span>
              <span className={cn('text-base font-extrabold tabular-nums', accent.text)}>
                {row.pct}%
              </span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${row.title} score`}
            >
              <motion.div
                className={cn('h-full rounded-full bg-gradient-to-r', accent.bar)}
                initial={{ width: 0 }}
                whileInView={{ width: `${pct}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Status + report affordance */}
          <div className="flex items-center justify-between gap-3 md:w-auto md:shrink-0 md:justify-end">
            {expired ? (
              <StatusPill tone="warning" label="Timed out" />
            ) : row.passed ? (
              <StatusPill tone="positive" label="Passed" />
            ) : (
              <StatusPill tone="negative" label="Below pass mark" />
            )}
            <span className="flex items-center gap-1 text-xs font-bold text-slate-400 transition-colors group-hover:text-orange">
              Report
              <ArrowUpRight
                className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden="true"
              />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
