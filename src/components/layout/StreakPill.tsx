'use client';

import { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { getPracticeAccuracy } from '@/lib/api/practice';
import { isStudentContext } from '@/lib/session-hints';
import { AnimatedNumber } from '@/components/motion/primitives';

/**
 * Top-bar signal pill. The day-streak counter returns when the Sprint 5
 * streak ledger ships; until then the same slot carries the student's REAL
 * practice accuracy — and renders nothing for visitors with no attempts,
 * rather than inventing a number.
 *
 * The endpoint is STUDENT-only, so the fetch is gated on the role/preview
 * hint cookies — an admin console must not fire doomed 403 requests.
 */
export function StreakPill() {
  const [pct, setPct] = useState<number | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!isStudentContext()) return;
    let cancelled = false;
    getPracticeAccuracy()
      .then((a) => {
        if (!cancelled && a.total > 0) setPct(a.accuracyPct);
      })
      .catch(() => {
        // Signed out / stale hint → no pill
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (pct === null) return null;

  const lit = pct > 0;

  return (
    <motion.span
      initial={reduce ? false : { opacity: 0, scale: 0.85, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reduce ? undefined : { y: -1, scale: 1.03 }}
      className="group relative inline-flex select-none items-center gap-1.5 overflow-hidden rounded-full px-3 py-1 text-[11px] font-bold text-white shadow-[0_4px_14px_-4px_rgba(243,112,33,0.6)] ring-1 ring-white/20"
      style={{
        backgroundImage:
          'linear-gradient(120deg, #fb923c 0%, #f37021 45%, #ea580c 100%)',
      }}
    >
      {/* warm glow that intensifies on hover */}
      <span className="pointer-events-none absolute -inset-px rounded-full bg-[radial-gradient(120%_120%_at_0%_0%,rgba(255,237,213,0.55),transparent_60%)] opacity-70 transition-opacity duration-300 group-hover:opacity-100" />
      {/* glossy top sheen */}
      <span className="pointer-events-none absolute inset-x-1 top-0 h-1/2 rounded-full bg-white/25 blur-[2px]" />

      {/* flame with animated flicker when the streak is alive */}
      <span className="relative grid size-3.5 place-items-center">
        {lit && !reduce && (
          <motion.span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-amber-200/70 blur-[4px]"
            animate={{ opacity: [0.4, 0.9, 0.5, 0.85, 0.4], scale: [0.9, 1.15, 0.95, 1.1, 0.9] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        <motion.span
          className="relative"
          animate={
            lit && !reduce
              ? { rotate: [-3, 3, -2, 2, -3], y: [0, -0.5, 0, -0.3, 0] }
              : undefined
          }
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Flame
            className="size-3.5 fill-amber-100/90 drop-shadow-[0_0_3px_rgba(255,237,213,0.8)]"
            aria-hidden="true"
          />
        </motion.span>
      </span>

      <span className="relative inline-flex items-baseline gap-0.5 tabular-nums">
        <AnimatedNumber value={pct} format={(n) => `${n}`} />
        <span className="text-[10px] font-semibold tracking-widest text-white/85">% ACCURACY</span>
      </span>
    </motion.span>
  );
}
