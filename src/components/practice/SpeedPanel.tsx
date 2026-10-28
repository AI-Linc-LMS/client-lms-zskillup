import { formatSec, timingCoverage } from '@/shared/answer-timing';
import type { ApiMockTiming } from '@/lib/api/mocks';

/**
 * Measured speed on an attempt — the "how fast", beside the existing "how many right".
 *
 * Shared by the student report, the admin student report and the TPO drive report so one
 * set of numbers is described the same way everywhere; three screens each wording
 * "average time" differently is a support ticket about figures disagreeing.
 *
 * THE EMPTY STATE IS THE IMPORTANT PART. Per-question timing only exists for attempts
 * taken after it shipped, so most historical attempts have `recorded: 0`. Those render an
 * explicit "not recorded" rather than zeros, because a grid of 0s reads as "answered
 * instantly" and would quietly discredit every number on the page. Partial coverage says
 * how many questions it covers instead of presenting a fraction of the paper as the whole.
 */
export function SpeedPanel({
  timing,
  totalTimeSec,
  className,
}: {
  timing: ApiMockTiming | null | undefined;
  /** Wall-clock for the whole attempt — always known, even with no per-question data. */
  totalTimeSec?: number | null;
  className?: string;
}) {
  const coverage = timing ? timingCoverage(timing) : 'none';

  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm ${className ?? ''}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          Speed
        </p>
        {coverage === 'partial' && timing ? (
          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
            {timing.recorded} of {timing.total} questions timed
          </span>
        ) : null}
      </div>

      {coverage === 'none' ? (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-4">
            <Metric label="Total time" value={formatSec(totalTimeSec ?? null)} />
          </dl>
          <p className="mt-4 text-sm text-slate-500">
            Per-question timing was not recorded for this attempt. It is captured from the
            attempts taken after this feature went live, so older attempts show only the
            total.
          </p>
        </>
      ) : (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric label="Total time" value={formatSec(totalTimeSec ?? timing?.measuredTotalSec ?? null)} />
            <Metric label="Median / question" value={formatSec(timing?.medianSec)} />
            <Metric label="Average / question" value={formatSec(timing?.avgSec)} />
            <Metric label="Slowest question" value={formatSec(timing?.slowestSec)} />
          </dl>

          {/* Speed BESIDE accuracy — the point of the whole feature. Quick-and-wrong and
              slow-but-right are different problems and need different coaching. */}
          {timing && (timing.avgSecCorrect !== null || timing.avgSecIncorrect !== null) ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Split
                label="Average on correct answers"
                value={formatSec(timing.avgSecCorrect)}
                tone="emerald"
              />
              <Split
                label="Average on wrong answers"
                value={formatSec(timing.avgSecIncorrect)}
                tone="red"
              />
            </div>
          ) : null}

          {timing && timing.avgSecCorrect !== null && timing.avgSecIncorrect !== null ? (
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              {timing.avgSecIncorrect > timing.avgSecCorrect * 1.3
                ? 'Wrong answers took noticeably longer — the losses are on questions that were hard, not rushed.'
                : timing.avgSecCorrect > timing.avgSecIncorrect * 1.3
                  ? 'Wrong answers were the quick ones — worth slowing down before committing.'
                  : 'Time spent on right and wrong answers was similar.'}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</dt>
      <dd className="mt-1 text-[22px] font-extrabold leading-none text-navy">{value}</dd>
    </div>
  );
}

function Split({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'emerald' | 'red';
}) {
  const ring = tone === 'emerald' ? 'ring-emerald-200 bg-emerald-50' : 'ring-red-200 bg-red-50';
  const text = tone === 'emerald' ? 'text-emerald-700' : 'text-red-700';
  return (
    <div className={`rounded-xl p-4 ring-1 ${ring}`}>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-extrabold leading-none ${text}`}>{value}</p>
    </div>
  );
}
