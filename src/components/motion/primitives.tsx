'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { animate, motion, useReducedMotion, type Variants } from 'framer-motion';

/**
 * Shared motion + Aurora primitives for the redesigned student app. Pure
 * framer-motion; honors prefers-reduced-motion. These are the building blocks
 * every redesigned route composes — scroll reveals, staggered grids, animated
 * counters, and the signature aurora gradient backdrop.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

/** Fade + rise into view as it scrolls on-screen (once). */
export function Reveal({
  children,
  delay = 0,
  y = 18,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

const containerV: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const itemV: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

/** A grid/list whose children animate in one after another on scroll. */
export function Stagger({
  children,
  className,
  'data-tour': dataTour,
}: {
  children: ReactNode;
  className?: string;
  'data-tour'?: string;
}) {
  return (
    <motion.div
      className={className}
      data-tour={dataTour}
      variants={containerV}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={itemV}>
      {children}
    </motion.div>
  );
}

/** Count a number up to its target when first mounted. */
export function AnimatedNumber({
  value,
  duration = 1,
  className,
  format = (n) => n.toLocaleString(),
}: {
  value: number;
  duration?: number;
  className?: string;
  format?: (n: number) => string;
}) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? value : 0);
  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }
    const controls = animate(0, value, {
      duration,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [value, duration, reduce]);
  return <span className={className}>{format(display)}</span>;
}

/**
 * Signature animated aurora backdrop — slow-drifting gradient meshes over a deep
 * navy canvas. Absolutely positioned; place inside a `relative` container.
 */
export function AuroraBackground({ className = '' }: { className?: string }) {
  const reduce = useReducedMotion();
  const drift = (x: number[], y: number[]) =>
    reduce ? undefined : { x, y, transition: { duration: 18, repeat: Infinity, repeatType: 'mirror' as const, ease: 'easeInOut' as const } };
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      {/* Prephasz 2026 hero base: deep ink → indigo (matches .night-hero) with a golden
          mesh glow instead of the old orange/purple aurora. */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f1117] via-[#171b2e] to-[#202b63]" />
      <motion.div
        className="absolute -left-32 -top-40 h-[34rem] w-[34rem] rounded-full bg-[#f6b51d]/[0.18] blur-[120px]"
        animate={drift([0, 60, -20, 0], [0, 40, 80, 0])}
      />
      <motion.div
        className="absolute -right-32 top-10 h-[30rem] w-[30rem] rounded-full bg-[#ffc42d]/[0.12] blur-[120px]"
        animate={drift([0, -50, 30, 0], [0, 60, -30, 0])}
      />
      <motion.div
        className="absolute bottom-[-12rem] left-1/3 h-[28rem] w-[28rem] rounded-full bg-[#202b63]/40 blur-[120px]"
        animate={drift([0, 40, -40, 0], [0, -30, 30, 0])}
      />
      {/* dotted grid + top fade for depth */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: 'radial-gradient(rgb(255 255 255 / 0.8) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
    </div>
  );
}
