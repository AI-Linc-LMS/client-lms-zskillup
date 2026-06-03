'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CompanyCard, type CompanyCardData } from './CompanyCard';
import { listCompanies, type ApiCompany } from '@/lib/api/catalog';
import { DEMO_COMPANIES } from '@/lib/demo-data';

const TYPE_TABS: Array<{ key: 'All' | ApiCompany['type']; label: string }> = [
  { key: 'All', label: 'All' },
  { key: 'SERVICE', label: 'Service' },
  { key: 'PRODUCT', label: 'Product' },
  { key: 'CONSULTING', label: 'Consulting' },
];

const DIFFICULTIES = ['All', 'Easy', 'Medium', 'Hard'] as const;

/**
 * Companies explorer — Sprint 3. Fetches the live catalog from `GET /companies`
 * (public). Type is taken from the API enum directly (no demo overlay) so
 * companies created by superadmin CRUD show up under the correct tab. Display-
 * only metadata (rating, enrolled, package) is overlaid from DEMO_COMPANIES
 * when the slug matches — it's a v1 placeholder that won't survive the API
 * adding those fields in Sprint 5+.
 *
 * If the API is unreachable (preview), falls back to the demo grid.
 */

interface ExplorerCompany extends CompanyCardData {
  type: ApiCompany['type'];
}

export function CompaniesExplorer() {
  const [type, setType] = useState<'All' | ApiCompany['type']>('All');
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTIES)[number]>('All');
  const [companies, setCompanies] = useState<ExplorerCompany[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const demoBySlug = new Map(DEMO_COMPANIES.map((d) => [d.slug, d]));
    listCompanies()
      .then((live) => {
        if (cancelled) return;
        setCompanies(
          live.map((c) => {
            const demo = demoBySlug.get(c.slug);
            return {
              slug: c.slug,
              name: c.name,
              tagline: c.tagline,
              accent: c.accent,
              badge: c.badge,
              type: c.type,
              difficulty: demo?.difficulty,
              rating: demo?.rating,
              enrolled: demo?.enrolled,
              package: demo?.package,
              mcqs: demo?.mcqs,
              rounds: demo?.rounds,
            };
          }),
        );
      })
      .catch(() => {
        if (cancelled) return;
        // API unreachable → fall back to the seeded demo grid so the page
        // still renders something instead of an empty state.
        setCompanies(
          DEMO_COMPANIES.map((d) => ({
            ...(d as CompanyCardData),
            type:
              d.type === 'Service'
                ? 'SERVICE'
                : d.type === 'Product'
                  ? 'PRODUCT'
                  : 'CONSULTING',
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
      if (difficulty !== 'All' && c.difficulty !== difficulty) return false;
      return true;
    });
  }, [companies, type, difficulty]);

  const typeCount = (key: 'All' | ApiCompany['type']) => {
    if (!companies) return 0;
    if (key === 'All') return companies.length;
    return companies.filter((c) => c.type === key).length;
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap gap-4" role="tablist" aria-label="Company type">
          {TYPE_TABS.map((t) => {
            const active = type === t.key;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={active}
                onClick={() => setType(t.key)}
                className={cn(
                  'flex items-center gap-1.5 border-b-2 pb-2 text-sm font-medium transition-colors',
                  active
                    ? 'border-orange font-semibold text-navy'
                    : 'border-transparent text-slate-400 hover:text-slate-600',
                )}
              >
                {t.label}
                <span
                  className={cn(
                    'rounded-full px-1.5 py-px text-[10px] font-bold',
                    active ? 'bg-orange text-white' : 'bg-slate-100 text-slate-500',
                  )}
                >
                  {typeCount(t.key)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-slate-400" aria-hidden="true" />
          <span className="text-xs text-slate-500">Difficulty</span>
          <div className="flex gap-1">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  difficulty === d ? 'bg-navy text-white' : 'text-slate-500 hover:bg-slate-100',
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="py-3 text-xs text-slate-500">
        Showing {filtered.length} of {companies?.length ?? 0} companies
      </p>

      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-16">
          <Loader2 className="size-5 animate-spin text-slate-400" aria-hidden="true" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          No companies match these filters.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((c) => (
            <CompanyCard key={c.slug} company={c} />
          ))}
        </div>
      )}
    </div>
  );
}
