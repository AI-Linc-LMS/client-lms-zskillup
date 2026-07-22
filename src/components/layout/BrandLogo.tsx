import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Brand wordmark - "prephasz · Powered by ZSkillup".
 *
 * Ships in two variants so it stays legible on any surface:
 *   - `light`  → white/yellow lockup, for DARK backgrounds.
 *   - `dark`   → navy/yellow lockup, for LIGHT backgrounds (default).
 *
 * Pass a height utility via `className` (e.g. "h-8"); width follows the
 * wordmark's aspect ratio. Links to `/` unless `href={null}`.
 */
export function BrandLogo({
  variant = 'dark',
  className,
  href = '/',
  priority = false,
}: {
  variant?: 'light' | 'dark';
  className?: string;
  href?: string | null;
  priority?: boolean;
}) {
  const src = variant === 'light' ? '/images/prephasz-logo.png' : '/images/prephasz-logo-dark.png';
  const img = (
    <Image
      src={src}
      alt="prephasz - powered by ZSkillup"
      width={293}
      height={80}
      priority={priority}
      className={cn('h-8 w-auto object-contain', className)}
    />
  );
  if (href === null) return img;
  return (
    <Link href={href} className="inline-flex items-center" aria-label="prephasz home">
      {img}
    </Link>
  );
}
