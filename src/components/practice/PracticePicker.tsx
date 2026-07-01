'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Building2, Layers, ListTree, Search } from 'lucide-react';
import type { ApiTopic } from '@/lib/api/catalog';
import { ACCENT_CLASS, CODING_META, HIDDEN_ROOT_SLUGS, sectionMetaFor, type Accent } from './section-meta';

/**
 * Client-side Practice picker (Mode 1). Content is segregated into the five
 * sections (Numerical / Logical / Verbal / Technical + Coding). A student can
 * practise a WHOLE SECTION (the section button) or a SINGLE TOPIC (the chips).
 * Server passes raw topics + companies; icon/colour/order come from the shared
 * section-meta map (icons can't cross the RSC boundary). Coding is a separate
 * Judge0 system, so it links out to the Company Hub browse rather than the
 * adaptive MCQ runner.
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
  // topics. Empty query → everything.
  const filteredRoots = useMemo<RootTopic[]>(() => {
    if (!q) return roots;
    return roots
      .map((r) => {
        const rootMatch = r.name.toLowerCase().includes(q);
        const children = rootMatch ? r.children : r.children.filter((c) => c.name.toLowerCase().includes(q));
        return { ...r, children };
      })
      .filter((r) => r.name.toLowerCase().includes(q) || r.children.length > 0);
  }, [roots, q]);

  const filteredCompanies = useMemo(
    () => (q ? companies.filter((c) => c.name.toLowerCase().includes(q)) : companies),
    [companies, q],
  );

  const codingVisible = !q || 'coding'.includes(q);
  const nothing = filteredRoots.length === 0 && filteredCompanies.length === 0 && !codingVisible;

  return (
    <div className="space-y-8">
      {/* search bar */}
      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search companies, sections or topics…"
          className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3 text-sm text-navy shadow-sm placeholder:text-slate-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
        />
      </div>

      {nothing ? (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 text-sm text-slate-500">
          No companies, sections or topics match &ldquo;{query.trim()}&rdquo;.
        </div>
      ) : null}

      {/* By company */}
      {filteredCompanies.length > 0 ? (
        <div>
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
                {c.questionCount ? (
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                    {c.questionCount}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {/* By section → topics */}
      {filteredRoots.length > 0 || codingVisible ? (
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 ring-1 ring-inset ring-emerald-100">
            <ListTree className="size-3.5" /> By section
          </span>
          <h2 className="mb-4 mt-2 text-lg font-extrabold tracking-tight text-navy sm:text-xl">
            Practice a whole section or a single topic
          </h2>
          <div className="space-y-4">
            {filteredRoots.map((root) => (
              <SectionBlock key={root.id} root={root} topicHref={adaptiveTopicHref} />
            ))}
            {codingVisible ? <CodingBlock /> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** One MCQ section: a section-wide CTA plus a chip per topic. */
function SectionBlock({
  root,
  topicHref,
}: {
  root: RootTopic;
  topicHref: (slug: string) => string;
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
            <p className="text-base font-bold leading-snug text-navy">{root.name}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {root.children.length} topic{root.children.length === 1 ? '' : 's'}
              {root.questionCount ? ` · ${root.questionCount.toLocaleString()} questions` : ''}
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
            {child.questionCount ? (
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                {child.questionCount}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}

/** Section 5 — Coding. Separate Judge0 system, so it links to the Company Hub browse. */
function CodingBlock() {
  const Icon = CODING_META.icon;
  const a = ACCENT_CLASS[CODING_META.accent];
  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_18px_50px_-30px_rgba(99,102,241,0.25)]">
      <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 size-32 rounded-full bg-indigo-400/10 blur-2xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`grid size-12 place-items-center rounded-2xl ring-1 ${a.tile}`}>
            <Icon className="size-6" aria-hidden="true" />
          </span>
          <div>
            <p className="text-base font-bold leading-snug text-navy">Coding</p>
            <p className="mt-0.5 text-xs text-slate-500">
              DSA problems — Judge0-evaluated, grouped by topic &amp; company
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/company"
          className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-xs font-extrabold text-white transition-transform hover:-translate-y-0.5"
        >
          Browse coding <ArrowRight className="size-3.5" />
        </Link>
      </div>
      <p className="relative mt-3 text-xs text-slate-500">
        Arrays, Strings, Searching &amp; Sorting, Trees, Graphs, DP and more — pick a topic in the Company Hub.
      </p>
    </div>
  );
}
