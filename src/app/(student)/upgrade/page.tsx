'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowRight,
  Building2,
  Check,
  Clock,
  Crown,
  FileText,
  Gift,
  HelpCircle,
  Layers,
  Loader2,
  Puzzle,
  Receipt,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { getMe, type ApiMe } from '@/lib/api/me';
import { getMySubscription, getPricing } from '@/lib/api/payments';
import { getReadiness, type Readiness } from '@/lib/api/readiness';
import { formatPrice } from '@/lib/api/subscriptions';
import { buildPriceMap, periodMonths, retailPrice } from '@/lib/payments/pricing';
import { usePurchase } from '@/components/billing/usePurchase';
import { FeatureItem, IncludedGrid, PlanPill, StatBand, TrustBadges, ValueProps } from '@/components/billing/plan-ui';
import { PLAN_INCLUDED, PLAN_STATS, PLAN_VALUES } from '@/components/billing/plan-content';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { BillingPeriod, EntitlementScope } from '@/shared/enums';
import type { EntitlementDto, MySubscriptionDto, PriceBookEntryDto, PurchaseHistoryItemDto } from '@/shared/dto/payments.dto';
import { cn } from '@/lib/utils';

function slugToLabel(ref: string | null): string {
  if (!ref) return '';
  return ref
    .replace(/^coding:/, '')
    .replace(/^section-\d+-/, '')
    .split(/[-:]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function historyPlanLabel(h: PurchaseHistoryItemDto): string {
  if (h.period) return h.period.toLowerCase();
  if (h.items && h.items.length > 0) {
    const distinct = new Set(h.items.map((i) => i.period));
    return distinct.size === 1 ? [...distinct][0].toLowerCase() : 'mixed';
  }
  return '—';
}

export default function UpgradeRenewPage() {
  const [me, setMe] = useState<ApiMe | null>(null);
  const [sub, setSub] = useState<MySubscriptionDto | null>(null);
  const [pricing, setPricing] = useState<PriceBookEntryDto[]>([]);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const { buy, busyKey } = usePurchase();

  useEffect(() => {
    void (async () => {
      const [m, s, p, r] = await Promise.all([
        getMe().catch(() => null),
        getMySubscription().catch(() => null),
        getPricing().catch(() => [] as PriceBookEntryDto[]),
        getReadiness().catch(() => null),
      ]);
      setMe(m);
      setSub(s);
      setPricing(p);
      setReadiness(r);
      setLoading(false);
    })();
  }, []);

  const priceMap = useMemo(() => buildPriceMap(pricing), [pricing]);
  const refresh = () => void getMySubscription().then(setSub).catch(() => {});

  const hasPlatform = sub?.hasPlatform ?? false;
  const active = (sub?.entitlements ?? []).filter((e) => e.status === 'ACTIVE');
  const platformEnt = active.find((e) => e.scopeType === EntitlementScope.PLATFORM);
  const granular = active.filter((e) => e.scopeType !== EntitlementScope.PLATFORM);
  const paidHistory = (sub?.history ?? []).filter((h) => h.status === 'PAID');
  const totalPaid = paidHistory.reduce((n, h) => n + h.amountCents, 0);

  const renew = (period: BillingPeriod) =>
    buy({
      key: `renew:${period}`,
      scope: EntitlementScope.PLATFORM,
      period,
      label: `Full Platform (${periodMonths(period)})`,
      prefill: { name: me?.fullName, email: me?.email },
      onPurchased: refresh,
    });

  if (loading) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="size-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Upgrade & Renew' }]} />
      <h1 data-tour="upgrade:title" className="mt-4 text-2xl font-black tracking-tight text-navy">
        {hasPlatform ? 'Upgrade & Renew' : 'Plans & Access'}
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {hasPlatform
          ? 'Your membership, readiness and quick actions in one place.'
          : 'See what you already have and choose the best way to continue your preparation.'}
      </p>

      {hasPlatform ? (
        <PremiumView
          platformEnt={platformEnt}
          history={sub?.history ?? []}
          readiness={readiness}
          period={paidHistory.find((h) => h.scopeType === EntitlementScope.PLATFORM)?.period ?? null}
          onRenew={renew}
          busyKey={busyKey}
          showHistory={showHistory}
          setShowHistory={setShowHistory}
        />
      ) : granular.length > 0 ? (
        <CustomPlanView
          granular={granular}
          totalPaid={totalPaid}
          history={sub?.history ?? []}
          showHistory={showHistory}
          setShowHistory={setShowHistory}
        />
      ) : (
        <NoPlanView priceMap={priceMap} />
      )}
    </div>
  );
}

/* ───────────────────────── Premium (full platform) ───────────────────────── */

function PremiumView({
  platformEnt,
  history,
  readiness,
  period,
  onRenew,
  busyKey,
  showHistory,
  setShowHistory,
}: {
  platformEnt?: EntitlementDto;
  history: PurchaseHistoryItemDto[];
  readiness: Readiness | null;
  period: BillingPeriod | null;
  onRenew: (p: BillingPeriod) => void;
  busyKey: string | null;
  showHistory: boolean;
  setShowHistory: (v: boolean) => void;
}) {
  const planName = period ? `Premium ${periodMonths(period)}` : 'Premium';
  const days = platformEnt?.daysRemaining ?? null;
  const score = readiness?.overall.score ?? null;

  // Use the server's honest counts. These used to be derived from `companies[]`,
  // which is keyed off the MANY-TO-MANY company tags — so "Questions Attempted"
  // summed the same question once per tagged company (~4.5x too high) and
  // "Companies Practised" counted every company that merely shared a tag (15 for a
  // student who had actually practised 3). Fall back to the true topic-sum, which
  // is exact because subtopic_id is single-valued.
  // `companiesPractised` has no honest client-side fallback (the only other signal
  // is the tag-inflated companies[]), so show "—" rather than a false 0 on a server
  // that predates `stats`. The other two DO have exact fallbacks.
  const companies = readiness?.stats?.companiesPractised ?? null;
  const topics = readiness?.stats?.topicsPractised ?? readiness?.topics.length ?? 0;
  const attempted =
    readiness?.stats?.questionsAttempted ??
    readiness?.topics.reduce((n, t) => n + t.attempts, 0) ??
    0;

  // The billing history renders at the BOTTOM of the page, so merely toggling it
  // looked like nothing happened ("Manage Subscription" / "Payment History" read as
  // dead). Open it AND scroll to it. The scroll runs in an effect — i.e. AFTER the
  // DOM commit — because doing it on a timer raced the render: the ref could still
  // be null and the scroll would silently no-op.
  const historyRef = useRef<HTMLDivElement | null>(null);
  const scrollToHistory = () =>
    historyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  useEffect(() => {
    if (showHistory) scrollToHistory();
  }, [showHistory]);
  const openHistory = () => {
    if (showHistory) scrollToHistory(); // already open → just take them there
    else setShowHistory(true); // the effect scrolls once it's mounted
  };

  const quickActions = [
    { icon: RefreshCw, label: 'Renew Plan', onClick: () => onRenew(BillingPeriod.ANNUAL) },
    { icon: Receipt, label: 'Payment History', onClick: openHistory },
    { icon: FileText, label: 'Download Invoice', onClick: () => toast.info('GST invoices are available on request — contact support.') },
    { icon: Gift, label: 'Gift Premium', onClick: () => toast.info('Gifting is coming soon.') },
    { icon: HelpCircle, label: 'Need Help?', href: '/support' },
  ];

  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-4 lg:grid-cols-4">
        {/* Premium member */}
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-5">
          <span className="grid size-11 place-items-center rounded-2xl bg-emerald-500 text-white">
            <Crown className="size-6" />
          </span>
          <p className="mt-3 text-base font-black text-emerald-900">You&apos;re a Premium Member! 🎉</p>
          <p className="mt-1 text-xs text-emerald-800/80">
            Enjoy unlimited access to all companies, sections and topics.
          </p>
          <Link
            href="/shop"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700"
          >
            Explore Plans <ArrowRight className="size-3.5" />
          </Link>
        </div>

        {/* Your premium plan */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-navy">Your Premium Plan</h3>
            <PlanPill tone="emerald">Active</PlanPill>
          </div>
          <dl className="mt-3 space-y-2 text-sm">
            <KV k="Plan" v={planName} />
            <KV k="Valid till" v={fmtDate(platformEnt?.expiresAt)} />
            {days != null && <KV k="Days left" v={`${days} days`} />}
          </dl>
          <button
            type="button"
            onClick={openHistory}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg text-xs font-bold text-indigo-600 underline-offset-2 transition hover:text-indigo-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            Manage Subscription <ArrowRight className="size-3.5" />
          </button>
        </div>

        {/* Placement readiness */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-black text-navy">Your Placement Readiness</h3>
          <div className="mt-3 flex items-center gap-3">
            <ReadinessDonut score={score} />
            <div className="min-w-0">
              <p className="text-xs font-bold text-emerald-600">{readiness?.overall.level ?? 'Keep going'}</p>
              <Link
                href="/study-plan"
                className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700"
              >
                Go to Study Plan <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-black text-navy">Quick Actions</h3>
          <div className="mt-3 space-y-1">
            {quickActions.map((a) =>
              a.href ? (
                <Link
                  key={a.label}
                  href={a.href}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-navy"
                >
                  <a.icon className="size-4 text-indigo-500" /> {a.label}
                </Link>
              ) : (
                <button
                  key={a.label}
                  type="button"
                  onClick={a.onClick}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-navy"
                >
                  <a.icon className="size-4 text-indigo-500" /> {a.label}
                </button>
              ),
            )}
          </div>
        </div>
      </div>

      {/* Preparation at a glance */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-black tracking-tight text-navy">Your Preparation at a Glance</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <StatTile icon={Building2} tint="bg-violet-50 text-violet-600" label="Companies Practised" value={companies ?? '—'} />
          <StatTile icon={Layers} tint="bg-amber-50 text-amber-600" label="Topics Practised" value={topics} />
          <StatTile icon={Target} tint="bg-emerald-50 text-emerald-600" label="Questions Attempted" value={attempted} />
          <StatTile icon={TrendingUp} tint="bg-indigo-50 text-indigo-600" label="Readiness" value={score != null ? `${score}%` : '—'} />
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
          <Sparkles className="size-3.5 text-indigo-400" /> New companies, mock tests &amp; questions are added every week.
        </p>
      </section>

      {/* Premium perks */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-black tracking-tight text-navy">Everything your Premium unlocks</h2>
        <p className="mt-1 text-sm text-slate-500">It&apos;s all included — dive into any of it.</p>
        <IncludedGrid items={PLAN_INCLUDED} className="mt-4" />
      </section>

      {/* What's new */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black tracking-tight text-navy">What&apos;s New for You</h2>
          <Link href="/dashboard/company" className="inline-flex items-center gap-1 text-sm font-bold text-indigo-600">
            View All <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <WhatsNew icon={Building2} title="Company Hubs" sub="Explore recruiter PYQ banks" href="/dashboard/company" />
          <WhatsNew icon={FileText} title="Study Material" sub="Curated videos, quizzes & notes" href="/dashboard/company" />
          <WhatsNew icon={Sparkles} title="Live Sessions" sub="Join upcoming expert sessions" href="/live-sessions" />
        </div>
      </section>

      {showHistory && (
        <div ref={historyRef}>
          <HistorySection history={history} />
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Custom plan (Plans & Access) ───────────────────────── */

function CustomPlanView({
  granular,
  totalPaid,
  history,
  showHistory,
  setShowHistory,
}: {
  granular: EntitlementDto[];
  totalPaid: number;
  history: PurchaseHistoryItemDto[];
  showHistory: boolean;
  setShowHistory: (v: boolean) => void;
}) {
  const companies = granular.filter((e) => e.scopeType === EntitlementScope.COMPANY);
  const sections = granular.filter((e) => e.scopeType === EntitlementScope.SECTION);
  const topics = granular.filter((e) => e.scopeType === EntitlementScope.TOPIC);
  const maxDays = granular.reduce((n, e) => Math.max(n, e.daysRemaining ?? 0), 0);

  // Same as the premium view — reveal the history AND scroll to it (in an effect,
  // after the DOM commit, so the ref is guaranteed to exist).
  const historyRef = useRef<HTMLDivElement | null>(null);
  const scrollToHistory = () =>
    historyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  useEffect(() => {
    if (showHistory) scrollToHistory();
  }, [showHistory]);
  const openHistory = () => {
    if (showHistory) scrollToHistory();
    else setShowHistory(true);
  };

  return (
    <div className="mt-6 space-y-6">
      {/* Your current plan */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-black tracking-tight text-navy">Your Current Plan</h2>
          <PlanPill tone="emerald">Active</PlanPill>
        </div>
        <p className="mt-1 text-sm text-slate-500">Here&apos;s what you currently have access to.</p>

        <div className="mt-5 grid gap-5 lg:grid-cols-[220px_1fr]">
          <div className="flex flex-col items-center justify-center rounded-2xl bg-indigo-50/60 p-5 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-white text-indigo-600 shadow-sm">
              <Puzzle className="size-7" />
            </span>
            <p className="mt-3 text-base font-black text-navy">Custom Plan</p>
            <p className="text-xs text-slate-500">Total Value</p>
            <p className="text-xl font-black tabular-nums text-emerald-600">{formatPrice(totalPaid, 'INR')}</p>
            <div className="mt-4 flex w-full flex-col gap-2">
              <Link
                href="/shop/build"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white"
              >
                Manage My Selections
              </Link>
              <button
                type="button"
                onClick={openHistory}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-navy"
              >
                <RefreshCw className="size-3.5" /> Payment History
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <PlanFacet icon={Building2} label="Companies" primary={`${companies.length} ${companies.length === 1 ? 'Company' : 'Companies'}`} sub={companies.map((e) => slugToLabel(e.scopeRef)).slice(0, 2).join(', ') || '—'} />
            <PlanFacet icon={Layers} label="Sections" primary={`${sections.length} Section${sections.length === 1 ? '' : 's'}`} sub={sections.map((e) => slugToLabel(e.scopeRef)).slice(0, 2).join(', ') || '—'} />
            <PlanFacet icon={Target} label="Sub-topics" primary={`${topics.length} Topic${topics.length === 1 ? '' : 's'}`} sub={topics.map((e) => slugToLabel(e.scopeRef)).slice(0, 2).join(', ') || '—'} />
            <PlanFacet icon={Sparkles} label="Access" primary={`${granular.length} unlock${granular.length === 1 ? '' : 's'}`} sub="Practice + analytics" />
            <PlanFacet icon={Clock} label="Validity" primary={maxDays > 0 ? `${maxDays} days left` : 'Active'} sub="Renew any time" />
          </div>
        </div>
      </section>

      <StatBand stats={PLAN_STATS} />

      {/* Choose how you want to learn */}
      <section>
        <h2 className="text-lg font-black tracking-tight text-navy">Choose how you want to learn</h2>
        <p className="text-sm text-slate-500">Two flexible ways to continue your placement preparation.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <LearnCard
            tone="indigo"
            icon={Crown}
            title="Unlimited Platform Access"
            pill="Best Value"
            subtitle="Unlock everything on prephasz and prepare without any limits."
            features={['100+ Companies', '55,000+ Questions', 'Unlimited Mock Tests', 'AI Study Plan', 'Interview Prep', 'Advanced Analytics']}
            cta="Upgrade to Premium"
            href="/shop/full"
          />
          <LearnCard
            tone="sky"
            icon={Puzzle}
            title="Build Your Own Plan"
            pill="Pay for what you need"
            subtitle="Choose companies, sections and topics you want to prepare for."
            features={['Choose Companies', 'Choose Sections', 'Choose Topics', 'Set different validity', 'Pay only for what you select']}
            cta="Customize Your Plan"
            href="/shop/build"
          />
        </div>
      </section>

      {/* Unlock more */}
      <section>
        <h2 className="text-lg font-black tracking-tight text-navy">Unlock the full experience</h2>
        <p className="mt-1 text-sm text-slate-500">Upgrade any time to open everything below.</p>
        <IncludedGrid items={PLAN_INCLUDED} className="mt-4" />
      </section>

      <ValueProps items={PLAN_VALUES} />

      {showHistory && (
        <div ref={historyRef}>
          <HistorySection history={history} />
        </div>
      )}

      <p className="flex items-center justify-center gap-1.5 rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-2.5 text-xs font-semibold text-emerald-700">
        <Check className="size-4" /> Plans are valid for the selected duration. Renew any time to continue your access.
      </p>
    </div>
  );
}

/* ───────────────────────── No plan ───────────────────────── */

function NoPlanView({ priceMap }: { priceMap: Map<string, PriceBookEntryDto> }) {
  const platform = retailPrice(priceMap, EntitlementScope.PLATFORM, BillingPeriod.MONTHLY);
  return (
    <div className="mt-6 space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-sky-50 px-6 py-10 text-center shadow-sm sm:px-10 sm:py-14">
        <div aria-hidden className="pointer-events-none absolute -left-16 -top-16 size-64 rounded-full bg-indigo-300/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -right-16 -bottom-16 size-64 rounded-full bg-sky-300/20 blur-3xl" />
        <div className="relative mx-auto max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-widest text-indigo-600">
            <Crown className="size-3.5" /> Get started
          </span>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-navy sm:text-4xl">Start your placement prep</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-500 sm:text-base">
            You don&apos;t have a plan yet. Unlock companies, sections and topics — or go all-access
            {platform ? ` from ${formatPrice(platform.amountCents, 'INR')}/month` : ''}.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/shop/full" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700">
              <Crown className="size-4" /> Get Full Access
            </Link>
            <Link href="/shop/build" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-navy transition hover:bg-slate-50">
              <Puzzle className="size-4 text-sky-600" /> Build Your Own
            </Link>
          </div>
        </div>
      </section>

      <StatBand stats={PLAN_STATS} />

      {/* Two ways to learn */}
      <section>
        <h2 className="text-lg font-black tracking-tight text-navy">Choose how you want to learn</h2>
        <p className="text-sm text-slate-500">Two flexible ways to start your placement preparation.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <LearnCard
            tone="indigo"
            icon={Crown}
            title="Unlimited Platform Access"
            pill="Best Value"
            subtitle="Unlock everything on prephasz and prepare without any limits."
            features={['100+ Companies', '55,000+ Questions', 'Unlimited Mock Tests', 'AI Study Plan', 'Interview Prep', 'Advanced Analytics']}
            cta="Get Full Access"
            href="/shop/full"
          />
          <LearnCard
            tone="sky"
            icon={Puzzle}
            title="Build Your Own Plan"
            pill="Pay for what you need"
            subtitle="Choose companies, sections and topics you want to prepare for."
            features={['Choose Companies', 'Choose Sections', 'Choose Topics', 'Set different validity', 'Pay only for what you select']}
            cta="Start Customizing"
            href="/shop/build"
          />
        </div>
      </section>

      {/* Everything you unlock */}
      <section>
        <h2 className="text-lg font-black tracking-tight text-navy">Everything you unlock</h2>
        <p className="mt-1 text-sm text-slate-500">Every plan is packed with the tools recruiters test on.</p>
        <IncludedGrid items={PLAN_INCLUDED} className="mt-4" />
      </section>

      <ValueProps items={PLAN_VALUES} />
      <TrustBadges />
    </div>
  );
}

/* ───────────────────────── shared bits ───────────────────────── */

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate-500">{k}</dt>
      <dd className="font-bold text-navy">{v}</dd>
    </div>
  );
}

function StatTile({ icon: Icon, tint, label, value }: { icon: typeof Building2; tint: string; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
      <span className={cn('grid size-9 place-items-center rounded-xl', tint)}>
        <Icon className="size-5" />
      </span>
      <p className="mt-3 text-2xl font-black tabular-nums text-navy">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function WhatsNew({ icon: Icon, title, sub, href }: { icon: typeof Building2; title: string; sub: string; href: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-3 transition hover:border-indigo-200 hover:bg-indigo-50/40">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-indigo-600 shadow-sm">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-navy">{title}</p>
        <p className="truncate text-xs text-slate-500">{sub}</p>
      </div>
    </Link>
  );
}

function PlanFacet({ icon: Icon, label, primary, sub }: { icon: typeof Building2; label: string; primary: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">
        <Icon className="size-3.5" /> {label}
      </p>
      <p className="mt-1.5 text-sm font-black text-navy">{primary}</p>
      <p className="truncate text-xs text-slate-500">{sub}</p>
    </div>
  );
}

function LearnCard({
  tone,
  icon: Icon,
  title,
  pill,
  subtitle,
  features,
  cta,
  href,
}: {
  tone: 'indigo' | 'sky';
  icon: typeof Crown;
  title: string;
  pill: string;
  subtitle: string;
  features: string[];
  cta: string;
  href: string;
}) {
  const accent = tone === 'indigo' ? 'text-indigo-600 bg-indigo-50' : 'text-sky-600 bg-sky-50';
  const btn = tone === 'indigo' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700';
  return (
    <div className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <span className={cn('grid size-11 place-items-center rounded-2xl', accent)}>
          <Icon className="size-6" />
        </span>
        <div className="flex-1">
          <p className="text-base font-black text-navy">{title}</p>
        </div>
        <PlanPill tone={tone === 'indigo' ? 'emerald' : 'amber'}>{pill}</PlanPill>
      </div>
      <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
      <ul className="mt-4 grid flex-1 gap-2 sm:grid-cols-2">
        {features.map((f) => (
          <FeatureItem key={f} tone={tone === 'indigo' ? 'violet' : 'slate'}>
            {f}
          </FeatureItem>
        ))}
      </ul>
      <Link
        href={href}
        className={cn('mt-5 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white transition', btn)}
      >
        {cta} <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}

function ReadinessDonut({ score }: { score: number | null }) {
  const pct = Math.max(0, Math.min(100, score ?? 0));
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid size-20 shrink-0 place-items-center">
      <svg viewBox="0 0 64 64" className="size-20 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeWidth="7" className="text-slate-100" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          className="text-emerald-500 transition-all"
        />
      </svg>
      <span className="absolute text-sm font-black tabular-nums text-navy">{score != null ? `${score}%` : '—'}</span>
    </div>
  );
}

function HistorySection({ history }: { history: PurchaseHistoryItemDto[] }) {
  if (!history.length) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-400 shadow-sm">
        No purchases yet.
      </section>
    );
  }
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-400">
        <Clock className="size-4" /> Purchase history
      </h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th className="pb-2">Item</th>
              <th className="pb-2">Plan</th>
              <th className="pb-2 text-right">Amount</th>
              <th className="pb-2 text-right">Status</th>
              <th className="pb-2 text-right">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {history.map((h) => (
              <tr key={h.orderId}>
                <td className="py-2.5 font-semibold text-navy">
                  {h.items && h.items.length > 0
                    ? `Cart · ${h.items.length} item${h.items.length === 1 ? '' : 's'}`
                    : h.scopeType === EntitlementScope.PLATFORM
                      ? 'Full Platform'
                      : slugToLabel(h.scopeRef) || h.scopeType}
                </td>
                <td className="py-2.5 capitalize text-slate-500">{historyPlanLabel(h)}</td>
                <td className="py-2.5 text-right tabular-nums text-navy">{formatPrice(h.amountCents, h.currency)}</td>
                <td className="py-2.5 text-right">
                  <StatusPill status={h.status} />
                </td>
                <td className="py-2.5 text-right tabular-nums text-slate-500">
                  {new Date(h.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    PAID: 'bg-emerald-50 text-emerald-700',
    CREATED: 'bg-amber-50 text-amber-700',
    FAILED: 'bg-rose-50 text-rose-700',
    REFUNDED: 'bg-slate-100 text-slate-600',
    EXPIRED: 'bg-slate-100 text-slate-500',
  };
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', map[status] ?? 'bg-slate-100 text-slate-600')}>
      {status === 'CREATED' ? 'Pending' : status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
