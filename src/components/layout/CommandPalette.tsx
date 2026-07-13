'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { AnimatePresence, motion } from 'framer-motion';
import { navForPath } from './nav-config';
import { ArrowRight, Building2, Search } from 'lucide-react';

/**
 * ⌘K command palette (design-direction: app-feel upgrades). Role-aware — it
 * reuses the same nav model as the sidebar, so admins never see student
 * destinations. Company quick-jumps mirror the TopBarSearch known-slug list.
 */
const COMPANIES = ['tcs', 'infosys', 'wipro', 'cognizant', 'capgemini', 'accenture'];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const sections = navForPath(pathname);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Let any component (e.g. TopBarSearch) open the palette via a window event.
  useEffect(() => {
    const openIt = () => setOpen(true);
    window.addEventListener('open-command-palette', openIt);
    return () => window.removeEventListener('open-command-palette', openIt);
  }, []);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] flex items-start justify-center bg-navy-950/40 p-4 pt-[14vh] backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Command label="Command palette" loop>
              <div className="flex items-center gap-2.5 border-b border-slate-100 px-4">
                <Search className="size-4 shrink-0 text-slate-400" />
                <Command.Input
                  autoFocus
                  placeholder="Jump to anything…"
                  className="w-full bg-transparent py-3.5 text-sm text-navy placeholder:text-slate-400 focus:outline-none"
                />
                <kbd className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">esc</kbd>
              </div>
              <Command.List className="scroll-soft max-h-[46vh] overflow-y-auto p-2">
                <Command.Empty className="py-8 text-center text-sm text-slate-400">
                  Nothing matches — try a page or company name.
                </Command.Empty>
                {sections.map((section) => (
                  <Command.Group
                    key={section.heading}
                    heading={section.heading}
                    className="mb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-slate-400"
                  >
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Command.Item
                          key={item.href}
                          value={`${section.heading} ${item.label}`}
                          onSelect={() => go(item.href)}
                          className="group flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium text-slate-600 data-[selected=true]:bg-orange-50 data-[selected=true]:text-navy"
                        >
                          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500 group-data-[selected=true]:bg-orange group-data-[selected=true]:text-[#171717]">
                            <Icon className="size-4" />
                          </span>
                          <span className="flex-1">{item.label}</span>
                          <ArrowRight className="size-3.5 text-slate-300 opacity-0 group-data-[selected=true]:opacity-100" />
                        </Command.Item>
                      );
                    })}
                  </Command.Group>
                ))}
                {/* Company quick-jumps — student area only */}
                {!pathname.startsWith('/superadmin') && !pathname.startsWith('/admin') && !pathname.startsWith('/tpo') && (
                  <Command.Group
                    heading="COMPANY HUBS"
                    className="mb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-slate-400"
                  >
                    {COMPANIES.map((slug) => (
                      <Command.Item
                        key={slug}
                        value={`company ${slug}`}
                        onSelect={() => go(`/dashboard/company/${slug}`)}
                        className="group flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium capitalize text-slate-600 data-[selected=true]:bg-orange-50 data-[selected=true]:text-navy"
                      >
                        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500 group-data-[selected=true]:bg-orange group-data-[selected=true]:text-[#171717]">
                          <Building2 className="size-4" />
                        </span>
                        <span className="flex-1">{slug === 'tcs' ? 'TCS' : slug}</span>
                        <ArrowRight className="size-3.5 text-slate-300 opacity-0 group-data-[selected=true]:opacity-100" />
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
              </Command.List>
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-[10px] text-slate-400">
                <span>↑↓ navigate · ↵ open</span>
                <span className="font-semibold">ZSkillup</span>
              </div>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
