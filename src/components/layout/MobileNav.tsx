'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { navForPath, workspaceLabelForPath } from './nav-config';

/**
 * Mobile workspace navigation. The persistent {@link Sidebar} is `hidden md:flex`
 * and the TopBar primary nav is `hidden lg:flex`, so below `md` there is no way to
 * navigate the app — this hamburger + slide-over drawer fills that gap. It reuses
 * the same route-aware {@link navForPath} config as the sidebar, so student,
 * super-admin and TPO workspaces all get the correct menu. Rendered inside the
 * TopBar and only visible below `md`.
 */
export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const sections = navForPath(pathname);
  const label = workspaceLabelForPath(pathname);

  // Close the drawer whenever the route changes (a nav link was tapped).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // While open: lock body scroll and close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={open}
        className="relative z-10 grid size-9 shrink-0 place-items-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-navy md:hidden"
      >
        <Menu className="size-5" />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-50 md:hidden"
            initial="closed"
            animate="open"
            exit="closed"
          >
            {/* Backdrop */}
            <motion.div
              variants={{ open: { opacity: 1 }, closed: { opacity: 0 } }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-navy/40 backdrop-blur-sm"
            />

            {/* Sliding panel */}
            <motion.aside
              variants={{ open: { x: 0 }, closed: { x: '-100%' } }}
              transition={{ type: 'spring', stiffness: 380, damping: 40 }}
              className="absolute left-0 top-0 flex h-[100dvh] w-[82vw] max-w-xs flex-col border-r border-slate-200 bg-white shadow-2xl"
              aria-label="Workspace navigation"
            >
              <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 px-4">
                <span className="truncate text-sm font-black tracking-tight text-navy">{label}</span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close navigation menu"
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-navy"
                >
                  <X className="size-5" />
                </button>
              </div>

              <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label="Workspace">
                {sections.map((section) => (
                  <div key={section.heading}>
                    <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
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
                                'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors',
                                active
                                  ? 'bg-[#f37021]/10 font-semibold text-[var(--color-primary)]'
                                  : 'font-medium text-slate-600 hover:bg-slate-100 hover:text-navy',
                              )}
                            >
                              <span
                                aria-hidden
                                className={cn(
                                  'flex size-7 shrink-0 items-center justify-center rounded-lg',
                                  active
                                    ? 'bg-gradient-to-br from-[#f7a14e] to-[#f37021] text-white shadow-[0_4px_12px_-4px_rgba(243,112,33,0.7)]'
                                    : 'text-slate-500',
                                )}
                              >
                                <Icon className="size-4" />
                              </span>
                              <span className="flex-1 truncate">{item.label}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </nav>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
