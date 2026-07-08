'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2, Target } from 'lucide-react';
import { getMyPerformanceScatter, type PerformanceParticipationDto } from '@/lib/api/readiness';

const PART_HIGH = 15; // participation threshold (effort divider)
const PERF_HIGH = 50; // accuracy threshold (performance divider)
const KNEE = 0.4; // the effort divider always sits at 40% of the plot width
const INSET = 5; // % padding so points never clip the plot edges

function p95(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * 0.95))];
}

/** Which zone the student's point sits in + a one-line nudge. Labels match the
 *  in-chart quadrant captions so the read is coherent. */
function verdict(perf: number, part: number): { label: string; tip: string; tone: string } {
  const hiP = perf >= PERF_HIGH;
  const hiE = part >= PART_HIGH;
  if (hiP && hiE) return { label: 'Thriving', tip: 'Strong accuracy on real volume — keep the streak alive.', tone: 'text-emerald-600' };
  if (hiP && !hiE) return { label: 'Coasting', tip: 'Sharp on light practice — a bit more volume locks it in.', tone: 'text-sky-600' };
  if (!hiP && hiE) return { label: 'Grinding', tip: 'Great effort — target your weak topics to convert it into results.', tone: 'text-amber-600' };
  return { label: 'Getting started', tip: 'A little daily practice moves you up fast — start with one topic.', tone: 'text-rose-500' };
}

/**
 * Performance × participation quadrant for the student — your dot (orange) among
 * anonymized peers (grey). Performance = practice accuracy; participation = activity
 * volume. Rebuilt as a responsive HTML/CSS chart (not a stretched SVG): every label
 * uses the platform font at a real size, so it stays crisp at any dashboard width.
 * A fixed 40% effort divider keeps the quadrants from squashing on sparse data.
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

  // Piecewise x: 0→PART_HIGH maps to the left 40%, PART_HIGH→partMax to the right
  // 60% — the effort divider is pinned at 40% regardless of the data spread. Both
  // axes are inset so points sit comfortably inside the frame.
  const xNorm = (p: number) =>
    p <= PART_HIGH
      ? (p / PART_HIGH) * KNEE
      : KNEE + (partMax > PART_HIGH ? Math.min(1, (p - PART_HIGH) / (partMax - PART_HIGH)) : 0) * (1 - KNEE);
  const xPct = (p: number) => INSET + xNorm(p) * (100 - 2 * INSET);
  const yPct = (r: number) => INSET + (1 - Math.min(r, 100) / 100) * (100 - 2 * INSET);

  const vx = xPct(PART_HIGH); // vertical divider (%)
  const hy = yPct(PERF_HIGH); // horizontal divider (%)

  const v = data?.you ? verdict(data.you.performance, data.you.participation) : null;
  const peerCount = data ? Math.max(0, data.cohortSize - 1) : 0;

  const youX = data?.you ? xPct(data.you.participation) : 0;
  const youY = data?.you ? yPct(data.you.performance) : 0;
  const labelAbove = (data?.you?.performance ?? 0) <= 88;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
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
      ) : !data || !data.you ? (
        <div className="mt-4 flex h-56 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 text-center">
          <Target className="size-7 text-slate-300" />
          <p className="max-w-xs text-sm text-slate-500">Answer a few practice questions to see where you land on the map.</p>
          <Link href="/practice" className="mt-1 rounded-full bg-orange px-4 py-1.5 text-xs font-bold text-white transition hover:bg-orange/90">
            Start practising
          </Link>
        </div>
      ) : (
        <>
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

          {/* Verdict + legend */}
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-slate-100 pt-3">
            <p className="min-w-0 text-xs">
              <span className={`font-bold ${v!.tone}`}>{v!.label}.</span> <span className="text-slate-500">{v!.tip}</span>
            </p>
            <span className="flex shrink-0 items-center gap-2.5 text-[11px] font-semibold text-slate-400">
              <span className="inline-flex items-center gap-1">
                <span className="size-2 rounded-full bg-orange" /> You
              </span>
              {peerCount > 0 && (
                <span className="inline-flex items-center gap-1">
                  <span className="size-2 rounded-full bg-slate-300" /> {peerCount} {data.scope === 'college' ? 'peers' : 'students'}
                </span>
              )}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
