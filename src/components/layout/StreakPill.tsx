'use client';

import { useEffect, useRef, useState } from 'react';
import { Flame } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { getStudentStats } from '@/lib/api/gamification';
import { isStudentContext } from '@/lib/session-hints';
import { onXpUpdated } from '@/lib/xp-events';
import { cn } from '@/lib/utils';
import { AnimatedNumber } from '@/components/motion/primitives';

/** Spark offsets (px) for the celebratory burst when a streak ticks up. */
const SPARKS = [
  { x: -9, y: -11 },
  { x: -4, y: -15 },
  { x: 2, y: -16 },
  { x: 8, y: -12 },
  { x: 11, y: -5 },
];

/**
 * Top-bar streak pill (student-only). Shows the student's current day-streak
 * with a flame that flickers while the streak is alive, and fires a celebratory
 * burst the moment the streak CONTINUES — i.e. the day count ticks up after an
 * award (Quick Aptitude, mock submit, daily quest…). Renders nothing for
 * visitors / non-students; it never invents a number.
 *
 * The endpoint is STUDENT-only, so the fetch is gated on the role/preview hint
 * cookies — an admin console must not fire doomed 403 requests.
 */
export function StreakPill() {
  const [streak, setStreak] = useState<number | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const prevStreak = useRef<number | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!isStudentContext()) return;
    let cancelled = false;

    const sync = (celebrateOnGain: boolean) =>
      getStudentStats()
        .then((s) => {
          if (cancelled) return;
          const next = s.currentStreakDays;
          if (celebrateOnGain && prevStreak.current !== null && next > prevStreak.current) {
            setCelebrate(true);
          }
          prevStreak.current = next;
          setStreak(next);
        })
        .catch(() => {
          // Signed out / stale hint → leave the pill hidden.
        });

    void sync(false);
    // Re-pull whenever any widget awards XP/streak; celebrate if it ticked up.
    const off = onXpUpdated(() => void sync(true));
    return () => {
      cancelled = true;
      off();
    };
  }, []);

  // Auto-clear the celebration flourish.
  useEffect(() => {
    if (!celebrate) return;
    const t = setTimeout(() => setCelebrate(false), 1300);
    return () => clearTimeout(t);
  }, [celebrate]);

  if (streak === null) return null;

  const lit = streak > 0;
  const flicker = lit && !reduce;

  return (
    <motion.span
      data-tour="chrome:streak"
      initial={reduce ? false : { opacity: 0, scale: 0.85, y: -4 }}
      animate={
        celebrate && !reduce
          ? { opacity: 1, y: 0, scale: [1, 1.18, 0.96, 1.06, 1] }
          : { opacity: 1, scale: 1, y: 0 }
      }
      transition={
        celebrate && !reduce
          ? { duration: 0.7, ease: 'easeOut' }
          : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }
      }
      whileHover={reduce ? undefined : { y: -1, scale: 1.03 }}
      className={cn(
        'group relative inline-flex select-none items-center gap-1.5 overflow-hidden rounded-full px-3 py-1 text-[11px] font-extrabold ring-1',
        lit
          ? 'text-[#5b2a00] ring-[#ff7a1a]/35 shadow-[0_5px_16px_-5px_rgba(255,122,26,0.6)]'
          : 'text-white ring-white/20 shadow-[0_4px_14px_-6px_rgba(100,116,139,0.45)]',
      )}
      style={{
        backgroundImage: lit
          ? 'linear-gradient(120deg, #ffd24d 0%, #ffa32e 50%, #ff7a1a 100%)'
          : 'linear-gradient(120deg, #94a3b8 0%, #64748b 100%)',
      }}
      aria-label={`${streak}-day streak${lit ? '' : ' - start one today'}`}
    >
      {/* warm glow that intensifies on hover / celebration */}
      <span
        className={cn(
          'pointer-events-none absolute -inset-px rounded-full bg-[radial-gradient(120%_120%_at_0%_0%,rgba(255,237,213,0.55),transparent_60%)] transition-opacity duration-300 group-hover:opacity-100',
          celebrate ? 'opacity-100' : 'opacity-70',
        )}
      />
      {/* glossy top sheen */}
      <span className="pointer-events-none absolute inset-x-1 top-0 h-1/2 rounded-full bg-white/25 blur-[2px]" />

      {/* celebration: expanding ring flash + sparks the moment the streak ticks up */}
      {celebrate && !reduce ? (
        <>
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-amber-200/80"
            initial={{ opacity: 0.85, scale: 0.92 }}
            animate={{ opacity: 0, scale: 1.65 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          />
          {SPARKS.map((s, i) => (
            <motion.span
              key={i}
              aria-hidden="true"
              className="pointer-events-none absolute left-2 top-1/2 size-1 rounded-full bg-amber-100 shadow-[0_0_4px_rgba(255,237,213,0.9)]"
              initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              animate={{ opacity: 0, x: s.x, y: s.y, scale: 0.3 }}
              transition={{ duration: 0.7, ease: 'easeOut', delay: i * 0.02 }}
            />
          ))}
        </>
      ) : null}

      {/* flame - flickers while the streak is alive */}
      <span className="relative grid size-3.5 place-items-center">
        {flicker && (
          <motion.span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-amber-200/70 blur-[4px]"
            animate={{ opacity: [0.4, 0.9, 0.5, 0.85, 0.4], scale: [0.9, 1.15, 0.95, 1.1, 0.9] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        <motion.span
          className="relative"
          animate={flicker ? { rotate: [-3, 3, -2, 2, -3], y: [0, -0.5, 0, -0.3, 0] } : undefined}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Flame
            className={cn(
              'size-3.5',
              lit
                ? 'fill-white text-white drop-shadow-[0_1px_2px_rgba(120,45,10,0.5)]'
                : 'fill-white/20',
            )}
            aria-hidden="true"
          />
        </motion.span>
      </span>

      <span className="relative inline-flex items-baseline gap-1 tabular-nums">
        <AnimatedNumber value={streak} format={(n) => `${n}`} />
        <span className={cn('hidden text-[10px] font-bold tracking-widest sm:inline', lit ? 'text-[#5b2a00]/75' : 'text-white/85')}>
          DAY STREAK
        </span>
      </span>
    </motion.span>
  );
}
