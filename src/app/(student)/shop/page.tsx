'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Check,
  Layers,
  Loader2,
  Search,
  ShoppingCart,
  Sparkles,
  Target,
} from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { useCart } from '@/components/billing/CartProvider';
import { listCompanies, listTopicsWithCounts, type ApiCompany, type ApiTopic } from '@/lib/api/catalog';
import { getMySubscription, getPricing } from '@/lib/api/payments';
import { formatPrice } from '@/lib/api/subscriptions';
import { buildPriceMap, PERIODS, retailPrice } from '@/lib/payments/pricing';
import { HIDDEN_ROOT_SLUGS } from '@/components/practice/section-meta';
import { BillingPeriod, EntitlementScope } from '@/shared/enums';
import type { EntitlementDto, PriceBookEntryDto } from '@/shared/dto/payments.dto';

type Owned = { platform: boolean; scopes: Set<string> };
const scopeKey = (s: EntitlementScope, ref: string | null) => `${s}:${ref ?? ''}`;

/** A single buyable line with an Add / In-cart / Owned control. */
function BuyRow({
  scope,
  scopeRef,
  label,
  sub,
  price,
  period,
  owned,
  compact,
}: {
  scope: EntitlementScope;
  scopeRef: string | null;
  label: string;
  sub?: string;
  price: number | null;
  period: BillingPeriod;
  owned: Owned;
  compact?: boolean;
}) {
  const cart = useCart();
  const isOwned = owned.platform || owned.scopes.has(scopeKey(scope, scopeRef));
  const inCart = cart.has(scope, scopeRef);
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="min-w-0 flex-1">
        <p className={compact ? 'truncate text-sm font-semibold text-navy' : 'truncate font-bold text-navy'}>{label}</p>
        {sub && <p className="truncate text-xs text-slate-400">{sub}</p>}
      </div>
      <span className="w-16 text-right text-sm font-bold tabular-nums text-navy">
        {price != null ? formatPrice(price, 'INR') : '—'}
      </span>
      {isOwned ? (
        <span className="inline-flex w-28 items-center justify-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
          <Check className="size-3.5" /> Owned
        </span>
      ) : inCart ? (
        <Link
          href="/cart"
          className="inline-flex w-28 items-center justify-center gap-1 rounded-full border border-orange/40 bg-orange/5 px-3 py-1.5 text-xs font-bold text-orange"
        >
          <Check className="size-3.5" /> In cart
        </Link>
      ) : (
        <button
          type="button"
          disabled={price == null}
          onClick={() => cart.add({ scope, scopeRef, period, label })}
          className="inline-flex w-28 items-center justify-center gap-1 rounded-full bg-navy px-3 py-1.5 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-40"
        >
          <ShoppingCart className="size-3.5" /> Add
        </button>
      )}
    </div>
  );
}

