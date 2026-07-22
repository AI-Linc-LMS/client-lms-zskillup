import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Brand lockup. The ZSkillup logo ALWAYS links to `/` (homepage), never the
 * dashboard (frontend/CLAUDE.md §4b - homepage-first routing).
 *
 * Uses the official ZSkillup wordmark (the same asset as the marketing site).
 * The lockup lifts subtly on hover.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn('group inline-flex items-center', className)} aria-label="ZSkillup home">
      <Image
        src="/images/prephasz-logo-dark.png"
        alt="prephasz - powered by ZSkillup"
        width={293}
        height={80}
        priority
        className="h-8 w-auto object-contain transition-transform duration-300 group-hover:-translate-y-0.5 sm:h-9"
      />
    </Link>
  );
}
