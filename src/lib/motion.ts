import type { Transition, Variants } from 'framer-motion';

/**
 * Brand motion language (design-direction memory): ONE easing, THREE durations,
 * 40–60ms stagger. Every framer-motion animation in the app should compose from
 * these presets so motion feels authored, not scattered.
 */
export const EASE: Transition['ease'] = [0.22, 1, 0.36, 1];

export const DUR = {
  fast: 0.15,
  base: 0.25,
  slow: 0.4,
} as const;

/** Standard entrance: fade + rise. Use for cards, sections, panels. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: DUR.slow, ease: EASE } },
};

/** Subtle entrance for inline elements (chips, rows). */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: DUR.base, ease: EASE } },
};

/** Parent wrapper that staggers its children's `fadeUp`/`fadeIn` variants. */
export const stagger = (delayChildren = 0.05): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: delayChildren, ease: EASE } },
});

/** Quick spring-free hover/tap for buttons and tiles. */
export const pressable = {
  whileHover: { y: -2, transition: { duration: DUR.fast, ease: EASE } },
  whileTap: { y: 0, scale: 0.98 },
} as const;
