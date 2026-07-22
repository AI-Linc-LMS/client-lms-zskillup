'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Building2,
  Loader2,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedNumber } from '@/components/motion/primitives';
import { getCompanyReadiness, type CompanyReadiness } from '@/lib/api/adaptive';

/**
 * Per-band visual recipe. `from`/`to` drive gradient bars, icon chips and the
 * conic readiness ring; `glow` is the ambient blob; `text`/`badge` keep the
 * legible accents. Aurora depth = layered gradient + glow + ring, never a flat fill.
 */
const BAND = {
  emerging: {
    label: 'Emerging',
    from: '#fb7185',
    to: '#e11d48',
    glow: 'rgba(225,29,72,0.18)',
    text: 'text-rose-600',
    track: 'rgba(225,29,72,0.12)',
    badge: 'bg-rose-50 text-rose-700 ring-rose-200',
  },
  developing: {
    label: 'Developing',
    from: '#fbbf24',
    to: '#f59e0b',
    glow: 'rgba(245,158,11,0.18)',
    text: 'text-amber-600',
    track: 'rgba(245,158,11,0.12)',
    badge: 'bg-amber-50 text-amber-700 ring-amber-200',
  },
  proficient: {
    label: 'Proficient',
    from: '#60a5fa',
    to: '#2563eb',
    glow: 'rgba(37,99,235,0.18)',
    text: 'text-blue-600',
    track: 'rgba(37,99,235,0.12)',
    badge: 'bg-blue-50 text-blue-700 ring-blue-200',
  },
  mastered: {
    label: 'Mastered',
    from: '#34d399',
    to: '#059669',
    glow: 'rgba(5,150,105,0.2)',
    text: 'text-emerald-600',
    track: 'rgba(5,150,105,0.12)',
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  },
} as const;

const READY_THRESHOLD = 65; // >= this % = "ready"
const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Shows per-company readiness scores on the student dashboard,
 * derived from their latest completed adaptive mock session.
 */
