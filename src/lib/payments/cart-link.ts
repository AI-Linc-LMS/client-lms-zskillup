import { BillingPeriod, EntitlementScope } from '@/shared/enums';
import type { CartItem } from '@/components/billing/CartProvider';

/**
 * Cart pre-fill links: /cart?add=PLATFORM:MONTHLY&add=COMPANY:accenture:ANNUAL
 *
 * The point is marketing. An email or WhatsApp campaign links straight to a cart that
 * already contains what the campaign is selling, and the student only has to pay.
 *
 * THE URL CARRIES WHAT TO BUY, NEVER WHAT IT COSTS. Price is re-derived server-side
 * from billing.price_book at checkout, so a hand-edited link cannot buy anything at a
 * discount - the worst it can do is put an item in a cart. For the same reason the
 * LABEL is not accepted from the URL either: a label is rendered to the student, and
 * one supplied by a stranger is a spoofing surface ("Full Platform - FREE"). Labels are
 * derived from the ref instead.
 *
 * Format per entry: SCOPE:REF:PERIOD, with REF omitted for PLATFORM (which has none).
 * Unparseable entries are DROPPED silently rather than failing the page - a broken
 * campaign link should still land the student on a working cart.
 */

/** slug -> human label: 'quantitative-aptitude' -> 'Quantitative Aptitude'. */
export function labelFromRef(ref: string): string {
  return ref
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => (w.length <= 3 && w === w.toUpperCase() ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

const SCOPES = new Set<string>(Object.values(EntitlementScope));
const PERIODS = new Set<string>(Object.values(BillingPeriod));

/** One `add=` entry -> a cart line, or null if it is malformed. */
export function parseCartEntry(raw: string): CartItem | null {
  const parts = raw.trim().split(':');
  if (parts.length < 2 || parts.length > 3) return null;
  const scope = parts[0]?.toUpperCase() ?? '';
  if (!SCOPES.has(scope)) return null;

  const isPlatform = scope === EntitlementScope.PLATFORM;
  const ref = parts.length === 3 ? (parts[1] ?? '').trim() : null;
  const period = (parts.length === 3 ? parts[2] : parts[1])?.toUpperCase() ?? '';
  if (!PERIODS.has(period)) return null;
  // PLATFORM covers everything, so it has no ref; everything else needs one.
  if (isPlatform ? ref !== null && ref !== '' : !ref) return null;

  return {
    scope: scope as EntitlementScope,
    scopeRef: isPlatform ? null : ref,
    period: period as BillingPeriod,
    label: isPlatform ? 'Full Platform Access' : labelFromRef(ref as string),
  };
}

/**
 * All valid lines from a query string, de-duplicated and made cart-legal.
 *
 * Full Platform is applied as the WHOLE cart when present. The provider's own conflict
 * rules would otherwise raise a "replace everything?" popup at the student, which is a
 * terrible first impression from a marketing link - and those rules read the cart from a
 * stale closure when several items are added in one pass, so they cannot be relied on
 * here anyway.
 */
export function parseCartLink(search: string | URLSearchParams): CartItem[] {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  const items: CartItem[] = [];
  const seen = new Set<string>();
  for (const raw of params.getAll('add')) {
    const item = parseCartEntry(raw);
    if (!item) continue;
    const key = `${item.scope}:${item.scopeRef ?? ''}:${item.period}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(item);
  }
  const platform = items.find((i) => i.scope === EntitlementScope.PLATFORM);
  return platform ? [platform] : items;
}

/** Build a link for the admin generator / an upgrade CTA. */
export function buildCartLink(items: Array<Pick<CartItem, 'scope' | 'scopeRef' | 'period'>>): string {
  const parts = items.map((i) =>
    i.scope === EntitlementScope.PLATFORM ? `${i.scope}:${i.period}` : `${i.scope}:${i.scopeRef}:${i.period}`,
  );
  return parts.length ? `/cart?${parts.map((p) => `add=${encodeURIComponent(p)}`).join('&')}` : '/cart';
}
