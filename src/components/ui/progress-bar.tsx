import { cn } from '@/lib/utils';

/**
 * Shared progress bar. Display-only — `value` is a server/seeded number, never
 * computed client-side (FRONTEND_STANDARDS §3).
 *
 * `variant`:
 *  - `default` — solid navy/blue (course completion, general progress)
 *  - `xp`      — colorful gradient matching the reference dashboard XP bar
 *                (yellow → orange → red)
 */
export function ProgressBar({
  value,
  variant = 'default',
  className,
  barClassName,
}: {
  value: number;
  variant?: 'default' | 'xp';
  className?: string;
  barClassName?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));

  const barColor =
    variant === 'xp'
      ? 'bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500'
      : 'bg-navy';

  return (
    <div
      className={cn('h-2.5 w-full overflow-hidden rounded-full bg-muted', className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn('h-full rounded-full transition-all', barColor, barClassName)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
