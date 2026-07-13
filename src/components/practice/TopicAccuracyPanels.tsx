'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Calendar,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Reveal, Stagger, StaggerItem, AnimatedNumber } from '@/components/motion/primitives';
import { getTopicAccuracy, type ApiTopicAccuracy } from '@/lib/api/practice';

/**
 * Live per-topic accuracy panels (Sprint 3 exit — "reports show accuracy").
 * "Weak topics" = accuracy under 60% with at least 3 attempts (weakest first);
 * "Continue where you left off" = the most recently practised topics that
 * AREN'T already flagged weak (deduped, so the two panels never show the same
 * cards twice). Both read `GET /practice/accuracy/topics`; with no attempts yet
 * the panels render an honest empty state instead of invented numbers.
 */

/** Mastery band derived purely from a topic's accuracy — drives all coloring. */
type Band = 'strong' | 'developing' | 'weak';

interface BandTheme {
  label: string;
  /** progress-bar / ring gradient stops */
  from: string;
  to: string;
  /** colored glow blob */
  glow: string;
  /** badge + accent text */
  text: string;
  pill: string;
  ring: string;
}

const BANDS: Record<Band, BandTheme> = {
  strong: {
    label: 'Strong',
    from: '#34d399',
    to: '#059669',
    glow: '#10b981',
    text: 'text-emerald-700',
    pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    ring: 'border-emerald-200/80',
  },
  developing: {
    label: 'Developing',
    from: '#7c6cf5',
    to: '#2563eb',
    glow: '#4f7bf5',
    text: 'text-blue-700',
    pill: 'bg-blue-50 text-blue-700 ring-blue-200',
    ring: 'border-blue-200/80',
  },
  weak: {
    label: 'Weak',
    from: '#fbbf24',
    to: '#f37021',
    glow: '#f59e0b',
    text: 'text-amber-700',
    pill: 'bg-amber-50 text-amber-700 ring-amber-200',
    ring: 'border-amber-200/80',
  },
};

function bandOf(pct: number): Band {
  if (pct >= 80) return 'strong';
  if (pct >= 60) return 'developing';
  return 'weak';
}

/** Emerald eyebrow pill + bold section heading shared by both panels. */
function SectionLabel({
  icon: Icon,
  eyebrow,
  children,
}: {
  icon: typeof Target;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 ring-1 ring-inset ring-emerald-100">
        <Icon className="size-3.5" aria-hidden="true" />
        {eyebrow}
      </span>
      <h2 className="mt-2 text-lg font-extrabold tracking-tight text-navy sm:text-xl">{children}</h2>
    </div>
  );
}

/** Animated, gradient-filled accuracy meter with a band badge above it. */
function AccuracyMeter({
  pct,
  band,
  label,
}: {
  pct: number;
  band: Band;
  label: string;
}) {
  const reduce = useReducedMotion();
  const theme = BANDS[band];
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100"
    >
      {/* faint track tint in the band color so empty space still reads as "this topic" */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.18]"
        style={{ background: `linear-gradient(90deg, ${theme.from}, ${theme.to})` }}
      />
      <motion.div
        className="relative h-full rounded-full"
        style={{ background: `linear-gradient(90deg, ${theme.from}, ${theme.to})` }}
        initial={reduce ? false : { width: 0 }}
        whileInView={{ width: `${clamped}%` }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* glossy highlight along the fill */}
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-1/2 rounded-full bg-white/25"
        />
      </motion.div>
    </div>
  );
}

