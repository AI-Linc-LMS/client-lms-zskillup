'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Logo } from './Logo';
import { MobileNav } from './MobileNav';
import { AvatarMenu } from './AvatarMenu';
import { ExploreMenu } from './ExploreMenu';
import { RecommendedMenu } from './RecommendedMenu';
import { StreakPill } from './StreakPill';
import { TopBarSearch } from './TopBarSearch';
import { NotificationsBell } from './NotificationsBell';
import { GuideLauncher } from './GuideLauncher';
import { CartButton } from '@/components/billing/CartProvider';
import { workspaceLabelForPath } from './nav-config';

/**
 * Persistent top bar, route-aware. The workspace label and the primary nav
 * adapt to the route group: the student Explore/Companies/search cluster only
 * shows in the student workspace (and during the super-admin "view as student"
 * preview, which lives on `/dashboard`); the admin and TPO consoles get a clean
 * bar driven by their sidebar instead.
 *
 * Aurora redesign: a glassy sticky bar with a hairline border, a faint gradient
 * sheen and an aurora accent line along the bottom edge for depth — never a flat
 * shadow alone. Stays `h-14` and remains the positioning context so the Explore
 * mega-menu (anchored at `top-14`, `left-0 right-0`) keeps aligning to it.
 */
export function TopBar() {
  const pathname = usePathname();
  const isStudentZone =
    !pathname.startsWith('/superadmin') &&
    !pathname.startsWith('/admin') &&
    !pathname.startsWith('/tpo');

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200/70 glass px-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6),0_8px_24px_-18px_rgba(11,18,32,0.45)] sm:gap-5 sm:px-6"
    >
      {/* faint top-to-bottom wash for glass depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/40 to-transparent"
      />
      {/* aurora accent hairline along the bottom edge */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#f37021]/40 to-transparent"
      />

      <MobileNav />
      <Logo workspaceLabel={workspaceLabelForPath(pathname)} className="relative z-10" />

      {isStudentZone ? (
        <>
          {/* Primary nav */}
          <nav className="relative z-10 hidden items-center gap-1 lg:flex" aria-label="Primary">
            <ExploreMenu />
            <Link
              href="/dashboard/company"
              className="group relative rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-navy"
            >
              Companies
              <span
                aria-hidden
                className="absolute inset-x-3 -bottom-px h-px scale-x-0 bg-gradient-to-r from-orange to-amber-500 transition-transform duration-300 group-hover:scale-x-100"
              />
            </Link>
            <RecommendedMenu />
          </nav>

          <TopBarSearch />
        </>
      ) : null}

      {/* Right cluster - pushed right on mobile/tablet (search is hidden < lg, so
          it can't provide the spacer); on lg+ the flex-1 search handles spacing. */}
      <div
        className={
          isStudentZone
            ? 'relative z-10 ml-auto flex items-center gap-1.5 sm:gap-2 lg:ml-0'
            : 'relative z-10 ml-auto flex items-center gap-1.5 sm:gap-2'
        }
      >
        <StreakPill />
        <CartButton />
        {isStudentZone ? <GuideLauncher /> : null}
        <NotificationsBell />
        <span aria-hidden className="mx-0.5 hidden h-6 w-px bg-slate-200/80 sm:block" />
        <AvatarMenu />
      </div>
    </motion.header>
  );
}
