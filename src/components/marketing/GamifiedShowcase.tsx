'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { BadgeCheck, Flame, PlayCircle, Sparkles, Star, Target, Trophy, Zap } from 'lucide-react';
import { LANDING_STREAK_DEMO, LANDING_TODAYS_FOCUS } from '@/lib/landing-config';
import { HomeTopCohort } from './HomeTopCohort';

/**
 * Redesigned "Gamified prep" section. Client component so it can layer several
 * DISTINCT scroll/entrance animations (framer-motion) over an animated backdrop:
 *   - drifting aurora blobs (ambient, infinite)      ← backdrop
 *   - an achievements ticker (horizontal marquee)    ← continuous
 *   - staggered fade-up for the copy + feature chips
 *   - slide-in-from-right for the Today's-focus card
 *   - pop-scale for the streak card, with bars that grow on reveal
 *   - slide-up for the cohort card
 *   - count-up numbers for the impact stats
 * All motion is gated behind prefers-reduced-motion.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};
const fromRight: Variants = {
  hidden: { opacity: 0, x: 44 },
  show: { opacity: 1, x: 0, transition: { duration: 0.6, ease: EASE } },
};
const fromBottom: Variants = {
  hidden: { opacity: 0, y: 44 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};
const popScale: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.55, ease: EASE } },
};
const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};
const barStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

const ACHIEVEMENTS = [
  { icon: Flame, label: '14-day streak' },
  { icon: Zap, label: '+150 XP · Daily quest' },
  { icon: Trophy, label: 'National rank #228' },
  { icon: Star, label: 'Speedster badge earned' },
  { icon: BadgeCheck, label: 'Percentages · Mastered' },
  { icon: Target, label: '84% quant accuracy' },
  { icon: Trophy, label: 'Top 5% of cohort' },
  { icon: Zap, label: 'Level 12 reached' },
];

const FEATURES = [
  { icon: Flame, label: 'Streaks that reward showing up' },
  { icon: Zap, label: 'Daily quests with XP rewards' },
  { icon: Trophy, label: 'College & national leaderboard' },
  { icon: BadgeCheck, label: 'Earnable concept badges' },
];

const STATS = [
  { to: 4910, suffix: '', label: 'On the leaderboard' },
  { to: 92, suffix: ' days', label: 'Longest streak' },
  { to: 250, suffix: '+', label: 'Concept badges' },
];

/** Ease-out count-up that fires the first time it scrolls into view. */
function CountUp({ to, suffix = '', duration = 1400 }: { to: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(0);
  const fired = useRef(false);
  const reduce = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || fired.current) return;
        fired.current = true;
        if (reduce) {
          setN(to);
          return;
        }
        const start = performance.now();
        const step = (t: number) => {
          const p = Math.min(1, (t - start) / duration);
          setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [to, duration, reduce]);
  return (
    <span ref={ref} className="num-tab">
      {n.toLocaleString('en-IN')}
      {suffix}
    </span>
  );
}

