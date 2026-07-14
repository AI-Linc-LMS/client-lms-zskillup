'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Briefcase,
  Building2,
  ChevronDown,
  ClipboardCheck,
  Compass,
  CreditCard,
  LayoutGrid,
  Lock,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { useCalibrationStatus } from '@/hooks/useCalibrationStatus';
import { useMySubscription } from '@/hooks/useMySubscription';
import { useOptionalGuide } from '@/components/guide/GuideProvider';
import {
  navForPath,
  PROFILE_GATED_HREFS,
  CALIBRATION_GATED_HREFS,
  PREMIUM_GATED_HREFS,
  PLAN_ONLY_HREFS,
  type NavItem,
} from './nav-config';

/**
 * Workspace sidebar — route-aware.
 *
 * Student zone: a full-width sidebar of the five sections (Workspace / Practice
 * / Assessment / Career / Explore) as collapsible accordion headers. Hovering
 * (or focusing) a section expands its sub-items DOWNWARD with an animated
 * height reveal; the section holding the current route stays open by default.
 * Admin / TPO keep the classic always-open full sidebar.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

/** Sections rendered FLAT — always-open, no collapse toggle (their items stand
 *  as individual nav links under a static header). */
const FLAT_HEADINGS = new Set(['COMPANY HUBS', 'PLANS & SUPPORT']);

/** Section-level icons for the accordion headers, keyed by the nav heading. */
const SECTION_ICON: Record<string, typeof Compass> = {
  // Student
  WORKSPACE: LayoutGrid,
  PRACTICE: Target,
  ASSESSMENT: ClipboardCheck,
  CAREER: Briefcase,
  EXPLORE: Compass,
  'COMPANY HUBS': Building2,
  'PLANS & SUPPORT': CreditCard,
  // Admin / Super-admin / TPO
  'PLATFORM ADMIN': LayoutGrid,
  OVERVIEW: LayoutGrid,
  INSIGHTS: Compass,
  PEOPLE: Briefcase,
  OPERATIONS: ClipboardCheck,
  ENGAGEMENT: Compass,
  MARKETING: Compass,
  CATALOG: ClipboardCheck,
  ANALYTICS: Compass,
  MANAGE: Target,
  ACCOUNT: Briefcase,
};

/** Title-case a heading that may be one or two words (e.g. "PLATFORM ADMIN"). */
const titleCase = (h: string) =>
  h
    .split(' ')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');

export function Sidebar() {
  const pathname = usePathname();
  const sections = navForPath(pathname);
  const reduce = useReducedMotion();
  const { complete: profileComplete } = useProfileCompletion();
  const { required: calibrationRequired } = useCalibrationStatus();
  // "Upgrade & Renew" only makes sense once a plan exists; free users buy via
  // "Explore Plans". Skip the fetch outside the student zone (the endpoint is
  // student-only) and hide plan-only items while there's no active plan.
  const isStudentZone = !/^\/(admin|tpo|superadmin)(\/|$)/.test(pathname);
  const { planStatus } = useMySubscription(isStudentZone);

  const visibleSections = sections
    .map((s) => ({
      ...s,
      items: s.items.filter(
        (i) => !(PLAN_ONLY_HREFS.has(i.href) && planStatus === 'none'),
      ),
    }))
    .filter((s) => s.items.length > 0);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');
  const isLocked = (href: string) =>
    (calibrationRequired && CALIBRATION_GATED_HREFS.has(href)) ||
    (!profileComplete && PROFILE_GATED_HREFS.has(href)) ||
    (planStatus === 'none' && PREMIUM_GATED_HREFS.has(href));

  // Collapsible accordion sidebar for EVERY role (student / admin / super-admin) —
  // sections expand on click, multi-open, with the active section open by default.
  return (
    <NavAccordion
      sections={visibleSections}
      isActive={isActive}
      isLocked={isLocked}
      reduce={!!reduce}
    />
  );
}

