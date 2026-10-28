/**
 * Speed metrics over a set of answered questions.
 *
 * Shared because BOTH repos compute them (ADR-011, byte-identical): the backend puts
 * them on report DTOs, the frontend derives the same figures for a filtered subset the
 * API never saw (one section, one topic, the questions a student got wrong). Two
 * implementations of "average time" that round differently is a support ticket about
 * numbers disagreeing between two screens.
 *
 * THE RULE THAT SHAPES EVERYTHING HERE: `timeMs === null` means NOT MEASURED, never
 * zero. Every attempt taken before per-question timing shipped has null on every answer,
 * so a naive `sum / length` would report those students as answering instantly and make
 * the whole report lie. Null rows are excluded from every aggregate, and `recorded` /
 * `total` are returned so a UI can say "timing recorded for 12 of 40 questions" instead
 * of silently averaging a fraction of the paper.
 */

/** The shape these metrics need from an answer. Anything wider is accepted. */
export interface TimedAnswer {
  /** Cumulative ms on this question, or null when never measured. */
  timeMs?: number | null;
  /** null for unattempted/ungraded. Used only to split speed by outcome. */
  isCorrect?: boolean | null;
}

export interface AnswerTimingStats {
  /** Questions carrying a real measurement. 0 => every other field is null. */
  recorded: number;
  /** Questions considered, measured or not. `recorded < total` => partial coverage. */
  total: number;
  /** Seconds, 1dp. Null when nothing was measured. */
  avgSec: number | null;
  medianSec: number | null;
  fastestSec: number | null;
  slowestSec: number | null;
  /** Sum of the measured questions only — NOT the attempt's wall-clock total. */
  measuredTotalSec: number | null;
  /** Speed split by outcome: the "quick but wrong" vs "slow but right" signal. */
  avgSecCorrect: number | null;
  avgSecIncorrect: number | null;
}

/** One decimal place, and never `-0`. */
function sec(ms: number): number {
  return Math.round(ms / 100) / 10 + 0;
}

function avgSec(list: number[]): number | null {
  if (!list.length) return null;
  return sec(list.reduce((a, b) => a + b, 0) / list.length);
}

/** True for a usable measurement. Rejects null, undefined, NaN and negatives. */
export function isMeasured(a: TimedAnswer): boolean {
  return typeof a.timeMs === 'number' && Number.isFinite(a.timeMs) && a.timeMs >= 0;
}

export function answerTimingStats(answers: readonly TimedAnswer[]): AnswerTimingStats {
  const total = answers.length;
  const measured = answers.filter(isMeasured);
  const times = measured.map((a) => a.timeMs as number);

  if (!times.length) {
    return {
      recorded: 0,
      total,
      avgSec: null,
      medianSec: null,
      fastestSec: null,
      slowestSec: null,
      measuredTotalSec: null,
      avgSecCorrect: null,
      avgSecIncorrect: null,
    };
  }

  const sorted = [...times].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  // Even count -> mean of the two middle values, so the median of [1,2,3,4] is 2.5 and
  // not 3; an off-by-one here is the classic silent reporting bug.
  const medianMs =
    sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

  return {
    recorded: times.length,
    total,
    avgSec: avgSec(times),
    medianSec: sec(medianMs),
    fastestSec: sec(sorted[0]),
    slowestSec: sec(sorted[sorted.length - 1]),
    measuredTotalSec: sec(times.reduce((a, b) => a + b, 0)),
    avgSecCorrect: avgSec(
      measured.filter((a) => a.isCorrect === true).map((a) => a.timeMs as number),
    ),
    avgSecIncorrect: avgSec(
      measured.filter((a) => a.isCorrect === false).map((a) => a.timeMs as number),
    ),
  };
}

/**
 * How to label timing coverage in a UI, so every screen says the same thing about the
 * same data instead of each inventing its own empty state.
 *
 * - `none`    — nothing measured (every attempt from before timing shipped). Show
 *               "Not recorded", never a 0.
 * - `partial` — some measured. The average is real but covers part of the paper, so the
 *               UI must say how much.
 * - `full`    — every question measured.
 */
export type TimingCoverage = 'none' | 'partial' | 'full';

export function timingCoverage(stats: Pick<AnswerTimingStats, 'recorded' | 'total'>): TimingCoverage {
  if (stats.recorded === 0) return 'none';
  return stats.recorded >= stats.total ? 'full' : 'partial';
}

/** `m:ss` for a duration in seconds, or an em dash when there is nothing to show. */
export function formatSec(secs: number | null | undefined): string {
  if (secs === null || secs === undefined || !Number.isFinite(secs)) return '—';
  const whole = Math.max(0, Math.round(secs));
  if (whole < 60) return `${whole}s`;
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}
