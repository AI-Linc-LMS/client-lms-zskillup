'use client';

import type { ComponentType, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReadinessBand } from '@/shared';

// Student "motion as default" — subtle fade+rise on mount; motion owns the
// transform so `whileHover` can lift without fighting a Tailwind hover class.
const CARD_MOTION = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
};

/**
 * Presentational building blocks for the TPO Placement Office console — Blueprint
 * light theme (white cards, 1px navy-tinted borders, orange accents), no charting
 * dependency. Every analytics surface carries a "Data Curated From" provenance
 * chip so a TPO can always see where a number comes from.
 */

// ── Readiness band pill (shared across roster surfaces) ─────────────────────────

export const BAND_STYLE: Record<ReadinessBand, string> = {
  READY: 'bg-emerald-100 text-emerald-700',
  IN_TRAINING: 'bg-amber-100 text-amber-700',
  AT_RISK: 'bg-red-100 text-red-700',
};
export const BAND_LABEL: Record<ReadinessBand, string> = {
  READY: 'Ready',
  IN_TRAINING: 'In training',
  AT_RISK: 'At risk',
};

export function ReadinessBadge({ band }: { band: ReadinessBand }) {
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', BAND_STYLE[band])}>
      {BAND_LABEL[band]}
    </span>
  );
}

// ── Provenance chip — "Data Curated From" ───────────────────────────────────────

export function ProvenanceChip({ source, className }: { source: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600',
        className,
      )}
      title={`Data curated from: ${source}`}
    >
      <Database className="size-3 text-slate-500" aria-hidden />
      <span className="truncate">{source}</span>
    </span>
  );
}

// ── Numbered bento card (the exec-dashboard grid cells) ─────────────────────────

export function BentoCard({
  n,
  title,
  subtitle,
  source,
  action,
  children,
  className,
}: {
  n?: number;
  title: string;
  subtitle?: string;
  source?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'flex flex-col rounded-2xl border border-slate-200 bg-white p-5',
        className,
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          {typeof n === 'number' && (
            <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg bg-navy text-[11px] font-bold text-white">
              {n}
            </span>
          )}
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-navy">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
      {source && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <ProvenanceChip source={source} />
        </div>
      )}
    </section>
  );
}

// ── KPI stat tile (exec header row) ─────────────────────────────────────────────

const TONE: Record<string, { chip: string; glow: string }> = {
  slate: { chip: 'bg-slate-100 text-slate-600', glow: '#64748b' },
  sky: { chip: 'bg-sky-50 text-sky-600', glow: '#0284c7' },
  emerald: { chip: 'bg-emerald-50 text-emerald-600', glow: '#059669' },
  violet: { chip: 'bg-violet-50 text-violet-600', glow: '#7c3aed' },
  red: { chip: 'bg-red-50 text-red-600', glow: '#dc2626' },
  orange: { chip: 'bg-[#fff5ea] text-[#f5b400]', glow: '#f5b400' },
};

export function KpiCard({
  icon: Icon,
  label,
  value,
  source,
  tone = 'slate',
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  source?: string;
  tone?: keyof typeof TONE;
}) {
  const t = TONE[tone] ?? TONE.slate;
  return (
    <motion.div
      {...CARD_MOTION}
      whileHover={{ y: -4 }}
      className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-4"
    >
      {/* aurora top-hairline — the student KPI signature */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1"
        style={{ background: `linear-gradient(90deg, ${t.glow}, color-mix(in srgb, ${t.glow} 30%, white))` }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-6 size-20 rounded-full opacity-[0.08] blur-2xl transition-opacity group-hover:opacity-[0.15]"
        style={{ background: t.glow }}
      />
      <span className={cn('grid size-9 place-items-center rounded-xl', t.chip)}>
        <Icon className="size-5" aria-hidden />
      </span>
      <p className="mt-3 text-2xl font-black tabular-nums leading-none text-navy">
        {typeof value === 'number' ? value.toLocaleString('en-IN') : value}
      </p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      {source && (
        <p className="mt-2 flex items-center gap-1 text-[10px] text-slate-500">
          <Database className="size-3" aria-hidden /> {source}
        </p>
      )}
    </motion.div>
  );
}

// ── Participation × performance quadrant tile ───────────────────────────────────

export function Quad({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'emerald' | 'amber' | 'sky' | 'red';
}) {
  const tint: Record<string, string> = {
    emerald: 'border-emerald-200 bg-emerald-50/60',
    amber: 'border-amber-200 bg-amber-50/60',
    sky: 'border-sky-200 bg-sky-50/60',
    red: 'border-red-200 bg-red-50/60',
  };
  return (
    <div className={cn('rounded-xl border p-3', tint[tone])}>
      <p className="text-2xl font-black tabular-nums text-navy">{value.toLocaleString('en-IN')}</p>
      <p className="mt-0.5 text-[11px] font-medium leading-tight text-slate-600">{label}</p>
    </div>
  );
}

// ── Module scaffold — a titled "in progress" surface for not-yet-built modules ──

export function ModulePlaceholder({
  icon: Icon,
  title,
  blurb,
  points,
  source,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  blurb: string;
  points: string[];
  source: string;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="relative border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white p-6">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-[#ffc42d]/[0.06] blur-3xl"
        />
        <div className="relative flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#ffd24d] to-[#f5b400] text-[#171717]">
            <Icon className="size-6" aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-navy">{title}</h1>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                In progress
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">{blurb}</p>
          </div>
        </div>
      </div>
      <div className="p-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          What you&apos;ll see here
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-2 text-sm text-slate-600">
              <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-orange" />
              {p}
            </li>
          ))}
        </ul>
        <div className="mt-5">
          <ProvenanceChip source={source} />
        </div>
      </div>
    </section>
  );
}
