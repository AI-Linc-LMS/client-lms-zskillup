'use client';

import { usePathname } from 'next/navigation';
import { CalendarDays, ChevronDown, Users } from 'lucide-react';
import { AvatarMenu } from '@/components/layout/AvatarMenu';
import { NotificationsBell } from '@/components/layout/NotificationsBell';
import { TPO_NAV } from '@/components/layout/nav-config';
import { useTpoConsole } from './TpoConsole';
import { TpoMobileNav } from './TpoMobileNav';

/** Longest-prefix match of the current route against the module nav → page title. */
function moduleTitle(pathname: string): string {
  let best = 'Placement Office';
  let bestLen = -1;
  for (const section of TPO_NAV) {
    for (const item of section.items) {
      if ((pathname === item.href || pathname.startsWith(item.href + '/')) && item.href.length > bestLen) {
        best = item.label;
        bestLen = item.href.length;
      }
    }
  }
  return best;
}

/**
 * Placement Office top bar - page title + welcome, a global Batch selector that
 * scopes every module (via TpoConsole context), a data-freshness chip, the
 * notifications bell and the avatar menu. The heavy nav lives in the sidebar, so
 * this bar stays clean.
 */
export function TpoTopBar() {
  const pathname = usePathname();
  const { summary, cohorts, cohortId, setCohortId } = useTpoConsole();
  const title = moduleTitle(pathname);
  const asOf = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <header className="glass sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200/70 px-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6),0_8px_24px_-18px_rgba(11,18,32,0.45)] sm:px-6">
      {/* aurora hairline - matches the student TopBar */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#ffc42d]/40 to-transparent"
      />
      <TpoMobileNav />
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-black tracking-tight text-navy">{title}</h1>
        <p className="hidden truncate text-xs text-slate-500 sm:block">
          Welcome back - here&apos;s what&apos;s happening across{' '}
          {summary?.collegeName ?? 'your campus'}.
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {/* Batch selector - scopes the whole console */}
        <div className="relative hidden sm:block">
          <Users className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-500" />
          <select
            value={cohortId}
            onChange={(e) => setCohortId(e.target.value)}
            aria-label="Batch"
            className="w-40 appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-8 text-xs font-semibold text-navy shadow-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
          >
            <option value="">All batches</option>
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-slate-500" />
        </div>

        {/* Data-freshness chip (analytics are point-in-time; date-range trends land with the snapshot pipeline) */}
        <span className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-600 lg:inline-flex">
          <CalendarDays className="size-3.5 text-slate-500" /> As of {asOf}
        </span>

        <NotificationsBell />
        <span aria-hidden className="mx-0.5 hidden h-6 w-px bg-slate-200 sm:block" />
        <AvatarMenu />
      </div>
    </header>
  );
}
