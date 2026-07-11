'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Zap } from 'lucide-react';

/** How long the burst stays on screen before it floats away. */
const VISIBLE_MS = 1400;

/**
 * "+N pts" burst that floats up and fades on a correct submit. Keyed on `nonce`
 * so re-earning the same value re-fires the animation. Renders nothing when the
 * answer earned 0 (wrong).
 *
 * It self-dismisses on a timer: previously it rendered purely off `earned > 0`,
 * and since nothing ever reset that, the pill mounted on the first correct answer
 * and then stayed pinned to the viewport across every following question (the
 * `exit` animation only runs when the element actually leaves the tree). The
 * timer makes the burst the transient celebration it was always meant to be —
 * and the runner also clears `lastPoints` on Next, so the next question is clean
 * even if you advance before the timer fires.
 */
export function PointsBurst({
  earned,
  nonce,
}: {
  earned: number | null | undefined;
  nonce: number;
}) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!earned || earned <= 0) {
      setShown(false);
      return;
    }
    setShown(true);
    const t = window.setTimeout(() => setShown(false), VISIBLE_MS);
    return () => window.clearTimeout(t);
  }, [earned, nonce]);

  return (
    // Fixed to the VIEWPORT (not the scrolling, overflow-hidden runner) so the
    // "+N pts" is always visible near the top-centre regardless of scroll.
    <div className="pointer-events-none fixed left-1/2 top-20 z-[120] -translate-x-1/2">
      <AnimatePresence>
        {shown && earned && earned > 0 ? (
          <motion.div
            key={nonce}
            initial={{ opacity: 0, y: 16, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -24, scale: 0.9 }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-4 py-1.5 text-base font-black text-white shadow-[0_10px_30px_-8px_rgba(16,185,129,0.6)]"
          >
            <Zap className="size-4 fill-white" /> +{earned} pts
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
