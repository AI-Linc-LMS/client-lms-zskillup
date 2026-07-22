'use client';

import { useMemo, useState } from 'react';
import type { ReadinessBand, TpoStudentRow } from '@/shared';

/**
 * Performance × Participation scatter - pure SVG, no chart lib. Each dot is a
 * student (x = participation volume, y = readiness). Two dividers split the plane
 * into the four quadrants the TPO acts on; click a dot to open the drill-down.
 */

const BAND_DOT: Record<ReadinessBand, string> = {
  READY: '#059669',
  IN_TRAINING: '#f59e0b',
  AT_RISK: '#dc2626',
};

const W = 720;
const H = 420;
const PAD = { l: 44, r: 18, t: 18, b: 40 };

/** 95th percentile so a single hyper-active student doesn't squash the axis. */
function p95(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
}

export function QuadrantScatter({
  students,
  partHigh = 15,
  perfHigh = 50,
  onSelect,
}: {
  students: TpoStudentRow[];
  partHigh?: number;
  perfHigh?: number;
  onSelect: (id: string) => void;
}) {
  const [hoverId, setHoverId] = useState<string | null>(null);

  const xMax = useMemo(
    () => Math.max(partHigh * 2, p95(students.map((s) => s.participation))),
    [students, partHigh],
  );

  const x = (p: number) => PAD.l + (Math.min(p, xMax) / (xMax || 1)) * (W - PAD.l - PAD.r);
  const y = (r: number) => PAD.t + (1 - r / 100) * (H - PAD.t - PAD.b);
  const vx = x(partHigh);
  const hy = y(perfHigh);

  const hovered = students.find((s) => s.id === hoverId) ?? null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Performance versus participation scatter plot">
      {/* Quadrant tints */}
      <rect x={PAD.l} y={PAD.t} width={vx - PAD.l} height={hy - PAD.t} fill="#0284c7" opacity={0.05} />
      <rect x={vx} y={PAD.t} width={W - PAD.r - vx} height={hy - PAD.t} fill="#059669" opacity={0.06} />
      <rect x={PAD.l} y={hy} width={vx - PAD.l} height={H - PAD.b - hy} fill="#dc2626" opacity={0.05} />
      <rect x={vx} y={hy} width={W - PAD.r - vx} height={H - PAD.b - hy} fill="#f59e0b" opacity={0.06} />

      {/* Dividers */}
      <line x1={vx} y1={PAD.t} x2={vx} y2={H - PAD.b} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="4 4" />
      <line x1={PAD.l} y1={hy} x2={W - PAD.r} y2={hy} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="4 4" />

      {/* Axis frame */}
      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={H - PAD.b} stroke="#e2e8f0" strokeWidth={1} />
      <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} stroke="#e2e8f0" strokeWidth={1} />

      {/* Quadrant labels */}
      <text x={vx + 8} y={PAD.t + 14} className="fill-emerald-600" fontSize="11" fontWeight="700">High effort · High performance</text>
      <text x={PAD.l + 6} y={PAD.t + 14} className="fill-sky-600" fontSize="11" fontWeight="700">Low effort · High performance</text>
      <text x={vx + 8} y={H - PAD.b - 8} className="fill-amber-600" fontSize="11" fontWeight="700">High effort · Needs support</text>
      <text x={PAD.l + 6} y={H - PAD.b - 8} className="fill-red-600" fontSize="11" fontWeight="700">Low effort · Low performance</text>

      {/* Axis captions */}
      <text x={(W + PAD.l) / 2} y={H - 6} textAnchor="middle" className="fill-slate-400" fontSize="11">Participation →</text>
      <text x={14} y={(H - PAD.b + PAD.t) / 2} textAnchor="middle" fontSize="11" className="fill-slate-400" transform={`rotate(-90 14 ${(H - PAD.b + PAD.t) / 2})`}>Readiness →</text>
      {[0, 50, 100].map((r) => (
        <text key={r} x={PAD.l - 6} y={y(r) + 3} textAnchor="end" fontSize="9" className="fill-slate-400">{r}</text>
      ))}

      {/* Dots */}
      {students.map((s) => {
        const on = s.id === hoverId;
        return (
          <circle
            key={s.id}
            cx={x(s.participation)}
            cy={y(s.readiness)}
            r={on ? 6 : 4}
            fill={BAND_DOT[s.band]}
            opacity={on ? 1 : 0.72}
            stroke={on ? '#0a0a0c' : 'white'}
            strokeWidth={on ? 1.5 : 0.5}
            className="cursor-pointer transition-[r]"
            onMouseEnter={() => setHoverId(s.id)}
            onMouseLeave={() => setHoverId((cur) => (cur === s.id ? null : cur))}
            onClick={() => onSelect(s.id)}
          >
            <title>{`${s.name ?? s.email} · ${s.readiness}% readiness · ${s.participation} participation`}</title>
          </circle>
        );
      })}

      {/* In-SVG tooltip for the hovered dot */}
      {hovered && (
        <g pointerEvents="none" transform={`translate(${Math.min(x(hovered.participation) + 10, W - 190)}, ${Math.max(y(hovered.readiness) - 34, PAD.t)})`}>
          <rect width={180} height={30} rx={6} fill="#0a0a0c" opacity={0.92} />
          <text x={8} y={13} fontSize="10" fontWeight="700" fill="white">{hovered.name ?? hovered.email}</text>
          <text x={8} y={24} fontSize="9" fill="#cbd5e1">{`${hovered.readiness}% readiness · ${hovered.participation} participation`}</text>
        </g>
      )}
    </svg>
  );
}
