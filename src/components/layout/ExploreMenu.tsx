'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Building2,
  ChevronDown,
  Compass,
  LayoutGrid,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ASSESSMENT_PLATFORMS, DEMO_COMPANIES, EXPLORE_TRACKS } from '@/lib/demo-data';

/**
 * Explore mega-menu — Aurora redesign of the demo prototype's three-column layout
 * (TRACKS · PLATFORMS · COMPANIES) plus the ZSkillup Plus promo card.
 *
 * Open/close model (CLAUDE.md §4.13 interactions):
 *
 *  - Hover-in on either the trigger button OR the dropdown opens immediately.
 *  - Hover-out starts a short close timer (150ms). Re-entering either region
 *    cancels the timer. This is the standard mega-menu pattern — without the
 *    delay, the small visual gap between the trigger and the full-width panel
 *    closes the menu as the cursor crosses it (the original bug the QA audit
 *    surfaced — the menu disappeared the moment the user tried to click a
 *    track or platform).
 *  - Click on the trigger toggles open/closed (keyboard- and tap-friendly).
 *  - Escape closes. Click outside closes.
 *  - Clicking any link inside closes immediately so the next page is unobstructed.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

export function ExploreMenu() {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const cancelClose = useCallback(() => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => {
      setOpen(false);
      closeTimer.current = null;
    }, 150);
  }, [cancelClose]);

  const openNow = useCallback(() => {
    cancelClose();
    setOpen(true);
  }, [cancelClose]);

  const closeNow = useCallback(() => {
    cancelClose();
    setOpen(false);
  }, [cancelClose]);

  // Escape + click-outside (only registered while open).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeNow();
    };
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) closeNow();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, [open, closeNow]);

  // Clear any pending timer on unmount.
  useEffect(() => () => cancelClose(), [cancelClose]);

  return (
    <div
      ref={rootRef}
      className="hidden lg:block"
      onMouseEnter={openNow}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => (open ? closeNow() : openNow())}
        className={cn(
          'group inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-all',
          open
            ? 'bg-orange/10 text-navy ring-1 ring-orange/20'
            : 'text-slate-600 hover:bg-slate-100 hover:text-navy',
        )}
      >
        <Compass
          className={cn(
            'size-4 transition-colors',
            open ? 'text-orange' : 'text-slate-400 group-hover:text-orange',
          )}
          aria-hidden="true"
        />
        Explore
        <ChevronDown
          className={cn('size-4 transition-transform duration-300', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            // The panel is the FULL width of the viewport beneath the TopBar.
            // Wrapping a hover-friendly region around it (handlers below) so the
            // cursor crossing the small visual gap from the trigger doesn't fire
            // a real mouseLeave on the root.
            className="absolute left-0 right-0 top-14 z-40"
            onMouseEnter={openNow}
            onMouseLeave={scheduleClose}
            role="menu"
            aria-label="Explore"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: EASE }}
          >
            {/* Layered surface: crisp white panel with a faint aurora wash + soft
                top border accent for depth. */}
            <div className="relative overflow-hidden border-b border-slate-200/80 bg-white/95 shadow-[0_30px_70px_-35px_rgba(11,18,32,0.45)] backdrop-blur-xl">
              {/* gradient hairline at the very top edge */}
              <div
                aria-hidden
                className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange/50 to-transparent"
              />
              {/* faint aurora glow blobs behind the content */}
              <div
                aria-hidden
                className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-orange/10 blur-3xl"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -right-16 top-0 size-72 rounded-full bg-[#6d3bf5]/10 blur-3xl"
              />

              <motion.div
                className="relative mx-auto grid max-w-6xl grid-cols-12 gap-8 px-6 py-8"
                initial="hidden"
                animate="show"
                variants={{
                  hidden: {},
                  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
                }}
              >
                {/* TRACKS */}
                <Column className="col-span-2">
                  <SectionLabel icon={<Compass className="size-3" />}>Tracks</SectionLabel>
                  <ul className="space-y-1">
                    {EXPLORE_TRACKS.map((t) => (
                      <li key={t.href}>
                        <Link
                          href={t.href}
                          onClick={closeNow}
                          className="group flex items-center justify-between rounded-lg px-2 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-orange/[0.07] hover:text-navy"
                        >
                          {t.label}
                          <ArrowRight className="size-3.5 -translate-x-1 text-orange opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Column>

                {/* PLATFORMS */}
                <Column className="col-span-4">
                  <SectionLabel icon={<LayoutGrid className="size-3" />}>Platforms</SectionLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {ASSESSMENT_PLATFORMS.map((p, i) => (
                      <Link
                        key={p}
                        href={`/prepare?platform=${encodeURIComponent(p.toLowerCase())}`}
                        onClick={closeNow}
                        className="group relative flex items-center gap-2.5 overflow-hidden rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-all hover:-translate-y-0.5 hover:border-orange/40 hover:text-navy hover:shadow-[0_10px_24px_-14px_rgba(243,112,33,0.6)]"
                      >
                        <span
                          className="grid size-7 shrink-0 place-items-center rounded-lg text-[10px] font-bold text-white shadow-sm"
                          style={{ background: chipGradient(i) }}
                        >
                          {p.slice(0, 2).toUpperCase()}
                        </span>
                        {p}
                      </Link>
                    ))}
                  </div>
                </Column>

                {/* COMPANIES */}
                <Column className="col-span-4">
                  <SectionLabel icon={<Building2 className="size-3" />}>Companies</SectionLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {DEMO_COMPANIES.slice(0, 9).map((c) => (
                      <Link
                        key={c.slug}
                        href={`/dashboard/company/${c.slug}`}
                        onClick={closeNow}
                        className="group relative flex items-center gap-2.5 overflow-hidden rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-all hover:-translate-y-0.5 hover:border-orange/40 hover:text-navy hover:shadow-[0_10px_24px_-14px_rgba(243,112,33,0.6)]"
                      >
                        <span
                          className={cn(
                            'grid size-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-[10px] font-bold text-white shadow-sm',
                            c.accent,
                          )}
                        >
                          {c.name.slice(0, 2).toUpperCase()}
                        </span>
                        {c.name}
                      </Link>
                    ))}
                  </div>
                  <Link
                    href="/dashboard/company"
                    onClick={closeNow}
                    className="group mt-3 inline-flex items-center gap-1 text-sm font-semibold text-orange transition-colors hover:text-orange/80"
                  >
                    All companies
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Column>

                {/* ZSkillup Plus promo card */}
                <Column className="col-span-2">
                  <div className="group relative h-full overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2440] via-[#0b1220] to-[#0b1220] p-4 text-white shadow-[0_20px_50px_-24px_rgba(11,18,32,0.8)]">
                    {/* aurora orbs inside the promo */}
                    <div
                      aria-hidden
                      className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full bg-orange/40 blur-2xl transition-opacity duration-500 group-hover:opacity-80"
                    />
                    <div
                      aria-hidden
                      className="pointer-events-none absolute -bottom-12 -left-8 size-28 rounded-full bg-[#6d3bf5]/40 blur-2xl"
                    />
                    <div className="relative">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.08] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white/80 backdrop-blur">
                        <Sparkles className="size-3 text-[#ffb877]" />
                        ZSkillup Plus
                      </span>
                      <p className="mt-3 text-sm leading-relaxed text-white/80">
                        Full company tracks, video walkthroughs, and adaptive mocks &mdash;
                        practice like the real drive.
                      </p>
                      <Link
                        href="/prepare"
                        onClick={closeNow}
                        className="group/cta mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-[#f7a14e] to-[#f37021] px-4 py-2 text-sm font-bold text-white shadow-[0_12px_28px_-12px_rgba(243,112,33,0.9)] transition-transform active:scale-[0.98]"
                      >
                        Get started
                        <ArrowRight className="size-4 transition-transform group-hover/cta:translate-x-0.5" />
                      </Link>
                    </div>
                  </div>
                </Column>
              </motion.div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** A staggered column wrapper for the mega-menu sections. */
function Column({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
      }}
    >
      {children}
    </motion.div>
  );
}

/** Tiny uppercase section label with a gradient icon chip. */
function SectionLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <p className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
      <span className="grid size-4 place-items-center rounded text-orange">{icon}</span>
      {children}
    </p>
  );
}

/** Deterministic gradient palette for the platform chips (no accent in data). */
const CHIP_GRADIENTS = [
  'linear-gradient(135deg, #f7a14e, #f37021)',
  'linear-gradient(135deg, #7c6cf5, #5b3bf5)',
  'linear-gradient(135deg, #38bdf8, #1e6ff5)',
  'linear-gradient(135deg, #34d399, #059669)',
  'linear-gradient(135deg, #fb7185, #e11d48)',
  'linear-gradient(135deg, #f5c451, #e0a91b)',
  'linear-gradient(135deg, #a78bfa, #7c3aed)',
  'linear-gradient(135deg, #2dd4bf, #0d9488)',
];

function chipGradient(i: number): string {
  return CHIP_GRADIENTS[i % CHIP_GRADIENTS.length];
}
