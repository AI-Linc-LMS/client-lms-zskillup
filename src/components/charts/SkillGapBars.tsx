'use client';

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TpoSkillGap } from '@/shared/dto/tpo-analytics.dto';

function accColor(acc: number): string {
  if (acc >= 70) return '#059669';
  if (acc >= 50) return '#f59e0b';
  return '#dc2626';
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
    <div style={{ height: Math.max(160, data.length * 34) }} className="w-full">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 34, bottom: 4, left: 4 }} barSize={16}>
          <XAxis type="number" domain={[0, 100]} hide />
          <YAxis
            type="category"
            dataKey="name"
            width={128}
            tick={{ fontSize: 11, fill: '#475569' }}
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
