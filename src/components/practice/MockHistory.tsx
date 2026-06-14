'use client';

import { useEffect, useState } from 'react';
import { formatDateIN } from '@/lib/format';
import Link from 'next/link';
import { BarChart3, Clock, FileText, Loader2, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { StatusPill } from '@/components/student/StatusPill';
import { getMockHistory, type ApiMockAttemptHistory } from '@/lib/api/mocks';
import { getMockStats } from '@/lib/mock-stats';

/**
 * Live mock history (Sprint 4): the KPI row and past-results table on
 * /mock-tests, computed from the student's real finalized attempts
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
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>
    );
  }

  if (!rows) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-12">
        <Loader2 className="size-5 animate-spin text-slate-400" aria-hidden="true" />
      </div>
    );
  }

  const { taken: testsTaken, avgPct, bestPercentile } = getMockStats(rows);

  const kpis = [
    { label: 'Tests Taken', value: String(testsTaken), icon: FileText },
    { label: 'Avg Score', value: avgPct !== null ? `${avgPct}%` : '—', icon: BarChart3 },
    {
      label: 'Best Percentile',
      value: bestPercentile !== null ? `${bestPercentile}th` : '—',
      icon: Trophy,
    },
  ];

  return (
    <>
      {/* KPI row */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {kpis.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              {label}
            </p>
            <div className="mt-2 flex items-end justify-between">
              <span className="text-[26px] font-extrabold leading-none text-navy">{value}</span>
              <span className="flex size-9 items-center justify-center rounded-lg bg-sky-50 text-navy">
                <Icon className="size-5" aria-hidden="true" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Past results */}
      <section>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Past Results
        </p>
        {rows.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <span className="mx-auto grid size-11 place-items-center rounded-xl bg-sky-50 text-navy ring-1 ring-sky-100">
              <Clock className="size-5" aria-hidden="true" />
            </span>
            <p className="mt-3 text-sm font-semibold text-navy">No results yet.</p>
            <p className="mt-1 text-xs text-slate-500">
              Finish your first mock test and your score history will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 md:grid">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Mock Name</span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Date</span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Score</span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Percentile</span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Status</span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Report</span>
            </div>

            {rows.map((row, idx) => (
              <div
                key={row.attemptId}
                className={`grid grid-cols-1 gap-2 px-5 py-4 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] md:items-center md:gap-4 ${idx < rows.length - 1 ? 'border-b border-slate-100' : ''}`}
              >
                <div>
                  <p className="text-sm font-semibold text-navy">{row.title}</p>
                  <p className="mt-0.5 text-xs text-slate-400 md:hidden">
                    {formatDateIN(row.submittedAt)} · {row.pct}% · {row.percentile}th
                  </p>
                </div>
                <p className="hidden text-sm text-slate-600 md:block">{formatDateIN(row.submittedAt)}</p>
                <div className="hidden md:block">
                  <span className="text-sm font-semibold text-navy">{row.pct}%</span>
                  <ProgressBar value={row.pct} className="mt-1 h-1.5" label={`${row.title} score`} />
                </div>
                <p className="hidden text-sm text-slate-600 md:block">{row.percentile}th</p>
                <div className="hidden md:block">
                  {row.status === 'EXPIRED' ? (
                    <StatusPill tone="warning" label="Timed out" />
                  ) : row.passed ? (
                    <StatusPill tone="positive" label="Passed" />
                  ) : (
                    <StatusPill tone="negative" label="Below pass mark" />
                  )}
                </div>
                <div className="flex items-center md:justify-end">
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={`/dashboard/quiz?report=${row.attemptId}`}
                      aria-label={`View report for ${row.title}`}
                    >
                      View report
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
