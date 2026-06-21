'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { navForPath } from './nav-config';

/**
 * Workspace sidebar — route-aware (student / super-admin / TPO). Pure
 * navigation: the placement-readiness (PPS) footer was removed with the rest of
 * the Sprint-7 surfaces, so nothing here renders fabricated data.
 *
 * Aurora redesign: refined uppercase section headings, nav items with a smooth
 * hover lift, and a distinctive active state — a brand-gradient pill that slides
 * between items via a shared `layoutId`, paired with a left accent indicator and
 * a gradient-tinted icon chip. Routes, labels, icons, active-detection logic and
 * structure are unchanged.
 */
export function Sidebar() {
  const pathname = usePathname();
  const sections = navForPath(pathname);
  const reduce = useReducedMotion();

  return (
    <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-60 shrink-0 flex-col self-start border-r border-[var(--color-line)] bg-white md:flex">
      {/* faint brand wash anchoring the rail */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#f37021]/[0.04] to-transparent"
      />
      <nav
        className="scroll-soft relative flex-1 space-y-6 overflow-y-auto px-3 py-5"
        aria-label="Workspace"
      >
        {sections.map((section) => (
          <div key={section.heading}>
            <p className="mb-2 flex items-center gap-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              <span
                aria-hidden
                className="h-px w-3 rounded-full bg-gradient-to-r from-[#f37021]/60 to-transparent"
              />
              {section.heading}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'group relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-all duration-200',
                        active
                          ? 'font-semibold text-[var(--color-primary)]'
                          : 'font-medium text-[var(--color-text-muted)] hover:-translate-y-px hover:text-[var(--color-text)]',
                      )}
                    >
                      {/* sliding active pill — shared layoutId glides between items */}
                      {active && (
                        <motion.span
                          layoutId="sidebar-active-pill"
                          aria-hidden
                          className="absolute inset-0 rounded-xl border border-[#f37021]/20 bg-gradient-to-r from-[#f37021]/[0.14] via-[#f37021]/[0.07] to-transparent shadow-[0_6px_18px_-10px_rgba(243,112,33,0.6)]"
                          transition={
                            reduce
                              ? { duration: 0 }
                              : { type: 'spring', stiffness: 480, damping: 38, mass: 0.7 }
                          }
                        />
                      )}
                      {/* left accent indicator */}
                      {active && (
                        <motion.span
                          layoutId="sidebar-active-bar"
                          aria-hidden
                          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-gradient-to-b from-[#f7a14e] to-[#f37021]"
                          transition={
                            reduce
                              ? { duration: 0 }
                              : { type: 'spring', stiffness: 480, damping: 38, mass: 0.7 }
                          }
                        />
                      )}

                      {/* idle hover wash (sits below content, fades in) */}
                      {!active && (
                        <span
                          aria-hidden
                          className="absolute inset-0 rounded-xl bg-[var(--color-surface-2)] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                        />
                      )}

                      {/* icon chip — gradient-tinted when active */}
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
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