function NavAccordion({
  sections,
  isActive,
  isLocked,
  reduce,
}: {
  sections: ReturnType<typeof navForPath>;
  isActive: (href: string) => boolean;
  isLocked: (href: string) => boolean;
  reduce: boolean;
}) {
  // The section holding the current route — opened by default and re-opened on
  // navigation. Clicking a header toggles that section (multi-open: opening one
  // does NOT collapse the others).
  const activeHeading =
    sections.find((s) => s.items.some((i) => isActive(i.href)))?.heading ?? null;
  // While the platform guide runs, force every section open so its nav-item
  // steps (which live in otherwise-collapsed sections) can find + spotlight
  // their `data-tour` targets.
  const guideActive = useOptionalGuide()?.active ?? false;
  const [open, setOpen] = useState<Set<string>>(() => new Set(activeHeading ? [activeHeading] : []));
  useEffect(() => {
    if (activeHeading) {
      setOpen((prev) => (prev.has(activeHeading) ? prev : new Set(prev).add(activeHeading)));
    }
  }, [activeHeading]);

  return (
    <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-64 shrink-0 flex-col self-start border-r border-[var(--color-line)] bg-white md:flex">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#ffc42d]/[0.06] to-transparent" />
      <nav className="scroll-soft relative flex-1 space-y-1.5 overflow-y-auto px-3 py-4" aria-label="Workspace">
        {sections.map((section) => {
          const SecIcon = SECTION_ICON[section.heading] ?? Compass;
          const active = section.items.some((i) => isActive(i.href));
          const flat = FLAT_HEADINGS.has(section.heading);
          const expanded = flat || guideActive || open.has(section.heading);

          const iconEl = (
            <span
              className={cn(
                'grid size-8 shrink-0 place-items-center rounded-lg transition-all duration-200',
                active
                  ? 'bg-[#1a1a1a] text-[#ffc42d] ring-1 ring-[#ffc42d]/40'
                  : expanded
                    ? 'bg-[#ffc42d]/15 text-[var(--color-primary)]'
                    : 'text-[var(--color-text-subtle)] group-hover:text-[var(--color-text)]',
              )}
            >
              <SecIcon className="size-[18px]" />
            </span>
          );
          const labelEl = (
            <span
              className={cn(
                'flex-1 text-left text-[13px] font-bold uppercase tracking-wide',
                active || expanded ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]',
              )}
            >
              {titleCase(section.heading)}
            </span>
          );
          const itemsEl = (
            <ul className="ml-4 mt-1 space-y-0.5 border-l border-slate-100 pl-2">
              {section.items.map((item) => (
                <li key={item.href}>
                  <SubNavLink item={item} active={isActive(item.href)} locked={isLocked(item.href)} />
                </li>
              ))}
            </ul>
          );

          return (
            <div key={section.heading}>
              {flat ? (
                // Non-collapsible: static header, items always visible as individual links.
                <div className="group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5">
                  {iconEl}
                  {labelEl}
                </div>
              ) : (
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() =>
                    setOpen((prev) => {
                      const next = new Set(prev);
                      if (next.has(section.heading)) next.delete(section.heading);
                      else next.add(section.heading);
                      return next;
                    })
                  }
                  className={cn(
                    'group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 transition-colors',
                    expanded ? 'bg-[#fff5ea]' : 'hover:bg-[#fff5ea]',
                  )}
                >
                  {iconEl}
                  {labelEl}
                  <ChevronDown
                    aria-hidden
                    className={cn(
                      'size-4 shrink-0 text-slate-500 transition-transform duration-200',
                      expanded && 'rotate-180',
                    )}
                  />
                </button>
              )}

              {flat ? (
                itemsEl
              ) : (
                <AnimatePresence initial={false}>
                  {expanded ? (
                    <motion.div
                      key="items"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={reduce ? { duration: 0 } : { duration: 0.24, ease: EASE }}
                      className="overflow-hidden"
                    >
                      {itemsEl}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

/** Accordion sub-item — compact row under a section header. */
function SubNavLink({ item, active, locked }: { item: NavItem; active: boolean; locked: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      data-tour={`nav:${item.href}`}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition-colors',
        active
          ? // Active = black pill, WHITE label, GOLD icon + a gold ring accent - matches the
            // benchmark (black bg, white text, yellow icon) with the requested yellow border.
            'bg-[#1a1a1a] font-semibold text-white ring-1 ring-[#ffc42d]/30'
          : 'font-medium text-[var(--color-text-muted)] hover:bg-[#fff5ea] hover:text-[var(--color-text)]',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'grid size-7 shrink-0 place-items-center rounded-lg transition-colors',
          active
            ? 'text-[#ffc42d]'
            : 'text-[var(--color-text-subtle)] group-hover:text-[var(--color-text)]',
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="flex-1 truncate">{item.label}</span>
      {locked && <Lock className="size-3.5 shrink-0 text-slate-400" aria-label="Locked" />}
    </Link>
  );
}
