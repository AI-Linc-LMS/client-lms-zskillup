'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Briefcase, ClipboardCheck, Compass, LayoutGrid, Lock, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { useCalibrationStatus } from '@/hooks/useCalibrationStatus';
import {
  navForPath,
  PROFILE_GATED_HREFS,
  CALIBRATION_GATED_HREFS,
  type NavItem,
  type NavSection,
} from './nav-config';

/**
 * Workspace sidebar — route-aware.
 *
 * Student zone: a COLLAPSED icon rail of the five sections (Workspace / Practice
 * / Assessment / Career / Explore). Hovering (or focusing) a section slides out
 * an animated flyout with its sub-items — more canvas for the page, the nav a
 * hover away. Admin / TPO keep the classic full sidebar (their consoles rely on
 * always-visible section lists).
 */

const EASE = [0.22, 1, 0.36, 1] as const;

/** Section-level icons for the collapsed rail, keyed by the nav heading. */
const SECTION_ICON: Record<string, typeof Compass> = {
  WORKSPACE: LayoutGrid,
  PRACTICE: Target,
  ASSESSMENT: ClipboardCheck,
  CAREER: Briefcase,
  EXPLORE: Compass,
};

const titleCase = (h: string) => h.charAt(0) + h.slice(1).toLowerCase();

