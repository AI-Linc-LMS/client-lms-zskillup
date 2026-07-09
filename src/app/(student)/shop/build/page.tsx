'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  BadgePercent,
  Bookmark,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  Crown,
  HelpCircle,
  Layers,
  Loader2,
  ShoppingCart,
  Trophy,
  X,
} from 'lucide-react';
import { useCart, type CartItem } from '@/components/billing/CartProvider';
import { PlanPill } from '@/components/billing/plan-ui';
import { getMySubscription, getPricing } from '@/lib/api/payments';
import { formatPrice } from '@/lib/api/subscriptions';
import { listCompanies, listTopicsWithCounts, type ApiCompany, type ApiTopic } from '@/lib/api/catalog';
import { HIDDEN_ROOT_SLUGS } from '@/components/practice/section-meta';
import { buildPriceMap, PERIODS, periodSavingsPct, retailPrice } from '@/lib/payments/pricing';
import { BillingPeriod, EntitlementScope } from '@/shared/enums';
import type { PriceBookEntryDto } from '@/shared/dto/payments.dto';

const sKey = (scope: EntitlementScope, ref: string | null) => `${scope}:${ref ?? ''}`;
type Owned = { platform: boolean; scopes: Set<string> };

const UNLOCKS = [
  'All Selected Sections & Sub-sections',
  'Practice Tests',
  'Performance Analytics',
  'Progress Tracking',
  'All India Rankings',
];

const WHY_LONGER = [
  { icon: BadgePercent, tint: 'bg-emerald-50 text-emerald-600', title: 'Save More', sub: 'Get up to 37% discount with annual plans.' },
  { icon: CalendarDays, tint: 'bg-indigo-50 text-indigo-600', title: 'Uninterrupted Preparation', sub: 'More time to practice, learn and improve.' },
  { icon: Trophy, tint: 'bg-amber-50 text-amber-600', title: 'Better Results', sub: 'Consistent practice leads to success.' },
];

/**
 * Build Your Own Plan — à-la-carte customiser (Explore Plans → "Start
 * Customizing"). Pick companies, whole sections and individual sub-topics, each
 * at its own validity. Selections are staged locally in "Your Selections" and
 * committed to the shared cart on "Add to Cart".
 */