export default function ShopPage() {
  const cart = useCart();
  const [prices, setPrices] = useState<PriceBookEntryDto[]>([]);
  const [topics, setTopics] = useState<ApiTopic[]>([]);
  const [companies, setCompanies] = useState<ApiCompany[]>([]);
  const [owned, setOwned] = useState<Owned>({ platform: false, scopes: new Set() });
  const [period, setPeriod] = useState<BillingPeriod>(BillingPeriod.ANNUAL);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getPricing().catch(() => []),
      listTopicsWithCounts().catch(() => []),
      listCompanies().catch(() => []),
      getMySubscription().catch(() => null),
    ]).then(([pr, tp, co, sub]) => {
      setPrices(pr);
      setTopics(tp);
      setCompanies(co);
      if (sub) {
        const ents = (sub.entitlements as EntitlementDto[]).filter((e) => e.status === 'ACTIVE');
        setOwned({
          platform: ents.some((e) => e.scopeType === EntitlementScope.PLATFORM),
          scopes: new Set(ents.map((e) => scopeKey(e.scopeType, e.scopeRef))),
        });
      }
      setLoading(false);
    });
  }, []);

  const priceMap = useMemo(() => buildPriceMap(prices), [prices]);
  const priceOf = (s: EntitlementScope) => retailPrice(priceMap, s, period)?.amountCents ?? null;

  // Build the section → topics tree (roots = sections; leaves = buyable topics).
  const sections = useMemo(() => {
    const byId = new Map(topics.map((t) => [t.id, t]));
    const childOf = new Set(topics.filter((t) => t.parentId).map((t) => t.parentId));
    const rootOf = (t: ApiTopic): ApiTopic => {
      let cur = t;
      while (cur.parentId && byId.has(cur.parentId)) cur = byId.get(cur.parentId)!;
      return cur;
    };
    const roots = topics
      .filter((t) => t.parentId === null && !HIDDEN_ROOT_SLUGS.has(t.slug))
      .sort((a, b) => a.name.localeCompare(b.name));
    const leavesByRoot = new Map<string, ApiTopic[]>();
    for (const t of topics) {
      if (t.parentId === null || childOf.has(t.id)) continue; // roots + non-leaves skipped
      const r = rootOf(t);
      if (HIDDEN_ROOT_SLUGS.has(r.slug)) continue;
      const list = leavesByRoot.get(r.id) ?? [];
      list.push(t);
      leavesByRoot.set(r.id, list);
    }
    return roots.map((r) => ({ section: r, topics: (leavesByRoot.get(r.id) ?? []).sort((a, b) => a.name.localeCompare(b.name)) }));
  }, [topics]);

  const needle = q.trim().toLowerCase();
  const match = (s: string) => !needle || s.toLowerCase().includes(needle);
  const visibleSections = sections
    .map((s) => ({ ...s, topics: s.topics.filter((t) => match(t.name) || match(s.section.name)) }))
    .filter((s) => match(s.section.name) || s.topics.length > 0);
  const visibleCompanies = companies.filter((c) => match(c.name));

  const periodLabel = PERIODS.find((p) => p.period === period)?.short ?? '';

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Breadcrumb items={[{ label: 'Shop' }]} />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-navy">
            <ShoppingCart className="size-6 text-orange" /> Shop
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Add topics, sections or company hubs to your cart and unlock them together.
          </p>
        </div>
        <Link
          href="/cart"
          className="inline-flex items-center gap-2 rounded-full bg-navy px-4 py-2 text-sm font-bold text-white"
        >
          <ShoppingCart className="size-4" /> Cart{cart.count > 0 ? ` · ${cart.count}` : ''}
        </Link>
      </div>

      {/* Controls: search + billing period */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search topics or companies…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-navy outline-none focus:border-orange/50"
          />
        </div>
        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
          {PERIODS.map((p) => (
            <button
              key={p.period}
              onClick={() => setPeriod(p.period)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                period === p.period ? 'bg-white text-navy shadow-sm' : 'text-slate-500 hover:text-navy'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="mt-10 flex justify-center">
          <Loader2 className="size-6 animate-spin text-orange" />
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {/* Full platform */}
          {!owned.platform && (
            <section className="overflow-hidden rounded-3xl border border-orange/30 bg-gradient-to-br from-orange/5 to-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-[#f7a14e] to-[#f37021] text-white">
                    <Sparkles className="size-5" />
                  </span>
                  <div>
                    <p className="text-lg font-black text-navy">Full platform</p>
                    <p className="text-sm text-slate-500">Every topic, section, company hub & coding — one unlock.</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-black tabular-nums text-navy">
                    {priceOf(EntitlementScope.PLATFORM) != null
                      ? formatPrice(priceOf(EntitlementScope.PLATFORM)!, 'INR')
                      : '—'}
                    <span className="text-xs font-semibold text-slate-400">{periodLabel}</span>
                  </span>
                  {cart.has(EntitlementScope.PLATFORM, null) ? (
                    <Link href="/cart" className="inline-flex items-center gap-1 rounded-full border border-orange/40 bg-orange/5 px-5 py-2.5 text-sm font-bold text-orange">
                      <Check className="size-4" /> In cart
                    </Link>
                  ) : (
                    <button
                      onClick={() => cart.add({ scope: EntitlementScope.PLATFORM, scopeRef: null, period, label: 'Full platform' })}
                      className="inline-flex items-center gap-1.5 rounded-full bg-orange px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-105"
                    >
                      <ShoppingCart className="size-4" /> Add
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Company hubs */}
          {visibleCompanies.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-400">
                <Building2 className="size-4" /> Company hubs
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {visibleCompanies.map((c) => (
                  <div key={c.slug} className="rounded-2xl border border-slate-200 bg-white px-4 shadow-sm">
                    <BuyRow
                      scope={EntitlementScope.COMPANY}
                      scopeRef={c.slug}
                      label={c.name}
                      sub={c.questionCount ? `${c.questionCount.toLocaleString('en-IN')} questions` : "Recruiter PYQ bank"}
                      price={priceOf(EntitlementScope.COMPANY)}
                      period={period}
                      owned={owned}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Sections + their topics */}
          {visibleSections.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-400">
                <Layers className="size-4" /> Sections & topics
              </h2>
              <div className="space-y-4">
                {visibleSections.map(({ section, topics: subs }) => (
                  <div key={section.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 bg-slate-50/60 px-4">
                      <BuyRow
                        scope={EntitlementScope.SECTION}
                        scopeRef={section.slug}
                        label={`${section.name} — whole section`}
                        sub={`${subs.length} topic${subs.length === 1 ? '' : 's'}`}
                        price={priceOf(EntitlementScope.SECTION)}
                        period={period}
                        owned={owned}
                      />
                    </div>
                    {subs.length > 0 && (
                      <div className="divide-y divide-slate-100 px-4">
                        {subs.map((t) => (
                          <BuyRow
                            key={t.id}
                            scope={EntitlementScope.TOPIC}
                            scopeRef={t.slug}
                            label={t.name}
                            sub={t.questionCount ? `${t.questionCount} questions` : undefined}
                            price={priceOf(EntitlementScope.TOPIC)}
                            period={period}
                            owned={owned}
                            compact
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {visibleSections.length === 0 && visibleCompanies.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-400">Nothing matches “{q}”.</p>
          )}
        </div>
      )}
    </div>
  );
}
