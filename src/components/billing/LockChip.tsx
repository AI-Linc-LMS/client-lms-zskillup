'use client';

import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * A tiny inline "Locked" pill for Phase 8 — sits next to a tab label, chip, or
 * list item to signal paid content without hiding it. Purely presentational;
 * the click/enforcement lives on the parent (LockedRow / LockedTabPanel / the
 * server gate). Follows the §4.11 status-pill shape.
 */
export function LockChip({ label = 'Locked', className }: { label?: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200',
        className,
      )}
    >
      <Lock className="size-3" aria-hidden="true" />
      {label}
    </span>
  );
}
