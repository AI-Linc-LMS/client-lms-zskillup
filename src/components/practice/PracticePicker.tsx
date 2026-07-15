'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Building2, Check, Crown, Layers, ListTree, Lock, Search, SlidersHorizontal } from 'lucide-react';
import type { ApiTopic } from '@/lib/api/catalog';
import { listCodingTopics, type CodingTopic } from '@/lib/api/mocks';
import { useMySubscription } from '@/hooks/useMySubscription';
import { EntitlementScope } from '@/shared/enums';
import { cn } from '@/lib/utils';
import { ACCENT_CLASS, HIDDEN_ROOT_SLUGS, sectionMetaFor, type Accent } from './section-meta';
import { CodingBlock } from './CodingBlock';

/**
 * Client-side Practice picker (Mode 1). Content is segregated into the five
 * sections (Numerical / Logical / Verbal / Technical + Coding). A student can
 * practise a WHOLE SECTION (the section button) or a SINGLE TOPIC (the chips).
 * Server passes raw topics + companies; icon/colour/order come from the shared
 * section-meta map (icons can't cross the RSC boundary). Coding is a separate
 * Judge0 system, so it links out to the Company Hub browse rather than the
 * adaptive MCQ runner.
 *
 * No lock affordances on chips/sections: every topic, section and company links
 * straight into the runner (like the Company Hub → Practice Quiz tab). The
 * free-tier meter (first N questions per scope free) is enforced INSIDE the
 * runner, which raises the PaywallCard only once the allowance is spent — so a
 * padlock up-front (which reads as "completely inaccessible") is wrong. Ownership
 * is still surfaced positively via the "Included" pill + "Your access" panel.
 */

interface RootTopic extends ApiTopic {
  children: ApiTopic[];
  icon: typeof Layers;
  accent: Accent;
  order: number;
}

export interface PickerCompany {
  id: string;
  slug: string;
  name: string;
  questionCount?: number;
}

