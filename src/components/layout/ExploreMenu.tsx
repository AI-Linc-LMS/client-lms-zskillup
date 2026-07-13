'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Building2,
  CalendarCheck,
  ChevronDown,
  ClipboardList,
  Compass,
  FileText,
  GraduationCap,
  MessageSquare,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { HOMEPAGE_FEATURED_TRACKS } from '@/lib/demo-data-extra';

/**
 * Explore mega-menu — a discovery hub that surfaces the platform's key
 * destinations (Practice · Grow · Companies) plus the Plus promo. Redesign of
 * the earlier two-column (Tracks · Companies) layout: every destination now
 * carries an icon + one-line description so the menu reads as a map of the app.
 *
 * Open/close model (CLAUDE.md §4.13 interactions):
 *
 *  - Hover-in on either the trigger button OR the dropdown opens immediately.
 *  - Hover-out starts a short close timer (150ms). Re-entering either region
 *    cancels the timer. This is the standard mega-menu pattern — without the
 *    delay, the small visual gap between the trigger and the full-width panel
 *    closes the menu as the cursor crosses it.
 *  - Click on the trigger toggles open/closed (keyboard- and tap-friendly).
 *  - Escape closes. Click outside closes.
 *  - Clicking any link inside closes immediately so the next page is unobstructed.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

type Dest = { label: string; href: string; icon: typeof Compass; desc: string };

const PRACTICE: Dest[] = [
  // "Company Hubs" now lives as its own sidebar section, so it's dropped from the
  // Explore dropdown to avoid duplicate navigation (the "Top companies" column
  // below still offers quick per-company jump-in).
  { label: 'Topic Mastery', href: '/practice', icon: Target, desc: 'Adaptive drills, section by section' },
  { label: 'Full Mock Quiz', href: '/mock-assessment', icon: ClipboardList, desc: 'Timed, full-length simulation' },
  { label: 'Non-Adaptive', href: '/practice-wish', icon: Sparkles, desc: 'Free-form practice on any topic' },
];

const GROW: Dest[] = [
  { label: 'Mock Interview', href: '/mock-interview', icon: MessageSquare, desc: 'Spoken AI interview + feedback' },
  { label: 'Resume Builder', href: '/resume-builder', icon: FileText, desc: 'ATS-ready in minutes' },
  { label: 'Study Plan', href: '/study-plan', icon: CalendarCheck, desc: 'Your personalized path' },
  { label: 'Leaderboard', href: '/leaderboard', icon: Trophy, desc: 'Climb your cohort' },
];

const PLUS_PERKS = ['Full company tracks', 'Video walkthroughs', 'Unlimited adaptive mocks'];

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
    <div ref={rootRef} className="hidden lg:block" onMouseEnter={openNow} onMouseLeave={scheduleClose}>
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
            // FULL-WIDTH panel pinned to the viewport just under the (sticky, h-14)
            // TopBar. `fixed inset-x-0` makes the width independent of whatever
            // positioned ancestor the TopBar provides.
            className="fixed inset-x-0 top-14 z-40"
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
              <div
                aria-hidden
                className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange/50 to-transparent"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-orange/10 blur-3xl"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -right-16 top-0 size-72 rounded-full bg-[#6d3bf5]/10 blur-3xl"
              />

              <motion.div
                className="relative mx-auto grid max-w-6xl grid-cols-12 gap-x-8 gap-y-6 px-6 py-8"
                initial="hidden"
                animate="show"
                variants={{
                  hidden: {},
                  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
                }}
              >
                {/* PRACTICE */}
                <Column className="col-span-3">
                  <SectionLabel icon={<Target className="size-3" />}>Practice &amp; assess</SectionLabel>
                  <div className="space-y-0.5">
                    {PRACTICE.map((d) => (
                      <DestRow key={d.href} d={d} onClick={closeNow} />
                    ))}
                  </div>
                </Column>

                {/* GROW */}
                <Column className="col-span-3">
                  <SectionLabel icon={<GraduationCap className="size-3" />}>Grow &amp; get hired</SectionLabel>
                  <div className="space-y-0.5">
                    {GROW.map((d) => (
                      <DestRow key={d.href} d={d} onClick={closeNow} />
                    ))}
                  </div>
                </Column>

                {/* COMPANIES */}
                <Column className="col-span-3">
                  <SectionLabel icon={<Building2 className="size-3" />}>Top companies</SectionLabel>
                  <div className="space-y-0.5">
                    {/* The five LIVE featured companies, shared with the Explore grid and the
                        landing tracks - not DEMO_COMPANIES.slice(0,5), which still led with
                        Wipro after it was delisted from the featured set. */}
                    {HOMEPAGE_FEATURED_TRACKS.filter((c) => !c.locked)
                      .slice(0, 5)
                      .map((c) => (
                      <Link
                        key={c.slug}
                        href={`/dashboard/company/${c.slug}`}
                        onClick={closeNow}
                        className="group flex items-center gap-3 rounded-xl border border-transparent px-2.5 py-2 transition-colors hover:border-slate-200/80 hover:bg-white hover:shadow-[0_10px_24px_-16px_rgba(11,18,32,0.5)]"
                      >
                        <CompanyChip name={c.company} accent={c.accent} logo={c.logoSrc} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-700 group-hover:text-navy">
                            {c.company}
                          </span>
                          <span className="block truncate text-[10px] text-slate-400">{c.description}</span>
                        </span>
                        <ArrowRight className="size-3.5 shrink-0 -translate-x-1 text-orange opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                      </Link>
                    ))}
                  </div>
                  <Link
                    href="/dashboard/company"
                    onClick={closeNow}
                    className="group mt-2 inline-flex items-center gap-1 px-2.5 text-sm font-semibold text-orange transition-colors hover:text-orange/80"
                  >
                    All companies
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Column>

                {/* Plus promo card */}
                <Column className="col-span-3">
                  <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2440] via-[#0b1220] to-[#0b1220] p-4 text-white shadow-[0_20px_50px_-24px_rgba(11,18,32,0.8)]">
                    <div
                      aria-hidden
                      className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full bg-orange/40 blur-2xl transition-opacity duration-500 group-hover:opacity-80"
                    />
                    <div
                      aria-hidden
                      className="pointer-events-none absolute -bottom-12 -left-8 size-28 rounded-full bg-[#6d3bf5]/40 blur-2xl"
                    />
                    <div className="relative flex flex-1 flex-col">
                      <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.08] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white/80 backdrop-blur">
                        <Sparkles className="size-3 text-[#ffb877]" />
                        prephasz Plus
                      </span>
                      <p className="mt-3 text-sm font-semibold leading-snug text-white">
                        Practice like the real drive.
                      </p>
                      <ul className="mt-3 space-y-1.5">
                        {PLUS_PERKS.map((perk) => (
                          <li key={perk} className="flex items-center gap-2 text-[12px] text-white/75">
                            <span className="grid size-4 shrink-0 place-items-center rounded-full bg-[#f37021]/20 text-[#ffb877]">
                              <svg viewBox="0 0 12 12" className="size-2.5 fill-none stroke-current stroke-[1.8]">
                                <path d="M2.5 6.2 5 8.5 9.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </span>
                            {perk}
                          </li>
                        ))}
                      </ul>
                      <Link
                        href="/upgrade"
                        onClick={closeNow}
                        className="group/cta mt-auto inline-flex w-fit items-center gap-1.5 rounded-xl bg-gradient-to-b from-[#f7a14e] to-[#f37021] px-4 py-2 text-sm font-bold text-white shadow-[0_12px_28px_-12px_rgba(243,112,33,0.9)] transition-transform active:scale-[0.98]"
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

