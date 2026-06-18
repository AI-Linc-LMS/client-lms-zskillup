import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Brand lockup. The ZSkillup logo ALWAYS links to `/` (homepage), never the
 * dashboard (frontend/CLAUDE.md §4b — homepage-first routing).
 *
 * Aurora redesign: a gradient brand mark (the "Z" tile) sits beside the
 * wordmark, with the optional workspace label as a tiny uppercase eyebrow.
 * The whole lockup lifts subtly on hover.
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
      className={cn('group flex items-center gap-2.5', className)}
      aria-label="ZSkillup home"
    >
      {/* Gradient brand mark */}
      <span className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-[#f7a14e] to-[#f37021] text-base font-black text-white shadow-[0_6px_16px_-6px_rgba(243,112,33,0.7)] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_10px_22px_-8px_rgba(243,112,33,0.85)]">
        {/* glossy top highlight */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent"
        />
        <span className="relative">Z</span>
      </span>

      <span className="flex flex-col leading-none">
        <span className="text-[19px] font-extrabold tracking-tight">
          <span className="text-orange">Z</span>
          <span className="text-navy">Skillup</span>
        </span>
        {workspaceLabel ? (
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            {workspaceLabel}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
