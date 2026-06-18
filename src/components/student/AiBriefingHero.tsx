'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Brain,
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
const DEFAULT_ACTION: NextAction = { label: 'Take a mock', kind: 'mock', href: '/mock-tests' };

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

  // Three independent fetches — each renders the moment it resolves, none
  // blocks another, and every rejection silently degrades to a derived value.
  useEffect(() => {
    let cancelled = false;
    const loadStats = () =>
      getStudentStats()
        .then((d) => !cancelled && setStats(d))
        .catch(() => {});
    getMe()
      .then((d) => !cancelled && setMe(d))
      .catch(() => {});
    loadStats();
    getBriefing()
      .then((d) => !cancelled && setBriefing(d))
      .catch(() => {});
    // Live-refresh the level/XP/streak when any widget awards XP.
    const off = onXpUpdated(loadStats);
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

  // Derived, always-confident copy. The AI briefing wins when present; otherwise
  // we build a strong personalized headline from name + stats.
  const greeting = briefing?.greeting ?? `Welcome back, ${firstName}`;
  const headline = useMemo(() => {
    if (briefing?.headline) return briefing.headline;
    const bits: string[] = [`Level ${level}`];
    if (streak > 0) bits.push(`${streak}-day streak`);
    bits.push(`${totalXp.toLocaleString()} XP`);
    return bits.join('  ·  ');
  }, [briefing?.headline, level, streak, totalXp]);
  const subline =
    briefing?.subline ??
    (streak > 0
      ? `You're on a roll — keep the streak alive and close in on Level ${level + 1}.`
      : `One focused session today reignites your streak and pushes you toward Level ${level + 1}.`);

  const focusAreas = briefing?.focusAreas?.length ? briefing.focusAreas : DEFAULT_FOCUS;
  const nextAction = briefing?.nextAction ?? DEFAULT_ACTION;

  const float = reduce
    ? undefined
    : {
        y: [0, -12, 0],
        transition: { duration: 7, repeat: Infinity, ease: 'easeInOut' as const },
      };

  return (
    <section className="relative isolate overflow-hidden rounded-[1.75rem] p-7 text-white shadow-[0_30px_90px_-32px_rgba(11,18,32,0.85)] sm:rounded-[2rem] sm:p-10">
      <AuroraBackground />

      {/* Extra layered depth: a warm top-edge highlight + an inner ring so the
          glass surface reads as crafted, not a flat tinted box. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[1.75rem] ring-1 ring-inset ring-white/10 sm:rounded-[2rem]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
      />

      {/* Floating parallax accent — a soft AI orb in the top-right that drifts. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 hidden sm:block"
        animate={float}
      >
        <div className="relative size-44">
          <div className="absolute inset-0 rounded-full bg-[#f37021]/25 blur-2xl" />
          <div className="absolute inset-6 rounded-full bg-[#6d3bf5]/30 blur-xl" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex size-16 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.08] shadow-[0_8px_30px_-8px_rgba(0,0,0,0.5)] backdrop-blur">
              <Brain className="size-7 text-[#ffb877]" />
            </div>
          </div>
        </div>
      </motion.div>

      <div className="relative z-10 max-w-3xl">
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
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#f7a14e] to-[#f37021] shadow-sm">
                <Target className="size-3.5 text-white" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold leading-tight">{f.title}</span>
                <span className="block truncate text-xs text-white/55">{f.detail}</span>
              </span>
            </motion.div>
          ))}
        </div>

        {/* CTA + live progress */}
        <motion.div
          className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.42 }}
        >
          <Link
            href={nextAction.href}
            className="group relative inline-flex w-fit items-center gap-2 overflow-hidden rounded-full bg-gradient-to-b from-[#f7a14e] to-[#f37021] px-6 py-3 text-sm font-extrabold text-white shadow-[0_14px_34px_-10px_rgba(243,112,33,0.85)] transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
          >
            <span
              aria-hidden
              className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full"
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

          <div className="flex items-stretch gap-3 sm:gap-4">
            {/* Level / XP progress */}
            <div className="min-w-[10rem] flex-1 rounded-2xl border border-white/10 bg-white/[0.05] px-3.5 py-2.5 backdrop-blur sm:flex-none">
              <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold">
                <span className="flex items-center gap-1 text-white/80">
                  <Star className="size-3 fill-amber-300 text-amber-300" /> Level {level}
                </span>
                <span className="tabular-nums text-white/45">
                  {xpSpan > 0 ? `${xpToGo.toLocaleString()} XP to go` : `${nextPct}%`}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-[#f7a14e] via-[#f37021] to-[#f5491e]"
                  initial={reduce ? false : { width: 0 }}
                  animate={{ width: `${nextPct}%` }}
                  transition={{ duration: 1.1, delay: 0.55, ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* Streak flame */}
            <div className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.06] px-3.5 py-2.5 text-sm font-extrabold backdrop-blur">
              <motion.span
                animate={
                  reduce || streak === 0
                    ? undefined
                    : { scale: [1, 1.18, 1], transition: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } }
                }
              >
                <Flame
                  className={
                    streak > 0
                      ? 'size-4 fill-orange-500 text-orange-400'
                      : 'size-4 text-white/40'
                  }
                />
              </motion.span>
              <AnimatedNumber value={streak} className="tabular-nums" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
