'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2, Target, TrendingUp } from 'lucide-react';
import { getMyPerformanceScatter, type PerformanceParticipationDto, type ScatterPoint } from '@/lib/api/readiness';

const PART_HIGH = 15; // participation threshold (effort divider)
const PERF_HIGH = 50; // accuracy threshold (performance divider)
const KNEE = 0.4; // the effort divider always sits at 40% of the plot width
const INSET = 5; // % padding so points never clip the plot edges

type ZoneKey = 'thriving' | 'coasting' | 'grinding' | 'start';

const ZONES: Array<{ key: ZoneKey; label: string; bar: string; dot: string; tone: string }> = [
  { key: 'thriving', label: 'Thriving', bar: 'bg-emerald-400', dot: 'bg-emerald-400', tone: 'text-emerald-600' },
  { key: 'coasting', label: 'Coasting', bar: 'bg-sky-400', dot: 'bg-sky-400', tone: 'text-sky-600' },
  { key: 'grinding', label: 'Grinding', bar: 'bg-amber-400', dot: 'bg-amber-400', tone: 'text-amber-600' },
  { key: 'start', label: 'Start here', bar: 'bg-rose-300', dot: 'bg-rose-300', tone: 'text-rose-500' },
];

function p95(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * 0.95))];
}

const mean = (arr: number[]) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : 0);

/** Percentile rank of `val` within `arr` — share of the cohort at or below it. */
const pctRank = (val: number, arr: number[]) =>
  arr.length ? Math.round((arr.filter((a) => a <= val).length / arr.length) * 100) : 0;