export default function BuildYourOwnPage() {
  const cart = useCart();
  const router = useRouter();
  const [prices, setPrices] = useState<PriceBookEntryDto[]>([]);
  const [topics, setTopics] = useState<ApiTopic[]>([]);
  const [companies, setCompanies] = useState<ApiCompany[]>([]);
  const [owned, setOwned] = useState<Owned>({ platform: false, scopes: new Set() });
  const [loading, setLoading] = useState(true);

  // Staging — keyed by scope+ref (period lives on the value). Committed to cart on submit.
  const [staged, setStaged] = useState<Record<string, CartItem>>({});
  const [companyPeriod, setCompanyPeriod] = useState<BillingPeriod>(BillingPeriod.ANNUAL);
  const [sectionPeriod, setSectionPeriod] = useState<BillingPeriod>(BillingPeriod.ANNUAL);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showAllCompanies, setShowAllCompanies] = useState(false);
  const [showAllSections, setShowAllSections] = useState(false);
  const [subsOpen, setSubsOpen] = useState(false);

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
        const ents = sub.entitlements.filter((e) => e.status === 'ACTIVE');
        setOwned({
          platform: ents.some((e) => e.scopeType === EntitlementScope.PLATFORM),
          scopes: new Set(ents.map((e) => sKey(e.scopeType, e.scopeRef))),
        });
      }
      setLoading(false);
    });
  }, []);

  const priceMap = useMemo(() => buildPriceMap(prices), [prices]);
  const priceOf = (scope: EntitlementScope, period: BillingPeriod) =>
    retailPrice(priceMap, scope, period)?.amountCents ?? null;

  // section → subtopics tree (roots = sections; leaves = buyable topics), deduped.
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
      if (t.parentId === null || childOf.has(t.id)) continue;
      if (!t.questionCount) continue;
      const r = rootOf(t);
      if (HIDDEN_ROOT_SLUGS.has(r.slug)) continue;
      const list = leavesByRoot.get(r.id) ?? [];
      list.push(t);
      leavesByRoot.set(r.id, list);
    }
    const dedupe = (list: ApiTopic[]) => {
      const best = new Map<string, ApiTopic>();
      for (const t of list) {
        const key = t.name.trim().toLowerCase();
        const cur = best.get(key);
        if (!cur || (t.questionCount ?? 0) > (cur.questionCount ?? 0)) best.set(key, t);
      }
      return [...best.values()].sort((a, b) => a.name.localeCompare(b.name));
    };
    return roots
      .map((r) => ({ section: r, topics: dedupe(leavesByRoot.get(r.id) ?? []) }))
      .filter((s) => s.topics.length > 0);
  }, [topics]);

  useEffect(() => {
    if (!activeSection && sections.length) setActiveSection(sections[0].section.id);
  }, [sections, activeSection]);

  const activeSub = sections.find((s) => s.section.id === activeSection) ?? null;

  // ---- staging helpers ----
  const isStaged = (scope: EntitlementScope, ref: string | null) => sKey(scope, ref) in staged;
  const stagedPeriod = (scope: EntitlementScope, ref: string | null) => staged[sKey(scope, ref)]?.period;
  const isOwned = (scope: EntitlementScope, ref: string | null) =>
    owned.platform || owned.scopes.has(sKey(scope, ref));

  const toggle = (scope: EntitlementScope, ref: string | null, period: BillingPeriod, label: string) => {
    if (isOwned(scope, ref)) return;
    setStaged((prev) => {
      const next = { ...prev };
      const k = sKey(scope, ref);
      if (k in next) delete next[k];
      else next[k] = { scope, scopeRef: ref, period, label };
      return next;
    });
  };

  // Radio behaviour for sub-topics: same period clicked again → remove; else set.
  const pickTopic = (ref: string, period: BillingPeriod, label: string) => {
    if (isOwned(EntitlementScope.TOPIC, ref)) return;
    setStaged((prev) => {
      const next = { ...prev };
      const k = sKey(EntitlementScope.TOPIC, ref);
      if (next[k]?.period === period) delete next[k];
      else next[k] = { scope: EntitlementScope.TOPIC, scopeRef: ref, period, label };
      return next;
    });
  };

  // Changing a step's validity re-prices every staged item of that scope.
  const setStepPeriod = (scope: EntitlementScope, period: BillingPeriod) => {
    if (scope === EntitlementScope.COMPANY) setCompanyPeriod(period);
    if (scope === EntitlementScope.SECTION) setSectionPeriod(period);
    setStaged((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) if (next[k].scope === scope) next[k] = { ...next[k], period };
      return next;
    });
  };

  const items = Object.values(staged);
  const total = items.reduce((sum, it) => sum + (priceOf(it.scope, it.period) ?? 0), 0);
  const byScope = (scope: EntitlementScope) => items.filter((i) => i.scope === scope);

  const commit = (goToCart: boolean) => {
    if (owned.platform) {
      toast.info('You already have Full Platform access — everything is unlocked.');
      return;
    }
    if (!items.length) return;
    items.forEach((it) => cart.add(it));
    if (goToCart) {
      router.push('/cart');
    } else {
      toast.success(`Saved ${items.length} item${items.length === 1 ? '' : 's'} to your cart.`);
      setStaged({});
    }
  };

  const periodOptions = (scope: EntitlementScope, current: BillingPeriod, onPick: (p: BillingPeriod) => void) => (
    <div className="mt-3">
      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Access Plan (Validity)</p>
      <div className="grid gap-2.5 sm:grid-cols-3">
        {PERIODS.map((p) => {
          const amt = priceOf(scope, p.period);
          const pct = periodSavingsPct(priceMap, scope, p.period);
          const active = current === p.period;
          return (
            <button
              key={p.period}
              type="button"
              onClick={() => onPick(p.period)}
              className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition ${
                active
                  ? 'border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-500/30'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <span>
                <span className="flex items-center gap-1.5 text-sm font-bold text-navy">
                  {p.months}
                  {pct ? <PlanPill tone="emerald">Save {pct}%</PlanPill> : null}
                </span>
                <span className="text-sm font-semibold tabular-nums text-slate-500">
                  {amt != null ? formatPrice(amt, 'INR') : '—'}
                </span>
              </span>
              <span
                className={`grid size-4 place-items-center rounded-full border ${
                  active ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'
                }`}
              >
                {active && <span className="size-1.5 rounded-full bg-white" />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const visibleCompanies = showAllCompanies ? companies : companies.slice(0, 8);
  const visibleSections = showAllSections ? sections : sections.slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-28 sm:px-6 lg:px-8 lg:pb-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/shop"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-navy"
          >
            <ArrowLeft className="size-4" /> Back to Explore Plans
          </Link>
          <h1 className="mt-3 text-2xl font-black tracking-tight text-navy">Build Your Own Plan</h1>
          <p className="mt-1 text-sm text-slate-500">
            Choose what you want to prepare and select your access plan.
          </p>
        </div>
        <div className="hidden max-w-xs items-start gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-500 shadow-sm sm:flex">
          <HelpCircle className="mt-0.5 size-4 shrink-0 text-indigo-500" />
          <span>
            <b className="text-navy">How it works?</b> Pick a company, section or sub-section, then choose an
            access plan (Monthly / Quarterly / Annual).
          </span>
        </div>
      </div>

      {loading ? (
        <div className="mt-16 flex justify-center">
          <Loader2 className="size-6 animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Main column */}
          <div className="space-y-6">
            {/* Step 1 — Company */}
            <Step n={1} title="Select a Company">
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {visibleCompanies.map((c) => (
                  <PickCard
                    key={c.slug}
                    label={c.name}
                    icon={<Building2 className="size-5" />}
                    selected={isStaged(EntitlementScope.COMPANY, c.slug)}
                    owned={isOwned(EntitlementScope.COMPANY, c.slug)}
                    onClick={() => toggle(EntitlementScope.COMPANY, c.slug, companyPeriod, c.name)}
                  />
                ))}
                {companies.length > 8 && (
                  <button
                    type="button"
                    onClick={() => setShowAllCompanies((v) => !v)}
                    className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-slate-300 p-3 text-xs font-bold text-indigo-600 transition hover:bg-indigo-50/40"
                  >
                    <ArrowRight className={`size-4 transition-transform ${showAllCompanies ? 'rotate-180' : ''}`} />
                    {showAllCompanies ? 'Show less' : 'View All Companies'}
                  </button>
                )}
              </div>
              {periodOptions(EntitlementScope.COMPANY, companyPeriod, (p) =>
                setStepPeriod(EntitlementScope.COMPANY, p),
              )}
            </Step>

            {/* Step 2 — Section */}
            <Step n={2} title="Select a Section">
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {visibleSections.map(({ section }) => (
                  <PickCard
                    key={section.id}
                    label={section.name}
                    icon={<Layers className="size-5" />}
                    selected={isStaged(EntitlementScope.SECTION, section.slug)}
                    owned={isOwned(EntitlementScope.SECTION, section.slug)}
                    onClick={() => toggle(EntitlementScope.SECTION, section.slug, sectionPeriod, section.name)}
                  />
                ))}
                {sections.length > 4 && (
                  <button
                    type="button"
                    onClick={() => setShowAllSections((v) => !v)}
                    className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-slate-300 p-3 text-xs font-bold text-indigo-600 transition hover:bg-indigo-50/40"
                  >
                    <ArrowRight className={`size-4 transition-transform ${showAllSections ? 'rotate-180' : ''}`} />
                    {showAllSections ? 'Show less' : 'View All Sections'}
                  </button>
                )}
              </div>
              {periodOptions(EntitlementScope.SECTION, sectionPeriod, (p) =>
                setStepPeriod(EntitlementScope.SECTION, p),
              )}
            </Step>

            {/* Step 3 — Sub-section */}
            <Step
              n={3}
              title="Select a Sub-section"
              trailing={
                activeSub ? (
                  <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-600">
                    {activeSub.section.name}
                  </span>
                ) : null
              }
            >
              {sections.length > 1 && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {sections.map(({ section }) => (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => {
                        setActiveSection(section.id);
                        setSubsOpen(false);
                      }}
                      className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                        activeSection === section.id
                          ? 'bg-navy text-white'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {section.name}
                    </button>
                  ))}
                </div>
              )}
              {activeSub && (
                <SubTable
                  subs={subsOpen ? activeSub.topics : activeSub.topics.slice(0, 5)}
                  priceMap={priceMap}
                  isOwned={(ref) => isOwned(EntitlementScope.TOPIC, ref)}
                  stagedPeriod={(ref) => stagedPeriod(EntitlementScope.TOPIC, ref)}
                  onPick={pickTopic}
                />
              )}
              {activeSub && activeSub.topics.length > 5 && (
                <button
                  type="button"
                  onClick={() => setSubsOpen((v) => !v)}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:text-indigo-700"
                >
                  {subsOpen ? 'Show fewer' : `View ${activeSub.topics.length - 5} more sub-sections`}
                  <ChevronDown className={`size-4 transition-transform ${subsOpen ? 'rotate-180' : ''}`} />
                </button>
              )}
            </Step>

            {/* Why longer */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-black text-navy">Why Choose a Longer Access Plan?</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {WHY_LONGER.map((w) => (
                  <div key={w.title} className="flex items-start gap-3">
                    <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${w.tint}`}>
                      <w.icon className="size-5" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-navy">{w.title}</p>
                      <p className="text-xs text-slate-500">{w.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Your Selections */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-black text-navy">Your Selections</h2>
                {items.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setStaged({})}
                    className="text-xs font-bold text-slate-400 transition hover:text-rose-500"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {items.length === 0 ? (
                <p className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center text-sm text-slate-400">
                  Pick a company, section or sub-topic to start building your plan.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  <SelGroup title="Company" icon={<Building2 className="size-4" />} rows={byScope(EntitlementScope.COMPANY)} priceOf={priceOf} onRemove={(it) => toggle(it.scope, it.scopeRef, it.period, it.label)} />
                  <SelGroup title="Section" icon={<Layers className="size-4" />} rows={byScope(EntitlementScope.SECTION)} priceOf={priceOf} onRemove={(it) => toggle(it.scope, it.scopeRef, it.period, it.label)} />
                  <SelGroup title="Sub-section" icon={<Layers className="size-4" />} rows={byScope(EntitlementScope.TOPIC)} priceOf={priceOf} onRemove={(it) => toggle(it.scope, it.scopeRef, it.period, it.label)} />
                </div>
              )}

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="text-sm font-bold text-navy">Total</span>
                <span className="text-2xl font-black tabular-nums text-indigo-600">{formatPrice(total, 'INR')}</span>
              </div>

              {items.length > 0 && (
                <div className="mt-3 rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs font-bold text-slate-500">You&apos;ll get access to:</p>
                  <ul className="mt-1.5 space-y-1">
                    {UNLOCKS.map((u) => (
                      <li key={u} className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Check className="size-3.5 text-emerald-500" /> {u}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                type="button"
                disabled={!items.length}
                onClick={() => commit(true)}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-40"
              >
                <ShoppingCart className="size-4" /> Add to Cart
              </button>
              <button
                type="button"
                disabled={!items.length}
                onClick={() => commit(false)}
                className="mt-2.5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-navy transition hover:bg-slate-50 disabled:opacity-40"
              >
                <Bookmark className="size-4" /> Save for Later
              </button>
            </div>

            {/* Changed your mind? */}
            <Link
              href="/shop/full"
              className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/50 px-4 py-3 text-sm transition hover:bg-indigo-50"
            >
              <span className="inline-flex items-center gap-2 font-semibold text-indigo-700">
                <Crown className="size-4" /> Want it all?
              </span>
              <span className="inline-flex items-center gap-1 font-bold text-indigo-700">
                Get Full Access <ArrowRight className="size-3.5" />
              </span>
            </Link>
          </aside>
        </div>
      )}

      {/* Mobile sticky action bar */}
      {items.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <div>
              <p className="text-xs text-slate-400">{items.length} selected</p>
              <p className="text-lg font-black tabular-nums text-navy">{formatPrice(total, 'INR')}</p>
            </div>
            <button
              type="button"
              onClick={() => commit(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white"
            >
              <ShoppingCart className="size-4" /> Add to Cart
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- small building blocks ----------

function Step({
  n,
  title,
  trailing,
  children,
}: {
  n: number;
  title: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="grid size-6 shrink-0 place-items-center rounded-md bg-indigo-600 text-xs font-black text-white">
          {n}
        </span>
        <h2 className="flex-1 text-base font-black text-navy">{title}</h2>
        {trailing}
      </div>
      {children}
    </section>
  );
}

function PickCard({
  label,
  icon,
  selected,
  owned,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  selected: boolean;
  owned: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={owned}
      className={`relative flex flex-col items-center justify-center gap-2 rounded-2xl border p-3 text-center transition ${
        owned
          ? 'cursor-default border-emerald-200 bg-emerald-50/60'
          : selected
            ? 'border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-500/30'
            : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      {(selected || owned) && (
        <span
          className={`absolute right-2 top-2 grid size-4 place-items-center rounded-full text-white ${
            owned ? 'bg-emerald-500' : 'bg-indigo-500'
          }`}
        >
          <Check className="size-3" />
        </span>
      )}
      <span
        className={`grid size-10 place-items-center rounded-xl ${
          selected ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'
        }`}
      >
        {icon}
      </span>
      <span className="line-clamp-2 text-xs font-bold text-navy">{label}</span>
      {owned && <span className="text-[10px] font-bold text-emerald-600">Owned</span>}
    </button>
  );
}

function SubTable({
  subs,
  priceMap,
  isOwned,
  stagedPeriod,
  onPick,
}: {
  subs: ApiTopic[];
  priceMap: Map<string, PriceBookEntryDto>;
  isOwned: (ref: string) => boolean;
  stagedPeriod: (ref: string) => BillingPeriod | undefined;
  onPick: (ref: string, period: BillingPeriod, label: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[440px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left">
            <th className="py-2 pr-3 text-xs font-bold uppercase tracking-widest text-slate-400">Sub-sections</th>
            {PERIODS.map((p) => {
              const pct = periodSavingsPct(priceMap, EntitlementScope.TOPIC, p.period);
              return (
                <th key={p.period} className="px-2 py-2 text-center text-xs font-bold text-slate-500">
                  <span className="flex flex-col items-center">
                    {p.months}
                    {pct ? <span className="text-[10px] font-bold text-emerald-600">Save {pct}%</span> : null}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {subs.map((t) => {
            const owned = isOwned(t.slug);
            const sel = stagedPeriod(t.slug);
            return (
              <tr key={t.id} className="border-b border-slate-50 last:border-0">
                <td className="py-2.5 pr-3">
                  <span className="font-semibold text-navy">{t.name}</span>
                  {owned && <span className="ml-2 text-[10px] font-bold text-emerald-600">Owned</span>}
                </td>
                {PERIODS.map((p) => {
                  const amt = retailPrice(priceMap, EntitlementScope.TOPIC, p.period)?.amountCents ?? null;
                  const active = sel === p.period;
                  return (
                    <td key={p.period} className="px-2 py-2.5 text-center">
                      <button
                        type="button"
                        disabled={owned}
                        onClick={() => onPick(t.slug, p.period, t.name)}
                        className="group inline-flex flex-col items-center gap-1 disabled:opacity-40"
                      >
                        <span
                          className={`grid size-4 place-items-center rounded-full border transition ${
                            active ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300 group-hover:border-indigo-400'
                          }`}
                        >
                          {active && <span className="size-1.5 rounded-full bg-white" />}
                        </span>
                        <span className="text-xs font-semibold tabular-nums text-slate-500">
                          {amt != null ? formatPrice(amt, 'INR') : '—'}
                        </span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SelGroup({
  title,
  icon,
  rows,
  priceOf,
  onRemove,
}: {
  title: string;
  icon: React.ReactNode;
  rows: CartItem[];
  priceOf: (scope: EntitlementScope, period: BillingPeriod) => number | null;
  onRemove: (it: CartItem) => void;
}) {
  if (!rows.length) return null;
  const months = (p: BillingPeriod) => PERIODS.find((x) => x.period === p)?.months ?? '';
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-slate-400">
        {icon} {title}
        {rows.length > 1 ? ` (${rows.length})` : ''}
      </p>
      <div className="space-y-1.5">
        {rows.map((it) => (
          <div
            key={sKey(it.scope, it.scopeRef)}
            className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-navy">{it.label}</p>
              <p className="text-xs text-slate-400">Plan: {months(it.period)}</p>
            </div>
            <span className="text-sm font-bold tabular-nums text-navy">
              {formatPrice(priceOf(it.scope, it.period) ?? 0, 'INR')}
            </span>
            <button
              type="button"
              onClick={() => onRemove(it)}
              aria-label={`Remove ${it.label}`}
              className="grid size-6 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