export function PracticePicker({
  topics,
  companies,
  companyParam,
}: {
  topics: ApiTopic[];
  companies: PickerCompany[];
  companyParam: string;
}) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  // ── access control: what the student owns, from live entitlements ──────────
  const { hasPlatform, active, paywallEnabled } = useMySubscription();
  const [onlyMine, setOnlyMine] = useState(false);

  const ownedSections = useMemo(
    () => new Set(active.filter((e) => e.scopeType === EntitlementScope.SECTION && e.scopeRef).map((e) => e.scopeRef as string)),
    [active],
  );
  const ownedTopics = useMemo(
    () => new Set(active.filter((e) => e.scopeType === EntitlementScope.TOPIC && e.scopeRef).map((e) => e.scopeRef as string)),
    [active],
  );
  const ownedCompanies = useMemo(
    () => new Set(active.filter((e) => e.scopeType === EntitlementScope.COMPANY && e.scopeRef).map((e) => e.scopeRef as string)),
    [active],
  );
  // Only surface locks when the paywall is actually enforced (falls open otherwise).
  const gating = paywallEnabled && !hasPlatform;
  const sectionOwned = (slug: string) => hasPlatform || ownedSections.has(slug);
  const topicOwned = (rootSlug: string, slug: string) =>
    hasPlatform || ownedSections.has(rootSlug) || ownedTopics.has(slug);
  const companyOwned = (slug: string) => hasPlatform || ownedCompanies.has(slug);
  const codingOwned = hasPlatform || ownedSections.has('coding');

  // Coding topics come from the coding bank (Judge0 problems), a separate system
  // from the MCQ taxonomy — fetched client-side (guaranteed auth token) like the
  // custom-mock builder does.
  const [codingTopics, setCodingTopics] = useState<CodingTopic[]>([]);
  useEffect(() => {
    let cancelled = false;
    listCodingTopics()
      .then((t) => !cancelled && setCodingTopics(t))
      .catch(() => !cancelled && setCodingTopics([]));
    return () => {
      cancelled = true;
    };
  }, []);

  const adaptiveTopicHref = (slug: string) =>
    `/dashboard/quiz/adaptive?topic=${encodeURIComponent(slug)}${companyParam}`;

  const roots = useMemo<RootTopic[]>(() => {
    return topics
      .filter((t) => t.parentId === null && !HIDDEN_ROOT_SLUGS.has(t.slug) && (t.questionCount ?? 0) > 0)
      .map((r, i) => {
        const meta = sectionMetaFor(r.slug, i);
        return {
          ...r,
          children: topics.filter((c) => c.parentId === r.id && (c.questionCount ?? 0) > 0),
          icon: meta.icon,
          accent: meta.accent,
          order: meta.order,
        };
      })
      .filter((r) => r.children.length > 0)
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  }, [topics]);

  // Search: keep a section if its name matches OR any topic matches; keep matching
  // topics. "Show only my content" then drops what isn't in the student's plan (a
  // whole section is kept if owned; otherwise only its individually-owned topics).
  const filteredRoots = useMemo<RootTopic[]>(() => {
    let list = roots;
    if (q) {
      list = list
        .map((r) => {
          const rootMatch = r.name.toLowerCase().includes(q);
          const children = rootMatch ? r.children : r.children.filter((c) => c.name.toLowerCase().includes(q));
          return { ...r, children };
        })
        .filter((r) => r.name.toLowerCase().includes(q) || r.children.length > 0);
    }
    if (onlyMine) {
      list = list
        .map((r) =>
          sectionOwned(r.slug) ? r : { ...r, children: r.children.filter((c) => topicOwned(r.slug, c.slug)) },
        )
        .filter((r) => sectionOwned(r.slug) || r.children.length > 0);
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roots, q, onlyMine, hasPlatform, ownedSections, ownedTopics]);

  const filteredCompanies = useMemo(() => {
    let list = q ? companies.filter((c) => c.name.toLowerCase().includes(q)) : companies;
    if (onlyMine) list = list.filter((c) => companyOwned(c.slug));
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companies, q, onlyMine, hasPlatform, ownedCompanies]);

  const filteredCodingTopics = useMemo(
    () => (q ? codingTopics.filter((t) => t.topic.toLowerCase().includes(q)) : codingTopics),
    [codingTopics, q],
  );
  const codingVisible =
    (!q || 'coding'.includes(q) || filteredCodingTopics.length > 0) && (!onlyMine || codingOwned);
  const nothing = filteredRoots.length === 0 && filteredCompanies.length === 0 && !codingVisible;

  return (
    <div className="space-y-8">
      {/* Your Access */}
      <AccessPanel
        hasPlatform={hasPlatform}
        gating={gating}
        ownedSectionCount={ownedSections.size}
        ownedTopicCount={ownedTopics.size}
        ownedCompanyCount={ownedCompanies.size}
        onlyMine={onlyMine}
        setOnlyMine={setOnlyMine}
      />

      {/* search bar */}
      <div data-tour="practice:search" className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search companies, sections or topics…"
          className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3 text-sm text-navy shadow-sm placeholder:text-slate-500 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
        />
      </div>

      {nothing ? (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 text-sm text-slate-600">
          No companies, sections or topics match &ldquo;{query.trim()}&rdquo;.
        </div>
      ) : null}

      {/* By company */}
      {filteredCompanies.length > 0 ? (
        <div data-tour="practice:by-company">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-violet-600 ring-1 ring-inset ring-violet-100">
            <Building2 className="size-3.5" /> By company
          </span>
          <h2 className="mb-4 mt-2 text-lg font-extrabold tracking-tight text-navy sm:text-xl">
            Practice a company&apos;s question style
          </h2>
          <div className="flex flex-wrap gap-2">
            {filteredCompanies.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/quiz/adaptive?company=${encodeURIComponent(c.slug)}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-navy transition-colors hover:border-violet-300 hover:bg-violet-50/70"
              >
                <Building2 className="size-3.5 text-violet-500" />
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {/* By section → topics */}
      {filteredRoots.length > 0 || codingVisible ? (
        <div data-tour="practice:by-section">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 ring-1 ring-inset ring-emerald-100">
            <ListTree className="size-3.5" /> By section
          </span>
          <h2 className="mb-4 mt-2 text-lg font-extrabold tracking-tight text-navy sm:text-xl">
            Practice a whole section or a single topic
          </h2>
          <div className="space-y-4">
            {filteredRoots.map((root) => (
              <SectionBlock
                key={root.id}
                root={root}
                topicHref={adaptiveTopicHref}
                owned={sectionOwned(root.slug)}
              />
            ))}
            {codingVisible ? <CodingBlock topics={filteredCodingTopics} /> : null}
          </div>
        </div>
      ) : null}

    </div>
  );
}

/** "Your Access" summary + the "Show only my content" filter toggle. */
function AccessPanel({
  hasPlatform,
  gating,
  ownedSectionCount,
  ownedTopicCount,
  ownedCompanyCount,
  onlyMine,
  setOnlyMine,
}: {
  hasPlatform: boolean;
  gating: boolean;
  ownedSectionCount: number;
  ownedTopicCount: number;
  ownedCompanyCount: number;
  onlyMine: boolean;
  setOnlyMine: (v: boolean) => void;
}) {
  const ownsSomething = ownedSectionCount + ownedTopicCount + ownedCompanyCount > 0;
  // Nothing to show if the paywall is off and the student owns nothing — the picker
  // is fully open, so an access panel would just be noise.
  if (!hasPlatform && !gating && !ownsSomething) return null;

  const parts: string[] = [];
  if (ownedSectionCount) parts.push(`${ownedSectionCount} section${ownedSectionCount === 1 ? '' : 's'}`);
  if (ownedTopicCount) parts.push(`${ownedTopicCount} topic${ownedTopicCount === 1 ? '' : 's'}`);
  if (ownedCompanyCount) parts.push(`${ownedCompanyCount} company hub${ownedCompanyCount === 1 ? '' : 's'}`);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_30px_-24px_rgba(15,23,42,0.35)]">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'grid size-10 shrink-0 place-items-center rounded-xl',
            hasPlatform ? 'bg-gradient-to-br from-[#ffd24d] to-[#f5b400] text-[#171717]' : 'bg-slate-100 text-slate-500',
          )}
        >
          {hasPlatform ? <Crown className="size-5" /> : <Lock className="size-5" />}
        </span>
        <div>
          <p className="text-sm font-bold text-navy">Your access</p>
          <p className="text-xs text-slate-600">
            {hasPlatform
              ? 'Full platform — every section, topic and company hub is unlocked.'
              : ownsSomething
                ? `Unlocked: ${parts.join(' · ')}. First questions in every topic are free.`
                : 'Free plan — your first questions in every topic are free.'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {!hasPlatform ? (
          <Link
            href="/shop"
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#ffd24d] via-[#ffc42d] to-[#f5b400] px-3.5 py-2 text-xs font-extrabold text-[#171717] transition hover:brightness-105"
          >
            <Crown className="size-3.5" /> Explore plans
          </Link>
        ) : null}
        {ownsSomething || gating ? (
          <button
            type="button"
            onClick={() => setOnlyMine(!onlyMine)}
            aria-pressed={onlyMine}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold transition',
              onlyMine
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
            )}
          >
            <SlidersHorizontal className="size-3.5" />
            {onlyMine ? 'Showing my content' : 'Show only my content'}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** One MCQ section: a section-wide CTA plus a chip per topic. Chips + the CTA link
 *  straight into the runner — no locks — and an "Included" pill positively marks a
 *  section the student owns. The free-tier allowance is metered in the runner. */
function SectionBlock({
  root,
  topicHref,
  owned,
}: {
  root: RootTopic;
  topicHref: (slug: string) => string;
  owned: boolean;
}) {
  const Icon = root.icon;
  const a = ACCENT_CLASS[root.accent];
  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_18px_50px_-30px_rgba(16,185,129,0.25)]">
      <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 size-32 rounded-full bg-emerald-400/10 blur-2xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`grid size-12 place-items-center rounded-2xl ring-1 ${a.tile}`}>
            <Icon className="size-6" aria-hidden="true" />
          </span>
          <div>
            <p className="flex items-center gap-1.5 text-base font-bold leading-snug text-navy">
              {root.name}
              {owned ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200/70">
                  <Check className="size-2.5" /> Included
                </span>
              ) : null}
            </p>
            <p className="mt-0.5 text-xs text-slate-600">
              {root.children.length} topic{root.children.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>
        <Link
          href={topicHref(root.slug)}
          className="inline-flex items-center gap-1.5 rounded-full bg-navy px-4 py-2 text-xs font-extrabold text-white transition-transform hover:-translate-y-0.5"
        >
          Practice whole section <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <div className="relative mt-4 flex flex-wrap gap-2">
        {root.children.map((child) => (
          <Link
            key={child.id}
            href={topicHref(child.slug)}
            className={`inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-navy transition-colors ${a.chip}`}
          >
            {child.name}
          </Link>
        ))}
      </div>
    </div>
  );
}

