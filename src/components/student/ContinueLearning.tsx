'use client';

import { useEffect, useState } from 'react';
import { formatDateIN } from '@/lib/format';
import Link from 'next/link';
import { ArrowRight, Play, RotateCcw } from 'lucide-react';
import { ProgressBar } from '@/components/ui/progress-bar';
import { getMockHistory, type ApiMockAttemptHistory } from '@/lib/api/mocks';
import { getPracticeAccuracy, type ApiAccuracy } from '@/lib/api/practice';

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
    <section className="lms-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-line)] px-6 py-4">
        <div>
          <h2 className="text-base font-bold text-[var(--color-ink)]">Pick up where you left off</h2>
          <p className="text-xs text-[var(--color-text-muted)]">Your latest assessment and practice signals</p>
        </div>
        <Link
          href="/mock-assessment"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-brand)] hover:underline"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="p-6">
        {latest === undefined ? (
          <div className="h-24 animate-pulse rounded-xl bg-[var(--color-surface-2)]" />
        ) : latest === null ? (
          <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-2)] p-6 text-center">
            <p className="text-sm font-semibold text-[var(--color-ink)]">No assessments yet.</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Take your first timed mock to see your score, percentile, and a full answer review
              here.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <p className="group-label mb-1.5">Latest mock</p>
                <p className="font-semibold leading-snug text-[var(--color-ink)]">{latest.title}</p>
                <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                  {latest.status === 'EXPIRED' ? 'Timed out · ' : ''}
                  {formatDateIN(latest.submittedAt)}
                </p>
              </div>
              <div>
                <p className="group-label mb-1.5">Score</p>
                <p className="font-semibold leading-snug text-[var(--color-ink)]">
                  {latest.score}/{latest.total} · {latest.pct}%
                </p>
                <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                  {latest.percentile}th percentile
                </p>
              </div>
              <div>
                <p className="group-label mb-1.5">Practice accuracy</p>
                <p className="font-semibold leading-snug text-[var(--color-ink)]">
                  {accuracy && accuracy.total > 0 ? `${accuracy.accuracyPct}%` : '-'}
                </p>
                <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                  {accuracy && accuracy.total > 0
                    ? `across ${accuracy.total} question${accuracy.total === 1 ? '' : 's'}`
                    : 'No practice attempts yet'}
                </p>
              </div>
            </div>

            <div className="mt-5">
              <ProgressBar value={latest.pct} label="Latest mock score" />
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                {latest.passed
                  ? 'Cleared the pass mark - push the percentile higher.'
                  : 'Below the 60% pass mark - review the report and retake.'}
              </p>
            </div>
          </>
        )}

        <div className="mt-5 flex items-center gap-3">
          {latest ? (
            <Link
              href={`/dashboard/quiz?report=${latest.attemptId}`}
              className="btn-brand inline-flex rounded-full px-5 py-2 text-sm"
            >
              <Play className="h-4 w-4 fill-white" aria-hidden />
              Review report
            </Link>
          ) : (
            <Link
              href="/mock-assessment"
              className="btn-brand inline-flex rounded-full px-5 py-2 text-sm"
            >
              <Play className="h-4 w-4 fill-white" aria-hidden />
              Start a mock
            </Link>
          )}
          <Link
            href="/practice"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-ink)]"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Resume practice
          </Link>
        </div>
      </div>
    </section>
  );
}