/** Correct ordinal suffix: 1st, 2nd, 3rd, 4th … 21st … */
function ord(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

const zoneOf = (p: ScatterPoint): ZoneKey => {
  const hiP = p.performance >= PERF_HIGH;
  const hiE = p.participation >= PART_HIGH;
  return hiP && hiE ? 'thriving' : hiP ? 'coasting' : hiE ? 'grinding' : 'start';
};

/** Which zone the student sits in + a one-line nudge. Labels match the in-chart captions. */
function verdict(perf: number, part: number): { label: string; tip: string; tone: string } {
  const hiP = perf >= PERF_HIGH;
  const hiE = part >= PART_HIGH;
  if (hiP && hiE) return { label: 'Thriving', tip: 'Strong accuracy on real volume — keep the streak alive.', tone: 'text-emerald-600' };
  if (hiP && !hiE) return { label: 'Coasting', tip: 'Sharp on light practice — a bit more volume locks it in.', tone: 'text-sky-600' };
  if (!hiP && hiE) return { label: 'Grinding', tip: 'Great effort — target your weak topics to convert it into results.', tone: 'text-amber-600' };
  return { label: 'Getting started', tip: 'A little daily practice moves you up fast — start with one topic.', tone: 'text-rose-500' };
}

/** The concrete gap to reach the top (high accuracy AND high volume) zone. */
function pathToTop(perf: number, part: number): string | null {
  const hiP = perf >= PERF_HIGH;
  const hiE = part >= PART_HIGH;
  const needAcc = Math.max(0, Math.ceil(PERF_HIGH - perf));
  const needAct = Math.max(0, Math.ceil(PART_HIGH - part));
  if (hiP && hiE) return null;
  if (hiP && !hiE) return `${needAct} more activity to reach Thriving`;
  if (!hiP && hiE) return `+${needAcc}% accuracy to reach Thriving`;
  return `+${needAcc}% accuracy and ${needAct} more activity to reach Thriving`;
}

/**
 * Performance × participation quadrant for the student — your dot (orange) among
 * anonymized peers (grey), with the cohort-average marker, your percentile on each
 * axis, how the cohort splits across the four zones, and the concrete gap to the
 * top zone. A responsive HTML/CSS chart (not a stretched SVG) so every label stays
 * crisp at any dashboard width; a fixed 40% effort divider keeps the quadrants from
 * squashing on sparse data.
 */
export function PerformanceParticipation() {
  const [data, setData] = useState<PerformanceParticipationDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getMyPerformanceScatter()
      .then((d) => alive && setData(d))
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const partMax = useMemo(() => {
    const parts = [...(data?.peers ?? []).map((p) => p.participation), data?.you?.participation ?? 0];
    return Math.max(PART_HIGH * 2, p95(parts));
  }, [data]);

  // Derived analytics from the full scatter: percentiles, cohort averages, and the
  // zone distribution. Computed over the whole cohort (peers + you) so the numbers
  // agree with the plot.
  const stats = useMemo(() => {
    if (!data?.you) return null;
    const all = [...data.peers, data.you];
    const perfs = all.map((p) => p.performance);
    const parts = all.map((p) => p.participation);
    const counts: Record<ZoneKey, number> = { thriving: 0, coasting: 0, grinding: 0, start: 0 };
    for (const p of all) counts[zoneOf(p)] += 1;
    const n = all.length;
    return {
      n,
      perfPct: pctRank(data.you.performance, perfs),
      partPct: pctRank(data.you.participation, parts),
      avgPerf: Math.round(mean(perfs)),
      avgPart: Math.round(mean(parts)),
      counts,
      zonePct: {
        thriving: (counts.thriving / n) * 100,
        coasting: (counts.coasting / n) * 100,
        grinding: (counts.grinding / n) * 100,
        start: (counts.start / n) * 100,
      } as Record<ZoneKey, number>,
      yourZone: zoneOf(data.you),
    };
  }, [data]);

  // Piecewise x: 0→PART_HIGH maps to the left 40%, PART_HIGH→partMax to the right
  // 60% — the effort divider is pinned at 40% regardless of the data spread.
  const xNorm = (p: number) =>
    p <= PART_HIGH
      ? (p / PART_HIGH) * KNEE
      : KNEE + (partMax > PART_HIGH ? Math.min(1, (p - PART_HIGH) / (partMax - PART_HIGH)) : 0) * (1 - KNEE);
  const xPct = (p: number) => INSET + xNorm(p) * (100 - 2 * INSET);
  const yPct = (r: number) => INSET + (1 - Math.min(r, 100) / 100) * (100 - 2 * INSET);

  const vx = xPct(PART_HIGH); // vertical divider (%)
  const hy = yPct(PERF_HIGH); // horizontal divider (%)

  const v = data?.you ? verdict(data.you.performance, data.you.participation) : null;
  const next = data?.you ? pathToTop(data.you.performance, data.you.participation) : null;
  const peerCount = data ? Math.max(0, data.cohortSize - 1) : 0;
  const scopeWord = data?.scope === 'college' ? 'College' : 'Platform';

  const youX = data?.you ? xPct(data.you.participation) : 0;
  const youY = data?.you ? yPct(data.you.performance) : 0;
  const labelAbove = (data?.you?.performance ?? 0) <= 88;

  return (
    <div data-tour="dash:performance" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-display text-base font-bold tracking-tight text-navy">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-orange/10 text-orange">
              <Target className="size-4" />
            </span>
            Performance vs Participation
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Accuracy vs effort — you against {data?.scope === 'college' ? 'your college' : 'everyone'}.
          </p>
        </div>
        <Link
          href="/performance"
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-orange/10 hover:text-orange"
        >
          Details <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="flex h-56 items-center justify-center">
          <Loader2 className="size-5 animate-spin text-slate-300" />
        </div>
      ) : !data || !data.you || !stats ? (
        <div className="mt-4 flex h-56 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 text-center">
          <Target className="size-7 text-slate-300" />
          <p className="max-w-xs text-sm text-slate-500">Answer a few practice questions to see where you land on the map.</p>
          <Link href="/practice" className="mt-1 rounded-full bg-orange px-4 py-1.5 text-xs font-bold text-white transition hover:bg-orange/90">
            Start practising
          </Link>
        </div>
      ) : (
        <>
          {/* Metric strip — your numbers + where they place you in the cohort */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Metric
              label="Your accuracy"
              value={`${data.you.performance}%`}
              sub={peerCount > 0 ? `${ord(stats.perfPct)} percentile` : 'practice accuracy'}
            />
            <Metric
              label="Your activity"
              value={`${data.you.participation}`}
              sub={peerCount > 0 ? `${ord(stats.partPct)} percentile` : 'effort volume'}
            />
            <Metric
              label={`${scopeWord} average`}
              value={`${stats.avgPerf}%`}
              sub={`${stats.avgPart} activity · ${stats.n} students`}
            />
          </div>

          {/* Chart: y-axis rail + plot area */}
          <div className="mt-4 flex gap-2.5">
            {/* Y axis */}
            <div className="flex w-6 shrink-0 flex-col items-end justify-between py-1">
              <span className="text-[10px] font-semibold tabular-nums text-slate-300">100</span>
              <span className="-rotate-90 whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Accuracy
              </span>
              <span className="text-[10px] font-semibold tabular-nums text-slate-300">0</span>
            </div>

            {/* Plot */}
            <div className="relative aspect-[2/1] w-full min-w-0 overflow-hidden rounded-2xl bg-slate-50/40 ring-1 ring-inset ring-slate-100">
              {/* Quadrant tints */}
              <div className="absolute bg-sky-500/[0.05]" style={{ left: 0, top: 0, width: `${vx}%`, height: `${hy}%` }} />
              <div className="absolute bg-emerald-500/[0.07]" style={{ left: `${vx}%`, top: 0, right: 0, height: `${hy}%` }} />
              <div className="absolute bg-rose-500/[0.05]" style={{ left: 0, top: `${hy}%`, width: `${vx}%`, bottom: 0 }} />
              <div className="absolute bg-amber-400/[0.08]" style={{ left: `${vx}%`, top: `${hy}%`, right: 0, bottom: 0 }} />

              {/* Dividers */}
              <div className="absolute top-0 bottom-0 border-l border-dashed border-slate-300/70" style={{ left: `${vx}%` }} />
              <div className="absolute right-0 left-0 border-t border-dashed border-slate-300/70" style={{ top: `${hy}%` }} />

              {/* Quadrant captions */}
              <span className="absolute left-2.5 top-2 text-[11px] font-bold text-sky-500/90">Coasting</span>
              <span className="absolute right-2.5 top-2 text-[11px] font-bold text-emerald-600/90">Thriving</span>
              <span className="absolute left-2.5 bottom-2 text-[11px] font-bold text-rose-400/90">Start here</span>
              <span className="absolute right-2.5 bottom-2 text-[11px] font-bold text-amber-500/90">Grinding</span>

              {/* Peers */}
              {data.peers.map((p, i) => (
                <span
                  key={i}
                  className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-400/45"
                  style={{ left: `${xPct(p.participation)}%`, top: `${yPct(p.performance)}%` }}
                />
              ))}

              {/* Cohort average marker (hollow diamond) */}
              {peerCount > 0 && (
                <div
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${xPct(stats.avgPart)}%`, top: `${yPct(stats.avgPerf)}%` }}
                >
                  <span className="block size-2.5 rotate-45 border border-navy/55 bg-white/80 shadow-sm">
                    <span className="sr-only">Cohort average</span>
                  </span>
                </div>
              )}

              {/* You */}
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${youX}%`, top: `${youY}%` }}
              >
                <span className="absolute left-1/2 top-1/2 size-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange/20" />
                <span className="absolute left-1/2 top-1/2 size-7 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-orange/25" />
                <span className="relative block size-3.5 rounded-full bg-orange shadow-md ring-2 ring-white">
                  <span className="sr-only">
                    You · {data.you.performance}% accuracy · {data.you.participation} participation
                  </span>
                </span>
                <span
                  className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-extrabold text-orange ${
                    labelAbove ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                  }`}
                >
                  You
                </span>
              </div>
            </div>
          </div>

          {/* X axis caption */}
          <p className="ml-8 mt-1 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Participation →
          </p>

          {/* Cohort distribution across the four zones */}
          {peerCount > 0 && (
            <div className="mt-3.5">
              <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                <span>Where the cohort sits</span>
                <span className="normal-case tracking-normal text-slate-400">
                  You&apos;re <span className={ZONES.find((z) => z.key === stats.yourZone)!.tone}>
                    {stats.yourZone === 'start' ? 'getting started' : ZONES.find((z) => z.key === stats.yourZone)!.label.toLowerCase()}
                  </span>
                </span>
              </div>
              <div className="mt-1.5 flex h-2.5 overflow-hidden rounded-full bg-slate-100">
                {ZONES.map((z) =>
                  stats.zonePct[z.key] > 0 ? (
                    <span
                      key={z.key}
                      className={`${z.bar} ${stats.yourZone === z.key ? 'ring-2 ring-inset ring-navy/45' : ''}`}
                      style={{ width: `${stats.zonePct[z.key]}%` }}
                      title={`${z.label}: ${stats.counts[z.key]}`}
                    />
                  ) : null,
                )}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                {ZONES.map((z) => (
                  <span key={z.key} className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                    <span className={`size-2 rounded-full ${z.dot}`} />
                    {z.label}
                    <span className="tabular-nums text-slate-400">{stats.counts[z.key]}</span>
                    {stats.yourZone === z.key && <span className="font-bold text-navy">· you</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Verdict + concrete next step */}
          <div className="mt-3.5 rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
            <p className="text-xs leading-relaxed">
              <span className={`font-bold ${v!.tone}`}>{v!.label}.</span>{' '}
              <span className="text-slate-600">{v!.tip}</span>
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
              {next ? (
                <Link
                  href="/practice"
                  className="inline-flex items-center gap-1.5 rounded-full bg-navy px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-navy/90"
                >
                  <TrendingUp className="size-3.5" /> {next}
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700">
                  <TrendingUp className="size-3.5" /> Top zone — keep the streak alive
                </span>
              )}
              <span className="flex shrink-0 items-center gap-2.5 text-[11px] font-semibold text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <span className="size-2 rounded-full bg-orange" /> You
                </span>
                {peerCount > 0 && (
                  <>
                    <span className="inline-flex items-center gap-1">
                      <span className="size-2 rounded-full bg-slate-300" /> {peerCount} {data.scope === 'college' ? 'peers' : 'students'}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="size-2 rotate-45 border border-navy/55 bg-white" /> Avg
                    </span>
                  </>
                )}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Compact metric tile for the stats strip. */
function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
      <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 font-display text-lg font-bold leading-none tabular-nums text-navy">{value}</p>
      <p className="mt-1 truncate text-[10px] font-medium text-slate-400">{sub}</p>
    </div>
  );
}
