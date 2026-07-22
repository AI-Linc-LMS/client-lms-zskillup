'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  ClipboardCheck,
  Crown,
  Flame,
  Rocket,
  Star,
  Target,
  Timer,
  Zap,
} from 'lucide-react';
import { getBriefing, type StudentBriefing } from '@/lib/api/personalization';
import { getStudentStats, type ApiStudentStats } from '@/lib/api/gamification';
import { getMe, type ApiMe } from '@/lib/api/me';
import { useCalibrationStatus } from '@/hooks/useCalibrationStatus';
import { useMySubscription } from '@/hooks/useMySubscription';
import { BriefingHeroCanvas } from '@/components/student/BriefingHeroCanvas';
import { AnimatedNumber, AuroraBackground } from '@/components/motion/primitives';
import { onXpUpdated } from '@/lib/xp-events';

/**
 * The dashboard centerpiece - a personalized, AI-written briefing over the
 * signature aurora backdrop.
 *
 * Hardened render strategy: `me` (name), `stats` (level/XP/streak) and the
 * AI `briefing` are fetched IN PARALLEL via independent effects. The hero
 * paints IMMEDIATELY from name + stats and layers the OpenAI-generated copy in
 * when it arrives. The briefing call is never on the critical path, so a slow
 * or failing GET /students/briefing can NEVER produce a bare fallback line - we
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
  const calibration = useCalibrationStatus();
  const { planStatus } = useMySubscription(true);
  const isPremium = planStatus !== 'none';
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

  // Effective stats: ALWAYS prefer the LIVE /students/stats - the briefing's
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

  // A brand-new student (no XP, no streak, still Level 1) has never been here -
  // "Welcome back" is wrong. Greet with "Welcome" and soften any AI greeting
  // that says "back".
  const isReturning = totalXp > 0 || streak > 0 || level > 1;

  // Derived, always-confident copy. The AI briefing wins when present; otherwise
  // we build a strong personalized headline from name + stats. (The greeting line is
  // rendered directly from firstName in the hero - "Welcome back, <name>" with the name
  // in yellow - so no separate greeting string is needed.)
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
        ? `You're on a roll - keep the streak alive and close in on Level ${level + 1}.`
        : `One focused session today reignites your streak and pushes you toward Level ${level + 1}.`);

  const focusAreas = briefing?.focusAreas?.length ? briefing.focusAreas : DEFAULT_FOCUS;
  const nextAction = briefing?.nextAction ?? DEFAULT_ACTION;

  // The one-time Placement Readiness Test (the former "calibration") is the very
  // first step of the journey - so an un-calibrated student is steered straight
  // to it: it replaces both the "Try a mock" reco card and the mock CTA below.
  const showPlacementTest = calibration.required && !!calibration.mockTestId;
  const placementHref = calibration.mockTestId
    ? `/dashboard/quiz?mock=${calibration.mockTestId}`
    : '/dashboard';

  const cta = showPlacementTest
    ? { label: 'Take Placement Readiness Test', href: placementHref, kind: 'placement' as const }
    : { label: nextAction.label, href: nextAction.href, kind: nextAction.kind };

  // Focus cards, capped to 3 so they stay on ONE horizontal row. For un-calibrated
  // students the Placement Readiness Test leads, and any "take a mock" card is
  // dropped (mocks come after the readiness test).
  const cards: FocusArea[] = showPlacementTest
    ? [
        { title: 'Take the Placement Readiness Test', detail: 'Your first step - we map where you stand' },
        ...focusAreas.filter((f) => !/mock/i.test(`${f.title} ${f.detail}`)),
      ].slice(0, 3)
    : focusAreas.slice(0, 3);

  // First paint: a shimmering skeleton over the aurora - never the 0-state.
  if (!ready) {
    return (
      <section data-tour="dash:briefing-hero" className="relative isolate overflow-hidden rounded-[1.5rem] p-6 text-white sm:rounded-[2rem] sm:p-10">
        <AuroraBackground />
        <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[1.5rem] ring-1 ring-inset ring-white/10 sm:rounded-[2rem]" />
        <div className="relative z-10 max-w-3xl animate-pulse" aria-busy="true" aria-label="Loading your briefing">
          <div className="h-7 w-36 rounded-full bg-white/10" />
          <div className="mt-6 h-4 w-40 rounded bg-white/10" />
          <div className="mt-4 h-10 w-3/4 rounded-lg bg-white/15 sm:h-12" />
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
    <section data-tour="dash:briefing-hero" className="relative isolate overflow-hidden rounded-[1.5rem] p-5 text-white sm:rounded-[2rem] sm:p-7">
      <BriefingHeroCanvas />

      {/* Top row: greeting/headline/subline (left) + live level/XP/streak (right),
          so there's no empty band above the greeting. */}
      <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 max-w-2xl">

        {/* greeting - the NAME rendered bold + yellow (benchmark). */}
        <motion.p
          className="text-xs font-bold uppercase tracking-[0.2em] text-white/55 sm:text-sm"
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.04 }}
        >
          {isReturning ? 'Welcome back' : 'Welcome'}, <span className="text-[#ffc42d]">{firstName}</span>
          {isPremium ? (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#ffd24d] to-[#f5b400] px-2 py-0.5 align-middle text-[9px] font-black tracking-wider text-[#171717]">
              <Crown className="size-2.5" strokeWidth={2.75} /> PREMIUM
            </span>
          ) : null}
        </motion.p>

        {/* headline */}
        <motion.h1
          className="mt-4 bg-gradient-to-b from-white to-white/70 bg-clip-text text-[30px] font-extrabold leading-[1.08] tracking-tight text-transparent sm:text-[38px]"
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08 }}
        >
          {headline}
        </motion.h1>

        {/* subline */}
        <motion.p
          className="mt-2 max-w-2xl text-sm leading-relaxed text-white/65"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.16 }}
        >
          {subline}
        </motion.p>
        </div>

        {/* live level/XP/streak */}
        <motion.div
          className="flex shrink-0 items-stretch gap-3"
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

      {/* focus cards + CTA - full width below the top row */}
      <div className="relative z-10 mt-6 max-w-4xl">
        {/* focus cards - a SINGLE horizontal row of up to 3; dark icon on a yellow disc. */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {cards.map((f, i) => {
            const isPlacement = i === 0 && showPlacementTest;
            return (
              <motion.div
                key={f.title}
                className={`group flex items-center gap-2.5 rounded-2xl border p-3 backdrop-blur transition-colors ${
                  isPlacement
                    ? 'border-[#ffc42d]/40 bg-[#ffc42d]/[0.08] hover:bg-[#ffc42d]/[0.12]'
                    : 'border-white/10 bg-white/[0.05] hover:border-[#ffc42d]/30 hover:bg-white/[0.09]'
                }`}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.24 + i * 0.08 }}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#ffc42d] ring-4 ring-[#ffc42d]/15">
                  {isPlacement ? (
                    <ClipboardCheck className="size-4 text-[#171717]" strokeWidth={2.4} />
                  ) : (
                    <Target className="size-4 text-[#171717]" strokeWidth={2.4} />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-bold leading-tight">{f.title}</span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-white/55">{f.detail}</span>
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* CTA */}
        <motion.div
          className="mt-6"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.42 }}
        >
          <Link
            href={cta.href}
            className="group relative inline-flex w-fit items-center gap-2 overflow-hidden rounded-full bg-gradient-to-br from-[#ffd24d] via-[#ffc42d] to-[#f5b400] px-6 py-2.5 text-sm font-extrabold text-[#171717] transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
          >
            <span
              aria-hidden
              className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/45 to-transparent transition-transform duration-700 group-hover:translate-x-full"
            />
            {cta.kind === 'placement' ? (
              <ClipboardCheck className="size-4" />
            ) : cta.kind === 'mock' ? (
              <Timer className="size-4" />
            ) : cta.kind === 'practice' ? (
              <Zap className="size-4" />
            ) : (
              <Rocket className="size-4" />
            )}
            {cta.label}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
