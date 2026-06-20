import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Brand lockup. The ZSkillup logo ALWAYS links to `/` (homepage), never the
 * dashboard (frontend/CLAUDE.md §4b — homepage-first routing).
 *
 * Uses the official ZSkillup wordmark (the same asset as the marketing site),
 * with the optional workspace label as a tiny uppercase eyebrow. The lockup
 * lifts subtly on hover.
 */
export function Logo({
  workspaceLabel,
  className,
}: {
  workspaceLabel?: string;
  className?: string;
}) {
  return (
    <Link
      href="/"
      className={cn('group flex flex-col gap-0.5', className)}
      aria-label="ZSkillup home"
    >
      <Image
        src="/images/Zskillup Black.png"
        alt="ZSkillup"
        width={120}
        height={38}
        priority
        className="h-7 w-auto transition-transform duration-300 group-hover:-translate-y-0.5 sm:h-8"
      />
      {workspaceLabel ? (
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          {workspaceLabel}
        </span>
      ) : null}
    </Link>
  );
}
