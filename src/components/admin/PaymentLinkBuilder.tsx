'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Check, Copy, Link2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getPriceBook } from '@/lib/api/admin-payments';
import { listCompanies, listTopics, type ApiCompany, type ApiTopic } from '@/lib/api/catalog';
import { buildCartLink } from '@/lib/payments/cart-link';
import { buildPriceMap, PERIODS, retailPrice } from '@/lib/payments/pricing';
import { formatMoney } from '@/lib/api/subscriptions';
import { BillingPeriod, EntitlementScope } from '@/shared/enums';
import type { PriceBookEntryDto } from '@/shared/dto/payments.dto';
import { cn } from '@/lib/utils';

/**
 * Build a shareable link that lands a student on a cart already holding what a campaign
 * is selling. Pairs with the /cart?add= reader.
 *
 * Deliberately generates a plain URL and nothing else - no rows to store, no tokens to
 * expire, no schema. The URL carries only (scope, ref, period); price is derived
 * server-side at checkout, so a link cannot be edited into a discount and cannot go
 * stale when a price changes. That is also why the total below is labelled "today's
 * price": it is what the student would pay right now, not a quote frozen into the link.
 */

type Line = { scope: EntitlementScope; scopeRef: string | null; period: BillingPeriod; label: string };

const PRODUCT_KINDS = [
  { scope: EntitlementScope.PLATFORM, label: 'Full Platform' },
  { scope: EntitlementScope.COMPANY, label: 'Company' },
  { scope: EntitlementScope.SECTION, label: 'Section' },
  { scope: EntitlementScope.TOPIC, label: 'Sub-topic' },
] as const;