export function GamifiedShowcase() {
  const reduce = useReducedMotion();
  // Ambient drift for the backdrop blobs (skipped when reduced-motion is on).
  const drift = (dx: number, dy: number, dur: number) =>
    reduce
      ? {}
      : {
          animate: { x: [0, dx, 0], y: [0, dy, 0] },
          transition: { duration: dur, repeat: Infinity, ease: 'easeInOut' as const },
        };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#0a0a0c] via-[#0d0e13] to-[#141a2e] py-16 text-white lg:py-24">
      {/* ── animated backdrop ── */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-28 -top-24 h-96 w-96 rounded-full bg-[#f5b400]/25 blur-3xl"
        {...drift(46, 34, 17)}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute top-1/4 -right-28 h-96 w-96 rounded-full bg-[#f5b400]/25 blur-3xl"
        {...drift(-40, 44, 21)}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-[#7c3aed]/20 blur-3xl"
        {...drift(32, -30, 19)}
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: 'radial-gradient(rgb(255 255 255 / 0.85) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />

      {/* ── achievements ticker (horizontal marquee) ── */}
      <div className="relative mb-12 lg:mb-14">
        <div className="marquee-hover-pause edge-fade-x overflow-hidden">
          <div className="marquee-x flex w-max items-center gap-3 pr-3">
            {[...ACHIEVEMENTS, ...ACHIEVEMENTS].map((a, i) => (
              <span
                key={i}
                aria-hidden={i >= ACHIEVEMENTS.length}
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white/85 backdrop-blur-sm"
              >
                <a.icon className="h-4 w-4 text-amber-300" aria-hidden /> {a.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="relative mx-auto grid max-w-[1400px] items-center gap-10 px-5 md:px-8 lg:grid-cols-[1fr_1.1fr]">
        {/* LEFT - staggered fade-up */}
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}>
          <motion.span
            variants={fadeUp}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/85"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Gamified prep
          </motion.span>
          <motion.h2 variants={fadeUp} className="mt-5 text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-4xl">
            Daily quests, streaks, levels - prep becomes a habit, not a grind
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 max-w-lg text-base text-white/75">
            Earn XP for every drill. Unlock badges, level up, and climb the national leaderboard. The
            dopamine loop does the work - you just show up.
          </motion.p>

          <motion.ul variants={stagger} className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {FEATURES.map((row) => (
              <motion.li
                key={row.label}
                variants={fadeUp}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-sm"
              >
                <row.icon className="h-5 w-5 shrink-0 text-amber-300" aria-hidden />
                <span className="text-sm font-semibold text-white/90">{row.label}</span>
              </motion.li>
            ))}
          </motion.ul>

          {/* count-up impact stats */}
          <motion.div variants={fadeUp} className="mt-7 flex flex-wrap gap-x-8 gap-y-3">
            {STATS.map((s) => (
              <div key={s.label}>
                <p className="text-2xl font-extrabold tracking-tight text-white">
                  <CountUp to={s.to} suffix={s.suffix} />
                </p>
                <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-white/50">
                  {s.label}
                </p>
              </div>
            ))}
          </motion.div>

          <motion.div variants={fadeUp}>
            <Link href="/leaderboard" className="btn-brand mt-7 inline-flex text-sm">
              <Trophy className="h-4 w-4" /> See live leaderboard
            </Link>
          </motion.div>
        </motion.div>

        {/* RIGHT - a different entrance per card */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Today's focus - slides in from the right */}
          <motion.div
            variants={fromRight}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            className="rounded-2xl border border-white/12 bg-white/[0.07] p-5 backdrop-blur-sm"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/55">
              {LANDING_TODAYS_FOCUS.eyebrow}
            </p>
            <p className="mt-1 text-base font-bold tracking-tight text-white">{LANDING_TODAYS_FOCUS.topic}</p>
            <p className="mt-1 text-xs text-white/60">{LANDING_TODAYS_FOCUS.meta}</p>
            <Link href={LANDING_TODAYS_FOCUS.ctaHref} className="btn-brand mt-3 inline-flex text-xs">
              <PlayCircle className="h-3.5 w-3.5" /> {LANDING_TODAYS_FOCUS.ctaLabel}
            </Link>
          </motion.div>

          {/* Active streak - pops in; the bars grow on reveal */}
          <motion.div
            variants={popScale}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            className="rounded-2xl border border-white/12 bg-white/[0.07] p-5 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/55">Active streak</p>
              <span className="streak-flame" style={{ padding: '0.25rem 0.6rem', fontSize: '0.66rem' }}>
                <Flame className="h-3 w-3" />
                {LANDING_STREAK_DEMO.days}d
              </span>
            </div>
            <motion.div
              className="mt-4 flex h-12 items-end gap-1.5"
              variants={barStagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.6 }}
            >
              {LANDING_STREAK_DEMO.week.map((h, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <motion.div
                    className="w-full rounded-md bg-gradient-to-t from-[#f5b400] to-[#fbbf24]"
                    style={{ height: `${(h / 100) * 36}px`, transformOrigin: 'bottom' }}
                    variants={{ hidden: { scaleY: 0 }, show: { scaleY: 1, transition: { duration: 0.45, ease: EASE } } }}
                  />
                  <span className="text-[9px] font-semibold text-white/50">{LANDING_STREAK_DEMO.labels[i]}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Top of cohort - slides up */}
          <motion.div
            variants={fromBottom}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            className="sm:col-span-2"
          >
            <HomeTopCohort />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
