'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Search, X } from 'lucide-react';
import { listAdminCompanies, type AdminCompanyRow } from '@/lib/api/admin';
import { CollegeSubscriptionKind } from '@/shared/enums';

/**
 * The one control for "what is this college buying?" - reused by the college
 * registration request form and the college-profile subscription card, so the
 * choice an admin makes at onboarding and the one they edit later can never drift
 * apart.
 *
 * Exactly one kind is selectable. Choosing Full Platform clears any company
 * selection (the server enforces the same rule with a DB CHECK), so the two can't
 * be submitted together.
 */

export interface SubscriptionScopeValue {
  kind: CollegeSubscriptionKind | '';
  companySlugs: string[];
}

export const EMPTY_SCOPE: SubscriptionScopeValue = { kind: '', companySlugs: [] };

/** True when the selection is complete enough to submit. */
export function isScopeComplete(v: SubscriptionScopeValue): boolean {
  if (v.kind === CollegeSubscriptionKind.PLATFORM) return true;
  if (v.kind === CollegeSubscriptionKind.COMPANY) return v.companySlugs.length > 0;
  return false;
}

function KindCard({
  selected,
  title,
  description,
  onSelect,
}: {
  selected: boolean;
  title: string;
  description: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
        selected
          ? 'border-orange bg-orange/5 ring-1 ring-orange/20'
          : 'border-slate-200 bg-white hover:bg-slate-50'
      }`}
    >
      <span
        aria-hidden
        className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border ${
          selected ? 'border-orange bg-orange text-white' : 'border-slate-300 bg-white'
        }`}
      >
        {selected ? <Check className="size-3" /> : null}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-navy">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-slate-600">{description}</span>
      </span>
    </button>
  );
}

export function SubscriptionScopePicker({
  value,
  onChange,
  disabled,
}: {
  value: SubscriptionScopeValue;
  onChange: (next: SubscriptionScopeValue) => void;
  disabled?: boolean;
}) {
  const [companies, setCompanies] = useState<AdminCompanyRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    listAdminCompanies()
      .then((rows) => !cancelled && setCompanies(rows))
      .catch(() => !cancelled && setLoadError('Could not load the company list.'));
    return () => {
      cancelled = true;
    };
  }, []);

  // Only published companies are offerable - selling a hub that 404s for the
  // student is worse than not offering it. Already-selected slugs stay visible
  // even if unpublished later, so an existing subscription is never silently
  // altered by editing something else on the page.
  const selectable = useMemo(() => {
    const rows = (companies ?? []).filter(
      (c) => c.isPublished || value.companySlugs.includes(c.slug),
    );
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((c) => c.name.toLowerCase().includes(q) || c.slug.includes(q));
  }, [companies, query, value.companySlugs]);

  const selectedRows = useMemo(
    () =>
      value.companySlugs.map(
        (slug) => (companies ?? []).find((c) => c.slug === slug) ?? { slug, name: slug },
      ),
    [companies, value.companySlugs],
  );

  const setKind = (kind: CollegeSubscriptionKind) =>
    onChange({
      kind,
      // Full Platform carries no company list - the server rejects the pair.
      companySlugs: kind === CollegeSubscriptionKind.PLATFORM ? [] : value.companySlugs,
    });

  const toggle = (slug: string) =>
    onChange({
      ...value,
      companySlugs: value.companySlugs.includes(slug)
        ? value.companySlugs.filter((s) => s !== slug)
        : [...value.companySlugs, slug],
    });

  return (
    <div className={disabled ? 'pointer-events-none opacity-60' : undefined}>
      <div className="grid gap-3 sm:grid-cols-2">
        <KindCard
          selected={value.kind === CollegeSubscriptionKind.PLATFORM}
          title="Full Platform"
          description="Every company hub and all premium features unlock for every student of this college."
          onSelect={() => setKind(CollegeSubscriptionKind.PLATFORM)}
        />
        <KindCard
          selected={value.kind === CollegeSubscriptionKind.COMPANY}
          title="Company Access"
          description="Only the company hubs selected below unlock. Everything else stays locked."
          onSelect={() => setKind(CollegeSubscriptionKind.COMPANY)}
        />
      </div>

      {value.kind === CollegeSubscriptionKind.COMPANY ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Companies included
            </p>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
              {value.companySlugs.length} selected
            </span>
          </div>

          {selectedRows.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {selectedRows.map((c) => (
                <li key={c.slug}>
                  <button
                    type="button"
                    onClick={() => toggle(c.slug)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-navy px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-navy/90"
                    aria-label={`Remove ${c.name}`}
                  >
                    {c.name}
                    <X className="size-3" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-slate-500">
              Select at least one company - a Company Access subscription with no companies unlocks
              nothing.
            </p>
          )}

          <div className="relative mt-4">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search companies"
              aria-label="Search companies"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-navy focus:border-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
            />
          </div>

          {companies === null && !loadError ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-slate-400" />
            </div>
          ) : loadError ? (
            <p role="alert" className="mt-3 rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
              {loadError}
            </p>
          ) : (
            <ul className="mt-3 max-h-60 divide-y divide-slate-100 overflow-auto rounded-lg border border-slate-200">
              {selectable.length === 0 ? (
                <li className="px-3 py-6 text-center text-xs text-slate-500">No companies match.</li>
              ) : (
                selectable.map((c) => {
                  const on = value.companySlugs.includes(c.slug);
                  return (
                    <li key={c.slug}>
                      <button
                        type="button"
                        onClick={() => toggle(c.slug)}
                        aria-pressed={on}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-slate-50"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-navy">
                            {c.name}
                          </span>
                          <span className="block truncate text-[11px] text-slate-500">{c.slug}</span>
                        </span>
                        <span
                          aria-hidden
                          className={`grid size-5 shrink-0 place-items-center rounded-md border ${
                            on ? 'border-orange bg-orange text-white' : 'border-slate-300 bg-white'
                          }`}
                        >
                          {on ? <Check className="size-3" /> : null}
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