/** Company logo chip — real brand logo on a white tile, monogram fallback. */
function CompanyChip({ name, accent, logo }: { name: string; accent: string; logo?: string }) {
  const [failed, setFailed] = useState(false);
  const showLogo = !!logo && !failed;
  return (
    <span
      className={cn(
        'grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg shadow-sm',
        showLogo
          ? 'bg-white p-1 ring-1 ring-slate-200/70'
          : cn('bg-gradient-to-br text-[10px] font-bold text-white', accent),
      )}
    >
      {showLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt={`${name} logo`}
          onError={() => setFailed(true)}
          loading="lazy"
          className="size-full object-contain"
        />
      ) : (
        name.slice(0, 2).toUpperCase()
      )}
    </span>
  );
}

/** A single destination row: icon chip + label + one-line description. */
function DestRow({ d, onClick }: { d: Dest; onClick: () => void }) {
  const Icon = d.icon;
  return (
    <Link
      href={d.href}
      onClick={onClick}
      className="group flex items-start gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-orange/[0.06]"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500 transition-colors group-hover:bg-orange/10 group-hover:text-orange">
        <Icon className="size-[18px]" />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1 text-sm font-semibold text-slate-800 group-hover:text-navy">
          {d.label}
          <ArrowRight className="size-3 -translate-x-1 text-orange opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
        </span>
        <span className="mt-0.5 block text-[11px] leading-snug text-slate-400">{d.desc}</span>
      </span>
    </Link>
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
    <p className="mb-3 flex items-center gap-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
      <span className="grid size-4 place-items-center rounded text-orange">{icon}</span>
      {children}
    </p>
  );
}
