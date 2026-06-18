'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from './Logo';
import { AvatarMenu } from './AvatarMenu';
import { ExploreMenu } from './ExploreMenu';
import { StreakPill } from './StreakPill';
import { TopBarSearch } from './TopBarSearch';
import { NotificationsBell } from './NotificationsBell';
import { workspaceLabelForPath } from './nav-config';

/**
 * Persistent top bar, route-aware. The workspace label and the primary nav
 * adapt to the route group: the student Explore/Companies/search cluster only
 * shows in the student workspace (and during the super-admin "view as student"
 * preview, which lives on `/dashboard`); the admin and TPO consoles get a clean
 * bar driven by their sidebar instead.
 */
export function TopBar() {
  const pathname = usePathname();
  const isStudentZone = !pathname.startsWith('/superadmin') && !pathname.startsWith('/tpo');

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-5 border-b border-[var(--color-line)] glass px-6 shadow-sm">
      <Logo workspaceLabel={workspaceLabelForPath(pathname)} />

      {isStudentZone ? (
        <>
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

          <TopBarSearch />
        </>
      ) : null}

      {/* Right cluster */}
      <div className={isStudentZone ? 'flex items-center gap-2.5' : 'ml-auto flex items-center gap-2.5'}>
        <StreakPill />
        <NotificationsBell />
        <AvatarMenu />
      </div>
    </header>
  );
}
