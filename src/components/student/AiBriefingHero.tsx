'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Flame,
  Rocket,
  Sparkles,
  Star,
  Target,
  Timer,
  Zap,
} from 'lucide-react';
import { getBriefing, type StudentBriefing } from '@/lib/api/personalization';
import { getStudentStats, type ApiStudentStats } from '@/lib/api/gamification';
import { getMe, type ApiMe } from '@/lib/api/me';
import { AnimatedNumber, AuroraBackground } from '@/components/motion/primitives';
import { onXpUpdated } from '@/lib/xp-events';

/**
 * The dashboard centerpiece — a personalized, AI-written briefing over the
 * signature aurora backdrop.
 *
 * Hardened render strategy: `me` (name), `stats` (level/XP/streak) and the
 * AI `briefing` are fetched IN PARALLEL via independent effects. The hero
 * paints IMMEDIATELY from name + stats and layers the OpenAI-generated copy in
 * when it arrives. The briefing call is never on the critical path, so a slow
 * or failing GET /students/briefing can NEVER produce a bare fallback line — we
 * always derive a confident, stat-backed greeting instead.
 */

interface FocusArea {
  title: string;
  detail: string;
}
interface NextAction {
  label: string;
  kind: 'mock' | 'practice' | 'course' | 'explore';
  href: string;
}

const DEFAULT_FOCUS: FocusArea[] = [
  { title: 'Sharpen your fundamentals', detail: 'Targeted practice on weak topics' },
  { title: 'Simulate the real thing', detail: 'A timed full-length mock test' },
];
const DEFAULT_ACTION: NextAction = { label: 'Take a mock', kind: 'mock', href: '/mock-assessment' };

function firstNameOf(fullName: string | null | undefined): string {
  const trimmed = fullName?.trim();
  if (!trimmed) return 'there';
  return trimmed.split(/\s+/)[0];
}

