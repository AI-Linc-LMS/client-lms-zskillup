'use client';

import { useEffect, useState } from 'react';
import { formatDateIN } from '@/lib/format';
import Link from 'next/link';
import { Play } from 'lucide-react';
import { ProgressBar } from '@/components/ui/progress-bar';
import { getMockHistory, type ApiMockAttemptHistory } from '@/lib/api/mocks';
import { getPracticeAccuracy, type ApiAccuracy } from '@/lib/api/practice';

/**
 * "Pick up where you left off" — live continuation card. Shows the student's
 * latest finalized mock (score, percentile, report deep-link) next to their
 * running practice accuracy. Per-course lesson progress arrives with the
 * Sprint 5 enrollment ledger; until then this card only states what actually
 * happened.
 */
export function ContinueLearning() {
  const [latest, setLatest] = useState<ApiMockAttemptHistory | null | undefined>(undefined);
  const [accuracy, setAccuracy] = useState<ApiAccuracy | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMockHistory()
      .then((rows) => !cancelled && setLatest(rows[0] ?? null))
      .catch(() => !cancelled && setLatest(null));
    getPracticeAccuracy()
      .then((a) => !cancelled && setAccuracy(a))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-navy">Pick up where you left off</h2>
          <p className="text-xs text-slate-500">Your latest assessment and practice signals</p>
        </div>
        <Link href="/mock-tests" className="text-xs font-semibold text-orange hover:underline">
          View all →
        </Link>
      </div>

      {latest === undefined ? (
        <div className="mt-5 h-24 animate-pulse rounded-lg bg-slate-50" />
      ) : latest === null ? (
        <div className="mt-5 rounded-lg bg-slate-50 p-5 text-center">
          <p className="text-sm font-semibold text-navy">No assessments yet.</p>
          <p className="mt-1 text-xs text-slate-500">
            Take your first timed mock to see your score, percentile, and a full answer review here.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-6 md:grid-cols-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Latest mock
              </p>
              <p className="mt-1.5 font-semibold leading-snug text-navy">{latest.title}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {latest.status === 'EXPIRED' ? 'Timed out · ' : ''}
                {formatDateIN(latest.submittedAt)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Score
              </p>
              <p className="mt-1.5 font-semibold leading-snug text-navy">
                {latest.score}/{latest.total} · {latest.pct}%
              </p>
              <p className="mt-0.5 text-xs text-slate-500">{latest.percentile}th percentile</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Practice accuracy
              </p>
              <p className="mt-1.5 font-semibold leading-snug text-navy">
                {accuracy && accuracy.total > 0 ? `${accuracy.accuracyPct}%` : '—'}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {accuracy && accuracy.total > 0
                  ? `across ${accuracy.total} question${accuracy.total === 1 ? '' : 's'}`
                  : 'No practice attempts yet'}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <ProgressBar value={latest.pct} label="Latest mock score" />
            <p className="mt-1 text-xs text-slate-500">
              {latest.passed
                ? 'Cleared the pass mark — push the percentile higher.'
                : 'Below the 60% pass mark — review the report and retake.'}
            </p>
          </div>
        </>
      )}

      <div className="mt-4 flex items-center gap-3">
        {latest ? (
          <Link
            href={`/dashboard/quiz?report=${latest.attemptId}`}
            className="inline-flex items-center gap-2 rounded-full bg-orange px-5 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
          >
            <Play className="size-4 fill-white" aria-hidden="true" />
            Review report
          </Link>
        ) : (
          <Link
            href="/mock-tests"
            className="inline-flex items-center gap-2 rounded-full bg-orange px-5 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
          >
            <Play className="size-4 fill-white" aria-hidden="true" />
            Start a mock
          </Link>
        )}
        <Link
          href="/practice"
          className="text-sm font-medium text-slate-500 transition-colors hover:text-navy"
        >
          Resume practice
        </Link>
      </div>
    </section>
  );
}
