'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Brain,
  Building2,
  Calculator,
  Code2,
  Cpu,
  Layers,
  ListTree,
  Search,
} from 'lucide-react';
import type { ApiTopic } from '@/lib/api/catalog';

/**
 * Client-side Practice picker (Mode 1): company / section / topic selection with a
 * live search bar and higher-level category grouping. Server passes raw topics +
 * companies; all grouping/filtering happens here (icons can't cross the RSC
 * boundary, so they're mapped by slug in the client).
 */

type Accent = 'sky' | 'violet' | 'orange' | 'emerald' | 'indigo' | 'amber';
const ACCENT_CYCLE: Accent[] = ['sky', 'violet', 'orange', 'emerald', 'indigo', 'amber'];
const ACCENT_CLASS: Record<Accent, { tile: string; chip: string }> = {
  sky: { tile: 'bg-sky-50 text-sky-600 ring-sky-100', chip: 'hover:border-sky-300 hover:bg-sky-50/70' },
  violet: { tile: 'bg-violet-50 text-violet-600 ring-violet-100', chip: 'hover:border-violet-300 hover:bg-violet-50/70' },
  orange: { tile: 'bg-orange-50 text-orange-600 ring-orange-100', chip: 'hover:border-orange-300 hover:bg-orange-50/70' },
  emerald: { tile: 'bg-emerald-50 text-emerald-600 ring-emerald-100', chip: 'hover:border-emerald-300 hover:bg-emerald-50/70' },
  indigo: { tile: 'bg-indigo-50 text-indigo-600 ring-indigo-100', chip: 'hover:border-indigo-300 hover:bg-indigo-50/70' },
  amber: { tile: 'bg-amber-50 text-amber-600 ring-amber-100', chip: 'hover:border-amber-300 hover:bg-amber-50/70' },
};
const CATEGORY_ICON: Record<string, typeof Calculator> = {
  'quantitative-aptitude': Calculator,
  'verbal-ability': BookOpen,
  'logical-reasoning': Brain,
  'programming-dsa': Code2,
  'cs-fundamentals': Cpu,
};
const CATEGORY_ACCENT: Record<string, Accent> = {
  'quantitative-aptitude': 'sky',
  'verbal-ability': 'violet',
  'logical-reasoning': 'orange',
  'programming-dsa': 'indigo',
  'cs-fundamentals': 'emerald',
};

/** Higher-level category each root section belongs to. */
const CATEGORY_OF: Record<string, string> = {
  'quantitative-aptitude': 'Aptitude',
  'logical-reasoning': 'Reasoning',
  'verbal-ability': 'Verbal',
  'cs-fundamentals': 'Technical',
  'programming-dsa': 'Coding',
};
const CATEGORY_ORDER = ['Aptitude', 'Reasoning', 'Verbal', 'Technical', 'Coding', 'More'];

interface RootTopic extends ApiTopic {
  children: ApiTopic[];
  icon: typeof Calculator;
  accent: Accent;
  category: string;
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
      .filter((t) => t.parentId === null && (t.questionCount ?? 0) > 0)
      .map((r, i) => ({
        ...r,
        children: topics.filter((c) => c.parentId === r.id && (c.questionCount ?? 0) > 0),
        icon: CATEGORY_ICON[r.slug] ?? Layers,
        accent: CATEGORY_ACCENT[r.slug] ?? ACCENT_CYCLE[i % ACCENT_CYCLE.length],
        category: CATEGORY_OF[r.slug] ?? 'More',
      }))
      .filter((r) => r.children.length > 0);
  }, [topics]);

  // Search: keep a section if its name matches OR any child matches; keep matching
  // children. Empty query → everything.
  const filteredRoots = useMemo<RootTopic[]>(() => {
    if (!q) return roots;
    return roots
      .map((r) => {
        const rootMatch = r.name.toLowerCase().includes(q) || r.category.toLowerCase().includes(q);
        const children = rootMatch ? r.children : r.children.filter((c) => c.name.toLowerCase().includes(q));
        return { ...r, children };
      })
      .filter((r) => r.name.toLowerCase().includes(q) || r.category.toLowerCase().includes(q) || r.children.length > 0);
  }, [roots, q]);

  const filteredCompanies = useMemo(
    () => (q ? companies.filter((c) => c.name.toLowerCase().includes(q)) : companies),
    [companies, q],
  );

  const categories = useMemo(() => {
    const present = new Set(filteredRoots.map((r) => r.category));
    return CATEGORY_ORDER.filter((cat) => present.has(cat));
  }, [filteredRoots]);

  const nothing = filteredRoots.length === 0 && filteredCompanies.length === 0;

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
          No companies or topics match &ldquo;{query.trim()}&rdquo;.
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

      {/* By category → sections → topics */}
      {categories.map((cat) => {
        const catRoots = filteredRoots.filter((r) => r.category === cat);
        if (catRoots.length === 0) return null;
        return (
          <div key={cat} className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 ring-1 ring-inset ring-emerald-100">
                <ListTree className="size-3.5" /> {cat}
              </span>
              <span className="h-px flex-1 bg-slate-100" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {catRoots.map((root) => {
                const Icon = root.icon;
                const a = ACCENT_CLASS[root.accent];
                return (
                  <Link
                    key={root.id}
                    href={adaptiveTopicHref(root.slug)}
                    className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_18px_50px_-30px_rgba(16,185,129,0.25)] transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
                  >
                    <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 size-32 rounded-full bg-emerald-400/10 blur-2xl transition-opacity duration-500 group-hover:opacity-60" />
                    <div className="relative flex items-center justify-between">
                      <span className={`grid size-12 place-items-center rounded-2xl ring-1 ${a.tile}`}>
                        <Icon className="size-6" aria-hidden="true" />
                      </span>
                      <ArrowRight className="size-4 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-emerald-600" />
                    </div>
                    <p className="relative mt-4 text-base font-bold leading-snug text-navy">{root.name}</p>
                    <p className="relative mt-1 text-xs text-slate-500">
                      {root.children.length} topic{root.children.length === 1 ? '' : 's'}
                      {root.questionCount ? ` · ${root.questionCount.toLocaleString()} questions` : ''}
                    </p>
                    <span className="relative mt-4 inline-flex items-center gap-1 text-xs font-bold text-emerald-600 opacity-0 transition-opacity group-hover:opacity-100">
                      Start section practice →
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* topic chips per section in this category */}
            <div className="grid gap-4 lg:grid-cols-2">
              {catRoots.map((root) => (
                <div
                  key={`${root.id}-chips`}
                  className="relative h-full overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_18px_50px_-30px_rgba(16,185,129,0.25)]"
                >
                  <div className="relative mb-4 flex items-center gap-3">
                    <span className={`grid size-11 place-items-center rounded-2xl ring-1 ${ACCENT_CLASS[root.accent].tile}`}>
                      <root.icon className="size-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-base font-bold text-navy">{root.name}</p>
                      <p className="text-[11px] text-slate-400">Pick a topic to practice</p>
                    </div>
                  </div>
                  <div className="relative flex flex-wrap gap-2">
                    {root.children.map((child) => (
                      <Link
                        key={child.id}
                        href={adaptiveTopicHref(child.slug)}
                        className={`inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-navy transition-colors ${ACCENT_CLASS[root.accent].chip}`}
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
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
