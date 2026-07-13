'use client';

import {
  CartesianGrid,
  Cell,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TpoStudentRow } from '@/shared/dto/tpo-analytics.dto';

const MID = 50;

/** Quadrant colour by (performance x, participation y), split at the 50 midpoint. */
function quadColor(perf: number, part: number): string {
  if (part >= MID && perf >= MID) return '#059669'; // high effort · high performance
  if (part >= MID && perf < MID) return '#f59e0b'; // high effort · needs support
  if (part < MID && perf >= MID) return '#0284c7'; // low effort · high performance
  return '#dc2626'; // low effort · low performance
}

type Pt = { x: number; y: number; name: string; branch: string; readiness: number; participation: number };

function ScatterTip({ active, payload }: { active?: boolean; payload?: { payload: Pt }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-bold text-navy">{p.name}</p>
      {p.branch && <p className="text-slate-500">{p.branch}</p>}
      <p className="mt-1 text-slate-600">
        Performance <span className="font-semibold tabular-nums text-navy">{p.readiness}%</span>
      </p>
      <p className="text-slate-600">
        Participation <span className="font-semibold tabular-nums text-navy">{p.participation}%</span>
      </p>
    </div>
  );
}

/**
 * Performance × Participation map — one dot per student, coloured by quadrant,
 * split at the 50-line. Faint quadrant tints + corner counts match the exec view.
 */
export function ParticipationScatter({ students }: { students: TpoStudentRow[] }) {
  const points: Pt[] = students.map((s) => ({
    x: s.readiness,
    y: s.participation,
    name: s.name ?? s.email,
    branch: s.branch ?? '',
    readiness: s.readiness,
    participation: s.participation,
  }));

  const q = {
    hphp: points.filter((p) => p.y >= MID && p.x >= MID).length,
    hplp: points.filter((p) => p.y >= MID && p.x < MID).length,
    lphp: points.filter((p) => p.y < MID && p.x >= MID).length,
    lplp: points.filter((p) => p.y < MID && p.x < MID).length,
  };

  const corner = 'pointer-events-none absolute z-10 text-[11px] font-semibold leading-tight';

  return (
    <div className="relative h-72 w-full">
      {/* Corner quadrant labels (overlay) */}
      <span className={`${corner} left-10 top-1 text-amber-600`}>
        High part · low perf<br />
        <b className="text-sm tabular-nums">{q.hplp}</b>
      </span>
      <span className={`${corner} right-2 top-1 text-right text-emerald-600`}>
        High part · high perf<br />
        <b className="text-sm tabular-nums">{q.hphp}</b>
      </span>
      <span className={`${corner} bottom-8 left-10 text-rose-600`}>
        Low part · low perf<br />
        <b className="text-sm tabular-nums">{q.lplp}</b>
      </span>
      <span className={`${corner} bottom-8 right-2 text-right text-sky-600`}>
        Low part · high perf<br />
        <b className="text-sm tabular-nums">{q.lphp}</b>
      </span>

      <ResponsiveContainer>
        <ScatterChart margin={{ top: 8, right: 12, bottom: 18, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          {/* Quadrant tints */}
          <ReferenceArea x1={MID} x2={100} y1={MID} y2={100} fill="#059669" fillOpacity={0.05} />
          <ReferenceArea x1={0} x2={MID} y1={MID} y2={100} fill="#f59e0b" fillOpacity={0.05} />
          <ReferenceArea x1={MID} x2={100} y1={0} y2={MID} fill="#0284c7" fillOpacity={0.05} />
          <ReferenceArea x1={0} x2={MID} y1={0} y2={MID} fill="#dc2626" fillOpacity={0.05} />
          <ReferenceLine x={MID} stroke="#cbd5e1" strokeDasharray="4 4" />
          <ReferenceLine y={MID} stroke="#cbd5e1" strokeDasharray="4 4" />
          <XAxis
            type="number"
            dataKey="x"
            domain={[0, 100]}
            tickCount={6}
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            label={{ value: 'Performance (assessment score) →', position: 'insideBottom', offset: -10, fontSize: 10, fill: '#94a3b8' }}
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={[0, 100]}
            tickCount={6}
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            label={{ value: 'Participation →', angle: -90, position: 'insideLeft', offset: 16, fontSize: 10, fill: '#94a3b8' }}
          />
          <Tooltip content={<ScatterTip />} />
          <Scatter data={points} isAnimationActive={false}>
            {points.map((p, i) => (
              <Cell key={i} fill={quadColor(p.x, p.y)} fillOpacity={0.7} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
