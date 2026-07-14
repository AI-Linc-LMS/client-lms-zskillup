'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, animate, motion } from 'framer-motion';
import { Flame, Sparkles, Star, TrendingUp, Trophy, Zap } from 'lucide-react';
import type { GamificationSummary } from '@/lib/api/gamification-types';

/**
 * Duolingo-style reward reveal shown after a graded submission. Orchestrated
 * with framer-motion: emblem springs in → XP counts up → streak flame pops →
 * level/progress bar fills, with a canvas-confetti burst (extra burst on a
 * level-up). Self-contained: drop it in with a `summary` and an `onClose`.
 */
export function RewardOverlay({
  summary,
  onClose,
  passed,
}: {
  summary: GamificationSummary;
  onClose: () => void;
  passed?: boolean;
}) {
  const [xp, setXp] = useState(0);
  const [progress, setProgress] = useState(0);

  const nextPct =
    summary.xpForNextLevel > 0
      ? Math.min(100, Math.round((summary.xpIntoLevel / summary.xpForNextLevel) * 100))
      : 100;

  // Count the XP up and fill the level bar, slightly staggered.
  useEffect(() => {
    const c1 = animate(0, summary.xpEarned, {
      duration: 1.1,
      delay: 0.45,
      ease: 'easeOut',
      onUpdate: (v) => setXp(Math.round(v)),
    });
    const c2 = animate(0, nextPct, {
      duration: 1.1,
      delay: 0.9,
      ease: 'easeOut',
      onUpdate: (v) => setProgress(v),
    });
    return () => {
      c1.stop();
      c2.stop();
    };
  }, [summary.xpEarned, nextPct]);

  // Confetti — fire on mount, an extra volley on level-up.
  useEffect(() => {
    let cancelled = false;
    void import('canvas-confetti').then(({ default: confetti }) => {
      if (cancelled) return;
      const fire = (opts: Record<string, unknown>) =>
        confetti({ disableForReducedMotion: true, zIndex: 9999, ...opts });
      fire({ particleCount: 80, spread: 70, origin: { y: 0.35 }, startVelocity: 45 });
      if (summary.leveledUp) {
        setTimeout(() => fire({ particleCount: 120, spread: 100, origin: { y: 0.4 } }), 700);
        setTimeout(
          () => fire({ particleCount: 60, angle: 60, spread: 70, origin: { x: 0, y: 0.6 } }),
          900,
        );
        setTimeout(
          () => fire({ particleCount: 60, angle: 120, spread: 70, origin: { x: 1, y: 0.6 } }),
          900,
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [summary.leveledUp]);

  const headline = summary.leveledUp
    ? 'Level up!'
    : passed
      ? 'Nicely done!'
      : summary.xpEarned > 0
        ? 'XP earned!'
        : 'Keep it up!';

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[200] grid place-items-center bg-[#0a0a0c]/80 px-6 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          role="dialog"
          aria-label="Assessment reward"
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-sm overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-b from-[#141d3a] to-[#0a0a0c] p-7 text-center text-white shadow-2xl"
          initial={{ scale: 0.8, y: 30, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        >
          {/* glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 left-1/2 size-56 -translate-x-1/2 rounded-full bg-[#f5b400]/30 blur-3xl"
          />

          {/* Emblem */}
          <motion.div
            className="relative mx-auto grid size-20 place-items-center rounded-3xl bg-gradient-to-br from-[#ffd24d] to-[#f5b400] shadow-[0_10px_40px_-8px_rgba(245,180,0,0.7)]"
            initial={{ scale: 0, rotate: -25 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 12, delay: 0.1 }}
          >
            {summary.leveledUp ? (
              <Trophy className="size-10" strokeWidth={2.2} />
            ) : (
              <Zap className="size-10 fill-white" strokeWidth={2} />
            )}
            <motion.span
              aria-hidden
              className="absolute -right-1 -top-1 text-amber-200"
              initial={{ scale: 0, rotate: -40 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.5, type: 'spring', stiffness: 300 }}
            >
              <Sparkles className="size-5" />
            </motion.span>
          </motion.div>

          <motion.h2
            className="mt-5 text-2xl font-extrabold tracking-tight"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            {headline}
          </motion.h2>

          {/* XP count-up */}
          <motion.div
            className="mt-4 inline-flex items-baseline gap-1.5 rounded-2xl bg-white/[0.06] px-5 py-3 ring-1 ring-white/10"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <span className="text-[40px] font-black leading-none tabular-nums text-[#ffc42d]">
              +{xp}
            </span>
            <span className="text-sm font-bold uppercase tracking-wider text-white/60">XP</span>
          </motion.div>

          {/* Level + progress */}
          <div className="mt-6 text-left">
            <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-white/80">
                <Star className="size-3.5 fill-amber-300 text-amber-300" /> Level {summary.level}
              </span>
              <span className="text-white/50 tabular-nums">
                {summary.xpIntoLevel} / {summary.xpForNextLevel} XP
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#ffd24d] to-[#f5b400]"
                style={{ width: `${progress}%` }}
              />
            </div>
            {summary.leveledUp && (
              <motion.p
                className="mt-2 flex items-center gap-1 text-xs font-bold text-emerald-300"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1 }}
              >
                <TrendingUp className="size-3.5" /> Reached level {summary.level} (was{' '}
                {summary.prevLevel})
              </motion.p>
            )}
          </div>

          {/* Streak */}
          <motion.div
            className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-white/[0.06] px-4 py-3 ring-1 ring-white/10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <motion.span
              animate={
                summary.streakIncreased
                  ? { scale: [1, 1.35, 1], rotate: [0, -8, 8, 0] }
                  : { scale: [1, 1.12, 1] }
              }
              transition={{ delay: 0.85, duration: 0.7 }}
            >
              <Flame
                className={summary.streakDays > 0 ? 'size-7 fill-orange-500 text-orange-400' : 'size-7 text-white/40'}
              />
            </motion.span>
            <span className="text-lg font-extrabold tabular-nums">{summary.streakDays}</span>
            <span className="text-sm font-semibold text-white/70">
              day{summary.streakDays === 1 ? '' : 's'} streak
              {summary.streakIncreased ? ' · +1 today!' : ''}
            </span>
          </motion.div>

          {summary.newBadges > 0 && (
            <motion.p
              className="mt-3 text-xs font-bold text-amber-300"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              🏅 {summary.newBadges} new badge{summary.newBadges === 1 ? '' : 's'} unlocked!
            </motion.p>
          )}

          <motion.button
            onClick={onClose}
            className="mt-7 w-full rounded-2xl bg-gradient-to-b from-[#ffd24d] to-[#f5b400] py-3.5 text-sm font-extrabold uppercase tracking-wide text-[#171717] shadow-lg transition-transform active:scale-[0.98]"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
          >
            Continue
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