export function PaymentLinkBuilder() {
  const [prices, setPrices] = useState<PriceBookEntryDto[]>([]);
  const [companies, setCompanies] = useState<ApiCompany[]>([]);
  const [topics, setTopics] = useState<ApiTopic[]>([]);
  const [scope, setScope] = useState<EntitlementScope>(EntitlementScope.PLATFORM);
  const [ref, setRef] = useState('');
  const [period, setPeriod] = useState<BillingPeriod>(BillingPeriod.MONTHLY);
  const [lines, setLines] = useState<Line[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void getPriceBook().then(setPrices).catch(() => setPrices([]));
    void listCompanies().then(setCompanies).catch(() => setCompanies([]));
    void listTopics().then(setTopics).catch(() => setTopics([]));
  }, []);

  const priceMap = useMemo(() => buildPriceMap(prices), [prices]);
  // A root topic (no parent) is a Section; anything with a parent is a sub-topic.
  const sections = useMemo(() => topics.filter((t) => !t.parentId), [topics]);
  const subTopics = useMemo(() => topics.filter((t) => t.parentId), [topics]);

  const options = useMemo(() => {
    if (scope === EntitlementScope.COMPANY) return companies.map((c) => ({ slug: c.slug, name: c.name }));
    if (scope === EntitlementScope.SECTION) return sections.map((t) => ({ slug: t.slug, name: t.name }));
    if (scope === EntitlementScope.TOPIC) return subTopics.map((t) => ({ slug: t.slug, name: t.name }));
    return [];
  }, [scope, companies, sections, subTopics]);

  const needsRef = scope !== EntitlementScope.PLATFORM;
  const canAdd = !needsRef || !!ref;

  const priceOf = (l: Line): number | null => retailPrice(priceMap, l.scope, l.period)?.amountCents ?? null;
  const total = lines.reduce((sum, l) => sum + (priceOf(l) ?? 0), 0);
  const anyUnpriced = lines.some((l) => priceOf(l) === null);

  const addLine = () => {
    const label =
      scope === EntitlementScope.PLATFORM
        ? 'Full Platform Access'
        : (options.find((o) => o.slug === ref)?.name ?? ref);
    const next: Line = { scope, scopeRef: needsRef ? ref : null, period, label };
    setLines((prev) => {
      if (prev.some((p) => p.scope === next.scope && p.scopeRef === next.scopeRef && p.period === next.period)) {
        return prev;
      }
      // Full Platform covers everything, so the cart treats it as exclusive. Mirror that
      // here rather than generating a link the cart will immediately have to rewrite.
      if (next.scope === EntitlementScope.PLATFORM) return [next];
      if (prev.some((p) => p.scope === EntitlementScope.PLATFORM)) {
        toast.info('Full Platform already covers everything - remove it first to sell parts.');
        return prev;
      }
      return [...prev, next];
    });
    setRef('');
  };

  const path = buildCartLink(lines);
  const url = typeof window !== 'undefined' && lines.length ? `${window.location.origin}${path}` : '';

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy - select the link and copy manually.');
    }
  };

  return (
    <section id="payment-links" className="mt-8 scroll-mt-24">
      <h2 className="text-lg font-bold text-navy">Payment links</h2>
      <p className="mt-1 text-sm text-slate-600">
        Build a link that opens the cart with these products already in it - for email, WhatsApp or
        social campaigns. The link carries what to buy, never the price: students are charged
        today&apos;s price at checkout.
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Add a product</p>

          <div className="mt-3 flex flex-wrap gap-2">
            {PRODUCT_KINDS.map((k) => (
              <button
                key={k.scope}
                type="button"
                onClick={() => {
                  setScope(k.scope);
                  setRef('');
                }}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                  scope === k.scope ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                )}
              >
                {k.label}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_10rem_auto]">
            {needsRef ? (
              <select
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30"
              >
                <option value="">Select…</option>
                {options.map((o) => (
                  <option key={o.slug} value={o.slug}>
                    {o.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="flex h-10 items-center text-sm text-slate-500">Covers everything on the platform.</p>
            )}

            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as BillingPeriod)}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30"
            >
              {PERIODS.map((p) => (
                <option key={p.period} value={p.period}>
                  {p.months}
                </option>
              ))}
            </select>

            <Button type="button" onClick={addLine} disabled={!canAdd} size="sm">
              <Plus className="size-4" /> Add
            </Button>
          </div>

          {lines.length > 0 ? (
            <ul className="mt-5 space-y-2">
              {lines.map((l, i) => {
                const cents = priceOf(l);
                return (
                  <li
                    key={`${l.scope}:${l.scopeRef ?? ''}:${l.period}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2"
                  >
                    <span className="min-w-0 truncate text-sm text-navy">
                      <span className="font-semibold">{l.label}</span>
                      <span className="text-slate-500">
                        {' '}
                        · {PERIODS.find((p) => p.period === l.period)?.months}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="text-sm font-semibold text-navy">
                        {cents === null ? (
                          <span className="text-amber-600">No price set</span>
                        ) : (
                          formatMoney(cents)
                        )}
                      </span>
                      <button
                        type="button"
                        aria-label={`Remove ${l.label}`}
                        onClick={() => setLines((prev) => prev.filter((_, j) => j !== i))}
                        className="text-slate-400 transition-colors hover:text-red-600"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-5 rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
              Nothing added yet.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">The link</p>
          {url ? (
            <>
              <p className="mt-3 break-all rounded-lg bg-slate-50 p-3 font-mono text-xs text-slate-700">{url}</p>
              <Button type="button" onClick={copy} className="mt-3 w-full" size="sm">
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? 'Copied' : 'Copy link'}
              </Button>
              <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500">
                <Link2 className="mt-0.5 size-3.5 shrink-0" />
                Works signed out too - the student signs in and lands straight on this cart.
              </p>
              <div className="mt-4 border-t border-slate-100 pt-3">
                <p className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Today&apos;s price</span>
                  <span className="font-bold text-navy">{formatMoney(total)}</span>
                </p>
                {anyUnpriced ? (
                  <p className="mt-1.5 text-xs text-amber-600">
                    One line has no price in the book - the student cannot check it out until you set one.
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-slate-500">Add a product to generate a link.</p>
          )}
        </div>
      </div>
    </section>
  );
}
