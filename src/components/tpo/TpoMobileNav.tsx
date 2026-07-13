'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { GraduationCap, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TPO_NAV } from '@/components/layout/nav-config';

/** Hamburger + slide-in drawer that gives the TPO console navigation below `md`
 *  (the desktop TpoSidebar is `hidden md:flex`, so the console had no mobile nav). */
export function TpoMobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-navy md:hidden"
      >
        <Menu className="size-5" />
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[60] md:hidden">
            <motion.div
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              className="absolute inset-y-0 left-0 flex w-72 max-w-[82vw] flex-col bg-white shadow-2xl"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 40 }}
            >
              <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-slate-100 px-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#ffd24d] to-[#f5b400] text-[#171717]">
                  <GraduationCap className="size-5" />
                </span>
                <p className="flex-1 text-sm font-black tracking-tight text-navy">TPO Platform</p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100"
                >
                  <X className="size-5" />
                </button>
              </div>

              <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
                {TPO_NAV.map((section) => (
                  <div key={section.heading}>
                    <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                      {section.heading}
                    </p>
                    <ul className="space-y-0.5">
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href);
                        return (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              onClick={() => setOpen(false)}
                              aria-current={active ? 'page' : undefined}
                              className={cn(
                                'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors',
                                active
                                  ? 'bg-[#1a1a1a] font-semibold text-white'
                                  : 'font-medium text-slate-600 hover:bg-[#fff5ea] hover:text-navy',
                              )}
                            >
                              <span
                                className={cn(
                                  'grid size-7 shrink-0 place-items-center rounded-lg',
                                  active
                                    ? 'text-[#ffc42d]'
                                    : 'text-slate-400',
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
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
