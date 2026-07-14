'use client';

import { useEffect, useMemo, useState } from 'react';
import { Layers, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { SectionCard } from './SectionCard';
import { listTopicsWithCounts } from '@/lib/api/catalog';
import { listCodingTopics } from '@/lib/api/mocks';
import {
  buildCodingSection,
  buildSections,
  buildSoftSkillsSection,
  type SectionRoot,
} from '@/lib/sections/section-catalog';
import { useMySubscription } from '@/hooks/useMySubscription';
import { getPricing } from '@/lib/api/payments';
import { formatPrice } from '@/lib/api/subscriptions';
import { buildPriceMap, retailPrice } from '@/lib/payments/pricing';
import { BillingPeriod, EntitlementScope } from '@/shared/enums';
import type { PriceBookEntryDto } from '@/shared/dto/payments.dto';

/**
 * Sectional Hubs explorer — the section analog of `CompaniesExplorer`. Derives the
 * section list from the live topic tree (`/topics/with-counts`), reads the SECTION
 * price + the student's entitlements, and renders a `SectionCard` grid. Owned
 * sections (Full Platform or a SECTION grant for that root) show "Owned".
 */
export function SectionsExplorer() {
  const [sections, setSections] = useState<SectionRoot[] | null>(null);
  const [loading, setLoading] = useState(true);

  const { hasPlatform, active } = useMySubscription();
  const [prices, setPrices] = useState<PriceBookEntryDto[]>([]);

  useEffect(() => {
    getPricing()
      .then(setPrices)
      .catch(() => setPrices([]));
  }, []);

  /** Section roots the student already owns (Full Platform unlocks every one). */
  const ownedRoots = useMemo(
    () =>
      new Set(
        active
          .filter((e) => e.scopeType === EntitlementScope.SECTION && e.scopeRef)
          .map((e) => e.scopeRef as string),
      ),
    [active],
  );
  const isOwned = (slug: string) => hasPlatform || ownedRoots.has(slug);

  /** Annual section price shown on the Add button (e.g. "₹399"). */
  const priceLabel = useMemo(() => {
    const entry = retailPrice(buildPriceMap(prices), EntitlementScope.SECTION, BillingPeriod.ANNUAL);
    return entry ? formatPrice(entry.amountCents, 'INR') : null;
  }, [prices]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    // The 4 MCQ sections come from the bank; Coding is synthetic (Judge0 topic list),
    // and Soft Skills is the interview-prep root. Coding topics failing shouldn't drop
    // the whole grid, so tolerate an empty coding list.
    Promise.all([listTopicsWithCounts(), listCodingTopics().catch(() => [])])
      .then(([topics, codingTopics]) => {
        if (cancelled) return;
        const mcq = buildSections(topics);
        const coding = codingTopics.length ? [buildCodingSection(codingTopics)] : [];
        const soft = buildSoftSkillsSection(topics);
        setSections([...mcq, ...coding, ...(soft ? [soft] : [])].sort((a, b) => a.order - b.order));
      })
      .catch(() => {
        if (!cancelled) setSections([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-3xl border border-slate-200/80 bg-white p-20 shadow-[0_8px_30px_-20px_rgba(15,23,42,0.35)]">
        <Loader2 className="size-6 animate-spin text-orange" aria-hidden="true" />
      </div>
    );
  }

  if (!sections || sections.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-14 text-center shadow-[0_8px_30px_-20px_rgba(15,23,42,0.35)]">
        <span className="relative mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500">
          <Layers className="size-6" aria-hidden="true" />
        </span>
        <p className="relative mt-4 text-sm font-bold text-navy">Sections are being prepared.</p>
        <p className="relative mt-1 text-xs text-slate-600">Check back shortly.</p>
      </div>
    );
  }

  return (
    <motion.div
      className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } } }}
    >
      {sections.map((s, i) => (
        <motion.div
          key={s.slug}
          className="h-full"
          variants={{
            hidden: { opacity: 0, y: 16 },
            show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
          }}
        >
          <SectionCard section={s} index={i} owned={isOwned(s.slug)} priceLabel={priceLabel} />
        </motion.div>
      ))}
    </motion.div>
  );
}
