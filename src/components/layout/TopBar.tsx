import Link from 'next/link';
import { Logo } from './Logo';
import { AvatarMenu } from './AvatarMenu';
import { ExploreMenu } from './ExploreMenu';
import { StreakPill } from './StreakPill';
import { TopBarSearch } from './TopBarSearch';
import { NotificationsBell } from './NotificationsBell';
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
      <TopBarSearch />

      {/* Right cluster */}
      <div className="flex items-center gap-2.5">
        <StreakPill days={DEMO_STUDENT.streakDays} />

        <NotificationsBell />

        <AvatarMenu initials={DEMO_STUDENT.initials} />
      </div>
    </header>
  );
}
