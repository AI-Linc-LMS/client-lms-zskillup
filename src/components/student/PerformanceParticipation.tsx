'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2, Target } from 'lucide-react';
import { getMyPerformanceScatter, type PerformanceParticipationDto } from '@/lib/api/readiness';

const W = 640;
const H = 380;
const PAD = { l: 40, r: 16, t: 16, b: 36 };
const PART_HIGH = 15;
const PERF_HIGH = 50;

function p95(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * 0.95))];
}

/** Which zone the student's point sits in + a one-line nudge. */
function verdict(perf: number, part: number): { label: string; tip: string; tone: string } {
  const hiP = perf >= PERF_HIGH;
  const hiE = part >= PART_HIGH;
  if (hiP && hiE) return { label: 'High effort · High performance', tip: "You're crushing it — keep the streak alive.", tone: 'text-emerald-600' };
  if (hiP && !hiE) return { label: 'Low effort · High performance', tip: 'Sharp results on light practice — a bit more volume locks it in.', tone: 'text-sky-600' };
  if (!hiP && hiE) return { label: 'High effort · Needs support', tip: 'Great effort — target your weak topics to convert it into results.', tone: 'text-amber-600' };
  return { label: 'Just getting started', tip: 'A little daily practice moves you up fast — start with one topic.', tone: 'text-rose-600' };
}

/**
 * Performance × participation quadrant for the student — the same lens a TPO
 * sees for the cohort, but from your seat: your dot (orange) among anonymized
 * peers (grey). Performance = practice accuracy; participation = activity volume.
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

  const xMax = useMemo(() => {
    const parts = [...(data?.peers ?? []).map((p) => p.participation), data?.you?.participation ?? 0];
    return Math.max(PART_HIGH * 2, p95(parts));
  }, [data]);

  const x = (p: number) => PAD.l + (Math.min(p, xMax) / (xMax || 1)) * (W - PAD.l - PAD.r);
  const y = (r: number) => PAD.t + (1 - Math.min(r, 100) / 100) * (H - PAD.t - PAD.b);
  const vx = x(PART_HIGH);
  const hy = y(PERF_HIGH);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-black text-navy">
          <Target className="size-4 text-orange" /> Performance vs Participation
        </h2>
        <Link href="/performance" className="inline-flex items-center gap-1 text-xs font-semibold text-orange hover:underline">
          Details <ArrowRight className="size-3.5" />
        </Link>
      </div>
      <p className="mb-3 text-xs text-slate-500">
        Where you land against {data?.scope === 'college' ? 'your college' : 'the bar'} — effort on the X axis, accuracy on the Y.
      </p>

      {loading ? (
        <div className="flex h-56 items-center justify-center"><Loader2 className="size-6 animate-spin text-slate-300" /></div>
      ) : !data || !data.you ? (
        <div className="flex h-56 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 text-center">
          <Target className="size-8 text-slate-300" />
          <p className="max-w-xs text-sm text-slate-500">Answer a few practice questions to see where you land on the map.</p>
          <Link href="/practice" className="mt-1 rounded-full bg-orange px-4 py-1.5 text-xs font-bold text-white hover:bg-orange/90">Start practising</Link>
        </div>
      ) : (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Your performance versus participation">
            {/* Quadrant tints */}
            <rect x={PAD.l} y={PAD.t} width={vx - PAD.l} height={hy - PAD.t} fill="#0284c7" opacity={0.05} />
            <rect x={vx} y={PAD.t} width={W - PAD.r - vx} height={hy - PAD.t} fill="#059669" opacity={0.06} />
            <rect x={PAD.l} y={hy} width={vx - PAD.l} height={H - PAD.b - hy} fill="#dc2626" opacity={0.05} />
            <rect x={vx} y={hy} width={W - PAD.r - vx} height={H - PAD.b - hy} fill="#f59e0b" opacity={0.06} />
            {/* Dividers + frame */}
            <line x1={vx} y1={PAD.t} x2={vx} y2={H - PAD.b} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="4 4" />
            <line x1={PAD.l} y1={hy} x2={W - PAD.r} y2={hy} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="4 4" />
            <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={H - PAD.b} stroke="#e2e8f0" />
            <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} stroke="#e2e8f0" />
            {/* Zone labels */}
            <text x={vx + 8} y={PAD.t + 14} className="fill-emerald-600" fontSize="10.5" fontWeight="700">High effort · High performance</text>
            <text x={PAD.l + 6} y={PAD.t + 14} className="fill-sky-600" fontSize="10.5" fontWeight="700">Low effort · High</text>
            <text x={vx + 8} y={H - PAD.b - 8} className="fill-amber-600" fontSize="10.5" fontWeight="700">High effort · Needs support</text>
            <text x={PAD.l + 6} y={H - PAD.b - 8} className="fill-red-600" fontSize="10.5" fontWeight="700">Low effort · Low</text>
            {/* Axis captions */}
            <text x={(W + PAD.l) / 2} y={H - 4} textAnchor="middle" className="fill-slate-400" fontSize="10.5">Participation →</text>
            <text x={12} y={(H - PAD.b + PAD.t) / 2} textAnchor="middle" fontSize="10.5" className="fill-slate-400" transform={`rotate(-90 12 ${(H - PAD.b + PAD.t) / 2})`}>Accuracy →</text>
            {[0, 50, 100].map((r) => (
              <text key={r} x={PAD.l - 6} y={y(r) + 3} textAnchor="end" fontSize="9" className="fill-slate-400">{r}</text>
            ))}
            {/* Peers (anonymized) */}
            {data.peers.map((p, i) => (
              <circle key={i} cx={x(p.participation)} cy={y(p.performance)} r={3.5} fill="#94a3b8" opacity={0.5} />
            ))}
            {/* You */}
            <circle cx={x(data.you.participation)} cy={y(data.you.performance)} r={11} fill="#f37021" opacity={0.18} />
            <circle cx={x(data.you.participation)} cy={y(data.you.performance)} r={6} fill="#f37021" stroke="white" strokeWidth={2}>
              <title>{`You · ${data.you.performance}% accuracy · ${data.you.participation} participation`}</title>
            </circle>
            <text x={x(data.you.participation)} y={y(data.you.performance) - 12} textAnchor="middle" fontSize="10" fontWeight="800" className="fill-orange">You</text>
          </svg>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <p className="text-sm">
              <span className={`font-bold ${verdict(data.you.performance, data.you.participation).tone}`}>
                {verdict(data.you.performance, data.you.participation).label}.
              </span>{' '}
              <span className="text-slate-500">{verdict(data.you.performance, data.you.participation).tip}</span>
            </p>
            {data.scope === 'college' && (
              <span className="flex items-center gap-3 text-[11px] font-semibold text-slate-400">
                <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-full bg-orange" /> You</span>
                <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-full bg-slate-400/60" /> {data.cohortSize - 1} peers</span>
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
