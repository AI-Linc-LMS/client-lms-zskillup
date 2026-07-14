'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowRight,
  BookOpen,
  Check,
  ClipboardList,
  Gauge,
  LayoutGrid,
  ListChecks,
  Lock,
  MonitorPlay,
  ShoppingCart,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { cn } from '@/lib/utils';
import { getTopicAccuracy, type ApiTopicAccuracy } from '@/lib/api/practice';
import { getPricing } from '@/lib/api/payments';
import { onXpUpdated } from '@/lib/xp-events';
import { InfoTip } from '@/components/ui/InfoTip';
import { Disclaimer } from '@/components/legal/Disclaimer';
import { AnimatedNumber, AuroraBackground, Reveal, Stagger, StaggerItem } from '@/components/motion/primitives';
import { StudyMaterialTab } from '@/components/study-material/StudyMaterialTab';
import { UpgradeModal } from '@/components/billing/UpgradeModal';
import { useUpgradeGate } from '@/hooks/useUpgradeGate';
import { useMySubscription } from '@/hooks/useMySubscription';
import { useCartOptional } from '@/components/billing/CartProvider';
import { ACCENT_CLASS, sectionMetaFor } from '@/components/practice/section-meta';
import { sectionLeaves, type SectionLeaf, type SectionRoot } from '@/lib/sections/section-catalog';
import { buildPriceMap, retailPrice } from '@/lib/payments/pricing';
import { formatPrice } from '@/lib/api/subscriptions';
import { BillingPeriod, EntitlementScope } from '@/shared/enums';
import type { PriceBookEntryDto } from '@/shared/dto/payments.dto';

const SECTION_TABS = ['Overview', 'Syllabus', 'Study Material', 'Practice'] as const;
type SectionTab = (typeof SECTION_TABS)[number];

const TAB_ICONS: Record<SectionTab, typeof BookOpen> = {
  Overview: LayoutGrid,
  Syllabus: ClipboardList,
  'Study Material': MonitorPlay,
  Practice: ListChecks,
};

const READINESS_TIP = {
  title: 'Your section readiness',
  body: 'How strong you are in this section right now — measured from your own practice, not a community average.',
  bullets: [
    'Built from your accuracy across the topics you have practised in this section',
    'Rises as you practise more topics and answer more accurately',
    'Updates automatically every time you practise',
  ],
};

/** Per-topic accuracy keyed by slug, refreshed after any XP award. */
function useSectionAccuracy(leaves: SectionLeaf[]): {
  loading: boolean;
  bySlug: Map<string, ApiTopicAccuracy>;
  readiness: number | null;
  practised: number;
} {
  const [rows, setRows] = useState<ApiTopicAccuracy[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    const sync = () =>
      getTopicAccuracy()
        .then((r) => !cancelled && setRows(r))
        .catch(() => !cancelled && setRows([]));
    void sync();
    const off = onXpUpdated(() => void sync());
    return () => {
      cancelled = true;
      off();
    };
  }, []);

  return useMemo(() => {
    const bySlug = new Map((rows ?? []).map((r) => [r.topicSlug, r]));
    const mine = leaves.map((l) => bySlug.get(l.slug)).filter((r): r is ApiTopicAccuracy => !!r && r.total > 0);
    const readiness = mine.length
      ? Math.round(mine.reduce((s, r) => s + r.accuracyPct, 0) / mine.length)
      : null;
    return { loading: rows === null, bySlug, readiness, practised: mine.length };
  }, [rows, leaves]);
}

/**
 * Sectional Hub — the section analog of `CompanyHub`, built from the same visual
 * system (dark aurora hero + sticky glass tab bar + white violet-tinted cards) so
 * the two feel like one platform. Four tabs: Overview / Syllabus / Study Material /
 * Practice, with topic-level unlock (₹9/topic) and a whole-section bundle.
 */
