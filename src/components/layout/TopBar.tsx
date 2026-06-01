import Link from 'next/link';
import { Bell, Search } from 'lucide-react';
import { Logo } from './Logo';
import { AvatarMenu } from './AvatarMenu';
import { ExploreMenu } from './ExploreMenu';
import { StreakPill } from './StreakPill';
import { DEMO_STUDENT } from '@/lib/demo-data';

/**
 * Persistent top bar — matches reference screenshot exactly.
 * Server Component; ExploreMenu, AvatarMenu, StreakPill are client leaves.
 */
export function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-5 border-b border-slate-200 bg-white px-6 shadow-sm">
      {/* Logo */}
      <Logo workspaceLabel="Student Workspace" />

      {/* Primary nav */}
      <nav className="hidden items-center gap-5 lg:flex" aria-label="Primary">
        <ExploreMenu />
        <Link
          href="/dashboard/company"
          className="text-sm font-medium text-slate-600 transition-colors hover:text-navy"
        >
          Companies
        </Link>
      </nav>

      {/* Search */}
      <div className="relative ml-auto hidden max-w-xs flex-1 lg:block">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          type="search"
          placeholder="Search companies, topics…"
          aria-label="Search companies and topics"
          className="h-8 w-full rounded-full border border-slate-200 bg-slate-50 pl-8 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/30"
        />
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-2.5">
        <StreakPill days={DEMO_STUDENT.streakDays} />

        <button
          type="button"
          aria-label="Notifications"
          className="relative grid size-8 place-items-center rounded-full text-slate-500 transition-colors hover:bg-slate-100"
        >
          <Bell className="size-4" aria-hidden="true" />
          <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-red-500" aria-hidden="true" />
        </button>

        <AvatarMenu initials={DEMO_STUDENT.initials} />
      </div>
    </header>
  );
}
