'use client';

import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Freemium row wrapper (COMPANY_HUB_SPEC §3 / frontend/CLAUDE §4b). Locked
 * content is ALWAYS visible — shown dimmed with a lock icon, never hidden.
 * Clicking a locked item opens a purchase prompt (demo: alert stub for the
 * dynamic price drawer, which is API-computed in production — never client-side).
 */
export function LockedRow({
  locked,
  children,
  onUnlockClick,
}: {
  locked: boolean;
  children: ReactNode;
  onUnlockClick?: () => void;
}) {
  if (!locked) {
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
      <Lock className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
    </button>
  );
}