export function SectionHub({ section }: { section: SectionRoot }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const reduce = useReducedMotion();

  const upgrade = useUpgradeGate();
  const { hasPlatform, active } = useMySubscription();
  const cart = useCartOptional();
  const [prices, setPrices] = useState<PriceBookEntryDto[]>([]);
  useEffect(() => {
    getPricing()
      .then(setPrices)
      .catch(() => setPrices([]));
  }, []);

  const meta = sectionMetaFor(section.slug, section.order - 1);
  const Icon = meta.icon;
  const tone = ACCENT_CLASS[meta.accent];

  const leaves = useMemo(() => sectionLeaves(section), [section]);
  const acc = useSectionAccuracy(leaves);

  // ── ownership + pricing ────────────────────────────────────────────────────
  const ownedSection = useMemo(
    () =>
      hasPlatform ||
      active.some((e) => e.scopeType === EntitlementScope.SECTION && e.scopeRef === section.slug),
    [hasPlatform, active, section.slug],
  );
  const ownedTopics = useMemo(
    () =>
      new Set(
        active
          .filter((e) => e.scopeType === EntitlementScope.TOPIC && e.scopeRef)
          .map((e) => e.scopeRef as string),
      ),
    [active],
  );
  const topicOwned = useCallback(
    (slug: string) => ownedSection || ownedTopics.has(slug),
    [ownedSection, ownedTopics],
  );

  const priceMap = useMemo(() => buildPriceMap(prices), [prices]);
  const topicPrice = useMemo(() => {
    const e = retailPrice(priceMap, EntitlementScope.TOPIC, BillingPeriod.MONTHLY);
    return e ? formatPrice(e.amountCents, 'INR') : null;
  }, [priceMap]);
  const sectionPrice = useMemo(() => {
    const e = retailPrice(priceMap, EntitlementScope.SECTION, BillingPeriod.ANNUAL);
    return e ? formatPrice(e.amountCents, 'INR') : null;
  }, [priceMap]);

  const addTopic = useCallback(
    (leaf: SectionLeaf) => {
      if (!cart || cart.has(EntitlementScope.TOPIC, leaf.slug)) return;
      cart.add({
        scope: EntitlementScope.TOPIC,
        scopeRef: leaf.slug,
        period: BillingPeriod.MONTHLY,
        label: leaf.name,
      });
      toast.success(`${leaf.name} added to cart`, {
        description: 'Change the plan length any time in your cart.',
      });
    },
    [cart],
  );
  const addSection = useCallback(() => {
    if (!cart || cart.has(EntitlementScope.SECTION, section.slug)) return;
    cart.add({
      scope: EntitlementScope.SECTION,
      scopeRef: section.slug,
      period: BillingPeriod.ANNUAL,
      label: section.name,
    });
    toast.success(`${section.name} added to cart`, {
      description: 'Unlocks every topic in this section.',
    });
  }, [cart, section.slug, section.name]);

  // ── tab state (URL-persisted) ──────────────────────────────────────────────
  const urlTab = searchParams.get('tab');
  const [tab, setTab] = useState<SectionTab>(
    urlTab && (SECTION_TABS as readonly string[]).includes(urlTab) ? (urlTab as SectionTab) : 'Overview',
  );
  const selectTab = useCallback(
    (t: SectionTab) => {
      setTab(t);
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', t);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const firstPracticeHref = leaves[0] ? `/dashboard/quiz/adaptive?topic=${encodeURIComponent(leaves[0].slug)}` : '/practice';

  return (
    <div className="w-full">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Sections', href: '/dashboard/section' },
          { label: section.name },
        ]}
      />

      <SectionHero
        section={section}
        Icon={Icon}
        tone={tone}
        reduce={!!reduce}
        readiness={acc.loading ? null : acc.readiness}
        practised={acc.practised}
        totalTopics={leaves.length}
        owned={ownedSection}
        firstPracticeHref={firstPracticeHref}
      />

      {/* Sticky glass tab bar */}
      <div className="sticky top-2 z-30 mt-6">
        <div
          className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/80 p-1.5 shadow-[0_8px_30px_-18px_rgba(15,23,42,0.35)] backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Section hub"
        >
          {SECTION_TABS.map((t) => {
            const TabIcon = TAB_ICONS[t];
            const activeTab = tab === t;
            return (
              <button
                key={t}
                role="tab"
                aria-selected={activeTab}
                onClick={() => selectTab(t)}
                className={cn(
                  'relative flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors',
                  activeTab ? 'text-white' : 'text-slate-600 hover:text-navy',
                )}
              >
                {activeTab && (
                  <motion.span
                    layoutId="section-tab-pill"
                    className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-b from-[#1f2d4d] to-[#0a0a0c] shadow-[0_10px_24px_-10px_rgba(11,18,32,0.7)]"
                    transition={{ type: 'spring', stiffness: 480, damping: 38 }}
                  />
                )}
                <TabIcon
                  className={cn('size-4 transition-colors', activeTab ? 'text-[#ffc42d]' : 'text-slate-500')}
                  aria-hidden="true"
                />
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content + rail */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_19rem]">
        <div className="min-w-0">
          <motion.div
            key={tab}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            {tab === 'Overview' && (
              <OverviewTab
                section={section}
                owned={ownedSection}
                sectionPrice={sectionPrice}
                onUnlock={addSection}
                inCart={!!cart?.has(EntitlementScope.SECTION, section.slug)}
              />
            )}
            {tab === 'Syllabus' && <SyllabusTab section={section} topicOwned={topicOwned} />}
            {tab === 'Study Material' && (
              <StudyMaterialTab slug={section.slug} scope="section" gate={upgrade.guard} />
            )}
            {tab === 'Practice' && (
              <PracticeTab
                section={section}
                accuracy={acc.bySlug}
                topicOwned={topicOwned}
                topicPrice={topicPrice}
                onAddTopic={addTopic}
                cartHas={(slug) => !!cart?.has(EntitlementScope.TOPIC, slug)}
              />
            )}
          </motion.div>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <AccessCard
            owned={ownedSection}
            sectionName={section.name}
            sectionPrice={sectionPrice}
            onUnlock={addSection}
            inCart={!!cart?.has(EntitlementScope.SECTION, section.slug)}
          />
          <AuroraCard glow="#7c3aed">
            <SectionLabel icon={Gauge}>Section stats</SectionLabel>
            <div className="mt-4 space-y-2">
              <Stat label="Topics" value={String(section.topicCount)} />
              <Stat label="Practice areas" value={String(leaves.length)} />
              <Stat
                label="Topics practised"
                value={acc.loading ? '—' : `${acc.practised} / ${leaves.length}`}
                accent
              />
            </div>
          </AuroraCard>
        </aside>
      </div>

      <Disclaimer className="mt-8" />

      <UpgradeModal
        open={upgrade.feature !== null}
        onClose={upgrade.close}
        feature={upgrade.feature ?? undefined}
        message={
          upgrade.feature
            ? `This section is yours to explore. Opening ${upgrade.feature} needs a plan.`
            : undefined
        }
      />
    </div>
  );
}

/* ── Hero ─────────────────────────────────────────────────────────────────── */

function SectionHero({
  section,
  Icon,
  tone,
  reduce,
  readiness,
  practised,
  totalTopics,
  owned,
  firstPracticeHref,
}: {
  section: SectionRoot;
  Icon: typeof BookOpen;
  tone: { tile: string; chip: string; solid: string };
  reduce: boolean;
  readiness: number | null;
  practised: number;
  totalTopics: number;
  owned: boolean;
  firstPracticeHref: string;
}) {
  const facts: Array<{ icon: typeof Target; label: string; value: string }> = [
    { icon: ClipboardList, label: 'Topics', value: String(section.topicCount) },
    { icon: ListChecks, label: 'Practice areas', value: String(totalTopics) },
    { icon: Gauge, label: 'Practised', value: `${practised}/${totalTopics}` },
  ];

  return (
    <section className="relative isolate overflow-hidden rounded-[1.75rem] p-6 text-white shadow-[0_30px_90px_-32px_rgba(11,18,32,0.85)] sm:rounded-[2rem] sm:p-9">
      <AuroraBackground />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[1.75rem] ring-1 ring-inset ring-white/10 sm:rounded-[2rem]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
      />

      <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 max-w-2xl">
          <motion.div
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur"
            initial={reduce ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Sparkles className="size-3.5 text-[#ffc42d]" />
            Sectional hub
            {owned ? (
              <>
                <span aria-hidden className="size-1 rounded-full bg-white/30" />
                <span className="text-[#ffc42d]">Unlocked</span>
              </>
            ) : null}
          </motion.div>

          <div className="mt-6 flex items-center gap-4">
            <motion.span
              className={cn('grid size-16 shrink-0 place-items-center rounded-2xl shadow-[0_14px_34px_-10px_rgba(0,0,0,0.6)] ring-1 ring-white/15', tone.tile)}
              initial={reduce ? false : { opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            >
              <Icon className="size-8" aria-hidden="true" />
            </motion.span>
            <div className="min-w-0">
              <motion.h1
                className="bg-gradient-to-b from-white to-white/70 bg-clip-text text-3xl font-extrabold leading-[1.05] tracking-tight text-transparent sm:text-[40px]"
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.08 }}
              >
                {section.name}
              </motion.h1>
              <motion.p
                className="mt-1 truncate text-sm text-white/65 sm:text-base"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.16 }}
              >
                Guided syllabus, study material and topic-wise practice.
              </motion.p>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-3 gap-2.5">
            {facts.map((f, i) => (
              <motion.div
                key={f.label}
                className="rounded-2xl border border-white/10 bg-white/[0.06] px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur"
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.22 + i * 0.07 }}
              >
                <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/45">
                  <f.icon className="size-3 text-[#ffc42d]" aria-hidden="true" />
                  {f.label}
                </span>
                <p className="mt-1 truncate text-sm font-extrabold text-white tabular-nums">{f.value}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            className="mt-7 flex flex-wrap gap-3"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Link
              href={firstPracticeHref}
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-gradient-to-b from-[#ffd24d] to-[#f5b400] px-5 py-2.5 text-sm font-extrabold text-[#171717] shadow-[0_14px_34px_-10px_rgba(245,180,0,0.85)] transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <span
                aria-hidden
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full"
              />
              <BookOpen className="size-4" aria-hidden="true" /> Start practising
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/mock-assessment"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-5 py-2.5 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur transition-colors hover:bg-white/[0.14]"
            >
              <Trophy className="size-4" aria-hidden="true" /> Timed assessment
            </Link>
          </motion.div>
        </div>

        {/* Readiness ring */}
        <motion.div
          className="mx-auto w-full max-w-xs shrink-0 lg:mx-0 lg:w-64"
          initial={reduce ? false : { opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur">
            <ReadinessRing pct={readiness} reduce={reduce} />
            <InfoTip
              content={READINESS_TIP}
              label="your section readiness"
              className="relative mt-4 flex items-center justify-center gap-1.5"
              dotClassName="text-white/40 hover:text-white"
            >
              <span className="text-[11px] font-semibold uppercase tracking-widest text-white/50">
                Your readiness
              </span>
            </InfoTip>
            <p className="mt-1 text-xs leading-relaxed text-white/55">
              {readiness === null
                ? 'Practise this section to see your readiness'
                : `${practised} of ${totalTopics} topics practised`}
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function ReadinessRing({ pct, reduce }: { pct: number | null; reduce: boolean }) {
  const R = 52;
  const C = 2 * Math.PI * R;
  const value = pct ?? 0;
  const dash = (value / 100) * C;
  return (
    <div className="relative mx-auto size-36">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <defs>
          <linearGradient id="sectionReadyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffd24d" />
            <stop offset="55%" stopColor="#f5b400" />
            <stop offset="100%" stopColor="#6d3bf5" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="10" />
        <motion.circle
          cx="60"
          cy="60"
          r={R}
          fill="none"
          stroke="url(#sectionReadyGrad)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={C}
          initial={reduce ? { strokeDashoffset: C - dash } : { strokeDashoffset: C }}
          animate={{ strokeDashoffset: C - dash }}
          transition={{ duration: 1.2, delay: 0.5, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {pct === null ? (
          <span className="text-3xl font-extrabold text-white/35">-</span>
        ) : (
          <span className="text-4xl font-extrabold tabular-nums text-white">
            <AnimatedNumber value={pct} />
            <span className="text-2xl text-white/70">%</span>
          </span>
        )}
        <span className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-[#ffc42d]">
          <Gauge className="size-3" aria-hidden="true" /> ready
        </span>
      </div>
    </div>
  );
}

/* ── shared building blocks (mirror CompanyHub) ───────────────────────────── */

function SectionLabel({ icon: Icon, children }: { icon?: typeof Gauge; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-violet-600 ring-1 ring-inset ring-violet-100">
      {Icon ? <Icon className="size-3.5" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

function AuroraCard({ glow, className, children }: { glow: string; className?: string; children: React.ReactNode }) {
  return (
    <section
      className={cn(
        'group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_18px_50px_-30px_rgba(124,58,237,0.22)] transition-shadow hover:shadow-[0_24px_60px_-28px_rgba(124,58,237,0.35)] sm:p-7',
        className,
      )}
    >
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500/0 via-violet-500/70 to-violet-500/0" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-50/60 via-transparent to-transparent" />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-12 size-36 rounded-full opacity-[0.1] blur-2xl transition-opacity duration-500 group-hover:opacity-25"
        style={{ background: glow }}
      />
      <div className="relative z-10">{children}</div>
    </section>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  const isShort = value.trim().length <= 8;
  return (
    <div className={cn('rounded-xl border p-3', accent ? 'border-violet-200 bg-violet-50/70' : 'border-slate-200/80 bg-slate-50/60')}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p
        className={cn(
          'mt-0.5 break-words leading-snug',
          isShort ? 'text-lg font-black tracking-tight tabular-nums' : 'text-[13px] font-bold',
          accent ? 'text-violet-600' : 'text-navy',
        )}
      >
        {value}
      </p>
    </div>
  );
}

/** Right-rail "Your access" card — unlock the whole section, or an owned badge. */
function AccessCard({
  owned,
  sectionName,
  sectionPrice,
  onUnlock,
  inCart,
}: {
  owned: boolean;
  sectionName: string;
  sectionPrice: string | null;
  onUnlock: () => void;
  inCart: boolean;
}) {
  if (owned) {
    return (
      <section className="relative overflow-hidden rounded-3xl border border-emerald-200 bg-emerald-50/70 p-6">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 ring-1 ring-inset ring-emerald-200">
          <Check className="size-3.5" /> Full access
        </span>
        <p className="mt-3 text-sm font-bold text-navy">You own this section</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">
          Every topic in {sectionName} is unlocked — practise without limits.
        </p>
      </section>
    );
  }
  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_18px_50px_-30px_rgba(124,58,237,0.22)]">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#ffd24d] via-[#ffc42d] to-[#f5b400]" />
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#a16207] ring-1 ring-inset ring-amber-100">
        <Lock className="size-3.5" /> Your access
      </span>
      <p className="mt-3 text-sm font-bold text-navy">Unlock the whole section</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-600">
        Get every topic in {sectionName}. Or unlock a single topic from the Practice tab.
      </p>
      <button
        type="button"
        onClick={onUnlock}
        disabled={inCart}
        className={cn(
          'mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-extrabold transition',
          inCart
            ? 'cursor-default bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200/70'
            : 'bg-gradient-to-r from-[#ffd24d] via-[#ffc42d] to-[#f5b400] text-[#171717] shadow-sm hover:brightness-105',
        )}
      >
        {inCart ? (
          <>
            <Check className="size-4" /> In cart
          </>
        ) : (
          <>
            <ShoppingCart className="size-4" /> {sectionPrice ? `Add · ${sectionPrice}` : 'Add to cart'}
          </>
        )}
      </button>
    </section>
  );
}

/* ── Tabs ─────────────────────────────────────────────────────────────────── */

function OverviewTab({
  section,
  owned,
  sectionPrice,
  onUnlock,
  inCart,
}: {
  section: SectionRoot;
  owned: boolean;
  sectionPrice: string | null;
  onUnlock: () => void;
  inCart: boolean;
}) {
  return (
    <div className="space-y-6">
      <Reveal>
        <AuroraCard glow="#7c3aed">
          <SectionLabel icon={Sparkles}>What you'll master</SectionLabel>
          <h2 className="mt-3 text-lg font-extrabold tracking-tight text-navy sm:text-xl">{section.name}</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
            Work through {section.name} topic by topic — start with the syllabus, learn from the study
            material, then drill each topic with adaptive practice from the real question bank.
          </p>
          {section.topics.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-1.5">
              {section.topics.map((t) => (
                <span
                  key={t.slug}
                  className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200/70"
                >
                  {t.name}
                </span>
              ))}
            </div>
          ) : null}
        </AuroraCard>
      </Reveal>

      {!owned ? (
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-[#0d0e13] to-[#141a2e] p-7 text-white shadow-[0_30px_80px_-40px_rgba(11,18,32,0.85)]">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#ffc42d]">
              <Lock className="size-3.5" /> Unlock full access
            </span>
            <h3 className="mt-3 text-lg font-extrabold sm:text-xl">Own every topic in {section.name}</h3>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/65">
              Unlimited practice across the whole section, or unlock a single topic for less. Your first
              questions in every topic are always free.
            </p>
            <button
              type="button"
              onClick={onUnlock}
              disabled={inCart}
              className={cn(
                'mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-extrabold transition',
                inCart
                  ? 'cursor-default bg-white/15 text-white'
                  : 'bg-gradient-to-r from-[#ffd24d] via-[#ffc42d] to-[#f5b400] text-[#171717] hover:brightness-105',
              )}
            >
              {inCart ? (
                <>
                  <Check className="size-4" /> In cart
                </>
              ) : (
                <>
                  <ShoppingCart className="size-4" /> {sectionPrice ? `Unlock section · ${sectionPrice}` : 'Unlock section'}
                </>
              )}
            </button>
          </div>
        </Reveal>
      ) : null}
    </div>
  );
}

function SyllabusTab({
  section,
  topicOwned,
}: {
  section: SectionRoot;
  topicOwned: (slug: string) => boolean;
}) {
  return (
    <Reveal>
      <AuroraCard glow="#7c3aed">
        <SectionLabel icon={ClipboardList}>Syllabus</SectionLabel>
        <h2 className="mt-3 text-lg font-extrabold tracking-tight text-navy sm:text-xl">{section.name} syllabus</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
          Everything this section covers, grouped by topic. Unlocked topics are marked; the rest stay
          practiceable with your free allowance.
        </p>

        <Stagger className="mt-5 space-y-3">
          {section.topics.map((t, i) => {
            const subs = t.subtopics.length ? t.subtopics : [{ slug: t.slug, name: t.name, questionCount: t.questionCount }];
            return (
              <StaggerItem key={t.slug}>
                <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
                  <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 text-xs font-extrabold text-white shadow-sm">
                      {i + 1}
                    </span>
                    <p className="flex-1 truncate text-sm font-bold text-navy sm:text-base">{t.name}</p>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                      {subs.length} {subs.length === 1 ? 'topic' : 'topics'}
                    </span>
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {subs.map((s) => {
                      const owned = topicOwned(s.slug);
                      return (
                        <li key={s.slug} className="flex items-center gap-3 px-4 py-2.5">
                          <span className={cn('size-1.5 shrink-0 rounded-full', owned ? 'bg-emerald-500' : 'bg-slate-300')} />
                          <span className="flex-1 truncate text-sm text-slate-700">{s.name}</span>
                          {owned ? (
                            <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-emerald-600">
                              <Check className="size-3" /> Unlocked
                            </span>
                          ) : (
                            <Link
                              href={`/dashboard/quiz/adaptive?topic=${encodeURIComponent(s.slug)}`}
                              className="shrink-0 text-[11px] font-bold text-orange hover:text-[#d9610f]"
                            >
                              Practise →
                            </Link>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>
      </AuroraCard>
    </Reveal>
  );
}

function PracticeTab({
  section,
  accuracy,
  topicOwned,
  topicPrice,
  onAddTopic,
  cartHas,
}: {
  section: SectionRoot;
  accuracy: Map<string, ApiTopicAccuracy>;
  topicOwned: (slug: string) => boolean;
  topicPrice: string | null;
  onAddTopic: (leaf: SectionLeaf) => void;
  cartHas: (slug: string) => boolean;
}) {
  const leaves = useMemo(() => sectionLeaves(section), [section]);
  // Group leaves by their mid-level topic for readable sub-headers.
  const groups = useMemo(() => {
    const map = new Map<string, SectionLeaf[]>();
    for (const l of leaves) {
      const g = map.get(l.groupName);
      if (g) g.push(l);
      else map.set(l.groupName, [l]);
    }
    return [...map.entries()];
  }, [leaves]);

  return (
    <div className="space-y-5">
      {groups.map(([groupName, groupLeaves]) => (
        <Reveal key={groupName}>
          <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_18px_50px_-30px_rgba(15,23,42,0.25)]">
            <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-3.5">
              <span className="grid size-8 place-items-center rounded-xl bg-orange/10 text-orange">
                <ListChecks className="size-4" />
              </span>
              <h3 className="text-sm font-extrabold text-navy sm:text-base">{groupName}</h3>
            </div>
            <ul className="divide-y divide-slate-100">
              {groupLeaves.map((leaf) => {
                const owned = topicOwned(leaf.slug);
                const acc = accuracy.get(leaf.slug);
                const inCart = cartHas(leaf.slug);
                return (
                  <li key={leaf.slug} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-navy">{leaf.name}</p>
                      {acc && acc.total > 0 ? (
                        <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                          {acc.accuracyPct}% accuracy · {acc.total} attempted
                        </p>
                      ) : (
                        <p className="mt-0.5 text-[11px] text-slate-400">Not practised yet</p>
                      )}
                    </div>

                    {owned ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200/70">
                        <Check className="size-3" /> Unlocked
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onAddTopic(leaf)}
                        disabled={inCart}
                        className={cn(
                          'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-bold transition',
                          inCart
                            ? 'cursor-default bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200/70'
                            : 'bg-gradient-to-r from-[#ffd24d] via-[#ffc42d] to-[#f5b400] text-[#171717] shadow-sm hover:brightness-105',
                        )}
                      >
                        {inCart ? (
                          <>
                            <Check className="size-3" /> In cart
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="size-3" /> {topicPrice ? `Add · ${topicPrice}` : 'Add'}
                          </>
                        )}
                      </button>
                    )}

                    <Link
                      href={`/dashboard/quiz/adaptive?topic=${encodeURIComponent(leaf.slug)}`}
                      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-navy px-3 py-1.5 text-xs font-bold text-white transition hover:bg-navy/90"
                    >
                      Practise <ArrowRight className="size-3.5" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </Reveal>
      ))}
    </div>
  );
}
