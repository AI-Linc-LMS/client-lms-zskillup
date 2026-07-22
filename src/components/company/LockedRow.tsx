'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Freemium row wrapper (COMPANY_HUB_SPEC §3 / frontend/CLAUDE §4b). Locked
 * content is ALWAYS visible - shown dimmed with a lock icon, never hidden.
 * Clicking a locked item opens a purchase prompt (demo: alert stub for the
 * dynamic price drawer, which is API-computed in production - never client-side).
 *
 * An UNLOCKED row may pass `href` to become a real navigation target (e.g. a
 * free practice set that drops into the live question bank, or a free mock that
 * starts the timed engine). Unlocked rows without `href` stay presentational.
 */
export function LockedRow({
  locked,
  children,
  href,
  onUnlockClick,
}: {
  locked: boolean;
  children: ReactNode;
  href?: string;
  onUnlockClick?: () => void;
}) {
  if (!locked) {
    if (href) {
      return (
        <Link
          href={href}
          className="flex items-center justify-between rounded-lg border border-slate-200 p-3 transition-colors hover:border-orange hover:bg-orange/5"
        >
          {children}
          <ArrowRight className="size-4 shrink-0 text-orange" aria-hidden="true" />
        </Link>
      );
    }
    return (
      <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
        {children}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onUnlockClick}
      className={cn(
        'flex w-full items-center justify-between rounded-lg border border-slate-200 p-3 text-left opacity-50 transition-opacity hover:opacity-70',
      )}
    >
      {children}
      <Lock className="size-4 shrink-0 text-slate-500" aria-hidden="true" />
    </button>
  );
}
