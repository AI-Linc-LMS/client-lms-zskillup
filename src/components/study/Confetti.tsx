'use client';

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const COLORS = ['#f5b400', '#ffd24d', '#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b'];

/** A one-shot confetti burst from screen centre. Self-contained (no libs/canvas),
 *  pointer-events-none, and a no-op under prefers-reduced-motion. */
export function Confetti({ count = 40 }: { count?: number }) {
  const reduce = useReducedMotion();
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: (Math.random() * 2 - 1) * 320,
        up: 120 + Math.random() * 160,
        rot: (Math.random() * 2 - 1) * 540,
        delay: Math.random() * 0.12,
        color: COLORS[i % COLORS.length],
        w: 6 + Math.random() * 7,
      })),
    [count],
  );
  if (reduce) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center overflow-hidden">
      <div className="relative">
        {pieces.map((p) => (
          <motion.span
            key={p.id}
            className="absolute rounded-[2px]"
            style={{ width: p.w, height: p.w * 0.6, background: p.color }}
            initial={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
            animate={{ opacity: [1, 1, 0], x: p.x, y: [0, -p.up, 360], rotate: p.rot }}
            transition={{ duration: 1.8, delay: p.delay, ease: [0.2, 0.6, 0.4, 1] }}
          />
        ))}
      </div>
    </div>
  );
}
