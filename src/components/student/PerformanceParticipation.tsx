'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2, Target } from 'lucide-react';
import { getMyPerformanceScatter, type PerformanceParticipationDto } from '@/lib/api/readiness';

const W = 560;
const H = 232;
const PAD = { l: 30, r: 14, t: 20, b: 28 };
const PART_HIGH = 15; // participation threshold (effort divider)
const PERF_HIGH = 50; // accuracy threshold (performance divider)
const KNEE = 0.4; // the effort divider always sits at 40% of the plot width

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
 * Performance × participation quadrant for the student — the same lens a TPO sees
 * for a cohort, from your seat: your dot (orange) among anonymized peers (grey).
 * Performance = practice accuracy; participation = activity volume. Compact: a
 * short wide chart, a fixed 40% effort divider (so the quadrants never squash and
 * the corner labels never collide) and a one-line verdict.
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

  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  // Piecewise x: 0→PART_HIGH maps to the left 40%, PART_HIGH→partMax to the right
  // 60% — the effort divider is pinned at 40% regardless of the data spread.
  const xNorm = (p: number) =>
    p <= PART_HIGH
      ? (p / PART_HIGH) * KNEE
      : KNEE + (partMax > PART_HIGH ? Math.min(1, (p - PART_HIGH) / (partMax - PART_HIGH)) : 0) * (1 - KNEE);
  const x = (p: number) => PAD.l + xNorm(p) * plotW;
  const y = (r: number) => PAD.t + (1 - Math.min(r, 100) / 100) * plotH;
  const vx = x(PART_HIGH);
  const hy = y(PERF_HIGH);

  const v = data?.you ? verdict(data.you.performance, data.you.participation) : null;
  const peerCount = data ? Math.max(0, data.cohortSize - 1) : 0;

  const youX = data?.you ? x(data.you.participation) : 0;
  const youY = data?.you ? y(data.you.performance) : 0;
  const labelX = Math.max(PAD.l + 12, Math.min(W - PAD.r - 12, youX));
  const labelAbove = (data?.you?.performance ?? 0) <= 88;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-black text-navy">
            <Target className="size-4 shrink-0 text-orange" /> Performance vs Participation
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Accuracy vs effort — you against {data?.scope === 'college' ? 'your college' : 'everyone'}.
          </p>
        </div>
        <Link href="/performance" className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-orange hover:underline">
          Details <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="flex h-44 items-center justify-center"><Loader2 className="size-5 animate-spin text-slate-300" /></div>
      ) : !data || !data.you ? (
        <div className="mt-3 flex h-44 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 text-center">
          <Target className="size-7 text-slate-300" />
          <p className="max-w-xs text-sm text-slate-500">Answer a few practice questions to see where you land on the map.</p>
          <Link href="/practice" className="mt-1 rounded-full bg-orange px-4 py-1.5 text-xs font-bold text-white hover:bg-orange/90">Start practising</Link>
        </div>
      ) : (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label="Your performance versus participation">
            {/* Quadrant tints */}
            <rect x={PAD.l} y={PAD.t} width={vx - PAD.l} height={hy - PAD.t} fill="#0284c7" opacity={0.045} />
            <rect x={vx} y={PAD.t} width={W - PAD.r - vx} height={hy - PAD.t} fill="#059669" opacity={0.06} />
            <rect x={PAD.l} y={hy} width={vx - PAD.l} height={H - PAD.b - hy} fill="#f43f5e" opacity={0.045} />
            <rect x={vx} y={hy} width={W - PAD.r - vx} height={H - PAD.b - hy} fill="#f59e0b" opacity={0.06} />
            {/* Dividers + frame */}
            <line x1={vx} y1={PAD.t} x2={vx} y2={H - PAD.b} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="4 4" />
            <line x1={PAD.l} y1={hy} x2={W - PAD.r} y2={hy} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="4 4" />
            <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={H - PAD.b} stroke="#e2e8f0" />
            <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} stroke="#e2e8f0" />
            {/* Short quadrant labels, pinned to opposite corners so they never collide */}
            <text x={PAD.l + 5} y={PAD.t + 12} fontSize="9.5" fontWeight="700" className="fill-sky-500">Coasting</text>
            <text x={W - PAD.r - 5} y={PAD.t + 12} textAnchor="end" fontSize="9.5" fontWeight="700" className="fill-emerald-600">Thriving</text>
            <text x={PAD.l + 5} y={H - PAD.b - 6} fontSize="9.5" fontWeight="700" className="fill-rose-400">Start here</text>
            <text x={W - PAD.r - 5} y={H - PAD.b - 6} textAnchor="end" fontSize="9.5" fontWeight="700" className="fill-amber-500">Grinding</text>
            {/* Axis captions */}
            <text x={PAD.l + plotW / 2} y={H - 2} textAnchor="middle" fontSize="9.5" className="fill-slate-400">Participation →</text>
            <text x={9} y={PAD.t + plotH / 2} textAnchor="middle" fontSize="9.5" className="fill-slate-400" transform={`rotate(-90 9 ${PAD.t + plotH / 2})`}>Accuracy →</text>
            {[0, 50, 100].map((r) => (
              <text key={r} x={PAD.l - 5} y={y(r) + 3} textAnchor="end" fontSize="8" className="fill-slate-300">{r}</text>
            ))}
            {/* Peers (anonymized, active only) */}
            {data.peers.map((p, i) => (
              <circle key={i} cx={x(p.participation)} cy={y(p.performance)} r={2.6} fill="#94a3b8" opacity={0.4} />
            ))}
            {/* You */}
            <circle cx={youX} cy={youY} r={10} fill="#f37021" opacity={0.16} />
            <circle cx={youX} cy={youY} r={5.5} fill="#f37021" stroke="white" strokeWidth={2}>
              <title>{`You · ${data.you.performance}% accuracy · ${data.you.participation} participation`}</title>
            </circle>
            <text x={labelX} y={labelAbove ? youY - 11 : youY + 18} textAnchor="middle" fontSize="10" fontWeight="800" className="fill-orange">You</text>
          </svg>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-slate-100 pt-2.5">
            <p className="min-w-0 text-xs">
              <span className={`font-bold ${v!.tone}`}>{v!.label}.</span>{' '}
              <span className="text-slate-500">{v!.tip}</span>
            </p>
            <span className="flex shrink-0 items-center gap-2.5 text-[11px] font-semibold text-slate-400">
              <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-orange" /> You</span>
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
