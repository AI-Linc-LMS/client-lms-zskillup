import type { PriceBookEntryDto } from '@/shared/dto/payments.dto';
import { BillingPeriod, EntitlementScope, PriceTier } from '@/shared/enums';

/** The three billing periods in display order, with short labels. */
export const PERIODS: { period: BillingPeriod; label: string; short: string }[] = [
  { period: BillingPeriod.MONTHLY, label: 'Monthly', short: '/mo' },
  { period: BillingPeriod.QUARTERLY, label: 'Quarterly', short: '/qtr' },
  { period: BillingPeriod.ANNUAL, label: 'Annual', short: '/yr' },
];

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
