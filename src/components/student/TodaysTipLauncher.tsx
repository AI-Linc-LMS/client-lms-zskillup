'use client';

import { type ComponentType, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Building2,
  Flame,
  Lightbulb,
  type LucideProps,
  Moon,
  Rocket,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTodaysTip, type ApiTip } from '@/lib/api/tips';

/** Map the admin-authored icon name to a lucide component (fallback: Lightbulb). */
const ICONS: Record<string, ComponentType<LucideProps>> = {
  Lightbulb,
  Flame,
  Timer,
  Target,
  Zap,
  Building2,
  TrendingUp,
  Moon,
  Sparkles,
  Rocket,
};

/** Warm opener lines, rotated per open (client-only flourish, never business data). */
const ENCOURAGEMENTS = [
  "You've got this — here's today's edge.",
  "One small insight a day compounds. Here's yours.",
  'A minute now, a mark later — today’s tip:',
  'Keep the streak alive with today’s quick win.',
  'Sharpen up — your edge for today is ready.',
];

/** How long the modal stays before auto-dismissing (paused while hovered). */
const AUTO_DISMISS_MS = 9000;

/**
 * Today's Tip, relocated off the dashboard into a top-nav launcher (sits beside
 * "Recommended for you"). Clicking opens a small, encouraging modal with the
 * global tip of the day; it auto-dismisses after a few seconds (paused while the
 * pointer is over it) or fades away on a click outside / Esc. The tip is fetched
 * lazily on first open so it costs nothing on pages the student never triggers it.
 */
export function TodaysTipLauncher() {
  const [open, setOpen] = useState(false);
  const [tip, setTip] = useState<ApiTip | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [paused, setPaused] = useState(false);
  const [line, setLine] = useState(ENCOURAGEMENTS[0]);
  const openCount = useRef(0);
  const reduce = useReducedMotion();

  const close = useCallback(() => setOpen(false), []);

  const openNow = useCallback(() => {
    // Rotate the opener deterministically (no Math.random needed).
    openCount.current += 1;
    setLine(ENCOURAGEMENTS[openCount.current % ENCOURAGEMENTS.length]);
    setPaused(false);
    setOpen(true);
    if (!loaded) {
      getTodaysTip()
        .then(setTip)
        .catch(() => setTip(null))
        .finally(() => setLoaded(true));
    }
  }, [loaded]);

  // Esc-to-close + body scroll lock while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  // Reduced-motion path: no visible countdown bar, so drive auto-dismiss on a timer
  // (paused while hovered). The animated-bar path dismisses via onAnimationEnd.
  useEffect(() => {
    if (!open || !reduce || paused || !loaded) return;
    const t = window.setTimeout(close, AUTO_DISMISS_MS);
    return () => window.clearTimeout(t);
  }, [open, reduce, paused, loaded, close]);

  const Icon = (tip?.icon && ICONS[tip.icon]) || Lightbulb;

  return (
    <>
      <button
        type="button"
        onClick={openNow}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          'group hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-all lg:inline-flex',
          open ? 'bg-amber-100 text-navy ring-1 ring-amber-200' : 'text-slate-600 hover:bg-slate-100 hover:text-navy',
        )}
      >
        <Lightbulb
          className={cn('size-4 transition-colors', open ? 'text-amber-500' : 'text-slate-500 group-hover:text-amber-500')}
          aria-hidden
        />
        Tip of the day
      </button>

      {typeof document !== 'undefined'
        ? createPortal(
            <AnimatePresence>
              {open ? (
                <motion.div
                  className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-24 sm:items-center sm:pt-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  role="dialog"
                  aria-modal="true"
                  aria-label="Today's tip"
                  onMouseDown={(e) => {
                    // Click on the backdrop (not the panel) fades it away.
                    if (e.target === e.currentTarget) close();
                  }}
                >
                  {/* Backdrop — solid tint, no blur (DESIGN LAW: no glassmorphism). */}
                  <div aria-hidden className="absolute inset-0 bg-navy/50" />

                  <motion.div
                    className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg"
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.98 }}
                    animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    onMouseEnter={() => setPaused(true)}
                    onMouseLeave={() => setPaused(false)}
                  >
                    <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-[#f5b400] to-amber-400" />

                    <button
                      type="button"
                      onClick={close}
                      aria-label="Close"
                      className="absolute right-3 top-3 grid size-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/40"
                    >
                      <X className="size-4" />
                    </button>

                    <div className="p-6">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-500">Tip of the day</p>
                      <p className="mt-1 text-sm font-semibold text-navy">{line}</p>

                      {!loaded ? (
                        <div className="mt-4 flex animate-pulse items-start gap-4">
                          <div className="size-12 shrink-0 rounded-2xl bg-amber-100" />
                          <div className="flex-1 space-y-2 py-1">
                            <div className="h-4 w-3/4 rounded bg-slate-100" />
                            <div className="h-3 w-full rounded bg-slate-100" />
                            <div className="h-3 w-5/6 rounded bg-slate-100" />
                          </div>
                        </div>
                      ) : !tip ? (
                        <p className="mt-4 text-sm leading-relaxed text-slate-500">
                          No tip to show right now — check back tomorrow for your next edge.
                        </p>
                      ) : (
                        <div className="mt-4 flex items-start gap-4">
                          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#ffd24d] to-[#f5b400] text-[#171717]">
                            <Icon className="size-6" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-base font-bold leading-snug text-navy">
                              {tip.title}
                              {tip.category ? (
                                <span className="ml-2 align-middle text-[10px] font-semibold uppercase tracking-widest text-amber-600">
                                  · {tip.category}
                                </span>
                              ) : null}
                            </h3>
                            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{tip.body}</p>
                            {tip.ctaLabel && tip.ctaHref ? (
                              <Link
                                href={tip.ctaHref}
                                onClick={close}
                                className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-amber-600 transition-colors hover:text-amber-700"
                              >
                                {tip.ctaLabel}
                                <ArrowRight className="size-3.5" />
                              </Link>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Auto-dismiss countdown — pauses while hovered. The animation
                        END is what closes the modal, so pause keeps it open. */}
                    {!reduce && loaded ? (
                      <div aria-hidden className="h-1 w-full bg-slate-100">
                        <div
                          className="h-full bg-gradient-to-r from-amber-400 to-orange"
                          style={{
                            animation: `tip-countdown ${AUTO_DISMISS_MS}ms linear forwards`,
                            animationPlayState: paused ? 'paused' : 'running',
                          }}
                          onAnimationEnd={close}
                        />
                      </div>
                    ) : null}
                  </motion.div>

                  <style>{`@keyframes tip-countdown { from { width: 100%; } to { width: 0%; } }`}</style>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}
