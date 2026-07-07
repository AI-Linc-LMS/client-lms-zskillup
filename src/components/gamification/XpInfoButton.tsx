'use client';

import Link from 'next/link';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * The little "i" next to any XP display → opens the "How XP works" explainer.
 * `variant="icon"` is a compact circle (for stat tiles); `variant="label"` is an
 * inline text link (for headers / captions).
 */
export function XpInfoButton({
  className,
  variant = 'icon',
  tone = 'dark',
}: {
  className?: string;
  variant?: 'icon' | 'label';
  tone?: 'dark' | 'light';
}) {
  if (variant === 'label') {
    return (
      <Link
        href="/how-xp-works"
        className={cn(
          'inline-flex items-center gap-1 text-xs font-semibold transition-colors',
          tone === 'light' ? 'text-white/70 hover:text-white' : 'text-slate-400 hover:text-orange',
          className,
        )}
      >
        <Info className="size-3.5" /> How XP is calculated
      </Link>
    );
  }
  return (
    <Link
      href="/how-xp-works"
      title="See how XP is calculated"
      aria-label="See how XP is calculated"
      className={cn(
        'inline-grid size-5 place-items-center rounded-full ring-1 ring-inset transition-colors',
        tone === 'light'
          ? 'text-white/60 ring-white/20 hover:bg-white/10 hover:text-white'
          : 'text-slate-400 ring-slate-200 hover:bg-orange/10 hover:text-orange hover:ring-orange/30',
        className,
      )}
    >
      <Info className="size-3" />
    </Link>
  );
}