/** A premium per-topic mastery card: layered depth, band-driven color + meter. */
function TopicCard({
  topic,
  cta,
  trailing,
  ctaVariant = 'solid',
}: {
  topic: ApiTopicAccuracy;
  cta: string;
  trailing: React.ReactNode;
  ctaVariant?: 'solid' | 'ghost';
}) {
  const band = bandOf(topic.accuracyPct);
  const theme = BANDS[band];
  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }} className="h-full">
      <div
        className={cn(
          'group relative flex h-full flex-col overflow-hidden rounded-3xl border bg-white p-6 shadow-[0_18px_50px_-30px_rgba(16,185,129,0.25)] transition-shadow duration-300 hover:shadow-[0_22px_55px_-26px_rgba(15,23,42,0.5)]',
          theme.ring,
        )}
      >
        {/* faint gradient wash */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-50/70 via-transparent to-transparent"
        />
        {/* band-colored glow blob - intensifies on hover-lift */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-12 size-32 rounded-full opacity-[0.1] blur-2xl transition-opacity duration-500 group-hover:opacity-25"
          style={{ background: theme.glow }}
        />

        <div className="relative z-10 flex h-full flex-col">
          <div className="mb-4 flex items-start justify-between gap-2">
            <p className="min-w-0 break-words font-bold leading-snug text-navy">{topic.topicName}</p>
            <span
              className={cn(
                'shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1',
                theme.pill,
              )}
            >
              {theme.label}
            </span>
          </div>

          {/* big accuracy figure + meter */}
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <p className="flex items-baseline gap-0.5">
              <AnimatedNumber
                value={topic.accuracyPct}
                className={cn('text-3xl font-extrabold leading-none tracking-tight tabular-nums', theme.text)}
              />
              <span className={cn('text-base font-bold', theme.text)}>%</span>
            </p>
            <span className="text-[11px] font-medium text-slate-400">accuracy</span>
          </div>
          <AccuracyMeter
            pct={topic.accuracyPct}
            band={band}
            label={`${topic.topicName} accuracy`}
          />

          <div className="mb-4 mt-2 flex items-center justify-between gap-2 text-xs text-slate-400">
            <span>
              <span className="font-semibold text-slate-500 tabular-nums">{topic.correct}</span>/
              <span className="tabular-nums">{topic.total}</span> correct
            </span>
            {trailing}
          </div>

          {/* CTA pinned to the bottom so cards align on a row */}
          <Link
            href={`/dashboard/quiz/adaptive?topic=${encodeURIComponent(topic.topicSlug)}`}
            className={cn(
              'mt-auto inline-flex w-fit items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-all active:translate-y-px',
              ctaVariant === 'solid'
                ? 'text-white shadow-sm hover:-translate-y-0.5'
                : 'border border-slate-200 bg-white text-navy hover:border-slate-300 hover:bg-slate-50',
            )}
            style={
              ctaVariant === 'solid'
                ? { background: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }
                : undefined
            }
          >
            {cta}
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

export function TopicAccuracyPanels() {
  const [rows, setRows] = useState<ApiTopicAccuracy[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getTopicAccuracy()
      .then((data) => !cancelled && setRows(data))
      .catch(() => !cancelled && setRows([]));
    return () => {
      cancelled = true;
    };
  }, []);

  if (rows === null) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((k) => (
          <div
            key={k}
            className="h-48 animate-pulse rounded-3xl border border-slate-200/80 bg-white shadow-[0_18px_50px_-30px_rgba(16,185,129,0.25)]"
          />
        ))}
      </div>
    );
  }

  // Weak = below 60% on a meaningful sample (≥3 attempts), WEAKEST FIRST so
  // "Focus here" leads with the worst topic (rows arrive in recency order, not
  // accuracy order, so we must re-sort).
  const weak = rows
    .filter((r) => r.total >= 3 && r.accuracyPct < 60)
    .sort((a, b) => a.accuracyPct - b.accuracyPct)
    .slice(0, 3);

  // "Continue where you left off" = most recently practised (rows already arrive
  // ordered by last-attempt DESC), but EXCLUDING topics already surfaced in the
  // weak panel above. Without this dedupe a student whose recent practice is all
  // on weak topics sees the exact same three cards twice — the two panels only
  // differed by CTA label. Now they're complementary; if nothing distinct
  // remains the section hides itself (guard below).
  const weakSlugs = new Set(weak.map((r) => r.topicSlug));
  const recent = rows.filter((r) => !weakSlugs.has(r.topicSlug)).slice(0, 3);

  return (
    <>
      {/* Weak topics */}
      <div data-tour="practice:weak-topics">
        <SectionLabel icon={TrendingDown} eyebrow="Focus here">Your weak topics</SectionLabel>
        {weak.length === 0 ? (
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-7 shadow-[0_18px_50px_-30px_rgba(16,185,129,0.25)]">
              {/* layered depth even in the empty state */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-50/70 via-transparent to-transparent"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -right-12 -top-14 size-40 rounded-full bg-emerald-400/10 blur-2xl"
              />
              <div className="relative z-10 flex items-start gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-sm">
                  <Sparkles className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-bold text-navy">
                    {rows.length === 0 ? 'No practice data yet.' : 'No weak topics detected.'}
                  </p>
                  <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-500">
                    {rows.length === 0
                      ? 'Attempt a few questions and your weakest topics will surface here automatically.'
                      : 'Nice work - nothing has dropped under 60% across 3+ attempts. Topics appear here the moment one slips.'}
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        ) : (
          <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {weak.map((topic) => (
              <StaggerItem key={topic.topicSlug} className="h-full">
                <TopicCard
                  topic={topic}
                  cta="Drill now"
                  ctaVariant="solid"
                  trailing={
                    <span className="inline-flex items-center gap-1 font-semibold text-amber-600">
                      <TrendingUp className="size-3" aria-hidden="true" />
                      needs work
                    </span>
                  }
                />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>

      {/* Recently practised */}
      {recent.length > 0 ? (
        <div>
          <SectionLabel icon={Target} eyebrow="Keep going">Continue where you left off</SectionLabel>
          <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((topic) => (
              <StaggerItem key={topic.topicSlug} className="h-full">
                <TopicCard
                  topic={topic}
                  cta="Continue"
                  ctaVariant="ghost"
                  trailing={
                    <span className="inline-flex items-center gap-1 text-slate-400">
                      <Calendar className="size-3" aria-hidden="true" />
                      {formatRelative(topic.lastAttemptAt)}
                    </span>
                  }
                />
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      ) : null}
    </>
  );
}

function formatRelative(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
}
