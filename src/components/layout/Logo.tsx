import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Brand lockup. The ZSkillup logo ALWAYS links to `/` (homepage), never the
 * dashboard (frontend/CLAUDE.md §4b — homepage-first routing).
 */
export function Logo({
  workspaceLabel,
  className,
}: {
  workspaceLabel?: string;
  className?: string;
}) {
  return (
    <Link href="/" className={cn('flex flex-col leading-none', className)} aria-label="ZSkillup home">
      <span className="text-xl font-bold tracking-tight">
        <span className="text-orange">Z</span><span className="text-navy">Skillup</span>
      </span>
      {workspaceLabel ? (
        <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {workspaceLabel}
        </span>
      ) : null}
    </Link>
  );
}
