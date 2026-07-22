import type { PriceBookEntryDto } from '@/shared/dto/payments.dto';
import { BillingPeriod, EntitlementScope, PriceTier } from '@/shared/enums';

/**
 * The three billing periods in display order.
 * - `label`  - the plan-tier name ("Monthly").
 * - `short`  - a per-period price suffix ("/mo").
 * - `months` - the duration-first label the revamped billing UI uses ("1 Month").
 * - `multiple` - months of coverage, used to annualise a period for Save-% math.
 */
export const PERIODS: {
  period: BillingPeriod;
  label: string;
  short: string;
  months: string;
  multiple: number;
}[] = [
  { period: BillingPeriod.MONTHLY, label: 'Monthly', short: '/mo', months: '1 Month', multiple: 1 },
  { period: BillingPeriod.QUARTERLY, label: 'Quarterly', short: '/qtr', months: '3 Months', multiple: 3 },
  { period: BillingPeriod.ANNUAL, label: 'Annual', short: '/yr', months: '12 Months', multiple: 12 },
];

/** The "1 Month / 3 Months / 12 Months" label for a period (duration-first UI). */
export function periodMonths(period: BillingPeriod): string {
  return PERIODS.find((p) => p.period === period)?.months ?? '';
}

/** Coverage multiple (1 / 3 / 12) for a period. */
export function periodMultiple(period: BillingPeriod): number {
  return PERIODS.find((p) => p.period === period)?.multiple ?? 1;
}

export function priceKey(scope: EntitlementScope, tier: PriceTier, period: BillingPeriod): string {
  return `${scope}:${tier}:${period}`;
}

/** Index the price book for O(1) lookup by (scope, tier, period). */
export function buildPriceMap(rows: PriceBookEntryDto[]): Map<string, PriceBookEntryDto> {
  const map = new Map<string, PriceBookEntryDto>();
  for (const r of rows) map.set(priceKey(r.scopeType, r.tier, r.period), r);
  return map;
}

/** Retail price for a scope+period (the individual-student tier). */
export function retailPrice(
  map: Map<string, PriceBookEntryDto>,
  scope: EntitlementScope,
  period: BillingPeriod,
): PriceBookEntryDto | undefined {
  return map.get(priceKey(scope, PriceTier.RETAIL, period));
}

/**
 * Percent saved on a longer period vs paying month-by-month for the same scope.
 * e.g. annual ₹1199 vs 12×₹199 → round(1 − 1199/2388) = 50%. Returns a positive
 * integer, or `null` when there's no monthly baseline / no real saving (monthly
 * itself always returns null). Drives the "Save 37%" badges.
 */
export function periodSavingsPct(
  map: Map<string, PriceBookEntryDto>,
  scope: EntitlementScope,
  period: BillingPeriod,
): number | null {
  if (period === BillingPeriod.MONTHLY) return null;
  const monthly = retailPrice(map, scope, BillingPeriod.MONTHLY);
  const current = retailPrice(map, scope, period);
  if (!monthly || !current || monthly.amountCents <= 0) return null;
  const baseline = monthly.amountCents * periodMultiple(period);
  if (baseline <= 0) return null;
  const pct = Math.round((1 - current.amountCents / baseline) * 100);
  return pct > 0 ? pct : null;
}

/** Per-month equivalent price (paise) for a period - for "Just ₹X/month" copy. */
export function perMonthCents(entry: PriceBookEntryDto | undefined, period: BillingPeriod): number | null {
  if (!entry) return null;
  return Math.round(entry.amountCents / periodMultiple(period));
}

/** Human label for a scope (used in buy CTAs and history). */
export function scopeLabel(scope: EntitlementScope): string {
  switch (scope) {
    case EntitlementScope.PLATFORM:
      return 'Full platform';
    case EntitlementScope.SECTION:
      return 'Section';
    case EntitlementScope.TOPIC:
      return 'Topic';
    case EntitlementScope.COMPANY:
      return 'Company';
    default:
      return scope;
  }
}
