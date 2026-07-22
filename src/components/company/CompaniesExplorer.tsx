'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CompanyCard, type CompanyCardData } from './CompanyCard';
import { listCompanies, type ApiCompany } from '@/lib/api/catalog';
import { HOMEPAGE_FEATURED_TRACKS } from '@/lib/demo-data-extra';
import { useMySubscription } from '@/hooks/useMySubscription';
import { getPricing } from '@/lib/api/payments';
import { buildPriceMap, retailPrice } from '@/lib/payments/pricing';
import { BillingPeriod, EntitlementScope } from '@/shared/enums';
import type { PriceBookEntryDto } from '@/shared/dto/payments.dto';

const TYPE_TABS: Array<{ key: 'All' | ApiCompany['type']; label: string }> = [
  { key: 'All', label: 'All' },
  { key: 'SERVICE', label: 'Service' },
  { key: 'PRODUCT', label: 'Product' },
  { key: 'CONSULTING', label: 'Consulting' },
];

/**
 * Companies explorer. Fetches the live catalog from `GET /companies` (public).
 * Type AND card metadata (rating/enrolled/package/difficulty/mcqs/rounds) now
 * come straight from the API (DB-backed catalog.companies) - no demo overlay.
 *
 * If the API is unreachable (preview), falls back to the demo grid so the page
 * still renders something instead of an empty state.
 */

interface ExplorerCompany extends CompanyCardData {
  type: ApiCompany['type'];
}

