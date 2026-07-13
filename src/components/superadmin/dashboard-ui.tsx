'use client';

import type { ReactNode } from 'react';

/**
 * Presentational building blocks for the super-admin dashboard — pure SVG/CSS,
 * no charting dependency. Each piece is responsive (viewBox + width:100%) and
 * themed off the app tokens (navy / brand orange / accent blue / emerald).
 */

// ── KPI card ──────────────────────────────────────────────────────────────────

export function StatCard({
  label,
  value,
  sub,
  icon,
  accent = '#2563eb',
  trend,
}: {
  label: string;
  value: number | string;
  sub?: ReactNode;
  icon: ReactNode;
  accent?: string;
  trend?: { value: number; label?: string };
}) {
  const up = trend ? trend.value >= 0 : false;
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      {/* accent wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full opacity-[0.07] blur-xl transition-opacity group-hover:opacity-[0.13]"
        style={{ background: accent }}
      />
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{label}</p>
        <span
          className="flex size-9 items-center justify-center rounded-xl"
          style={{ background: `color-mix(in srgb, ${accent} 12%, white)`, color: accent }}
        >
          {icon}
        </span>
      </div>
      <div className="flex items-end gap-2">
        <p className="text-[28px] font-extrabold leading-none tracking-tight text-navy">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        {trend && (
          <span
            className={`mb-0.5 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              up ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'
            }`}
          >
            <span aria-hidden>{up ? '▲' : '▾'}</span>
            {up ? '+' : ''}
            {trend.value.toLocaleString()}
            {trend.label ? ` ${trend.label}` : ''}
          </span>
        )}
      </div>
      {sub && <p className="mt-1.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

// ── Section card shell ────────────────────────────────────────────────────────

export function Panel({
  title,
  action,
  children,
  className = '',
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{title}</p>
        {action}
      </div>
      {children}
    </section>
  );
}

// ── Area chart (smooth) ───────────────────────────────────────────────────────

export function AreaChart({
  data,
  height = 200,
  color = '#2563eb',
  id,
}: {
  data: Array<{ date: string; count: number }>;
  height?: number;
  color?: string;
  id: string;
}) {
  const W = 720;
  const H = height;
  const padX = 8;
  const padY = 18;
  const max = Math.max(1, ...data.map((d) => d.count));
  const n = data.length;
  const x = (i: number) => padX + (i * (W - padX * 2)) / Math.max(1, n - 1);
  const y = (v: number) => padY + (1 - v / max) * (H - padY * 2);

  const pts = data.map((d, i) => [x(i), y(d.count)] as const);
  // Smooth path via Catmull-Rom → cubic bézier.
  const line = pts
    .map((p, i, a) => {
      if (i === 0) return `M ${p[0]},${p[1]}`;
      const p0 = a[i - 1];
      const cx = (p0[0] + p[0]) / 2;
      return `C ${cx},${p0[1]} ${cx},${p[1]} ${p[0]},${p[1]}`;
    })
    .join(' ');
  const area = `${line} L ${x(n - 1)},${H - padY} L ${x(0)},${H - padY} Z`;

  const peak = data.reduce((m, d, i) => (d.count > data[m].count ? i : m), 0);

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
        <defs>
          <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* gridlines */}
        {[0.25, 0.5, 0.75].map((g) => (
          <line
            key={g}
            x1={padX}
            x2={W - padX}
            y1={padY + g * (H - padY * 2)}
            y2={padY + g * (H - padY * 2)}
            stroke="#f1f5f9"
            strokeWidth={1}
          />
        ))}
        <path d={area} fill={`url(#grad-${id})`} />
        <path d={line} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
        {/* peak marker */}
        <circle cx={x(peak)} cy={y(data[peak].count)} r={4} fill={color} />
        <circle cx={x(peak)} cy={y(data[peak].count)} r={8} fill={color} opacity={0.18} />
      </svg>
      <div className="mt-1 flex justify-between px-1 text-[10px] text-slate-500">
        <span>{fmtDay(data[0]?.date)}</span>
        <span className="font-semibold text-slate-600">peak {data[peak]?.count} · {fmtDay(data[peak]?.date)}</span>
        <span>{fmtDay(data[n - 1]?.date)}</span>
      </div>
    </div>
  );
}

function fmtDay(d?: string) {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ── Donut chart ───────────────────────────────────────────────────────────────

export function Donut({
  segments,
  size = 160,
  thickness = 22,
  centerTop,
  centerBottom,
}: {
  segments: Array<{ label: string; value: number; color: string }>;
  size?: number;
  thickness?: number;
  centerTop?: ReactNode;
  centerBottom?: ReactNode;
}) {
  const total = Math.max(1, segments.reduce((s, x) => s + x.value, 0));
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90" style={{ width: size, height: size }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={thickness} />
          {segments.map((s) => {
            const len = (s.value / total) * c;
            const el = (
              <circle
                key={s.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={thickness}
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
              />
            );
            offset += len;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerTop && <span className="text-2xl font-extrabold leading-none text-navy">{centerTop}</span>}
          {centerBottom && <span className="mt-1 text-[10px] uppercase tracking-widest text-slate-500">{centerBottom}</span>}
        </div>
      </div>
      <ul className="space-y-2">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-sm">
            <span className="size-2.5 rounded-full" style={{ background: s.color }} />
            <span className="text-slate-600">{s.label}</span>
            <span className="font-bold text-navy">{s.value.toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Labelled progress bar ─────────────────────────────────────────────────────

export function ProgressRow({
  label,
  value,
  total,
  color = '#2563eb',
  hint,
}: {
  label: string;
  value: number;
  total: number;
  color?: string;
  hint?: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-medium text-slate-600">{label}</span>
        <span className="text-xs text-slate-500">
          <span className="font-bold text-navy">{value.toLocaleString()}</span>
          {hint ? ` ${hint}` : ` / ${total.toLocaleString()}`}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// ── Mini stat (compact coverage tile) ─────────────────────────────────────────

export function MiniStat({
  label,
  value,
  icon,
  color = '#2563eb',
}: {
  label: string;
  value: number;
  icon: ReactNode;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
      <span
        className="mb-2 flex size-8 items-center justify-center rounded-lg"
        style={{ background: `color-mix(in srgb, ${color} 12%, white)`, color }}
      >
        {icon}
      </span>
      <p className="text-xl font-extrabold leading-none text-navy">{value.toLocaleString()}</p>
      <p className="mt-1 text-[11px] text-slate-500">{label}</p>
    </div>
  );
}
