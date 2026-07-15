'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ChevronDown,
  ChevronLeft,
  Download,
  GraduationCap,
  PanelLeft,
  Plus,
  Upload,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TPO_NAV } from '@/components/layout/nav-config';
import { useTpoConsole } from './TpoConsole';

interface QuickAction {
  label: string;
  href: string;
  icon: LucideIcon;
}
const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Create Assessment', href: '/tpo/assessments', icon: Plus },
  { label: 'Upload Students', href: '/tpo/invitations', icon: Upload },
  { label: 'Export Report', href: '/tpo/reports', icon: Download },
];

/**
 * Placement Office console sidebar — brand lockup, the 11-module nav (grouped),
 * a Quick Actions block, and a persisted collapse toggle. Dedicated to the /tpo
 * route group (NOT the shared student/admin Sidebar), so its bespoke chrome
 * carries no regression risk to the other consoles.
 */
export function TpoSidebar() {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const { summary, collapsed, toggleCollapsed } = useTpoConsole();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');
  const activeHeading = TPO_NAV.find((s) => s.items.some((i) => isActive(i.href)))?.heading ?? null;
  const [open, setOpen] = useState<Set<string>>(() => new Set(activeHeading ? [activeHeading] : []));
  useEffect(() => {
    if (activeHeading) setOpen((p) => (p.has(activeHeading) ? p : new Set(p).add(activeHeading)));
  }, [activeHeading]);

  return (
    <aside
      className={cn(
        'sticky top-0 z-40 hidden h-dvh shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-200 md:flex',
        collapsed ? 'w-[4.75rem]' : 'w-64',
      )}
    >
      {/* Brand lockup */}
      <div
        className={cn(
          'flex h-16 shrink-0 items-center gap-2.5 border-b border-slate-100 px-4',
          collapsed && 'justify-center px-0',
        )}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#ffd24d] to-[#f5b400] text-[#171717]">
          <GraduationCap className="size-5" />
        </span>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-black leading-tight tracking-tight text-navy">
              TPO Platform
            </p>
            <p className="truncate text-[11px] font-medium text-slate-500">
              {summary?.collegeName ?? 'Placement Office'}
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="scroll-soft flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Placement Office">
        {TPO_NAV.map((section) => {
          const sectionActive = section.items.some((i) => isActive(i.href));
          // When width-collapsed (icon rail) every section shows; otherwise it's a
          // click-to-toggle accordion (multi-open, active section open by default).
          const expanded = collapsed || open.has(section.heading);
          return (
          <div key={section.heading}>
            {!collapsed && (
              <button
                type="button"
                onClick={() =>
                  setOpen((p) => {
                    const n = new Set(p);
                    if (n.has(section.heading)) n.delete(section.heading);
                    else n.add(section.heading);
                    return n;
                  })
                }
                aria-expanded={expanded}
                className={cn(
                  'mb-1 flex w-full items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest transition-colors',
                  sectionActive ? 'text-[#1a1a1a]' : 'text-slate-500 hover:text-navy',
                )}
              >
                <span className="flex-1 text-left">{section.heading}</span>
                <ChevronDown className={cn('size-3.5 shrink-0 transition-transform', expanded && 'rotate-180')} />
              </button>
            )}
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.ul
                  key="items"
                  initial={collapsed || reduce ? false : { height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={reduce ? { duration: 0 } : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-0.5 overflow-hidden"
                >
              {section.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        'group relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-all duration-200',
                        collapsed && 'justify-center px-0',
                        active
                          ? 'font-semibold text-white'
                          : 'font-medium text-slate-600 hover:text-navy',
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="tpo-active-pill"
                          aria-hidden
                          className="absolute inset-0 rounded-xl bg-[#1a1a1a] ring-1 ring-[#ffc42d]/30"
                          transition={
                            reduce ? { duration: 0 } : { type: 'spring', stiffness: 480, damping: 38, mass: 0.7 }
                          }
                        />
                      )}
                      {!active && (
                        <span
                          aria-hidden
                          className="absolute inset-0 rounded-xl bg-slate-50 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                        />
                      )}
                      <span
                        aria-hidden
                        className={cn(
                          'relative z-10 flex size-7 shrink-0 items-center justify-center rounded-lg transition-all duration-200',
                          active
                            ? 'text-[#ffc42d]'
                            : 'text-slate-500 group-hover:text-navy',
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      {!collapsed && <span className="relative z-10 flex-1 truncate">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
          );
        })}

        {/* Quick actions */}
        <div>
          {!collapsed && (
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Quick Actions
            </p>
          )}
          <ul className="space-y-1">
            {QUICK_ACTIONS.map((a) => {
              const Icon = a.icon;
              return (
                <li key={a.label}>
                  <Link
                    href={a.href}
                    title={collapsed ? a.label : undefined}
                    className={cn(
                      'flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-[#ffc42d]/40 hover:bg-[#fff5ea] hover:text-navy',
                      collapsed && 'justify-center px-0',
                    )}
                  >
                    <Icon className="size-4 shrink-0 text-[#f5b400]" />
                    {!collapsed && <span className="truncate">{a.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* Collapse toggle */}
      <div className="shrink-0 border-t border-slate-100 p-3">
        <button
          type="button"
          onClick={toggleCollapsed}
          className={cn(
            'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-navy',
            collapsed && 'justify-center px-0',
          )}
          aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
        >
          {collapsed ? <PanelLeft className="size-4" /> : <ChevronLeft className="size-4" />}
          {!collapsed && <span>Collapse Menu</span>}
        </button>
      </div>
    </aside>
  );
}