export function CompaniesExplorer() {
  const [type, setType] = useState<'All' | ApiCompany['type']>('All');
  const [companies, setCompanies] = useState<ExplorerCompany[] | null>(null);
  const [loading, setLoading] = useState(true);

  // Buy-from-the-grid: fetched ONCE here (not per card) so the cards stay cheap.
  const { hasPlatform, active } = useMySubscription();
  const [prices, setPrices] = useState<PriceBookEntryDto[]>([]);

  useEffect(() => {
    getPricing()
      .then(setPrices)
      .catch(() => setPrices([]));
  }, []);

  /** Company hubs the student already has (Full Platform unlocks every one). */
  const ownedSlugs = useMemo(
    () =>
      new Set(
        active
          .filter((e) => e.scopeType === EntitlementScope.COMPANY && e.scopeRef)
          .map((e) => e.scopeRef as string),
      ),
    [active],
  );
  const isOwned = (slug: string) => hasPlatform || ownedSlugs.has(slug);

  /** 1-Month company price entry (selling + MRP) shown on the card. */
  const priceEntry = useMemo(
    () => retailPrice(buildPriceMap(prices), EntitlementScope.COMPANY, BillingPeriod.MONTHLY) ?? null,
    [prices],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listCompanies()
      .then((live) => {
        if (cancelled) return;
        const mapLive = (c: ApiCompany): ExplorerCompany => ({
          slug: c.slug,
          name: c.name,
          tagline: c.tagline,
          accent: c.accent,
          badge: c.badge,
          type: c.type,
          logoUrl: c.logoUrl,
          difficulty: (c.difficulty as CompanyCardData['difficulty']) ?? undefined,
          rounds: c.rounds ?? undefined,
          questionCount: c.questionCount,
          pyqCount: c.pyqCount,
          codingCount: c.codingCount,
          locked: false,
        });
        const liveBySlug = new Map(live.map((c) => [c.slug, c]));
        // Show exactly the FEATURED set (HOMEPAGE_FEATURED_TRACKS), in its declared order,
        // shared with the landing page. A featured slug present in the live catalog renders
        // unlocked + enriched; the rest render locked ("coming soon"), using the featured
        // config's own name/logo/tagline (so "LTIMindtree"/"HCLTech" show correctly even
        // though the catalog rows are unpublished). Publishing a row auto-unlocks it.
        const merged: ExplorerCompany[] = HOMEPAGE_FEATURED_TRACKS.map((f) => {
          const l = liveBySlug.get(f.slug);
          if (l) return mapLive(l);
          return {
            slug: f.slug,
            name: f.company,
            tagline: f.description,
            accent: f.accent,
            badge: null,
            type: f.type,
            logoUrl: f.logoSrc,
            rounds: f.rounds,
            locked: true,
          };
        });
        setCompanies(merged);
      })
      .catch(() => {
        if (cancelled) return;
        // API unreachable → render the featured set all-locked so the grid still shows the
        // right companies in the right order rather than an empty state.
        setCompanies(
          HOMEPAGE_FEATURED_TRACKS.map((f) => ({
            slug: f.slug,
            name: f.company,
            tagline: f.description,
            accent: f.accent,
            badge: null,
            type: f.type,
            logoUrl: f.logoSrc,
            rounds: f.rounds,
            locked: true,
          })),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!companies) return [];
    return companies.filter((c) => {
      if (type !== 'All' && c.type !== type) return false;
      return true;
    });
  }, [companies, type]);

  const typeCount = (key: 'All' | ApiCompany['type']) => {
    if (!companies) return 0;
    if (key === 'All') return companies.length;
    return companies.filter((c) => c.type === key).length;
  };

  return (
    <div>
      {/* Filter bar - a crisp white control panel with layered depth */}
      <div data-tour="company:filters" className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_8px_30px_-20px_rgba(15,23,42,0.35)] sm:p-3.5">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-50/70 via-transparent to-transparent"
        />
        <div className="relative z-10 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Type tabs - pill segmented control with sliding active state */}
          <div
            className="flex flex-wrap items-center gap-1"
            role="tablist"
            aria-label="Company type"
          >
            {/* Hide a type tab with no companies - the featured set has no PRODUCT company,
                so a "Product" tab would open onto an empty grid. "All" always shows. */}
            {TYPE_TABS.filter((t) => t.key === 'All' || typeCount(t.key) > 0).map((t) => {
              const active = type === t.key;
              return (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setType(t.key)}
                  className={cn(
                    'relative flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors',
                    active ? 'text-white' : 'text-slate-600 hover:text-navy',
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="company-type-pill"
                      aria-hidden
                      className="absolute inset-0 rounded-full bg-gradient-to-b from-[#1f2d4d] to-[#0a0a0c] shadow-[0_8px_18px_-8px_rgba(11,18,32,0.7)]"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10">{t.label}</span>
                  <span
                    className={cn(
                      'relative z-10 rounded-full px-1.5 py-px text-[10px] font-bold tabular-nums',
                      active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600',
                    )}
                  >
                    {typeCount(t.key)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Result count - keeps the bar balanced now that difficulty is gone */}
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            <Building2 className="size-3.5" aria-hidden="true" />
            <span className="tabular-nums text-navy">{filtered.length}</span>
            <span className="text-slate-400">/</span>
            <span className="tabular-nums">{companies?.length ?? 0}</span>
            companies
          </span>
        </div>
      </div>

      <div className="py-4" />

      {loading ? (
        <div className="flex items-center justify-center rounded-3xl border border-slate-200/80 bg-white p-20 shadow-[0_8px_30px_-20px_rgba(15,23,42,0.35)]">
          <Loader2 className="size-6 animate-spin text-orange" aria-hidden="true" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-14 text-center shadow-[0_8px_30px_-20px_rgba(15,23,42,0.35)]">
          <span
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-orange/10 blur-3xl"
          />
          <span className="relative mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500">
            <Building2 className="size-6" aria-hidden="true" />
          </span>
          <p className="relative mt-4 text-sm font-bold text-navy">No companies match these filters.</p>
          <p className="relative mt-1 text-xs text-slate-600">
            Try a different type or difficulty to see more hubs.
          </p>
        </div>
      ) : (
        <div data-tour="company:grid">
          {/* Reveal on mount (not whileInView) and re-key per filter, so the cards
              are never left stuck at opacity-0 when the grid mounts below the fold
              or the filtered set changes. */}
          <motion.div
            key={type}
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } } }}
          >
            {filtered.map((c) => (
              <motion.div
                key={c.slug}
                className="h-full"
                variants={{
                  hidden: { opacity: 0, y: 16 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
                }}
              >
                <CompanyCard company={c} owned={isOwned(c.slug)} priceEntry={priceEntry} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}
    </div>
  );
}
