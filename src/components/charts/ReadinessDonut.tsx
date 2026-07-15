'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

export type DonutSegment = { label: string; color: string; value: number };

/**
 * Donut of a categorical distribution (e.g. readiness bands) with a centre total
 * and a compact legend. Built on recharts PieChart.
 */
export function ReadinessDonut({
  segments,
  centerValue,
  centerLabel,
  formatValue = (v) => v.toLocaleString('en-IN'),
}: {
  segments: DonutSegment[];
  centerValue: string | number;
  centerLabel: string;
  formatValue?: (v: number) => string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const data = segments.filter((s) => s.value > 0);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative h-40 w-40 shrink-0">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data.length ? data : [{ label: 'None', color: '#e2e8f0', value: 1 }]}
              dataKey="value"
              nameKey="label"
              innerRadius={52}
              outerRadius={78}
              paddingAngle={data.length > 1 ? 2 : 0}
              stroke="none"
              isAnimationActive={false}
            >
              {(data.length ? data : [{ color: '#e2e8f0' }]).map((s, i) => (
                <Cell key={i} fill={s.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v, n) => [`${formatValue(Number(v))} (${total ? Math.round((Number(v) / total) * 100) : 0}%)`, n]}
              contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black tabular-nums text-navy">{centerValue}</span>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{centerLabel}</span>
        </div>
      </div>

      <ul className="grid w-full min-w-0 gap-2 sm:max-w-[220px]">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-sm">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
            <span className="min-w-0 flex-1 truncate text-slate-600">{s.label}</span>
            <span className="font-bold tabular-nums text-navy">{formatValue(s.value)}</span>
            <span className="w-9 text-right text-xs tabular-nums text-slate-500">
              {total ? Math.round((s.value / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