export function CompanyReadiness() {
  const [data, setData] = useState<CompanyReadiness[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCompanyReadiness()
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <Loader2 className="size-4 animate-spin text-[#f5b400]" />
          Checking company readiness…
        </div>
        <div className="mt-4 space-y-3">
          <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-3 w-2/3 animate-pulse rounded-full bg-slate-100" />
          <div className="h-3 w-1/2 animate-pulse rounded-full bg-slate-100" />
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <EmptyState />;
  }

  const ready = data.filter((c) => c.readinessPct >= READY_THRESHOLD);
  const notReady = data.filter((c) => c.readinessPct < READY_THRESHOLD);
  const topCompany = data[0];
  const topBand = BAND[topCompany.readinessBand];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, ease: EASE }}
      className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 transition-all hover:-translate-y-0.5"
    >
      {/* layered depth: faint wash + a colored glow that intensifies on hover */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#ffc42d]/[0.04] via-transparent to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full opacity-50 blur-3xl transition-opacity duration-500 group-hover:opacity-90"
        style={{ background: topBand.glow }}
      />

      <div className="relative z-10 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className="grid size-8 place-items-center rounded-xl text-[#171717] shadow-sm"
              style={{ background: 'linear-gradient(135deg, #ffd24d, #f5b400)' }}
            >
              <Building2 className="size-4" />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Career readiness
              </p>
              <p className="-mt-0.5 text-sm font-bold text-navy">Companies</p>
            </div>
          </div>
          {ready.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">
              <Trophy className="size-3" />
              <AnimatedNumber value={ready.length} /> ready
            </span>
          )}
        </div>

        {/* Top company highlight - readiness ring + best/weak skill */}
        {topCompany && (
          <motion.div
            whileHover={{ y: -2 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-4"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background: `linear-gradient(135deg, ${topBand.glow}, transparent 60%)`,
              }}
            />
            <div className="relative z-10 flex items-center gap-4">
              <ReadinessRing
                pct={topCompany.readinessPct}
                from={topBand.from}
                to={topBand.to}
                track={topBand.track}
                textClass={topBand.text}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-navy">{topCompany.companyName}</p>
                <p className="truncate text-[11px] text-slate-600">{topCompany.companyType}</p>
                <span
                  className={cn(
                    'mt-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ring-1',
                    topBand.badge,
                  )}
                >
                  {topBand.label}
                </span>
              </div>
            </div>

            {/* best & weakest skill snapshot */}
            {(topCompany.topSkill || topCompany.weakSkill) && (
              <div className="relative z-10 mt-3 grid grid-cols-2 gap-2">
                {topCompany.topSkill && (
                  <SkillPill
                    icon={<TrendingUp className="size-3 text-emerald-600" />}
                    label="Strongest"
                    skill={topCompany.topSkill.skill}
                    pct={topCompany.topSkill.masteryPct}
                    accent="text-emerald-600"
                  />
                )}
                {topCompany.weakSkill && (
                  <SkillPill
                    icon={<Target className="size-3 text-rose-600" />}
                    label="Focus"
                    skill={topCompany.weakSkill.skill}
                    pct={topCompany.weakSkill.masteryPct}
                    accent="text-rose-600"
                  />
                )}
              </div>
            )}

            {topCompany.readinessPct >= READY_THRESHOLD && (
              <p className="relative z-10 mt-3 flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
                <Sparkles className="size-3.5" /> You&apos;re ready to apply!
              </p>
            )}
          </motion.div>
        )}

        {/* Other companies - gradient readiness bars */}
        {data.length > 1 && (
          <div className="space-y-2.5">
            {data.slice(1).map((c, i) => {
              const band = BAND[c.readinessBand];
              return (
                <div key={c.companyId} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 truncate text-xs font-semibold text-navy">
                    {c.companyName}
                  </span>
                  <div
                    className="h-2 flex-1 overflow-hidden rounded-full"
                    style={{ background: band.track }}
                  >
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        background: `linear-gradient(90deg, ${band.from}, ${band.to})`,
                      }}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${c.readinessPct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.9, delay: 0.15 + i * 0.08, ease: EASE }}
                    />
                  </div>
                  <span className={cn('w-9 text-right text-xs font-extrabold tabular-nums', band.text)}>
                    {c.readinessPct}%
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Improve CTA */}
        {notReady.length > 0 && (
          <div className="border-t border-slate-100 pt-3.5">
            <p className="mb-2.5 text-[11px] leading-relaxed text-slate-600">
              Practice weak skills to boost readiness for{' '}
              <span className="font-semibold text-slate-600">
                {notReady.map((c) => c.companyName).join(', ')}
              </span>
              .
            </p>
            <Link
              href="/mock-assessment"
              className="group/cta inline-flex items-center gap-1.5 rounded-full bg-gradient-to-b from-[#ffd24d] via-[#ffc42d] to-[#f5b400] px-4 py-2 text-xs font-bold text-[#171717] shadow-[0_10px_24px_-12px_rgba(245,180,0,0.5)] transition-transform active:scale-[0.98]"
            >
              Retake adaptive test
              <ArrowRight className="size-3.5 transition-transform group-hover/cta:translate-x-0.5" />
            </Link>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/** Animated conic-gradient readiness ring with a counting % at its center. */
function ReadinessRing({
  pct,
  from,
  to,
  track,
  textClass,
}: {
  pct: number;
  from: string;
  to: string;
  track: string;
  textClass: string;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="relative grid size-[68px] shrink-0 place-items-center">
      <motion.div
        aria-hidden
        className="absolute inset-0 rounded-full"
        initial={{ rotate: -90, opacity: 0.4 }}
        whileInView={{ rotate: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: EASE }}
        style={{
          background: `conic-gradient(${from} 0deg, ${to} ${clamped * 3.6}deg, ${track} ${clamped * 3.6}deg)`,
        }}
      />
      <div className="absolute inset-[5px] rounded-full bg-white" />
      <span className={cn('relative text-base font-extrabold tabular-nums', textClass)}>
        <AnimatedNumber value={clamped} format={(n) => `${n}%`} />
      </span>
    </div>
  );
}

/** Compact strongest/focus skill chip used under the top-company card. */
function SkillPill({
  icon,
  label,
  skill,
  pct,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  skill: string;
  pct: number;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 px-2.5 py-2">
      <div className="flex items-center gap-1">
        {icon}
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
          {label}
        </span>
      </div>
      <p className="mt-0.5 truncate text-[11px] font-semibold text-navy">{skill}</p>
      <p className={cn('text-[11px] font-extrabold tabular-nums', accent)}>{pct}%</p>
    </div>
  );
}

/** Beautiful aurora empty state - gradient icon, glow, and a clear CTA. */
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, ease: EASE }}
      className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 text-center transition-all hover:-translate-y-0.5"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -left-10 -top-12 size-40 rounded-full bg-[#ffc42d]/15 opacity-60 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-12 -right-10 size-40 rounded-full bg-[#6d3bf5]/15 opacity-50 blur-3xl transition-opacity duration-500 group-hover:opacity-90"
      />

      <div className="relative z-10 flex flex-col items-center">
        <motion.span
          className="grid size-14 place-items-center rounded-2xl text-[#171717] shadow-[0_12px_28px_-12px_rgba(245,180,0,0.4)]"
          style={{ background: 'linear-gradient(135deg, #ffd24d, #f5b400)' }}
          initial={{ scale: 0.85, rotate: -6 }}
          whileInView={{ scale: 1, rotate: 0 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
        >
          <Building2 className="size-6" />
        </motion.span>

        <p className="mt-4 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          Career readiness
        </p>
        <p className="mt-0.5 text-base font-bold text-navy">See which companies you&apos;re ready for</p>
        <p className="mx-auto mt-1.5 max-w-[15rem] text-xs leading-relaxed text-slate-600">
          Take an adaptive mock test and we&apos;ll match your skills to real company hiring bars.
        </p>

        <Link
          href="/mock-assessment"
          className="group/cta mt-4 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-b from-[#ffd24d] via-[#ffc42d] to-[#f5b400] px-5 py-2.5 text-xs font-bold text-[#171717] shadow-[0_12px_28px_-12px_rgba(245,180,0,0.5)] transition-transform active:scale-[0.98]"
        >
          Take adaptive test
          <ArrowRight className="size-3.5 transition-transform group-hover/cta:translate-x-0.5" />
        </Link>
      </div>
    </motion.div>
  );
}
