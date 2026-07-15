'use client';

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TpoSkillGap } from '@/shared/dto/tpo-analytics.dto';

function accColor(acc: number): string {
  if (acc >= 70) return '#059669';
  if (acc >= 50) return '#f59e0b';
  return '#dc2626';
}

/** Long merged topic names (e.g. "Vocabulary (Contextual • Synonyms • Antonyms)" or
 *  "Time, Speed & Distance / Boats & Streams / Trains") overflow the axis and wrap
 *  into 3-4 lines that collide. Shorten to the first segment (before " / " or " (")
 *  and hard-cap the length; the full name stays in the tooltip. */
function shortLabel(name: string): string {
  let s = name.split(' / ')[0].split(' (')[0].trim();
  if (s.length > 24) s = `${s.slice(0, 23).trimEnd()}…`;
  return s;
}

/** Single-line, right-aligned tick — plain SVG <text> never wraps (unlike recharts'
 *  default <Text>, which wrapped the long names and overlapped adjacent rows). */
function YTick({ x, y, payload }: { x?: number; y?: number; payload?: { value?: string } }) {
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fontSize={11} fill="#475569">
      {shortLabel(payload?.value ?? '')}
    </text>
  );
}

/** Horizontal bars of weakest topics by accuracy (lowest first). Recharts BarChart. */
export function SkillGapBars({ gaps }: { gaps: TpoSkillGap[] }) {
  const data = [...gaps]
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 7)
    .map((g) => ({ name: g.topic, accuracy: Math.round(g.accuracy), attempts: g.attempts }));

  if (data.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-500">Not enough practice data yet.</p>;
  }

  return (
    <div style={{ height: Math.max(160, data.length * 40) }} className="w-full">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 34, bottom: 4, left: 4 }} barSize={16}>
          <XAxis type="number" domain={[0, 100]} hide />
          <YAxis
            type="category"
            dataKey="name"
            width={150}
            tick={<YTick />}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: '#f8fafc' }}
            formatter={(v, _n, item) => [`${v}% · ${(item?.payload as { attempts?: number })?.attempts ?? 0} attempts`, 'Accuracy']}
            contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
          />
          <Bar dataKey="accuracy" radius={[0, 6, 6, 0]} isAnimationActive={false}>
            {data.map((d, i) => (
              <Cell key={i} fill={accColor(d.accuracy)} />
            ))}
            <LabelList dataKey="accuracy" position="right" formatter={(v) => `${v}%`} style={{ fontSize: 11, fontWeight: 700, fill: '#334155' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