export function AiBriefingHero() {
  const reduce = useReducedMotion();
  const [me, setMe] = useState<ApiMe | null>(null);
  const [stats, setStats] = useState<ApiStudentStats | null>(null);
  const [briefing, setBriefing] = useState<StudentBriefing | null>(null);
  // Gate the first paint on the essentials (name + stats) so the hero never
  // flashes a "Level 0 · 0 XP" / "Welcome back, there" fallback before the real
  // data arrives. The AI briefing still layers in afterwards (off critical path).
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let meDone = false;
    let statsDone = false;
    const settle = () => {
      if (meDone && statsDone && !cancelled) setReady(true);
    };
    getMe()
      .then((d) => !cancelled && setMe(d))
      .catch(() => {})
      .finally(() => {
        meDone = true;
        settle();
      });
    getStudentStats()
      .then((d) => !cancelled && setStats(d))
      .catch(() => {})
      .finally(() => {
        statsDone = true;
        settle();
      });
    getBriefing()
      .then((d) => !cancelled && setBriefing(d))
      .catch(() => {});
    // Live-refresh the level/XP/streak when any widget awards XP.
    const off = onXpUpdated(() =>
      getStudentStats()
        .then((d) => !cancelled && setStats(d))
        .catch(() => {}),
    );
    return () => {
      cancelled = true;
      off();
    };
  }, []);

  const firstName = firstNameOf(me?.fullName);

  // Effective stats: ALWAYS prefer the LIVE /students/stats — the briefing's
  // stats are a cached snapshot from generation time and go stale (it only
  // regenerates on activity), which made the hero show a different level than
  // the stat cards. The briefing snapshot is only a pre-load fallback.
  const level = stats?.level ?? briefing?.stats.level ?? 0;
  const totalXp = stats?.totalXp ?? briefing?.stats.totalXp ?? 0;
  const streak = stats?.currentStreakDays ?? briefing?.stats.currentStreakDays ?? 0;
  const xpInto = stats?.xpIntoLevel ?? briefing?.stats.xpIntoLevel ?? 0;
  const xpSpan = stats?.xpForNextLevel ?? briefing?.stats.xpForNextLevel ?? 0;
  const xpToGo = Math.max(0, xpSpan - xpInto);

  const nextPct = xpSpan > 0 ? Math.min(100, Math.round((xpInto / xpSpan) * 100)) : 0;

  // A brand-new student (no XP, no streak, still Level 1) has never been here —
  // "Welcome back" is wrong. Greet with "Welcome" and soften any AI greeting
  // that says "back".
  const isReturning = totalXp > 0 || streak > 0 || level > 1;

  // Derived, always-confident copy. The AI briefing wins when present; otherwise
  // we build a strong personalized headline from name + stats.
  const rawGreeting = briefing?.greeting ?? `${isReturning ? 'Welcome back' : 'Welcome'}, ${firstName}`;
  const greeting = isReturning ? rawGreeting : rawGreeting.replace(/welcome back/i, 'Welcome');
  const headline = useMemo(() => {
    if (briefing?.headline) return briefing.headline;
    if (!isReturning) return `Welcome aboard, ${firstName}`;
    const bits: string[] = [`Level ${level}`];
    if (streak > 0) bits.push(`${streak}-day streak`);
    bits.push(`${totalXp.toLocaleString()} XP`);
    return bits.join('  ·  ');
  }, [briefing?.headline, isReturning, firstName, level, streak, totalXp]);
  const subline =
    briefing?.subline ??
    (!isReturning
      ? `Kick off your first session today to start earning XP and build your skill profile.`
      : streak > 0
        ? `You're on a roll — keep the streak alive and close in on Level ${level + 1}.`
        : `One focused session today reignites your streak and pushes you toward Level ${level + 1}.`);

  const focusAreas = briefing?.focusAreas?.length ? briefing.focusAreas : DEFAULT_FOCUS;
  const nextAction = briefing?.nextAction ?? DEFAULT_ACTION;

  // First paint: a shimmering skeleton over the aurora — never the 0-state.
  if (!ready) {
    return (
      <section data-tour="dash:briefing-hero" className="relative isolate overflow-hidden rounded-[1.5rem] p-6 text-white sm:rounded-[2rem] sm:p-10">
        <AuroraBackground />
        <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[1.5rem] ring-1 ring-inset ring-white/10 sm:rounded-[2rem]" />
        <div className="relative z-10 max-w-3xl animate-pulse" aria-busy="true" aria-label="Loading your briefing">
          <div className="h-7 w-36 rounded-full bg-white/10" />
          <div className="mt-6 h-4 w-40 rounded bg-white/10" />
          <div className="mt-3 h-9 w-3/4 rounded-lg bg-white/15 sm:h-11" />
          <div className="mt-3 h-4 w-2/3 rounded bg-white/10" />
          <div className="mt-7 flex flex-wrap gap-2.5">
            <div className="h-[3.25rem] w-52 rounded-2xl bg-white/10" />
            <div className="h-[3.25rem] w-52 rounded-2xl bg-white/10" />
          </div>
          <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="h-12 w-40 rounded-full bg-white/15" />
            <div className="flex gap-3">
              <div className="h-[3.75rem] w-40 rounded-2xl bg-white/10" />
              <div className="h-[3.75rem] w-24 rounded-2xl bg-white/10" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section data-tour="dash:briefing-hero" className="relative isolate overflow-hidden rounded-[1.5rem] p-6 text-white sm:rounded-[2rem] sm:p-10">
      <AuroraBackground />

      {/* Extra layered depth: a warm top-edge highlight + an inner ring so the
          glass surface reads as crafted, not a flat tinted box. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[1.5rem] ring-1 ring-inset ring-white/10 sm:rounded-[2rem]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
      />

      {/* Top bar — eyebrow (left) + live level/XP/streak (right) */}
      <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
        {/* eyebrow — keeps the live dot */}
        <motion.div
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur"
          initial={reduce ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Sparkles className="size-3.5 text-[#ffb877]" />
          {briefing?.generatedByAi ? 'Your AI briefing' : 'Your briefing'}
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-70" />
            <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
          </span>
        </motion.div>

        {/* live level/XP/streak — pinned top-right */}
        <motion.div
          className="flex items-stretch gap-3"
          initial={reduce ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.06 }}
        >
          <div className="min-w-[10rem] rounded-2xl border border-white/10 bg-white/[0.05] px-3.5 py-2.5 backdrop-blur">
            <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px] font-semibold">
              <span className="flex items-center gap-1 text-white/80">
                <Star className="size-3 fill-amber-300 text-amber-300" /> Level {level}
              </span>
              <span className="tabular-nums text-white/45">
                {xpSpan > 0 ? `${xpToGo.toLocaleString()} XP to go` : `${nextPct}%`}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#f5b400] via-[#ffc42d] to-[#ffd24d]"
                initial={reduce ? false : { width: 0 }}
                animate={{ width: `${nextPct}%` }}
                transition={{ duration: 1.1, delay: 0.55, ease: 'easeOut' }}
              />
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.06] px-3.5 py-2.5 text-sm font-extrabold backdrop-blur">
            <motion.span
              animate={
                reduce || streak === 0
                  ? undefined
                  : { scale: [1, 1.18, 1], transition: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } }
              }
            >
              <Flame className={streak > 0 ? 'size-4 fill-orange-500 text-orange-400' : 'size-4 text-white/40'} />
            </motion.span>
            <AnimatedNumber value={streak} className="tabular-nums" />
          </div>
        </motion.div>
      </div>

      <div className="relative z-10 mt-6 max-w-3xl">

        {/* greeting */}
        <motion.p
          className="mt-6 text-sm font-semibold uppercase tracking-[0.22em] text-white/45"
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.04 }}
        >
          {greeting}
        </motion.p>

        {/* headline */}
        <motion.h1
          className="mt-2 bg-gradient-to-b from-white to-white/70 bg-clip-text text-3xl font-extrabold leading-[1.08] tracking-tight text-transparent sm:text-[42px]"
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08 }}
        >
          {headline}
        </motion.h1>

        {/* subline */}
        <motion.p
          className="mt-3 max-w-2xl text-[15px] leading-relaxed text-white/65 sm:text-base"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.16 }}
        >
          {subline}
        </motion.p>

        {/* focus chips */}
        <div className="mt-7 flex flex-wrap gap-2.5">
          {focusAreas.map((f, i) => (
            <motion.div
              key={f.title}
              className="group flex max-w-full items-start gap-2.5 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur transition-colors hover:border-white/20 hover:bg-white/[0.1]"
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.24 + i * 0.08 }}
            >
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#ffd24d] to-[#f5b400]">
                <Target className="size-3.5 text-white" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold leading-tight">{f.title}</span>
                <span className="block truncate text-xs text-white/55">{f.detail}</span>
              </span>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          className="mt-8"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.42 }}
        >
          <Link
            href={nextAction.href}
            className="group relative inline-flex w-fit items-center gap-2 overflow-hidden rounded-full bg-gradient-to-br from-[#ffd24d] via-[#ffc42d] to-[#f5b400] px-6 py-3 text-sm font-extrabold text-[#171717] transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
          >
            <span
              aria-hidden
              className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/45 to-transparent transition-transform duration-700 group-hover:translate-x-full"
            />
            {nextAction.kind === 'mock' ? (
              <Timer className="size-4" />
            ) : nextAction.kind === 'practice' ? (
              <Zap className="size-4" />
            ) : (
              <Rocket className="size-4" />
            )}
            {nextAction.label}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