export function Sidebar() {
  const pathname = usePathname();
  const sections = navForPath(pathname);
  const reduce = useReducedMotion();
  const { complete: profileComplete } = useProfileCompletion();
  const { required: calibrationRequired } = useCalibrationStatus();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');
  const isLocked = (href: string) =>
    (calibrationRequired && CALIBRATION_GATED_HREFS.has(href)) ||
    (!profileComplete && PROFILE_GATED_HREFS.has(href));

  const isStudent = !/^\/(admin|superadmin|tpo)/.test(pathname);

  // ── Admin / TPO: classic full sidebar ──────────────────────────────────────
  if (!isStudent) {
    return (
      <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-60 shrink-0 flex-col self-start border-r border-[var(--color-line)] bg-white md:flex">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#f37021]/[0.04] to-transparent" />
        <nav className="scroll-soft relative flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label="Workspace">
          {sections.map((section) => (
            <div key={section.heading}>
              <p className="mb-2 flex items-center gap-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                <span aria-hidden className="h-px w-3 rounded-full bg-gradient-to-r from-[#f37021]/60 to-transparent" />
                {section.heading}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <FullNavLink item={item} active={isActive(item.href)} locked={isLocked(item.href)} reduce={!!reduce} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    );
  }

  // ── Student: collapsed rail with hover-expand flyouts ──────────────────────
  return (
    <StudentRail
      sections={sections}
      isActive={isActive}
      isLocked={isLocked}
      reduce={!!reduce}
    />
  );
}

function StudentRail({
  sections,
  isActive,
  isLocked,
  reduce,
}: {
  sections: NavSection[];
  isActive: (href: string) => boolean;
  isLocked: (href: string) => boolean;
  reduce: boolean;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const closeTimer = useRef<number | null>(null);

  const cancelClose = useCallback(() => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);
  const openNow = useCallback(
    (h: string) => {
      cancelClose();
      setOpen(h);
    },
    [cancelClose],
  );
  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpen(null), 140);
  }, [cancelClose]);
  useEffect(() => () => cancelClose(), [cancelClose]);

  return (
    <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-[4.75rem] shrink-0 flex-col self-start border-r border-[var(--color-line)] bg-white md:flex">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#f37021]/[0.05] to-transparent" />
      <nav className="relative flex flex-1 flex-col gap-1.5 px-2 py-4" aria-label="Workspace">
        {sections.map((section) => {
          const SecIcon = SECTION_ICON[section.heading] ?? Compass;
          const active = section.items.some((i) => isActive(i.href));
          const isOpen = open === section.heading;
          return (
            <div
              key={section.heading}
              className="relative"
              onMouseEnter={() => openNow(section.heading)}
              onMouseLeave={scheduleClose}
            >
              <button
                type="button"
                aria-expanded={isOpen}
                aria-label={titleCase(section.heading)}
                onFocus={() => openNow(section.heading)}
                className={cn(
                  'group flex w-full flex-col items-center gap-1 rounded-2xl px-1 py-2 transition-colors',
                  active || isOpen ? 'bg-[#f37021]/[0.09]' : 'hover:bg-slate-50',
                )}
              >
                <span
                  className={cn(
                    'grid size-9 place-items-center rounded-xl transition-all duration-200',
                    active
                      ? 'bg-gradient-to-br from-[#f7a14e] to-[#f37021] text-white shadow-[0_6px_16px_-6px_rgba(243,112,33,0.7)]'
                      : isOpen
                        ? 'bg-[#f37021]/10 text-[var(--color-primary)]'
                        : 'text-[var(--color-text-subtle)] group-hover:text-[var(--color-text)]',
                  )}
                >
                  <SecIcon className="size-[18px]" />
                </span>
                <span
                  className={cn(
                    'text-[9px] font-bold uppercase tracking-wide',
                    active || isOpen ? 'text-[var(--color-primary)]' : 'text-slate-400',
                  )}
                >
                  {titleCase(section.heading)}
                </span>
              </button>

              <AnimatePresence>
                {isOpen ? (
                  <motion.div
                    className="absolute left-full top-0 z-50 ml-1.5 w-56"
                    onMouseEnter={() => openNow(section.heading)}
                    onMouseLeave={scheduleClose}
                    role="menu"
                    aria-label={titleCase(section.heading)}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={reduce ? { duration: 0 } : { duration: 0.18, ease: EASE }}
                  >
                    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-2 shadow-[0_30px_70px_-30px_rgba(11,18,32,0.5)]">
                      <p className="flex items-center gap-2 px-2.5 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                        <span aria-hidden className="h-px w-3 rounded-full bg-gradient-to-r from-[#f37021]/60 to-transparent" />
                        {section.heading}
                      </p>
                      <ul className="space-y-0.5">
                        {section.items.map((item) => (
                          <li key={item.href}>
                            <FlyoutNavLink
                              item={item}
                              active={isActive(item.href)}
                              locked={isLocked(item.href)}
                              onNavigate={() => setOpen(null)}
                            />
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

/** Full-sidebar item (admin / TPO) — the original sliding-pill active treatment. */
function FullNavLink({
  item,
  active,
  locked,
  reduce,
}: {
  item: NavItem;
  active: boolean;
  locked: boolean;
  reduce: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      data-tour={`nav:${item.href}`}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-all duration-200',
        active
          ? 'font-semibold text-[var(--color-primary)]'
          : 'font-medium text-[var(--color-text-muted)] hover:-translate-y-px hover:text-[var(--color-text)]',
      )}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active-pill"
          aria-hidden
          className="absolute inset-0 rounded-xl border border-[#f37021]/20 bg-gradient-to-r from-[#f37021]/[0.14] via-[#f37021]/[0.07] to-transparent shadow-[0_6px_18px_-10px_rgba(243,112,33,0.6)]"
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 480, damping: 38, mass: 0.7 }}
        />
      )}
      {active && (
        <motion.span
          layoutId="sidebar-active-bar"
          aria-hidden
          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-gradient-to-b from-[#f7a14e] to-[#f37021]"
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 480, damping: 38, mass: 0.7 }}
        />
      )}
      {!active && (
        <span aria-hidden className="absolute inset-0 rounded-xl bg-[var(--color-surface-2)] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      )}
      <span
        aria-hidden
        className={cn(
          'relative z-10 flex size-7 shrink-0 items-center justify-center rounded-lg transition-all duration-200',
          active
            ? 'bg-gradient-to-br from-[#f7a14e] to-[#f37021] text-white shadow-[0_4px_12px_-4px_rgba(243,112,33,0.7)]'
            : 'text-[var(--color-text-subtle)] group-hover:text-[var(--color-text)]',
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="relative z-10 flex-1 truncate">{item.label}</span>
      {locked && <Lock className="relative z-10 size-3.5 shrink-0 text-slate-300" aria-label="Locked" />}
    </Link>
  );
}

/** Flyout item (student rail) — compact, closes the flyout on navigate. */
function FlyoutNavLink({
  item,
  active,
  locked,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  locked: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      data-tour={`nav:${item.href}`}
      aria-current={active ? 'page' : undefined}
      onClick={onNavigate}
      className={cn(
        'group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition-colors',
        active
          ? 'bg-gradient-to-r from-[#f37021]/[0.14] to-transparent font-semibold text-[var(--color-primary)]'
          : 'font-medium text-[var(--color-text-muted)] hover:bg-slate-50 hover:text-[var(--color-text)]',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'grid size-7 shrink-0 place-items-center rounded-lg transition-colors',
          active
            ? 'bg-gradient-to-br from-[#f7a14e] to-[#f37021] text-white shadow-[0_4px_12px_-4px_rgba(243,112,33,0.7)]'
            : 'text-[var(--color-text-subtle)] group-hover:text-[var(--color-text)]',
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="flex-1 truncate">{item.label}</span>
      {locked && <Lock className="size-3.5 shrink-0 text-slate-300" aria-label="Locked" />}
    </Link>
  );
}
