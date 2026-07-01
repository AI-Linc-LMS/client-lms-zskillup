'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Zap } from 'lucide-react';

/**
 * "+N pts" burst that floats up and fades on a correct submit. Keyed on `nonce`
 * so re-earning the same value re-fires the animation. Renders nothing when the
 * answer earned 0 (wrong).
 */
export function PointsBurst({
  earned,
  nonce,
}: {
  earned: number | null | undefined;
  nonce: number;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center">
      <AnimatePresence>
        {earned && earned > 0 ? (
          <motion.div
            key={nonce}
            initial={{ opacity: 0, y: 12, scale: 0.8 }}
            animate={{ opacity: 1, y: -28, scale: 1 }}
            exit={{ opacity: 0, y: -56 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-sm font-black text-white shadow-lg"
          >
            <Zap className="size-4 fill-white" /> +{earned} pts
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
