import { formatPrice } from '@/lib/api/subscriptions';
import { cn } from '@/lib/utils';

/**
 * The ONE way to render a price with an optional strike-through MRP. Shows the
 * selling price, and — when an MRP is present and higher — the struck original
 * beside it. Collapses to selling-only when `mrpCents` is null/≤ selling, so it's
 * safe to drop in everywhere. `sellingCents` is always the charged price; `mrpCents`
 * is display-only (never touches checkout).
 */
export function PriceTag({
  sellingCents,
  mrpCents,
  currency = 'INR',
  size = 'md',
  className,
}: {
  sellingCents: number;
  mrpCents?: number | null;
  currency?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const showMrp = mrpCents != null && mrpCents > sellingCents;
  const sell = { sm: 'text-sm', md: 'text-base', lg: 'text-lg' }[size];
  const mrp = { sm: 'text-[11px]', md: 'text-xs', lg: 'text-sm' }[size];
  return (
    <span className={cn('inline-flex items-baseline gap-1.5', className)}>
      <span className={cn('font-extrabold text-navy tabular-nums', sell)}>
        {formatPrice(sellingCents, currency)}
      </span>
      {showMrp ? (
        <span className={cn('font-medium text-slate-400 line-through tabular-nums', mrp)}>
          {formatPrice(mrpCents, currency)}
        </span>
      ) : null}
    </span>
  );
}
